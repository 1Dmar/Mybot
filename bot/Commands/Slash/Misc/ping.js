const {
  CommandInteraction,
  ApplicationCommandType,
  PermissionFlagsBits,
  Client,
} = require("discord.js");

module.exports = {
  name: "ping",
  description: `Get Bot Real Ping !!`,
  userPermissions: PermissionFlagsBits.SendMessages,
  botPermissions: PermissionFlagsBits.SendMessages,
  category: "Misc",
  type1: "slash",
  type: ApplicationCommandType.ChatInput,
  /**
   *
   * @param {Client} client
   * @param {CommandInteraction} interaction
   */
  run: async (client, interaction) => {
    try {
      await interaction.reply({
        content: `> Pong \`${client.ws.ping}ms\``,
        ephemeral: true,
      });
    } catch (error) {
      console.error("Error in ping command:", error);
      if (!interaction.replied) {
        await interaction.reply({
          content: "An error occurred while fetching the ping.",
          ephemeral: true,
        }).catch(() => {});
      }
    }
  },
};
