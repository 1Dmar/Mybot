const {
    InteractionType,
    ModalBuilder,
    TextInputBuilder,
    AttachmentBuilder,
    TextInputStyle,
    ActionRowBuilder,
    ButtonBuilder,
    ButtonStyle,
    EmbedBuilder,
    StringSelectMenuBuilder
} = require('discord.js');
const path = require('path');
const fs = require('fs');
const axios = require('axios');
const Jimp = require('jimp');
const Serverdb = require('../Models/Server');
const Langs = require("../Models/Langs");
const Server = require('../Models/User');
const StatusBar = require('../Models/StatusBar');
const BlackList = require("../Models/BlackList");

// Custom emojis
const EMOJIS = {
    BEDROCK: '<:Bedrock:1410147921676075038>',
    OFFLINE: '<:Offline:1410178629098278922>',
    ONLINE: '<:Online:1410178650070061096>',
    PLAYER: '<:Player:1410147631308603494>',
    INFORMATION: '<:Information:1410147645883678763>',
    ACHIEVEMENT: '<:Achievement:1410147661008605224>',
    CHECK: '<:Check:1410147529630289960>',
    JAVA: '<:Java:1410147547363934300>',
    WARNING: '<:Warning:1410147601281581118>',
    BLOCK: '<:Block:1410147617056362558>'
};

// Translation file path
const tsPath = path.join(__dirname, "..", "public", "json", "translations.json");
let translations = {};

try {
    if (fs.existsSync(tsPath)) {
        translations = JSON.parse(fs.readFileSync(tsPath, 'utf8'));
    }
} catch (error) {
    console.error('Error loading translations:', error);
}

// Fast-loading wallpapers
const WALLPAPERS = [
    "https://wallpapercave.com/wp/wp10819450.jpg",
    "https://static1.srcdn.com/wordpress/wp-content/uploads/2022/05/Minecraft-Shader-Pine-Forest.jpg",
    "https://resourcepack.net/fl/images/2022/11/RedHat-Shaders-for-minecraft-5.jpg",
    "https://i.ibb.co/KpWg3FHw/687d56199156581-664cf6f062769.png",
    "https://i.ibb.co/qLWGYkdL/c19988205236151-Y3-Jvc-Cwx-Mz-Ez-LDEw-Mjcs-Nj-I0-LDA.png"
];

// Helper function for safe HTTP requests
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

// Function to get translated message
async function getTranslatedMessage(guildId, messageKey) {
    try {
        if (!guildId) return translations['en']?.[messageKey] || messageKey;
        const userLang = await Langs.findOne({ guildId });
        const language = userLang ? userLang.language : 'en';
        return translations[language]?.[messageKey] || translations['en']?.[messageKey] || messageKey;
    } catch (error) {
        return translations['en']?.[messageKey] || messageKey;
    }
}

