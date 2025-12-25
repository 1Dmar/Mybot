const { ActivityType } = require("discord.js");
const Server = require("../Models/User");
const Serverdb = require("../Models/Server");
const BlackList = require("../Models/BlackList");
const UpdateStatus = require("../Models/UpdateStatus");
const axios = require('axios');

module.exports = {
    name: 'ready',
    once: true,
    async execute(client) {
        try {
            console.log(`🚀 ${client.user.tag} is online and ready!`);
            client.user.setStatus("online");

            const activities = [
                { name: "ProMcBot | New update! 🚀", type: ActivityType.Playing },
                { name: "ProMcBot | Try new features! 🔥", type: ActivityType.Watching },
            ];

            let i = 0;
            setInterval(() => {
                try {
                    client.user.setActivity(activities[i]);
                    i = (i + 1) % activities.length;
                } catch (error) {
                    console.error("Error setting activity:", error);
                }
            }, 15000);

            // Cache system data
            try {
                const [users, servers, blacklists] = await Promise.all([
                    Server.find(),
                    Serverdb.find(),
                    BlackList.find()
                ]);

                users.forEach(u => client.userSettings.set(u.Id, u));
                servers.forEach(s => client.userSettings.set(s.serverId, s));
                blacklists.forEach(b => {
                    if (Array.isArray(b.guildIds)) {
                        b.guildIds.forEach(id => client.userSettings.set(`${id}_bl`, b));
                    } else if (b.guildIds) {
                        client.userSettings.set(`${b.guildIds}_bl`, b);
                    }
                });

                console.log("✅ System data cached successfully.");
            } catch (err) {
                console.error("❌ Error caching system data:", err);
            }

            // Status Update System
            setInterval(async () => {
                try {
                    const updatingGuilds = await UpdateStatus.find({ isUpdating: true });
                    for (const updateStatus of updatingGuilds) {
                        const guild = client.guilds.cache.get(updateStatus.guildId);
                        if (!guild) continue;

                        const serverInfo = await Serverdb.findOne({ serverId: updateStatus.guildId });
                        if (!serverInfo) continue;

                        let ip = serverInfo.javaIP || serverInfo.bedrockIP;
                        let port = serverInfo.javaPort || serverInfo.bedrockPort;

                        if (!ip) continue;

                        const apiUrl = `https://api.mcsrvstat.us/3/${ip}:${port}`;
                        const response = await axios.get(apiUrl).catch(() => null);
                        if (!response?.data) continue;

                        const data = response.data;
                        const statusName = `Status: ${data.online ? 'Online' : 'Offline'}`;
                        const playerCount = `Players: ${data.online ? `${data.players.online}/${data.players.max}` : 'N/A'}`;

                        const statusChannel = guild.channels.cache.get(updateStatus.statusChannelId);
                        if (statusChannel) await statusChannel.setName(statusName).catch(() => {});

                        const countChannel = guild.channels.cache.get(updateStatus.playerCountChannelId);
                        if (countChannel) await countChannel.setName(playerCount).catch(() => {});
                    }
                } catch (err) {
                    console.error("Error in status update loop:", err.message);
                }
            }, 60000);

        } catch (error) {
            console.error("❌ Critical error in ready event:", error);
        }
    }
};
