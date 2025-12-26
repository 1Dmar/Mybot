const { Collection, AttachmentBuilder, EmbedBuilder, ActionRowBuilder, AuditLogEvent, WebhookClient, ChannelType, ButtonBuilder, ButtonStyle, PermissionsBitField } = require("discord.js");
const { PREFIX } = require("../settings/config");
const User = require("../Models/User");
const ServerInfo = require("../Models/Server");
const Servermembership = require("../Models/User");
const WelcomeChannel = require("../Models/WelcomeChannel");
const BlackList = require("../Models/BlackList");
const AutoResponder = require("../Models/AutoResponder");
const Log = require('../Models/Log');
const fs = require('fs');
const path = require('path');
const axios = require("axios");

// Helper function to decode hex strings
const decodeList = (hexArr) => hexArr.map(hex => Buffer.from(hex, 'hex').toString());

// Consolidated logic for all messageCreate events
async function handleMessageCreate(message) {
    const client = message.client;
    if (message.author.bot || !message.guild) return;

    // --- PREFIX COMMAND HANDLER ---
    if (message.content.startsWith(PREFIX)) {
        await handlePrefixCommands(client, message);
        return; // Stop processing after a command
    }

    // --- "mc" MINECRAFT SERVER STATUS CHECKER ---
    if (/^mc\b/i.test(message.content)) {
        await handleMinecraftStatus(client, message);
        return;
    }

    // --- AUTO-RESPONDER ---
    await handleAutoResponder(client, message);


    // --- OWNER-ONLY COMMANDS ---
    if (message.author.id === "804999528129363998") {
        if (message.content.startsWith("getstarted")) {
            await handleGetStarted(client, message);
        } else if (message.content.startsWith("getrules")) {
            await handleGetRules(client, message);
        } else if (message.content.startsWith("rules1")) {
             await handleRules1(client, message);
        }
    }
     // --- WELCOMER SETUP COMMAND ---
    if (message.content.startsWith('!set-welcomer') && message.member.permissions.has(PermissionsBitField.Flags.Administrator)) {
        await handleSetWelcomer(client, message);
    }

    // --- PRESENCE CHECK COMMAND ---
    if (message.content === '!presence' && message.member.permissions.has(PermissionsBitField.Flags.Administrator)) {
        await handlePresence(client, message);
    }
}


// --- Handler Functions ---

async function handlePrefixCommands(client, message) {
    let prefix = PREFIX;
    if (!message.content.startsWith(prefix)) return;

    let args = message.content.slice(prefix.length).trim().split(/ +/);
    let cmd = args.shift()?.toLowerCase();
    const command = client.mcommands.get(cmd);
    if (!command) return;

    let serverdb = client.userSettings.get(message.guild.id);
    let serverdbbl = client.userSettings.get(message.guild.id + "_bl");

    try {
        if (!serverdb) {
            const findUser = await User.findOne({ Id: message.guild.id });
            serverdb = findUser ? findUser : await User.create({ Id: message.guild.id });
            client.userSettings.set(message.guild.id, serverdb);
        }

        if (!serverdbbl) {
            const findBlackList = await BlackList.findOne({ guildIds: message.guild.id });
            if (findBlackList) {
                client.userSettings.set(message.guild.id + "_bl", findBlackList);
                serverdbbl = findBlackList;
            }
        }

        if (serverdbbl && serverdbbl.isBlacklisted === 'true') {
            const replyMessage = await message.reply({
                content: `> \`${message.guild.name}\`<:Block:1410147617056362558> Server has been Blacklisted from ProMcBot`,
            });
            setTimeout(() => replyMessage.delete().catch(console.error), 5000);
            return;
        }

        if (command.userPermissions && !message.member.permissions.has(command.userPermissions)) {
            return message.reply({ content: `<:Warning:1410147601281581118> you don't have enough permissions !!` });
        }

        if (command.botPermissions && !message.guild.members.me.permissions.has(command.botPermissions)) {
            return message.reply({ content: `<:Warning:1410147601281581118> I don't have enough permissions !!` });
        }

        const cooldownTime = cooldown(message, command);
        if (cooldownTime) {
            return message.reply({
                content: `<:Warning:1410147601281581118> You are On Cooldown , wait \`${cooldownTime.toFixed()}\` Seconds`,
            });
        }

        if (command.membership && serverdb && !serverdb.ismembership) {
            const replyMessage = await message.reply({
                content: `> \`${message.guild.name}\`<:Warning:1410147601281581118> Server is Not a MemberShip Server`,
            });
            setTimeout(() => replyMessage.delete().catch(console.error), 5000);
            return;
        }

        command.run(client, message, args, prefix);

    } catch (error) {
        console.error("Error handling command:", error);
        message.reply("<:Warning:1410147601281581118> An error occurred while processing the command, You can contact technical support");
    }
}

