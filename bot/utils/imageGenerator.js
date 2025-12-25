const Jimp = require('jimp');
const path = require('path');
const { safeAxiosGet } = require('./serverUtils');

function getMinecraftColor(code) {
    const colors = {
        '0': 0x000000FF, // Black
        '1': 0x0000AAFF, // Dark Blue
        '2': 0x00AA00FF, // Dark Green
        '3': 0x00AAAAFF, // Dark Aqua
        '4': 0xAA0000FF, // Dark Red
        '5': 0xAA00AAFF, // Dark Purple
        '6': 0xFFAA00FF, // Gold
        '7': 0xAAAAAAFF, // Gray
        '8': 0x555555FF, // Dark Gray
        '9': 0x5555FFFF, // Blue
        'a': 0x55FF55FF, // Green
        'b': 0x55FFFFFF, // Aqua
        'c': 0xFF5555FF, // Red
        'd': 0xFF55FFFF, // Light Purple
        'e': 0xFFFF55FF, // Yellow
        'f': 0xFFFFFFFF, // White
        'r': 0xFFFFFFFF  // Reset (White)
    };
    return colors[code] || 0xFFFFFFFF;
}

async function renderMOTD(image, font, serverStatus, imageWidth, imageHeight) {
    try {
        const motd = serverStatus.data.motd;
        let motdText = '';
        if (typeof motd === 'string') {
            motdText = motd;
        } else if (motd && motd.clean && Array.isArray(motd.clean)) {
            motdText = motd.clean.join('\n');
        } else if (motd && motd.raw && Array.isArray(motd.raw)) {
            motdText = motd.raw.join('\n');
        } else if (serverStatus.data.description) {
            motdText = serverStatus.data.description;
        } else {
            motdText = 'A Minecraft Server';
        }

        motdText = motdText.replace(/\\u00a7/g, '§');
        const motdLines = motdText.split('\n').filter(line => line.trim().length > 0);
        if (motdLines.length === 0) {
            motdLines.push("A Minecraft Server");
        }

        const lineHeight = 20;
        const totalMotdHeight = motdLines.length * lineHeight;
        const motdY = (imageHeight - totalMotdHeight) / 2;

        for (let i = 0; i < motdLines.length; i++) {
            const line = motdLines[i];
            if (line && line.length > 0) {
                const cleanLine = line.replace(/§./g, '');
                const totalWidth = Jimp.measureText(font, cleanLine);
                let currentX = (imageWidth - totalWidth) / 2;
                let currentColor = 0xFFFFFFFF;

                let j = 0;
                while (j < line.length) {
                    if (line[j] === '§' && j + 1 < line.length) {
                        const colorCode = line[j + 1].toLowerCase();
                        currentColor = getMinecraftColor(colorCode);
                        j += 2;
                    } else {
                        const char = line[j];
                        const charWidth = Jimp.measureText(font, char);
                        const charImage = new Jimp(charWidth, 20, 0x00000000);
                        charImage.print(font, 0, 0, char, currentColor);
                        image.composite(charImage, currentX, motdY + (i * lineHeight));
                        currentX += charWidth;
                        j++;
                    }
                }
            }
        }
    } catch (error) {
        console.log('Error processing colored MOTD:', error);
        // Fallback for MOTD
        try {
            const motd = serverStatus.data.motd;
            let motdText = '';
            if (typeof motd === 'string') {
                motdText = motd;
            } else if (motd && motd.clean && Array.isArray(motd.clean)) {
                motdText = motd.clean.join('\n');
            } else if (serverStatus.data.description) {
                motdText = serverStatus.data.description;
            } else {
                motdText = 'A Minecraft Server';
            }
            const cleanMotd = motdText.replace(/§./g, '').replace(/\\u00a7./g, '');
            const motdLines = cleanMotd.split('\n').filter(line => line.trim().length > 0);
            if (motdLines.length === 0) {
                motdLines.push("A Minecraft Server");
            }
            const lineHeight = 20;
            const totalMotdHeight = motdLines.length * lineHeight;
            const motdY = (imageHeight - totalMotdHeight) / 2;
            for (let i = 0; i < motdLines.length; i++) {
                const line = motdLines[i];
                if (line && line.length > 0) {
                    const lineWidth = Jimp.measureText(font, line);
                    const x = (imageWidth - lineWidth) / 2;
                    image.print(font, x, motdY + (i * lineHeight), line);
                }
            }
        } catch (fallbackError) {
            console.log('Fallback MOTD also failed:', fallbackError);
        }
    }
}
async function generateServerStatusImage(serverData, wallpaperUrl, interaction, isPreview = false) {
    try {
        const imageWidth = 690;
        const imageHeight = 120;
        const watermarkHeight = 20;
        const extraHeight = 10;
        const totalHeight = imageHeight + watermarkHeight + extraHeight;

        const image = new Jimp(imageWidth, totalHeight, 0x00000000);
        const fontPath = path.join(__dirname, '../src/fonts/d.fnt');
        const font = await Jimp.loadFont(fontPath);
        const fontPath1 = path.join(__dirname, '../src/fonts/f.fnt');
        const fontBold = await Jimp.loadFont(fontPath1);

        // Background with better error handling
        try {
            const response = await safeAxiosGet(wallpaperUrl, {
                responseType: 'arraybuffer'
            });

            if (response && response.status === 200 && response.data) {
                const background = await Jimp.read(Buffer.from(response.data));
                background.resize(960, 540);
                image.blit(background, 0, 0);
            } else {
                throw new Error('Failed to load wallpaper');
            }
        } catch (error) {
            console.log('Using fallback gradient background due to error:', error.message);
            // Fallback to gradient background
            for (let y = 0; y < imageHeight; y++) {
                const color = Jimp.rgbaToInt(47, 49, 54, 255 - (y * 255 / imageHeight));
                for (let x = 0; x < imageWidth; x++) {
                    image.setPixelColor(color, x, y);
                }
            }
        }

        // Server icon with better error handling
        let serverIconUrl;
        let serverStatus;

        if (isPreview) {
            // Use sample data for preview
            serverStatus = {
                success: true,
                data: {
                    online: true,
                    hostname: serverData.javaIP || serverData.bedrockIP || 'play.example.com',
                    players: {
                        online: 24,
                        max: 100
                    },
                    version: '1.19.2',
                    icon: null,
                    motd: {
                        clean: ["§aA Minecraft Server", "§eSecond Line"]
                    }
                }
            };
            serverIconUrl = 'https://api.mcstatus.io/v2/icon/minecraft.net';
        } else if (serverData.serverType === 'java' && serverData.javaIP) {
            serverStatus = await checkServerStatus(serverData.javaIP, serverData.javaPort || 25565, 'java');
            serverIconUrl = `https://api.mcstatus.io/v2/icon/${serverData.javaIP}:${serverData.javaPort || 25565}`;
        } else if (serverData.serverType === 'bedrock' && serverData.bedrockIP) {
            serverStatus = await checkServerStatus(serverData.bedrockIP, serverData.bedrockPort || 19132, 'bedrock');
            serverIconUrl = `https://api.mcstatus.io/v2/icon/${serverData.bedrockIP}:${serverData.bedrockPort || 19132}`;
        } else {
            serverIconUrl = 'https://api.mcstatus.io/v2/icon/minecraft.net';
        }

        try {
            const response = await safeAxiosGet(serverIconUrl, {
                responseType: 'arraybuffer'
            });

            if (response && response.status === 200 && response.data) {
                const serverIcon = await Jimp.read(Buffer.from(response.data));
                serverIcon.resize(64, 64);

                const mask = new Jimp(64, 64, 0x00000000);
                for (let y = 0; y < 64; y++) {
                    for (let x = 0; x < 64; x++) {
                        const distance = Math.sqrt(Math.pow(x - 32, 2) + Math.pow(y - 32, 2));
                        if (distance <= 30) {
                            mask.setPixelColor(0xFFFFFFFF, x, y);
                        }
                    }
                }
                serverIcon.mask(mask, 0, 0);
                image.blit(serverIcon, 40, 50);
            } else {
                throw new Error('Failed to load server icon');
            }
        } catch (error) {
            console.log('Using fallback server icon due to error:', error.message);
            const fallbackIcon = new Jimp(64, 64, 0x00000000);
            const centerX = 32;
            const centerY = 32;
            const radius = 30;
            for (let y = 0; y < 64; y++) {
                for (let x = 0; x < 64; x++) {
                    const distance = Math.sqrt(Math.pow(x - centerX, 2) + Math.pow(y - centerY, 2));
                    if (distance <= radius) {
                        fallbackIcon.setPixelColor(0x7289DAFF, x, y);
                    }
                }
            }
            image.blit(fallbackIcon, 40, 50);
        }

        const serverName = isPreview ? (serverData.serverName || 'Example Server') : (serverData.serverName || 'Minecraft Server');
        const isOnline = isPreview ? true : (serverStatus ? serverStatus.success : false);
        const statusColor = isOnline ? 0x00FF00FF : 0xFF0000FF;

        const statusX = imageWidth - 30;
        const statusY = 30;
        const statusRadius = 10;

        for (let y = statusY - statusRadius; y <= statusY + statusRadius; y++) {
            for (let x = statusX - statusRadius; x <= statusX + statusRadius; x++) {
                const distance = Math.sqrt(Math.pow(x - statusX, 2) + Math.pow(y - statusY, 2));
                if (distance <= statusRadius) {
                    image.setPixelColor(statusColor, x, y);
                }
            }
        }

        const textWidth = Jimp.measureText(fontBold, serverName);
        const x = (image.bitmap.width - textWidth) / 3.8;
        image.print(fontBold, x, 50, serverName);

        if (isOnline) {
            const playerCount = isPreview ? { online: 24, max: 100 } : (serverStatus && serverStatus.data.players ? serverStatus.data.players : { online: 0, max: 0 });
            const playerText = "Players"; // Simplified for now
            const playerCountText = `${playerText}: ${playerCount.online}/${playerCount.max}`;
            const playerCountWidth = Jimp.measureText(font, playerCountText);
            image.print(font, imageWidth - playerCountWidth - 20, 90, playerCountText);
        }

        if (serverStatus && serverStatus.data) {
            await renderMOTD(image, font, serverStatus, imageWidth, imageHeight);
        }

        const watermarkText = "ProMcBot Api";
        const watermarkImage = new Jimp(
          Jimp.measureText(font, watermarkText) + 40,
          Jimp.measureTextHeight(font, watermarkText) + 20,
          0x00000000
        );
        watermarkImage.print(font, 20, 30, watermarkText);
        watermarkImage.scale(0.8);
        const watermarkX = imageWidth - watermarkImage.getWidth() - 25;
        const watermarkY = imageHeight - watermarkImage.getHeight() + 30;
        image.composite(watermarkImage, watermarkX, watermarkY, {
          mode: Jimp.BLEND_SOURCE_OVER,
          opacitySource: 0.7
        });

        if (isPreview) {
            const previewText = "PREVIEW";
            const previewWidth = Jimp.measureText(fontBold, previewText);
            image.print(fontBold, (imageWidth - previewWidth) / 2, 10, previewText);
        }

        return await image.getBufferAsync(Jimp.MIME_PNG);
    } catch (error) {
        console.error('Error generating server status image:', error);
        const errorImage = new Jimp(800, 200, 0x2F3136FF);
        errorImage.print(Jimp.FONT_SANS_16_WHITE, 50, 90, "Error generating server status image");
        return await errorImage.getBufferAsync(Jimp.MIME_PNG);
    }
}

