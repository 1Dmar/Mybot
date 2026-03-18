const cron = require('node-cron');
const { updateServerStatus } = require('./statusUpdater');

const cronJobs = new Map();

module.exports.scheduleCronJobs = async (client) => {
  cronJobs.forEach(job => job.stop());
  cronJobs.clear();

  // Check if client.db and required models exist
  if (!client.db || !client.db.StatusBar || !client.db.Server) {
    console.error('Database models not initialized. Cron jobs not scheduled.');
    return 0;
  }

  try {
    const allSettings = await client.db.StatusBar.find();
    let scheduledCount = 0;
    
    for (const settings of allSettings) {
      // Validate settings before scheduling
      if (!settings.serverId || !settings.statusChannelId) {
        console.warn(`Skipping invalid StatusBar config: missing serverId or statusChannelId`);
        continue;
      }

      // Validate update interval
      if (!settings.updateInterval || settings.updateInterval < 1 || settings.updateInterval > 60) {
        console.warn(`Skipping StatusBar [${settings.serverId}]: invalid updateInterval (${settings.updateInterval})`);
        continue;
      }

      const job = cron.schedule(`*/${settings.updateInterval} * * * *`, async () => {
        try {
          const server = await client.db.Server.findOne({ serverId: settings.serverId });
          if (server) {
            await updateServerStatus(client, server, settings);
          } else {
            console.warn(`Cron Job [${settings.serverId}]: Server not found in database`);
          }
        } catch (error) {
          console.error(`Cron Job Error [${settings.serverId}]:`, error.message);
        }
      });

      cronJobs.set(settings.serverId, job);
      scheduledCount++;
    }
    
    console.log(`✅ Scheduled ${scheduledCount} status update jobs`);
    return scheduledCount;
  } catch (error) {
    console.error('Failed to fetch status settings:', error.message);
    return 0;
  }
};