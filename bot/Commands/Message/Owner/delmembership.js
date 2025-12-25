const { Message, PermissionFlagsBits, Client } = require("discord.js");
const Membership = require("../../../Models/User");

module.exports = {
  name: "delmembership",
  description: `Remove membership from a server`,
  userPermissions: PermissionFlagsBits.SendMessages,
  botPermissions: PermissionFlagsBits.SendMessages,
  category: "Owner",
  type1: "message",
  run: async (client, message, args, prefix) => {
    // Hardcoded owner check
    if (message.author.id !== "804999528129363998" && message.author.id !== "1071690719418396752") {
      return message.reply({
        content: "You are not authorized to use this command.",
      });
    }

    try {
      const serverId = args[0];
      if (!serverId) {
        return message.reply({
          content: `> Please provide a server ID.`,
        });
      }

      const server = await Membership.findOne({ Id: serverId });

      if (!server || !server.ismembership) {
        return message.reply({
          content: `Server with ID \`${serverId}\` does not have an active membership.`,
        });
      }

      await Membership.findOneAndRemove({ Id: serverId });

      // Delete from cache if it exists
      if (client.userSettings?.has(serverId)) {
        client.userSettings.delete(serverId);
      }

      return message.reply({
        content: `Membership successfully removed from server with ID \`${serverId}\`.`,
      });

    } catch (error) {
      console.error("Error in delmembership message command:", error);
      await message.reply({
        content: "An error occurred while removing the membership.",
      }).catch(() => {});
    }
  },
};
