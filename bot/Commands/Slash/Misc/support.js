const {
  CommandInteraction,
  ApplicationCommandType,
  PermissionFlagsBits,
  EmbedBuilder,
  Client,
} = require("discord.js");

module.exports = {
  name: "support",
  description: `Get the support server link of the bot.`,
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
        content: "Thank you for using our bot! 🙌\nIf you need assistance, join our support server: [Support Server](https://discord.gg/6FjFYStz5a)",
        ephemeral: true
      });
    } catch (error) {
      console.error("Error in support command:", error);
      if (!interaction.replied) {
        await interaction.reply({
          content: "An error occurred while generating the support link.",
          ephemeral: true,
        }).catch(() => {});
      }
    }
  },
};