function cooldown(message, cmd) {
    if (!message || !cmd) return;
    let { client, member } = message;
    if (!client.cooldowns.has(cmd.name)) {
        client.cooldowns.set(cmd.name, new Collection());
    }
    const now = Date.now();
    const timestamps = client.cooldowns.get(cmd.name);
    const cooldownAmount = cmd.cooldown * 1000;
    if (timestamps.has(member.id)) {
        const expirationTime = timestamps.get(member.id) + cooldownAmount;
        if (now < expirationTime) {
            const timeLeft = (expirationTime - now) / 1000;
            return timeLeft;
        }
    }
    timestamps.set(member.id, now);
    setTimeout(() => timestamps.delete(member.id), cooldownAmount);
    return false;
}

async function handleMinecraftStatus(client, message) {
    const serverId = message.guild.id;
    const serverInfo = await ServerInfo.findOne({ serverId });
    if (!serverInfo) return;

    const membershipInfo = await Servermembership.findOne({ Id: serverId });
    if (serverInfo.serverType === "custom" && !membershipInfo?.ismembership) {
        const membershipMessage = await message.channel.send('<:Warning:1410147601281581118> Membership not active for this server. Please contact the server owner.');
        setTimeout(() => membershipMessage.delete().catch(console.error), 10000);
        return;
    }

    try {
        let javaServerData = { online: false };
        if (["java", "custom"].includes(serverInfo.serverType)) {
            try {
                const response = await axios.get(`https://api.mcsrvstat.us/3/${serverInfo.javaIP}:${serverInfo.javaPort || 25565}`);
                javaServerData = response.data;
            } catch (e) { /* ignore */ }
        }

        let bedrockServerData = { online: false };
        if (["bedrock", "custom"].includes(serverInfo.serverType)) {
            try {
                const response = await axios.get(`https://api.mcsrvstat.us/bedrock/3/${serverInfo.bedrockIP}:${serverInfo.bedrockPort || 19132}`);
                bedrockServerData = response.data;
            } catch (e) { /* ignore */ }
        }

        const isOnline = javaServerData.online || bedrockServerData.online;
        const icon = isOnline ? `https://eu.mc-api.net/v3/server/favicon/${javaServerData.online ? serverInfo.javaIP : serverInfo.bedrockIP}` : 'https://api.mcstatus.io/v2/icon/dfgfdg.xyz';

        const embed = new EmbedBuilder()
            .setColor(isOnline ? "#90EE90" : "#FF7F7F")
            .setThumbnail(icon)
            .setTitle(`${isOnline ? "<:Online:1410178650070061096> Online" : "<:Offline:1410178629098278922> Offline"} ${serverInfo.serverName || "Minecraft"} Server`)
            .setTimestamp()
            .setFooter({ text: `© ${new Date().getFullYear()} - ProMcBot - All Rights Reserved.` });

        const addFields = (type, data, ip, port) => {
            const emoji = type === "Java" ? "<:Java:1410147547363934300>" : "<:Bedrock:1410147921676075038>";
            embed.addFields(
                { name: `<:promc_up:1243498882952855604> ${emoji} ${type} IP`, value: `**${ip}:${port || 'Default'}**`, inline: false },
                {
                    name: `<:promc_up:1243498882952855604> ${emoji} ${type} Informations`,
                    value: `**<:promc_down:1243498861041942538> ${data.online ? "<:Online:1410178650070061096> Online" : "<:Offline:1410178629098278922> Offline"}\n<:promc_down:1243498861041942538> <:Player:1410147631308603494> ${data.players?.online || "0"} / ${data.players?.max || "0"} Players\n<:promc_down:1243498861041942538> <:Information:1410147645883678763> ${data.version || "N/A"}**`,
                    inline: false,
                }
            );
        };

        if (serverInfo.serverType === "java") addFields("Java", javaServerData, serverInfo.javaIP, serverInfo.javaPort);
        if (serverInfo.serverType === "bedrock") addFields("Bedrock", bedrockServerData, serverInfo.bedrockIP, serverInfo.bedrockPort);
        if (serverInfo.serverType === "custom") {
            if(javaServerData.online) addFields("Java", javaServerData, serverInfo.javaIP, serverInfo.javaPort);
            if(bedrockServerData.online) addFields("Bedrock", bedrockServerData, serverInfo.bedrockIP, serverInfo.bedrockPort);
        }

        message.reply({ embeds: [embed] });

    } catch (error) {
        console.error("Error fetching Minecraft server information:", error);
        message.reply({ content: "An error occurred while fetching server status." });
    }
}

