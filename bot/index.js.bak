require('dotenv').config();
const { Client, Partials, Collection, GatewayIntentBits, WebhookClient, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, ChannelType } = require("discord.js");
const { MONGO_URL, TOKEN } = require("./settings/config");
const mongoose = require("mongoose");
const Langs = require("./Models/Langs");
const { scheduleCronJobs } = require('./utils/cronManager');
const Server = require('./Models/Server');
const StatusBar = require('./Models/StatusBar');
const path = require('path');

const client = new Client({
    intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMessages,
        GatewayIntentBits.MessageContent,
        GatewayIntentBits.GuildMembers,
        GatewayIntentBits.GuildVoiceStates,
        GatewayIntentBits.GuildPresences
    ],
    partials: [
        Partials.Channel,
        Partials.Message,
        Partials.User,
        Partials.GuildMember,
    ],
    failIfNotExists: false,
    allowedMentions: {
        parse: ['users', 'roles'],
        repliedUser: false,
    },
});

// Database Connection
mongoose.set("strictQuery", true);
mongoose.connect(MONGO_URL, {
    useNewUrlParser: true,
    useUnifiedTopology: true,
}).then(() => {
    console.log(`> MongoDB Connected !!`);
}).catch(error => {
    console.error('Error connecting to MongoDB:', error.message);
});

// Collections & Global Variables
client.scommands = new Collection();
client.mcommands = new Collection();
client.cooldowns = new Collection();
client.userSettings = new Collection();
client.tempData = {};
client.events = 0;

// Handlers
const handlers = [
    "event_handler",
    "slash_handler",
    "cmd_handler",
    "membership_handler",
    "blacklist_handler",
    "bump_handler"
];

handlers.forEach((handler) => {
    try {
        require(`./handlers/${handler}`)(client);
    } catch (err) {
        console.error(`❌ Error loading handler ${handler}:`, err);
    }
});

// Error Handling
const webhookClient = new WebhookClient({ url: "https://discord.com/api/webhooks/1273739871126683679/ik8_E019Evm0NeTcZHUiaHIZgYPlynhP3tPpQ51go-OZyIx-kiaZ8GcgspjVXX3tqK5A" });

process.on('unhandledRejection', (reason, promise) => {
    console.error('Unhandled Rejection at:', promise, 'reason:', reason);
    webhookClient.send({
        content: `**Unhandled Rejection**\n\`\`\`${reason}\`\`\``
    }).catch(() => {});
});

process.on('uncaughtException', (err, origin) => {
    console.error('Uncaught Exception:', err, 'at:', origin);
    webhookClient.send({
        content: `**Uncaught Exception**\n\`\`\`${err}\`\`\``
    }).catch(() => {});
});

client.on('error', (error) => {
    console.error('Discord Client Error:', error);
});

// Ready Event
client.once('ready', async () => {
    console.log(`✅ Logged in as ${client.user.tag}`);
    await scheduleCronJobs(client);
});

// Login
if (TOKEN) {
    client.login(TOKEN).catch(err => {
        console.error("❌ Login Failed:", err);
    });
} else {
    console.error("❌ No Token Provided in config/env");
}

module.exports = client;
