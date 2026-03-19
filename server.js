require('dotenv').config();
const express = require('express');
const bodyParser = require('body-parser');
const cookieParser = require('cookie-parser');
const path = require('path');
const { client, client1 } = require('./bot.js');
const dashRouter = require('./dash/index.js');

const app = express();
const PORT = process.env.PORT || 6269;

// Middleware
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));
app.use(cookieParser());

// Serve Dashboard
// Assuming dashRouter is an express router exported as .app
if (dashRouter.app) {
    app.use('/', dashRouter.app);
} else {
    app.use('/', dashRouter);
}

// Health check / Keep alive
app.get('/ping', (req, res) => {
    res.status(200).send('Pong!');
});

// Start Server
app.listen(PORT, () => {
    console.log(`🚀 Unified Server running on port ${PORT}`);
    console.log(`🌐 Dashboard available at http://localhost:${PORT}`);
});

// Bot Login
const BOT_TOKEN = process.env.BOT_TOKEN || process.env.BOT1_1_TOKEN || process.env.BOT1_TOKEN;
const MAIL_TOKEN = process.env.MAIL_TOKEN;

if (BOT_TOKEN) {
    client.login(BOT_TOKEN).catch(err => {
        console.error("❌ Main Bot Login Failed:", err.message);
    });
} else {
    console.error("❌ Main Bot Token (BOT_TOKEN) not found.");
}

if (MAIL_TOKEN) {
    client1.login(MAIL_TOKEN).catch(err => {
        console.error("❌ Secondary Bot Login Failed:", err.message);
    });
} else {
    console.log("ℹ️ Secondary Bot Token (MAIL_TOKEN) not found, skipping.");
}
