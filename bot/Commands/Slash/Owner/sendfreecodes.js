const { CommandInteraction, ApplicationCommandType, PermissionFlagsBits, Client, EmbedBuilder } = require("discord.js");
const moment = require("moment");
const voucher_codes = require("voucher-code-generator");
const schema = require("../../../Models/Code");

module.exports = {
  name: "sendfreecode", // Renamed for clarity
  description: "Generate a free membership code and send it to a user.",
  userPermissions: PermissionFlagsBits.Administrator,
  botPermissions: PermissionFlagsBits.SendMessages,
  category: "Owner",
  type: ApplicationCommandType.ChatInput,
  options: [{
    name: 'user',
    description: 'The user to send the code to.',
    type: 6, // USER type
    required: true,
  }, {
    name: 'plan',
    description: 'The plan for the code (e.g., weekly, monthly).',
    type: 3, // STRING type
    required: true,
  }],
  run: async (client, interaction) => {
    if (interaction.user.id !== "804999528129363998" && interaction.user.id !== "1071690719418396752") {
      return interaction.reply({
        content: "You are not authorized to use this command.",
        ephemeral: true,
      });
    }

    await interaction.deferReply({
      ephemeral: true
    });

    try {
      const user = interaction.options.getUser('user');
      const plan = interaction.options.getString('plan').toLowerCase();
      const plans = {
        daily: 86400000,
        weekly: 86400000 * 7,
        monthly: 86400000 * 30,
        yearly: 86400000 * 365
      };

      if (!plans[plan]) {
        return interaction.editReply({
          content: `Invalid plan. Available plans: \`${Object.keys(plans).join(", ")}\``
        });
      }

      const expiresAt = Date.now() + plans[plan];
      const code = voucher_codes.generate({
        pattern: "####-#####-###-####"
      })[0].toUpperCase();

      await schema.create({
        code,
        plan,
        expiresAt,
      });

      const embed = new EmbedBuilder()
        .setColor('Blurple')
        .setTitle('Your Free Membership Code!')
        .setDescription(`Here is your free \`${plan}\` membership code, courtesy of the bot owner.`)
        .addFields({
          name: 'Your Code',
          value: `\`\`\`${code}\`\`\``
        }, {
          name: 'Expires',
          value: `<t:${Math.floor(expiresAt / 1000)}:R>`
        })
        .setFooter({
          text: `To redeem, use /claim in a server with the bot.`
        });

      await user.send({
        embeds: [embed]
      });
      await interaction.editReply({
        content: `Successfully sent a \`${plan}\` code to ${user.tag}.`
      });

    } catch (error) {
      console.error("Error in sendfreecode command:", error);
      if (error.code === 50007) { // Cannot send messages to this user
        return interaction.editReply({
          content: "Failed to send the code. The user may have DMs disabled."
        });
      }
      if (interaction.deferred) {
        await interaction.editReply({
          content: "An error occurred while sending the code."
        }).catch(() => {});
      }
    }
  },
};
