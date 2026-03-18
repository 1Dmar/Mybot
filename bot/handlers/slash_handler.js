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
                        if (client.scommands.has(command.name)) {
                            console.warn(`⚠️ Skipping duplicate slash command: ${command.name} from ${file}`);
                            continue;
                        }
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
            try {
                const rest = new REST({ version: "10" }).setToken(token);
                const clientId = client.user.id;

                console.log(`🔄 Registering slash commands for ${client.user.tag}...`);

                // Try guild registration first for faster updates (optional)
                const GUILD_ID = process.env.TEST_GUILD_ID || "1226151054178127872";
                
                try {
                    await rest.put(
                        Routes.applicationGuildCommands(clientId, GUILD_ID),
                        { body: allCommands }
                    );
                    console.log(`🏰 Registered commands for guild: ${GUILD_ID}`);
                } catch (e) {
                    console.warn(`⚠️ Guild registration failed: ${e.message}`);
                }

                // Global registration
                await rest.put(
                    Routes.applicationCommands(clientId),
                    { body: allCommands }
                );
                console.log(`🌍 Registered commands globally.`);

            } catch (error) {
                console.error("❌ Slash Command Registration Error:", error);
            }
        });

    } catch (error) {
        console.error("💥 Critical error in slash handler:", error);
    }
};
