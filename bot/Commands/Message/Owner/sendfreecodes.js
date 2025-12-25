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
  name: "sendfreecode", // Renamed for clarity
  description: `Generate a free membership code and send it to a user.`,
  userPermissions: PermissionFlagsBits.Administrator,
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
      const user = message.mentions.users.first() || await client.users.fetch(args[0]);
      if (!user) {
        return message.reply("Please mention a user or provide a user ID.");
      }

      const plan = args[1]?.toLowerCase();
      const plans = {
        daily: 86400000,
        weekly: 86400000 * 7,
        monthly: 86400000 * 30,
        yearly: 86400000 * 365
      };

      if (!plans[plan]) {
        return message.reply(`Invalid plan. Available plans: \`${Object.keys(plans).join(", ")}\``);
      }

      const expiresAt = Date.now() + plans[plan];
      const code = voucher_codes.generate({ pattern: "####-#####-###-####" })[0].toUpperCase();

      await schema.create({
        code,
        plan,
        expiresAt,
      });

      const embed = new EmbedBuilder()
        .setColor('Blurple')
        .setTitle('Your Free Membership Code!')
        .setDescription(`Here is your free \`${plan}\` membership code, courtesy of the bot owner.`)
        .addFields({ name: 'Your Code', value: `\`\`\`${code}\`\`\`` }, { name: 'Expires', value: `<t:${Math.floor(expiresAt / 1000)}:R>` })
        .setFooter({ text: `To redeem, use /claim in a server with the bot.` });

      await user.send({ embeds: [embed] });
      await message.reply(`Successfully sent a \`${plan}\` code to ${user.tag}.`);

    } catch (error) {
      console.error("Error in sendfreecode message command:", error);
      if (error.code === 50007) {
        return message.reply("Failed to send the code. The user may have DMs disabled.");
      }
      await message.reply("An error occurred while sending the code.").catch(() => {});
    }
  },
};
