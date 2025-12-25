const { CommandInteraction, ApplicationCommandType, PermissionFlagsBits, Client } = require("discord.js");
const Membership = require("../../../Models/User");

module.exports = {
  name: "delmembership",
  description: "Remove membership from a server",
  userPermissions: PermissionFlagsBits.Administrator,
  botPermissions: PermissionFlagsBits.SendMessages,
  category: "Owner",
  type: ApplicationCommandType.ChatInput,
  options: [{
    name: 'serverid',
    description: 'The ID of the server to remove membership from',
    type: 3, // String type
    required: true,
  }],
  run: async (client, interaction) => {
    // Hardcoded owner check - consider moving to a config file
    if (interaction.user.id !== "804999528129363998" && interaction.user.id !== "1071690719418396752") {
      return interaction.reply({
        content: "You are not authorized to use this command.",
        ephemeral: true
      });
    }

    await interaction.deferReply({
      ephemeral: true
    });

    try {
      const serverId = interaction.options.getString('serverid');
      const server = await Membership.findOne({
        Id: serverId
      });

      if (!server || !server.ismembership) {
        return interaction.editReply({
          content: `Server with ID \`${serverId}\` does not have an active membership.`,
        });
      }

      await Membership.findOneAndRemove({
        Id: serverId
      });

      // Also delete from cache if it exists
      if (client.userSettings?.has(serverId)) {
        client.userSettings.delete(serverId);
      }

      await interaction.editReply({
        content: `Membership successfully removed from server with ID \`${serverId}\`.`,
      });

    } catch (error) {
      console.error("Error in delmembership command:", error);
      if (interaction.deferred) {
        await interaction.editReply({
          content: "An error occurred while removing the membership.",
        }).catch(() => {});
      }
    }
  },
};
