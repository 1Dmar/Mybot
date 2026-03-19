/**
 * Unified Bot Initialization for Mybot
 */
require('dotenv').config();
const { Client, GatewayIntentBits, Partials, Collection } = require('discord.js');
const mongoose = require('mongoose');
const path = require('path');

// Initialize main bot client
const client = new Client({
    intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMessages,
        GatewayIntentBits.MessageContent,
        GatewayIntentBits.GuildMembers,
        GatewayIntentBits.GuildVoiceStates,
        GatewayIntentBits.GuildPresences,
        GatewayIntentBits.DirectMessages,
        GatewayIntentBits.GuildMessageReactions,
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

// Initialize secondary bot (ModMail)
const client1 = new Client({
    intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMessages,
        GatewayIntentBits.DirectMessages,
        GatewayIntentBits.MessageContent,
        GatewayIntentBits.GuildMessageReactions,
        GatewayIntentBits.GuildMembers
    ],
    partials: [Partials.Channel]
});

// Setup Collections for main bot
client.scommands = new Collection();
client.mcommands = new Collection();
client.cooldowns = new Collection();
client.userSettings = new Collection();
client.tempData = {};
client.events = 0;

// Database Connection
mongoose.set("strictQuery", true);
const MONGO_URL = process.env.MONGO_URL;
if (MONGO_URL) {
    mongoose.connect(MONGO_URL, {
        useNewUrlParser: true,
        useUnifiedTopology: true,
    }).then(() => {
        console.log('✅ MongoDB Connected');
    }).catch(error => {
        console.error('❌ MongoDB Error:', error.message);
    });
} else {
    console.error('❌ MONGO_URL not found in environment variables');
}

// Load Handlers for main bot
const handlers = [
    "event_handler",
    "slash_handler",
    "cmd_handler",
    "membership_handler",
    "blacklist_handler",
    "bump_handler"
];

handlers.forEach((handlerName) => {
    try {
        const handler = require(`./bot/handlers/${handlerName}`);
        if (typeof handler === 'function') {
            handler(client);
        }
    } catch (err) {
        console.error(`❌ Error loading handler ${handlerName}:`, err.message);
    }
});

// Error Handling
process.on('unhandledRejection', (reason) => {
    console.error('❌ Unhandled Rejection:', reason);
});

process.on('uncaughtException', (err) => {
    console.error('❌ Uncaught Exception:', err);
});

client.on('error', (error) => {
    console.error('❌ Discord Client Error:', error);
});

client1.on('error', (error) => {
    console.error('❌ Secondary Bot Error:', error);
});

// Export clients
module.exports = { client, client1 };