async function handleAutoResponder(client, message) {
    try {
        const autoResponders = await AutoResponder.find({ guildId: message.guild.id });
        if (autoResponders.length === 0) return;

        for (const autoResponder of autoResponders) {
            if (message.content.includes(autoResponder.trigger)) {
                const memberRoles = message.member.roles.cache.map(role => role.id);
                const hasAllowedRole = autoResponder.allowedRoles.length === 0 || autoResponder.allowedRoles.some(role => memberRoles.includes(role));
                const hasDisallowedRole = autoResponder.disallowedRoles.length > 0 && autoResponder.disallowedRoles.some(role => memberRoles.includes(role));

                if (hasAllowedRole && !hasDisallowedRole) {
                    if (autoResponder.replyType === 'reply') {
                        await message.reply(autoResponder.response);
                    } else {
                        await message.channel.send(autoResponder.response);
                    }
                    return;
                }
            }
        }
    } catch (error) {
        console.error('Error in Auto-Responder:', error);
    }
}

async function handleGetStarted(client, message) {
    const args = message.content.split(" ");
    const channelId = args[1] || message.channel.id;
    const channel = message.guild.channels.cache.get(channelId);
    if (!channel) return message.reply("Channel not found.");

    const embeds = [
        new EmbedBuilder().setColor("#ee3c37").setTitle("ProMcBot New Version").setDescription("**<:dev:1252930632976175136> The ProMcBot team welcomes you and thanks you for trying the new version of the bot.\n<:promc_down:1243498861041942538> Arrange these steps properly to run the bot on your server without any issues.**").setThumbnail(client.user.displayAvatarURL()),
        new EmbedBuilder().setColor("#ee3c37").setTitle("Step #1").setDescription("Invite the bot to your Discord server using [This Link](https://discord.com/oauth2/authorize?client_id=1220005260857311294&permissions=537250992&integration_type=0&scope=bot+applications.commands)."),
        new EmbedBuilder().setColor("#ee3c37").setTitle("Step #2").setDescription("You can use </setup_server:1252742843206733928> command or type: \`/setup_server\` in your Discord server to connect the bot to your Minecraft server, and then you can choose either Java, Bedrock, or Custom for MemberShip Premium bot only!."),
        new EmbedBuilder().setColor("#ee3c37").setTitle("Step #3").setDescription("You can make changes to the language of your Discord server and your Minecraft server very soon!.").setFooter({ text: "© 2024 ProMcBot - All Rights Reserved." })
    ];

    message.delete().catch(console.error);
    channel.send({ embeds });
}

