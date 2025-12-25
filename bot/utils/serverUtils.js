const axios = require('axios');

async function safeAxiosGet(url, options = {}) {
    try {
        const response = await axios.get(url, {
            timeout: 5000,
            validateStatus: status => status < 500,
            ...options
        });
        return response;
    } catch (error) {
        console.log(`Request failed for ${url}:`, error.message);
        return null;
    }
}

async function checkServerStatus(ip, port, type) {
    if (!ip) return { success: false, error: new Error('No IP provided') };

    const endpoints = [];

    // Java servers
    if (type === 'java') {
        // Try different API endpoints and IP variations
        endpoints.push(`https://api.mcsrvstat.us/3/${ip}:${port}`);
        endpoints.push(`https://api.mcsrvstat.us/2/${ip}:${port}`);

        // Try with play. prefix if not already present
        if (!ip.startsWith('play.')) {
            endpoints.push(`https://api.mcsrvstat.us/3/play.${ip}:${port}`);
            endpoints.push(`https://api.mcsrvstat.us/2/play.${ip}:${port}`);
        }

        // Try without play. prefix if present
        if (ip.startsWith('play.')) {
            const cleanIp = ip.replace('play.', '');
            endpoints.push(`https://api.mcsrvstat.us/3/${cleanIp}:${port}`);
            endpoints.push(`https://api.mcsrvstat.us/2/${cleanIp}:${port}`);
        }
    }
    // Bedrock servers
    else if (type === 'bedrock') {
        endpoints.push(`https://api.mcsrvstat.us/bedrock/3/${ip}:${port}`);
        endpoints.push(`https://api.mcsrvstat.us/bedrock/2/${ip}:${port}`);
    }

    let lastError;
    for (const endpoint of endpoints) {
        try {
            const response = await safeAxiosGet(endpoint, { timeout: 10000 });
            if (response && response.data && (response.data.online || response.data.hostname)) {
                return {
                    success: true,
                    data: response.data,
                    source: endpoint
                };
            }
        } catch (error) {
            lastError = error;
            continue;
        }
    }

    // If all endpoints failed, try direct ping for Java servers
    if (type === 'java') {
        try {
            const response = await safeAxiosGet(`https://api.minetools.eu/ping/${ip}/${port}`, { timeout: 10000 });
            if (response && response.data && response.data.latency) {
                return {
                    success: true,
                    data: {
                        online: true,
                        hostname: ip,
                        players: {
                            online: response.data.players.online || 0,
                            max: response.data.players.max || 0
                        },
                        version: response.data.version || 'Unknown',
                        motd: response.data.description || 'A Minecraft Server'
                    },
                    source: 'minetools'
                };
            }
        } catch (error) {
            // Ignore this error, we'll use the lastError from the previous attempts
        }
    }

    return {
        success: false,
        error: lastError || new Error('All endpoints failed'),
        data: {
            online: false,
            hostname: ip,
            players: {
                online: 0,
                max: 0
            }
        }
    };
}

module.exports = {
    safeAxiosGet,
    checkServerStatus
};