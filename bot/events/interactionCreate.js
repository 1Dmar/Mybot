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
const Serverdb = require('../Models/Server');
const Langs = require("../Models/Langs");
const { checkServerStatus } = require('../utils/serverUtils');
const { generateServerStatusImage, generateWallpaperSelectionCard } = require('../utils/imageGenerator');

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
    translations = JSON.parse(fs.readFileSync(tsPath, 'utf8'));
} catch (error) {
    console.error('Error loading translations:', error);
}

// Fast-loading wallpapers (optimized for speed)
const WALLPAPERS = [
    "https://wallpapercave.com/wp/wp10819450.jpg",
    "https://static1.srcdn.com/wordpress/wp-content/uploads/2022/05/Minecraft-Shader-Pine-Forest.jpg",
    "https://resourcepack.net/fl/images/2022/11/RedHat-Shaders-for-minecraft-5.jpg",
    "https://i.ibb.co/KpWg3FHw/687d56199156581-664cf6f062769.png",
    "https://i.ibb.co/qLWGYkdL/c19988205236151-Y3-Jvc-Cwx-Mz-Ez-LDEw-Mjcs-Nj-I0-LDA.png"
];

// Function to get translated message with proper fallbacks
async function getTranslatedMessage(guildId, messageKey) {
    try {
        // Default to English if no guild ID provided
        if (!guildId) return translations['en']?.[messageKey] || messageKey;

        const userLang = await Langs.findOne({ guildId });
        const language = userLang ? userLang.language : 'en';

        // Return translation if available, otherwise English, otherwise the key itself
        return translations[language]?.[messageKey] ||
               translations['en']?.[messageKey] ||
               messageKey;
    } catch (error) {
        console.error('Error getting translation:', error);
        return translations['en']?.[messageKey] || messageKey;
    }
}