async function handleGetRules(client, message) {
     const args = message.content.split(" ");
    const channelId = args[1] || message.channel.id;

    const channel = message.guild.channels.cache.get(channelId);
    if (!channel) {
        return message.reply("Channel not found.");
    }

    const rules = [
        "Do not invite the bot to servers that violate Discord's rules and guidelines.",
        "We are not responsible for any misuse of the bot.",
        "It is not allowed for anyone to use vulnerabilities to extend the duration of Premium Membership except through the method permitted by us.",
        "You can inquire about anything related to the bot only through the bot's [Our ProMcBot Support](https://discord.gg/6FjFYStz5a).",
        "### ProMcBot Support Rules",
        "Not to disturb the technical support team for ProMcBot.",
        "Avoid repeating suggestions.",
        "Do not mention (links, Discord server names, names of competing bots, adult content, etc).",
        "Respecting others, whether they are regular members or part of the technical support team for the bot.",
    ];

    const embeds = rules.map((rule, index) => new EmbedBuilder().setColor("#ee3c37").setTitle(`Rule #${index + 1}`).setDescription(rule));

    const initialEmbed = new EmbedBuilder()
        .setColor("#ee3c37")
        .setTitle("ProMcBot Rules")
        .setDescription("**<:dev:1252930632976175136> Please follow all the rules to avoid any authorized penalties from the bot and the support team.**")
        .setThumbnail(client.user.displayAvatarURL());

    embeds.unshift(initialEmbed);
    message.delete().catch(console.error);

    for (let i = 0; i < embeds.length; i += 10) {
        const chunk = embeds.slice(i, i + 10);
        await channel.send({ embeds: chunk });
    }
}

async function handleRules1(client, message) {
    await message.delete().catch(console.error);
    await message.channel.send(
      `## **Please take a moment to review our guidelines :book:**\n` +
      `**1. Bot Invitation** Do not invite the bot to servers that violate Discord's rules.\n` +
      `**2. Misuse Disclaimer** We are not responsible for any misuse of the bot.\n` +
      `**3. Premium Abuse** Do not exploit vulnerabilities to extend Premium membership.\n` +
      `**4. Support Channel** Use only the official support channels for inquiries.\n` +
      `**5. Respect Others** Always treat staff and members with courtesy and respect.\n\n` + `**:link: We follow Discord’s ToS and Community Guidelines:**\n\n- [Terms of Service](https://discord.com/terms)  \n- [Community Guidelines](https://discord.com/guidelines)\n\n:warning: For help, please head to the support channels.`
    );
    await message.channel.send(`## **⚠️ Legal Warning: Intellectual Property Rights**\n\n` + `Copying or replicating the bot, its commands, support system, or any of its designs in any form is strictly prohibited. Any violation of these rights may result in legal action under applicable copyright and intellectual property laws.`);
}

async function handleSetWelcomer(client, message) {
    const args = message.content.split(' ');
    if (args[1]) {
        const channelId = args[1].replace('<#', '').replace('>', '');
        const channel = message.guild.channels.cache.get(channelId);
        if (channel) {
            await WelcomeChannel.findOneAndUpdate(
                { guildId: message.guild.id },
                { channelId: channelId },
                { upsert: true }
            );
            message.channel.send(`Welcome channel set to ${channel}`);
        } else {
            message.channel.send('Invalid channel.');
        }
    } else {
        message.channel.send('Please mention a channel.');
    }
}

async function handlePresence(client, message) {
    const presence = message.member.presence;
    if (presence) {
        const activities = presence.activities.map(activity => activity.name).join(', ') || 'none';
        message.channel.send(`${message.member.user.tag} is currently ${presence.status} and doing: ${activities}`);
    } else {
        message.channel.send(`${message.member.user.tag} has no presence information.`);
    }
}


module.exports = {
    name: 'messageCreate',
    async execute(message) {
        // Log and handle potential errors in the main handler
        try {
            await handleMessageCreate(message);
        } catch (error) {
            console.error('Unhandled error in messageCreate event:', error);
        }
    },
};
