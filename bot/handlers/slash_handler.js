const { Collection, REST, Routes } = require("discord.js");
const { readdirSync } = require("fs");
const path = require('path');
require('dotenv').config();

module.exports = async (client) => {
    try {
        // Use the correct token from config or env
        const token = process.env.BOT1_1_TOKEN || client.token;
        if (!token) {
            console.error("❌ Error: Bot token is not defined in environment variables (BOT1_1_TOKEN)");
            return;
        }

        client.scommands = new Collection();
        let allCommands = [];

        const slashPath = path.join(__dirname, "..", "Commands", "Slash");
        
        // Load commands
        const commandFolders = readdirSync(slashPath);
        for (const dir of commandFolders) {
            const folderPath = path.join(slashPath, dir);
            const commandFiles = readdirSync(folderPath).filter(f => f.endsWith(".js"));
            
            for (const file of commandFiles) {
                try {
                    const command = require(path.join(folderPath, file));
                    
                    if (command?.name && command?.description) {
                        client.scommands.set(command.name, command);
                        allCommands.push({
                            name: command.name,
                            description: command.description,
                            options: command.options || [],
                            default_member_permissions: command.userPermissions ? command.userPermissions.toString() : null,
                            dm_permission: command.dmPermission || false
                        });
                    }
                } catch (err) {
                    console.error(`❌ Error loading command ${file}:`, err.message);
                }
            }
        }

        console.log(`✅ Loaded ${client.scommands.size} slash commands.`);

        // Register commands
        client.once("ready", async () => {
            if (!client.user) {
                console.error("❌ Client user is not available for slash command registration.");
                return;
            }

            const rest = new REST({ version: "10" }).setToken(token);
            const clientId = client.user.id;

            try {
                console.log(`🔄 Started refreshing ${allCommands.length} application (/) commands.`);

                // Guild-specific registration (for testing)
                const guildId = process.env.TEST_GUILD_ID;
                if (guildId) {
                    try {
                        await rest.put(
                            Routes.applicationGuildCommands(clientId, guildId),
                            { body: allCommands }
                        );
                        console.log(`✅ Successfully reloaded commands for guild: ${guildId}`);
                    } catch (err) {
                        console.error(`❌ Failed to register commands for guild ${guildId}:`, err);
                    }
                }

                // Global registration
                try {
                    await rest.put(
                        Routes.applicationCommands(clientId),
                        { body: allCommands }
                    );
                    console.log(`🌍 Successfully registered commands globally.`);
                } catch (err) {
                    console.error("❌ Failed to register global commands:", err);
                }

            } catch (error) {
                console.error("❌ An unexpected error occurred during slash command registration:", error);
            }
        });

    } catch (error) {
        console.error("💥 Critical error in slash handler:", error);
    }
};