module.exports = {
    name: 'interactionCreate',
    async execute(interaction) {
        const client = interaction.client;
        try {
            if (interaction.isChatInputCommand() && interaction.commandName === 'setup') {
                try {
                    await interaction.deferReply({ ephemeral: true });

                    const introMessage = await getTranslatedMessage(interaction.guild?.id, "SELECT_SERVER_TYPE") || "Select your server type:";

                    const serverTypeSelect = new ActionRowBuilder()
                        .addComponents(
                            new StringSelectMenuBuilder()
                                .setCustomId('serverType')
                                .setPlaceholder(introMessage)
                                .addOptions([
                                    {
                                        label: 'Java Edition',
                                        description: 'Minecraft Java Edition server',
                                        value: 'java',
                                        emoji: '1410147547363934300'
                                    },
                                    {
                                        label: 'Bedrock Edition',
                                        description: 'Minecraft Bedrock Edition server',
                                        value: 'bedrock',
                                        emoji: '1410147921676075038'
                                    },
                                    {
                                        label: 'Custom Setup',
                                        description: 'Both Java and Bedrock servers',
                                        value: 'custom',
                                        emoji: '1410147645883678763'
                                    }
                                ])
                        );

                    await interaction.editReply({
                        content: `${EMOJIS.INFORMATION} ${introMessage}`,
                        components: [serverTypeSelect],
                        ephemeral: true
                    });
                } catch (error) {
                    console.error('Error in setup command:', error);
                    await interaction.editReply({
                        content: `${EMOJIS.WARNING} ${await getTranslatedMessage(interaction.guild?.id, "SETUP_ERROR") || "An error occurred while setting up the server."}`,
                        ephemeral: true
                    });
                }
                return;
            }

            if (interaction.isChatInputCommand()) {
                const command = client.scommands.get(interaction.commandName);

                if (!command) {
                    console.error(`No command matching ${interaction.commandName} was found.`);
                    return await interaction.reply({
                        content: `${EMOJIS.WARNING} ${await getTranslatedMessage(interaction.guild?.id, "COMMAND_NOT_AVAILABLE") || "This command is not available."}`,
                        ephemeral: true
                    });
                }

                try {
                    if (command.deferReply) {
                        await interaction.deferReply({ ephemeral: command.ephemeral || false });
                    }

                    console.log(`Executing command: ${interaction.commandName}`);
                    await command.run(client, interaction);
                } catch (error) {
                    console.error(`Error executing ${interaction.commandName}:`, error);

                    const errorEmbed = new EmbedBuilder()
                        .setColor(0xFF0000)
                        .setTitle(await getTranslatedMessage(interaction.guild?.id, "COMMAND_ERROR") || "Command Error")
                        .setDescription(await getTranslatedMessage(interaction.guild?.id, "COMMAND_EXECUTION_ERROR") || "There was an error while executing this command!")
                        .setTimestamp();

                    if (interaction.replied || interaction.deferred) {
                        await interaction.followUp({
                            embeds: [errorEmbed],
                            ephemeral: true
                        });
                    } else {
                        await interaction.reply({
                            embeds: [errorEmbed],
                            ephemeral: true
                        });
                    }
                }
                return;
            }

            if (interaction.isStringSelectMenu()) {
                if (interaction.customId === 'serverType') {
                    const serverType = interaction.values[0];
                    client.tempData = client.tempData || {};
                    client.tempData[interaction.user.id] = {
                        serverType: serverType,
                        step: 'serverTypeSelected'
                    };

                    const modal = new ModalBuilder()
                        .setCustomId('serverModal')
                        .setTitle(await getTranslatedMessage(interaction.guild?.id, "SERVER_INFORMATION") || "Server Information");

                    if (serverType === 'java') {
                        modal.addComponents(
                            new ActionRowBuilder().addComponents(
                                new TextInputBuilder()
                                    .setCustomId('serverName')
                                    .setLabel(await getTranslatedMessage(interaction.guild?.id, "SERVER_NAME") || "Server Name")
                                    .setStyle(TextInputStyle.Short)
                            ),
                            new ActionRowBuilder().addComponents(
                                new TextInputBuilder()
                                    .setCustomId('javaIP')
                                    .setLabel(await getTranslatedMessage(interaction.guild?.id, "JAVA_SERVER_IP") || "Java Server IP")
                                    .setStyle(TextInputStyle.Short)
                            ),
                            new ActionRowBuilder().addComponents(
                                new TextInputBuilder()
                                    .setCustomId('javaPort')
                                    .setLabel(await getTranslatedMessage(interaction.guild?.id, "JAVA_SERVER_PORT") || "Java Server Port")
                                    .setStyle(TextInputStyle.Short)
                                    .setPlaceholder('25565')
                                    .setRequired(false)
                            )
                        );
                    } else if (serverType === 'bedrock') {
                        modal.addComponents(
                            new ActionRowBuilder().addComponents(
                                new TextInputBuilder()
                                    .setCustomId('serverName')
                                    .setLabel(await getTranslatedMessage(interaction.guild?.id, "SERVER_NAME") || "Server Name")
                                    .setStyle(TextInputStyle.Short)
                            ),
                            new ActionRowBuilder().addComponents(
                                new TextInputBuilder()
                                    .setCustomId('bedrockIP')
                                    .setLabel(await getTranslatedMessage(interaction.guild?.id, "BEDROCK_SERVER_IP") || "Bedrock Server IP")
                                    .setStyle(TextInputStyle.Short)
                            ),
                            new ActionRowBuilder().addComponents(
                                new TextInputBuilder()
                                    .setCustomId('bedrockPort')
                                    .setLabel(await getTranslatedMessage(interaction.guild?.id, "BEDROCK_SERVER_PORT") || "Bedrock Server Port")
                                    .setStyle(TextInputStyle.Short)
                                    .setPlaceholder('19132')
                                    .setRequired(false)
                            )
                        );
                    } else if (serverType === 'custom') {
                        modal.addComponents(
                            new ActionRowBuilder().addComponents(
                                new TextInputBuilder()
                                    .setCustomId('serverName')
                                    .setLabel(await getTranslatedMessage(interaction.guild?.id, "SERVER_NAME") || "Server Name")
                                    .setStyle(TextInputStyle.Short)
                            ),
                            new ActionRowBuilder().addComponents(
                                new TextInputBuilder()
                                    .setCustomId('javaIP')
                                    .setLabel(`${await getTranslatedMessage(interaction.guild?.id, "JAVA_SERVER_IP")} (Optional)` || "Java Server IP (Optional)")
                                    .setStyle(TextInputStyle.Short)
                                    .setRequired(false)
                            ),
                            new ActionRowBuilder().addComponents(
                                new TextInputBuilder()
                                    .setCustomId('javaPort')
                                    .setLabel(`${await getTranslatedMessage(interaction.guild?.id, "JAVA_SERVER_PORT")} (Optional)` || "Java Server Port (Optional)")
                                    .setStyle(TextInputStyle.Short)
                                    .setPlaceholder('25565')
                                    .setRequired(false)
                            ),
                            new ActionRowBuilder().addComponents(
                                new TextInputBuilder()
                                    .setCustomId('bedrockIP')
                                    .setLabel(`${await getTranslatedMessage(interaction.guild?.id, "BEDROCK_SERVER_IP")} (Optional)` || "Bedrock Server IP (Optional)")
                                    .setStyle(TextInputStyle.Short)
                                    .setRequired(false)
                            ),
                            new ActionRowBuilder().addComponents(
                                new TextInputBuilder()
                                    .setCustomId('bedrockPort')
                                    .setLabel(`${await getTranslatedMessage(interaction.guild?.id, "BEDROCK_SERVER_PORT")} (Optional)` || "Bedrock Server Port (Optional)")
                                    .setStyle(TextInputStyle.Short)
                                    .setPlaceholder('19132')
                                    .setRequired(false)
                            )
                        );
                    }

                    await interaction.showModal(modal);
                } else if (interaction.customId === 'wallpaperSelect') {
                    await interaction.deferReply({ ephemeral: true });

                    const selectedIndex = parseInt(interaction.values[0].replace('wallpaper_', ''));
                    const selectedWallpaper = WALLPAPERS[selectedIndex];

                    if (!selectedWallpaper) {
                        const errorMessage = await getTranslatedMessage(interaction.guild?.id, "INVALID_WALLPAPER") || "Invalid wallpaper selection.";
                        return interaction.editReply({
                            content: `${EMOJIS.WARNING} ${errorMessage}`,
                            ephemeral: true
                        });
                    }
                    client.tempData[interaction.user.id].wallpaper = selectedWallpaper;

                    const previewBuffer = await generateServerStatusImage(
                        client.tempData[interaction.user.id].serverData,
                        selectedWallpaper,
                        interaction,
                        true // isPreview
                    );

                    const attachment = new AttachmentBuilder(previewBuffer, { name: `wallpaper_preview_${selectedIndex}.png` });

                    const confirmButton = new ButtonBuilder()
                        .setCustomId('confirmWallpaper')
                        .setLabel(await getTranslatedMessage(interaction.guild?.id, "CONFIRM_WALLPAPER") || "Use This Wallpaper")
                        .setStyle(ButtonStyle.Primary);

                    const chooseAnotherButton = new ButtonBuilder()
                        .setCustomId('chooseAnotherWallpaper')
                        .setLabel(await getTranslatedMessage(interaction.guild?.id, "CHOOSE_ANOTHER") || "Choose Another")
                        .setStyle(ButtonStyle.Secondary);

                    const buttonRow = new ActionRowBuilder().addComponents(confirmButton, chooseAnotherButton);

                    const previewMessage = await getTranslatedMessage(interaction.guild?.id, "WALLPAPER_PREVIEW") || "Preview of your selected wallpaper:";
                    await interaction.editReply({
                        content: `${EMOJIS.INFORMATION} ${previewMessage}`,
                        files: [attachment],
                        components: [buttonRow],
                        ephemeral: true
                    });
                }
            } else if (interaction.isModalSubmit() && interaction.customId === 'serverModal') {
                await interaction.deferReply({ ephemeral: true });

                const serverType = client.tempData[interaction.user.id].serverType;
                const serverId = interaction.guild.id;
                const serverName = interaction.fields.getTextInputValue('serverName') || 'Unknown';

                let javaIP = null;
                let javaPort = 25565;
                let bedrockIP = null;
                let bedrockPort = 19132;

                try {
                    if (serverType === 'java' || serverType === 'custom') {
                        javaIP = interaction.fields.getTextInputValue('javaIP') || null;
                        const javaPortValue = interaction.fields.getTextInputValue('javaPort');
                        if (javaPortValue) javaPort = javaPortValue;
                    }

                    if (serverType === 'bedrock' || serverType === 'custom') {
                        bedrockIP = interaction.fields.getTextInputValue('bedrockIP') || null;
                        const bedrockPortValue = interaction.fields.getTextInputValue('bedrockPort');
                        if (bedrockPortValue) bedrockPort = bedrockPortValue;
                    }
                } catch (error) {
                    console.error('Error getting field values:', error);
                    if (error.code === 'ModalSubmitInteractionFieldNotFound') {
                        console.log('Field not found, using default values');
                    } else {
                        throw error;
                    }
                }

                let finalServerType = serverType;
                if (serverType === 'custom') {
                    if (javaIP && !bedrockIP) finalServerType = 'java';
                    if (!javaIP && bedrockIP) finalServerType = 'bedrock';
                }

                const serverData = {
                    serverId,
                    serverName,
                    javaIP,
                    javaPort,
                    bedrockIP,
                    bedrockPort,
                    serverType: finalServerType
                };

                client.tempData[interaction.user.id] = {
                    ...client.tempData[interaction.user.id],
                    serverData: serverData,
                    step: 'serverDataEntered'
                };

                const selectionCard = await generateWallpaperSelectionCard(WALLPAPERS, interaction);

                if (selectionCard) {
                    const cardAttachment = new AttachmentBuilder(selectionCard, { name: 'wallpaper_selection.png' });

                    const wallpaperOptions = WALLPAPERS.map((url, index) => ({
                        label: `Wallpaper ${index + 1}`,
                        description: `Select wallpaper #${index + 1}`,
                        value: `wallpaper_${index}`
                    }));

                    const wallpaperSelect = new ActionRowBuilder()
                        .addComponents(
                            new StringSelectMenuBuilder()
                                .setCustomId('wallpaperSelect')
                                .setPlaceholder(await getTranslatedMessage(interaction.guild?.id, "SELECT_WALLPAPER") || 'Choose a wallpaper...')
                                .addOptions(wallpaperOptions.slice(0, 25))
                        );

                    await interaction.editReply({
                        content: `${EMOJIS.INFORMATION} ${await getTranslatedMessage(interaction.guild?.id, "SELECT_WALLPAPER_DESCRIPTION") || "Please select a wallpaper for your server status image:"}`,
                        files: [cardAttachment],
                        components: [wallpaperSelect],
                        ephemeral: true
                    });
                } else {
                    const wallpaperOptions = WALLPAPERS.map((url, index) => ({
                        label: `Wallpaper ${index + 1}`,
                        description: `Select wallpaper #${index + 1}`,
                        value: `wallpaper_${index}`
                    }));

                    const wallpaperSelect = new ActionRowBuilder()
                        .addComponents(
                            new StringSelectMenuBuilder()
                                .setCustomId('wallpaperSelect')
                                .setPlaceholder(await getTranslatedMessage(interaction.guild?.id, "SELECT_WALLPAPER") || 'Choose a wallpaper...')
                                .addOptions(wallpaperOptions.slice(0, 25))
                        );

                    await interaction.editReply({
                        content: `${EMOJIS.INFORMATION} ${await getTranslatedMessage(interaction.guild?.id, "SELECT_WALLPAPER_DESCRIPTION") || "Please select a wallpaper for your server status image:"}`,
                        components: [wallpaperSelect],
                        ephemeral: true
                    });
                }
            } else if (interaction.isButton()) {
                if (interaction.customId === 'confirmWallpaper') {
                    await interaction.deferReply({ ephemeral: true });

                    const serverData = client.tempData[interaction.user.id].serverData;
                    const wallpaper = client.tempData[interaction.user.id].wallpaper;

                    const imageBuffer = await generateServerStatusImage(serverData, wallpaper, interaction, false);
                    const attachment = new AttachmentBuilder(imageBuffer, {
                        name: `${serverData.serverName.replace(/[^a-zA-Z0-9]/g, '_')}_status.png`
                    });

                    const confirmButton = new ButtonBuilder()
                        .setCustomId('confirmServer')
                        .setLabel(await getTranslatedMessage(interaction.guild?.id, "CONFIRM") || "Confirm")
                        .setStyle(ButtonStyle.Primary);

                    const cancelButton = new ButtonBuilder()
                        .setCustomId('cancelServer')
                        .setLabel(await getTranslatedMessage(interaction.guild?.id, "CANCEL") || "Cancel")
                        .setStyle(ButtonStyle.Danger);

                    const buttonRow = new ActionRowBuilder().addComponents(confirmButton, cancelButton);

                    await interaction.editReply({
                        content: `${EMOJIS.INFORMATION} ${await getTranslatedMessage(interaction.guild?.id, "SERVER_STATUS_READY") || "Server status image ready!"}`,
                        files: [attachment],
                        components: [buttonRow],
                        ephemeral: true
                    });
                } else if (interaction.customId === 'chooseAnotherWallpaper') {
                    await interaction.deferReply({ ephemeral: true });

                    const selectionCard = await generateWallpaperSelectionCard(WALLPAPERS, interaction);

                    if (selectionCard) {
                        const cardAttachment = new AttachmentBuilder(selectionCard, { name: 'wallpaper_selection.png' });

                        const wallpaperOptions = WALLPAPERS.map((url, index) => ({
                            label: `Wallpaper ${index + 1}`,
                            description: `Select wallpaper #${index + 1}`,
                            value: `wallpaper_${index}`
                        }));

                        const wallpaperSelect = new ActionRowBuilder()
                            .addComponents(
                                new StringSelectMenuBuilder()
                                    .setCustomId('wallpaperSelect')
                                    .setPlaceholder(await getTranslatedMessage(interaction.guild?.id, "SELECT_WALLPAPER") || 'Choose a wallpaper...')
                                    .addOptions(wallpaperOptions.slice(0, 25))
                            );

                        await interaction.editReply({
                            content: `${EMOJIS.INFORMATION} ${await getTranslatedMessage(interaction.guild?.id, "SELECT_WALLPAPER_DESCRIPTION") || "Please select a wallpaper for your server status image:"}`,
                            files: [cardAttachment],
                            components: [wallpaperSelect],
                            ephemeral: true
                        });
                    } else {
                        const wallpaperOptions = WALLPAPERS.map((url, index) => ({
                            label: `Wallpaper ${index + 1}`,
                            description: `Select wallpaper #${index + 1}`,
                            value: `wallpaper_${index}`
                        }));

                        const wallpaperSelect = new ActionRowBuilder()
                            .addComponents(
                                new StringSelectMenuBuilder()
                                    .setCustomId('wallpaperSelect')
                                    .setPlaceholder(await getTranslatedMessage(interaction.guild?.id, "SELECT_WALLPAPER") || 'Choose a wallpaper...')
                                    .addOptions(wallpaperOptions.slice(0, 25))
                            );

                        await interaction.editReply({
                            content: `${EMOJIS.INFORMATION} ${await getTranslatedMessage(interaction.guild?.id, "SELECT_WALLPAPER_DESCRIPTION") || "Please select a wallpaper for your server status image:"}`,
                            components: [wallpaperSelect],
                            ephemeral: true
                        });
                    }
                } else if (interaction.customId === 'confirmServer') {
                    const serverData = client.tempData[interaction.user.id].serverData;

                    if (!serverData) {
                        return interaction.reply({
                            content: `${EMOJIS.WARNING} ${await getTranslatedMessage(interaction.guild?.id, "NO_SERVER_DATA") || "No server data found. Please start over."}`,
                            ephemeral: true
                        });
                    }

                    try {
                        const existingServer = await Serverdb.findOne({ serverId: serverData.serverId });

                        if (existingServer) {
                            await Serverdb.updateOne({ serverId: serverData.serverId }, serverData);
                        } else {
                            await Serverdb.create(serverData);
                        }

                        delete client.tempData[interaction.user.id];

                        await interaction.update({
                            components: [],
                            content: `${EMOJIS.CHECK} ${await getTranslatedMessage(interaction.guild?.id, "SERVER_SAVED_SUCCESS") || "Server information saved successfully!"}`
                        });
                    } catch (error) {
                        console.error('Error saving server:', error);
                        await interaction.reply({
                            content: `${EMOJIS.WARNING} ${await getTranslatedMessage(interaction.guild?.id, "SAVE_ERROR") || "Error saving server information."}`,
                            ephemeral: true
                        });
                    }
                } else if (interaction.customId === 'cancelServer') {
                    delete client.tempData[interaction.user.id];
                    await interaction.update({
                        components: [],
                        content: `${EMOJIS.WARNING} ${await getTranslatedMessage(interaction.guild?.id, "SETUP_CANCELLED") || "Setup cancelled."}`
                    });
                }
            }
        } catch (error) {
            console.error('Error handling interaction:', error);

            let errorMessage = await getTranslatedMessage(interaction.guild?.id, "PROCESSING_ERROR") || "An error occurred while processing your request.";

            if (error.code === 'ModalSubmitInteractionFieldNotFound') {
                errorMessage = await getTranslatedMessage(interaction.guild?.id, "FIELD_NOT_FOUND_ERROR") || "A required field was not found. Please try the setup again.";
            }

            if (interaction.replied || interaction.deferred) {
                await interaction.followUp({
                    content: `${EMOJIS.WARNING} ${errorMessage}`,
                    ephemeral: true
                });
            } else {
                await interaction.reply({
                    content: `${EMOJIS.WARNING} ${errorMessage}`,
                    ephemeral: true
                });
            }
        }
    }
}