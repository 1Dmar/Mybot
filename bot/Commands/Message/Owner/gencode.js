const {
  Message,
  PermissionFlagsBits,
  Client,
  EmbedBuilder,
} = require("discord.js");
const moment = require("moment");
const voucher_codes = require("voucher-code-generator");
const schema = require("../../../Models/Code");

module.exports = {
  name: "gencode",
  description: `Generate membership codes`,
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
      const plan = args[0]?.toLowerCase();
      const amount = parseInt(args[1]) || 1;
      const codes = [];
      const plans = {
        daily: 86400000,
        weekly: 86400000 * 7,
        monthly: 86400000 * 30,
        yearly: 86400000 * 365
      };

      if (!plans[plan]) {
        return message.reply(`Invalid plan. Available plans: \`${Object.keys(plans).join(", ")}\``);
      }

      const time = Date.now() + plans[plan];

      for (let i = 0; i < amount; i++) {
        const codeMemberShip = voucher_codes.generate({ pattern: "####-#####-###-####" });
        const code = codeMemberShip[0].toUpperCase();
        const find = await schema.findOne({ code: code });
        if (!find) {
          await schema.create({
            code: code,
            plan: plan,
            expiresAt: time,
          });
          codes.push(code);
        }
      }

      await message.reply({
        embeds: [
          new EmbedBuilder()
            .setColor("Blurple")
            .setTitle(`Generated ${codes.length} Codes`)
            .setDescription(`\`\`\`\n${codes.join("\n") || "No Codes Generated"}\`\`\``)
            .addFields([{
              name: 'Expires At',
              value: `<t:${Math.floor(time / 1000)}:F>`
            }])
            .setFooter({
              text: `To redeem, use ${prefix}claim <code>`
            }),
        ],
      });

    } catch (error) {
      console.error("Error in gencode message command:", error);
      await message.reply({
        content: "An error occurred while generating the codes.",
      }).catch(() => {});
    }
  },
};
