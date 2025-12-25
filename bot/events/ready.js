const { ActivityType } = require("discord.js");
const Server = require("../Models/User");
const Serverdb = require("../Models/Server");
const BlackList = require("../Models/BlackList");
const UpdateStatus = require("../Models/UpdateStatus");
const axios = require('axios');

module.exports = {
    name: 'ready',
    once: true,
    async execute(client) {
        console.log(`🚀 ${client.user.tag} is online and ready!`);

        // Set initial status
        client.user.setStatus("online");
        
        const activities = [
            { name: "ProMcBot | New update! 🚀", type: ActivityType.Playing },
            { name: "ProMcBot | Try new features! 🔥", type: ActivityType.Watching },
            { name: "ProMcBot | Compete now! ⚡", type: ActivityType.Competing },
            { name: "ProMcBot | Listening to your commands! 🎧", type: ActivityType.Listening }
        ];

        let i = 0;
        setInterval(() => {
            client.user.setActivity(activities[i]);
            i = (i + 1) % activities.length;
        }, 10000);

        // Cache system data
        try {
            const [users, servers, blacklists] = await Promise.all([
                Server.find(),
                Serverdb.find(),
                BlackList.find()
            ]);

            users.forEach(u => client.userSettings.set(u.Id, u));
            servers.forEach(s => client.userSettings.set(s.serverId, s));
            blacklists.forEach(b => {
                if (b.guildIds) {
                    if (Array.isArray(b.guildIds)) {
                        b.guildIds.forEach(id => client.userSettings.set(id + "_bl", b));
                    } else {
                        client.userSettings.set(b.guildIds + "_bl", b);
                    }
                }
            });
            
            console.log("✅ System data cached successfully.");
        } catch (err) {
            console.error("❌ Error caching system data:", err);
        }

        // Status Update System
        let toggle = true;
        setInterval(async () => {
            try {
                const updatingGuilds = await UpdateStatus.find({ isUpdating: true });
                for (const updateStatus of updatingGuilds) {
                    const guild = client.guilds.cache.get(updateStatus.guildId);
                    if (!guild) continue;

                    const serverInfo = await Server.findOne({ serverId: updateStatus.guildId });
                    if (!serverInfo) continue;

                    let apiUrl;
                    if (serverInfo.serverType === 'custom') {
                        apiUrl = toggle ? 
                            `https://api.mcsrvstat.us/3/${serverInfo.javaIP}:${serverInfo.javaPort}` : 
                            `https://api.mcsrvstat.us/3/${serverInfo.bedrockIP}:${serverInfo.bedrockPort}`;
                        toggle = !toggle;
                    } else {
                        const ip = serverInfo.serverType === 'java' ? serverInfo.javaIP : serverInfo.bedrockIP;
                        const port = serverInfo.serverType === 'java' ? serverInfo.javaPort : serverInfo.bedrockPort;
                        apiUrl = `https://api.mcsrvstat.us/3/${ip}:${port}`;
                    }

                    const response = await axios.get(apiUrl).catch(() => null);
                    if (!response || !response.data) continue;

                    const data = response.data;
                    const statusName = `Status: ${data.online ? 'Online' : 'Offline'}`;
                    const playerCount = `Players: ${data.online ? `${data.players.online}/${data.players.max}` : '--/--'}`;

                    const statusChannel = guild.channels.cache.get(updateStatus.statusChannelId);
                    if (statusChannel) await statusChannel.edit({ name: statusName }).catch(() => {});

                    const countChannel = guild.channels.cache.get(updateStatus.playerCountChannelId);
                    if (countChannel) await countChannel.edit({ name: playerCount }).catch(() => {});
                }
            } catch (err) {
                console.error("Error in status update loop:", err.message);
            }
        }, 60000); // Update every minute to avoid rate limits
    }
};
