require('dotenv-flow').config();
const express = require('express');
const mainApp = express();
const keep_alive = require('./keep_alive.js');
// جسر التوافق للمشروع الأول
const mainClient = require('./bot/index'); // Main bot client
const dashboardRouter = require('./dash/index')(mainClient); // Pass client to dash router

mainApp.use('/', dashboardRouter);

// تشغيل السيرفر
const PORT = process.env.PORT || 6269;
mainApp.listen(PORT, () => {
  console.log(`Main server running on port ${PORT}`);
  console.log(`Dashboard is available at http://localhost:${PORT}`);
});

// Login is handled inside bot/index.js, no need for additional logins here.