async function generateWallpaperSelectionCard(wallpapers, interaction) {
    try {
        const cardWidth = 600;
        const cardHeight = 400;

        const card = new Jimp(cardWidth, cardHeight, 0x2F3136FF);
        const titleBackground = new Jimp(cardWidth, 60, 0x7289DAFF);
        card.blit(titleBackground, 0, 0);

        const title = "Select a Wallpaper";
        const titleWidth = Jimp.measureText(Jimp.FONT_SANS_32_WHITE, title);
        card.print(Jimp.FONT_SANS_32_WHITE, (cardWidth - titleWidth) / 2, 15, title);

        const thumbnailSize = 100;
        const thumbnailsPerRow = 3;
        const spacing = 20;
        const startY = 80;

        for (let i = 0; i < Math.min(wallpapers.length, 9); i++) {
            const row = Math.floor(i / thumbnailsPerRow);
            const col = i % thumbnailsPerRow;

            const x = 50 + col * (thumbnailSize + spacing);
            const y = startY + row * (thumbnailSize + spacing);

            try {
                const response = await safeAxiosGet(wallpapers[i], {
                    responseType: 'arraybuffer'
                });

                if (response && response.status === 200 && response.data) {
                    const thumbnail = await Jimp.read(Buffer.from(response.data));
                    thumbnail.resize(thumbnailSize, thumbnailSize);
                    const borderColor = 0x7289DAFF;
                    for (let bx = 0; bx < thumbnail.bitmap.width; bx++) {
                        for (let by = 0; by < 3; by++) {
                            thumbnail.setPixelColor(borderColor, bx, by);
                            thumbnail.setPixelColor(borderColor, bx, thumbnail.bitmap.height - 1 - by);
                        }
                    }
                    for (let by = 0; by < thumbnail.bitmap.height; by++) {
                        for (let bx = 0; bx < 3; bx++) {
                            thumbnail.setPixelColor(borderColor, bx, by);
                            thumbnail.setPixelColor(borderColor, thumbnail.bitmap.width - 1 - bx, by);
                        }
                    }

                    card.blit(thumbnail, x, y);

                    const numberBg = new Jimp(30, 30, 0x7289DAFF);
                    const numCenterX = 15;
                    const numCenterY = 15;
                    const numRadius = 12;
                    for (let ny = 0; ny < 30; ny++) {
                        for (let nx = 0; nx < 30; nx++) {
                            const distance = Math.sqrt(Math.pow(nx - numCenterX, 2) + Math.pow(ny - numCenterY, 2));
                            if (distance <= numRadius) {
                                numberBg.setPixelColor(0xFFFFFFFF, nx, ny);
                            }
                        }
                    }
                    card.blit(numberBg, x + thumbnailSize - 25, y + thumbnailSize - 25);
                    card.print(Jimp.FONT_SANS_16_BLACK, x + thumbnailSize - 20, y + thumbnailSize - 20, `${i+1}`);
                } else {
                    throw new Error('Failed to load wallpaper');
                }
            } catch (error) {
                console.log('Using placeholder for wallpaper', i+1, 'due to error:', error.message);
                const placeholder = new Jimp(thumbnailSize, thumbnailSize, 0x7289DAFF);
                card.blit(placeholder, x, y);
                card.print(Jimp.FONT_SANS_16_WHITE, x + thumbnailSize/2 - 5, y + thumbnailSize/2 - 8, `${i+1}`);
            }
        }

        const instructionText = "Select a wallpaper from the menu below";
        const instructionWidth = Jimp.measureText(Jimp.FONT_SANS_16_WHITE, instructionText);
        card.print(Jimp.FONT_SANS_16_WHITE, (cardWidth - instructionWidth) / 2, cardHeight - 40, instructionText);

        return await card.getBufferAsync(Jimp.MIME_PNG);
    } catch (error) {
        console.error('Error generating wallpaper selection card:', error);
        return null;
    }
}

module.exports = {
    generateServerStatusImage,
    generateWallpaperSelectionCard
};