module.exports = {
    name: 'interactionCreate',
    async execute(interaction) {
        const client = interaction.client;

        try {
            // 1. Handle Slash Commands
            if (interaction.isChatInputCommand()) {
                await interaction.deferReply({ ephemeral: true }).catch(() => {});
                const command = client.scommands.get(interaction.commandName);
                
                if (!command) {
                    return await interaction.reply({ 
                        content: `${EMOJIS.WARNING} This command is not available.`, 
                        ephemeral: true 
                    });
                }

                try {
                    await command.run(client, interaction);
                    // If the command ran successfully, we need to edit the deferred reply.
                    // If the command already replied/followed up, this will be ignored.
                    if (!interaction.replied && !interaction.deferred) {
                        // This should not happen if deferReply is called, but as a fallback
                        await interaction.editReply({ content: `${EMOJIS.CHECK} Command executed successfully.`, ephemeral: true }).catch(() => {});
                    }
                } catch (error) {
                    console.error(`Error executing ${interaction.commandName}:`, error);
                    const errorMsg = { content: `${EMOJIS.WARNING} There was an error while executing this command!`, ephemeral: true };
                    if (interaction.deferred) {
                        await interaction.editReply(errorMsg);
                    } else if (interaction.replied) {
                        await interaction.followUp(errorMsg);
                    } else {
                        await interaction.reply(errorMsg);
                    }
                }
                return;
            }

            // 2. Handle String Select Menus
            if (interaction.isStringSelectMenu()) {
                if (interaction.customId === 'serverType') {
                    const serverType = interaction.values[0];
                    client.tempData = client.tempData || {};
                    client.tempData[interaction.user.id] = { serverType, step: 'serverTypeSelected' };
                    
                    const modal = new ModalBuilder()
                        .setCustomId('serverModal')
                        .setTitle("Server Information");

                    const rows = [
                        new ActionRowBuilder().addComponents(
                            new TextInputBuilder().setCustomId('serverName').setLabel("Server Name").setStyle(TextInputStyle.Short)
                        )
                    ];

                    if (serverType === 'java' || serverType === 'custom') {
                        rows.push(new ActionRowBuilder().addComponents(
                            new TextInputBuilder().setCustomId('javaIP').setLabel("Java Server IP").setStyle(TextInputStyle.Short).setRequired(serverType === 'java')
                        ));
                        rows.push(new ActionRowBuilder().addComponents(
                            new TextInputBuilder().setCustomId('javaPort').setLabel("Java Server Port").setStyle(TextInputStyle.Short).setPlaceholder('25565').setRequired(false)
                        ));
                    }
                    
                    if (serverType === 'bedrock' || serverType === 'custom') {
                        rows.push(new ActionRowBuilder().addComponents(
                            new TextInputBuilder().setCustomId('bedrockIP').setLabel("Bedrock Server IP").setStyle(TextInputStyle.Short).setRequired(serverType === 'bedrock')
                        ));
                        rows.push(new ActionRowBuilder().addComponents(
                            new TextInputBuilder().setCustomId('bedrockPort').setLabel("Bedrock Server Port").setStyle(TextInputStyle.Short).setPlaceholder('19132').setRequired(false)
                        ));
                    }

                    modal.addComponents(rows.slice(0, 5));
                    await interaction.showModal(modal);
                }
            }

            // 3. Handle Modal Submits
            if (interaction.isModalSubmit() && interaction.customId === 'serverModal') {
                await interaction.deferReply({ ephemeral: true });
                const serverType = client.tempData?.[interaction.user.id]?.serverType;
                if (!serverType) return interaction.editReply("Session expired. Please try again.");

                const serverData = {
                    serverId: interaction.guild.id,
                    serverName: interaction.fields.getTextInputValue('serverName'),
                    serverType: serverType,
                    javaIP: interaction.fields.fields.has('javaIP') ? interaction.fields.getTextInputValue('javaIP') : null,
                    javaPort: interaction.fields.fields.has('javaPort') ? (parseInt(interaction.fields.getTextInputValue('javaPort')) || 25565) : 25565,
                    bedrockIP: interaction.fields.fields.has('bedrockIP') ? interaction.fields.getTextInputValue('bedrockIP') : null,
                    bedrockPort: interaction.fields.fields.has('bedrockPort') ? (parseInt(interaction.fields.getTextInputValue('bedrockPort')) || 19132) : 19132,
                };

                await Serverdb.findOneAndUpdate({ serverId: serverData.serverId }, serverData, { upsert: true });
                await interaction.editReply(`${EMOJIS.CHECK} Server information saved successfully!`);
            }

        } catch (error) {
            console.error('Interaction Error:', error);
            const errorMsg = { content: `${EMOJIS.WARNING} An error occurred while processing your request.`, ephemeral: true };
            if (interaction.replied || interaction.deferred) {
                await interaction.followUp(errorMsg).catch(() => {});
            } else {
                await interaction.reply(errorMsg).catch(() => {});
            }
        }
    }
};
