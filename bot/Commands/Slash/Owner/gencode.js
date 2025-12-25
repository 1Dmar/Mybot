const { CommandInteraction, ApplicationCommandType, PermissionFlagsBits, Client, EmbedBuilder } = require("discord.js");
const moment = require("moment");
const voucher_codes = require("voucher-code-generator");
const schema = require("../../../Models/Code");

module.exports = {
  name: "gencode",
  description: "Generate membership codes",
  userPermissions: PermissionFlagsBits.SendMessages,
  botPermissions: PermissionFlagsBits.SendMessages,
  category: "Owner",
  type: ApplicationCommandType.ChatInput,
  type1: "slash",
  options: [
    {
      name: 'plan',
      description: 'The plan for the membership code (daily, weekly, monthly, yearly)',
      type: 3, // String type
      required: true,
    },
    {
      name: 'amount',
      description: 'The number of codes to generate',
      type: 4, // Integer type
      required: false,
    }
  ],
  run: async (client, interaction) => {
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
      const plan = interaction.options.getString('plan').toLowerCase();
      const amount = interaction.options.getInteger('amount') || 1;
      const codes = [];
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

      const time = Date.now() + plans[plan];

      for (let i = 0; i < amount; i++) {
        const codeMemberShip = voucher_codes.generate({
          pattern: "####-#####-###-####"
        });
        const code = codeMemberShip[0].toUpperCase();
        const find = await schema.findOne({
          code: code
        });

        if (!find) {
          await schema.create({
            code: code,
            plan: plan,
            expiresAt: time,
          });
          codes.push(code);
        }
      }

      await interaction.editReply({
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
            text: `To redeem, use /claim <code>`
          }),
        ],
      });

    } catch (error) {
      console.error("Error in gencode command:", error);
      if (interaction.deferred) {
        await interaction.editReply({
          content: "An error occurred while generating the codes.",
        }).catch(() => {});
      }
    }
  },
};
