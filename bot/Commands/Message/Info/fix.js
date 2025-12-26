const { EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, REST, Routes } = require('discord.js');

module.exports = {
    name: 'fix',
    description: 'Checks if the bot has the necessary permissions to create slash commands and provides a fix if needed.',
    run: async (client, message, args) => {
        // Only allow members with Administrator permissions to run this command.
        if (!message.member.permissions.has('Administrator')) {
            return message.reply({ content: 'You must be an Administrator to use this command.' });
        }

        const checkingEmbed = new EmbedBuilder()
            .setColor('Yellow')
            .setTitle('Checking Permissions...')
            .setDescription('Please wait while I check if I have the necessary permissions for slash commands.');

        const msg = await message.reply({ embeds: [checkingEmbed] });

        const rest = new REST({ version: '10' }).setToken(client.token);

        try {
            // Attempt to fetch the guild's application commands.
            // This is a reliable way to check for the `applications.commands` scope, as it will fail if the scope is missing.
            await rest.get(Routes.applicationGuildCommands(client.user.id, message.guild.id));

            // If the above line doesn't throw an error, it means the permissions are correct.
            const successEmbed = new EmbedBuilder()
                .setColor('Green')
                .setTitle('Permissions Check Successful!')
                .setDescription('I have all the necessary permissions to create and manage slash commands in this server. No action is needed.');

            await msg.edit({ embeds: [successEmbed] });

        } catch (error) {
            // A 403 Forbidden error indicates that the bot lacks the necessary scope.
            if (error.status === 403) {
                // Construct the re-authorization URL.
                const inviteUrl = `https://discord.com/oauth2/authorize?client_id=${client.user.id}&permissions=537250992&scope=bot%20applications.commands`;

                const errorEmbed = new EmbedBuilder()
                    .setColor('Red')
                    .setTitle('Permissions Issue Detected!')
                    .setDescription("It looks like I'm missing the required `applications.commands` permission, which is necessary for slash commands to work.\n\nTo fix this, a server administrator needs to re-authorize me by clicking the button below. This will not kick me from the server; it will only grant the missing permission.")
                    .addFields({ name: 'What to do:', value: 'Click the "Fix Permissions" button to open the authorization link.' });

                const row = new ActionRowBuilder()
                    .addComponents(
                        new ButtonBuilder()
                            .setLabel('Fix Permissions')
                            .setStyle(ButtonStyle.Link)
                            .setURL(inviteUrl)
                    );

                await msg.edit({ embeds: [errorEmbed], components: [row] });
            } else {
                // Handle other potential errors during the API call.
                console.error("An unexpected error occurred during the permissions check:", error);
                const unexpectedErrorEmbed = new EmbedBuilder()
                    .setColor('Red')
                    .setTitle('An Unexpected Error Occurred')
                    .setDescription('Something went wrong while checking permissions. Please try again later.');

                await msg.edit({ embeds: [unexpectedErrorEmbed] });
            }
        }
    }
};