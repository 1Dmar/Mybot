const {
  CommandInteraction,
  ApplicationCommandType,
  PermissionFlagsBits,
  Client,
  EmbedBuilder,
} = require("discord.js");

module.exports = {
  name: "avatar",
  description: `Get Avatar of a User !!`,
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
      const user = interaction.options.getUser("user") || interaction.user;
      const avatarURL = user.displayAvatarURL({
        extension: "png",
        size: 512,
        dynamic: true
      });

      await interaction.reply({
        embeds: [
          new EmbedBuilder()
            .setColor("Blurple")
            .setAuthor({
              name: `Avatar Of ${user.tag}`,
              iconURL: avatarURL,
            })
            .setImage(avatarURL)
            .setTimestamp(),
        ],
        ephemeral: true,
      });
    } catch (error) {
      console.error("Error in avatar command:", error);
      if (!interaction.replied) {
        await interaction.reply({
          content: "An error occurred while fetching the avatar.",
          ephemeral: true,
        }).catch(() => {});
      }
    }
  },
};
