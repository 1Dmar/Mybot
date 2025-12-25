const {
  Message,
  PermissionFlagsBits,
  Client,
  EmbedBuilder,
} = require("discord.js");
const schema = require("../../../Models/Code");
const moment = require("moment");

module.exports = {
  name: "mscodeslist",
  description: `List saved, available, and unused membership codes`,
  userPermissions: PermissionFlagsBits.SendMessages,
  botPermissions: PermissionFlagsBits.SendMessages,
  category: "Owner",
  type1: "message",
  run: async (client, message, args, prefix) => {
    if (message.author.id !== "804999528129363998" && message.author.id !== "1071690719418396752") {
      return message.reply({
        content: "You are not authorized to use this command.",
      });
    }

    try {
      const codes = await schema.find({
        expiresAt: { $gte: Date.now() },
        used: { $ne: true }
      });

      if (!codes.length) {
        return message.reply("No unused codes available.");
      }

      const pages = [];
      let currentPage = "";
      for (const [index, code] of codes.entries()) {
        const expiresIn = moment.duration(code.expiresAt - Date.now());
        const expiresAt = `${expiresIn.days()}d ${expiresIn.hours()}h ${expiresIn.minutes()}m`;
        const codeString = `\`${index + 1}. ${code.code} | ${code.plan} | Expires in: ${expiresAt}\`\n`;

        if (currentPage.length + codeString.length > 4000) {
          pages.push(currentPage);
          currentPage = "";
        }
        currentPage += codeString;
      }
      pages.push(currentPage);

      for (const [i, page] of pages.entries()) {
        const embed = new EmbedBuilder()
          .setColor("Blurple")
          .setTitle(`Available Unused Codes (Page ${i + 1}/${pages.length})`)
          .setDescription(page)
          .setFooter({
            text: `To redeem, use ${prefix}claim <code>`
          });
        await message.channel.send({ embeds: [embed] });
      }

    } catch (error) {
      console.error("Error in mscodeslist message command:", error);
      await message.reply("An error occurred while fetching the codes.").catch(() => {});
    }
  },
};
