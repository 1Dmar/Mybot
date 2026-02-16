require('dotenv-flow').config();
const express = require('express');
const mainApp = express();
const keep_alive = require('./keep_alive.js');

// Dashboard project
const dash = require('./dash/index');
if (dash.app && typeof dash.app === 'function') {
  mainApp.use('/', dash.app); 
}

// Bot project
// The bot project handles its own login in bot/index.js
require('./bot/index');

// تشغيل السيرفر
const PORT = process.env.PORT || 6269;
mainApp.listen(PORT, () => {
  console.log(`Main server running on port ${PORT}`);
  console.log(`Dashboard: http://localhost:${PORT}`);
});

// تسجيل دخول بوتات الداشبورد (لأنها معطلة في dash/index.js)
if (dash.client) dash.client.login(process.env.BOT1_TOKEN).catch(err => console.error("Dash Bot 1 Login Failed:", err.message));
if (dash.client1) dash.client1.login(process.env.BOT1_1_TOKEN).catch(err => console.error("Dash Bot 2 Login Failed:", err.message));
