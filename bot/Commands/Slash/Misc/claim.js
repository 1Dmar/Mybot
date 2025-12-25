const {
  CommandInteraction,
  ApplicationCommandType,
  PermissionFlagsBits,
  EmbedBuilder,
} = require("discord.js");
const moment = require("moment");
const Code = require("../../../Models/Code");
const Membership = require("../../../Models/User");

module.exports = {
  name: "claim",
  description: "Redeem membership codes",
  userPermissions: PermissionFlagsBits.Administrator,
  botPermissions: PermissionFlagsBits.SendMessages,
  category: "Misc",
  type: ApplicationCommandType.ChatInput,
  options: [{
    name: 'code',
    description: 'The membership code to redeem',
    type: 3, // String type
    required: true,
  }],
  run: async (client, interaction) => {
    await interaction.deferReply({
      ephemeral: true
    });

    try {
      const code = interaction.options.getString('code');
      const guildId = interaction.guild.id;
      const guildName = interaction.guild.name;

      let server = await Membership.findOne({
        Id: guildId,
      });

      if (server && server.ismembership) {
        return interaction.editReply({
          content: `**> This server is already in membership mode**`,
        });
      }

      const membershipCode = await Code.findOne({
        code: code.toUpperCase(),
      });

      if (!membershipCode) {
        return interaction.editReply({
          content: `**The code is invalid. Please try again using a valid one!**`,
        });
      }

      if (membershipCode.used) {
        return interaction.editReply({
          content: `**This code has already been used.**`,
        });
      }

      const expires = moment(membershipCode.expiresAt).format("dddd, MMMM Do YYYY HH:mm:ss");

      if (!server) {
        server = new Membership({
          Id: guildId,
          ismembership: false,
          membership: {
            redeemedBy: [],
          },
        });
      }

      server.ismembership = true;
      server.membership.redeemedBy.push({
        id: guildId,
        tag: guildName
      });
      server.membership.redeemedAt = Date.now();
      server.membership.expiresAt = membershipCode.expiresAt;
      server.membership.plan = membershipCode.plan;
      await server.save();

      membershipCode.used = true;
      await membershipCode.save();

      const logChannelId = '1273517280747065427';
      const logChannel = await client.channels.fetch(logChannelId).catch(() => null);
      if (logChannel) {
        const embed = new EmbedBuilder()
          .setColor(0xefc75e)
          .setTitle(`New Code Claimed: ${guildName}`)
          .addFields({
            name: 'Server ID',
            value: `\`${guildId}\``,
            inline: true
          }, {
            name: 'Code',
            value: `\`${code}\``,
            inline: true
          }, {
            name: 'Plan',
            value: membershipCode.plan,
            inline: true
          }, {
            name: 'Redeemed By',
            value: interaction.user.tag,
            inline: true
          }, {
            name: 'Expires At',
            value: expires,
            inline: true
          }, )
          .setTimestamp();
        await logChannel.send({
          embeds: [embed]
        });
      }

      await interaction.editReply({
        content: `**You have successfully redeemed membership!**\n\n\`Expires at: ${expires}\``,
      });

    } catch (error) {
      console.error("Error in claim command:", error);
      if (!interaction.replied) {
        await interaction.editReply({
          content: "An error occurred while processing your request.",
        }).catch(() => {});
      }
    }
  },
};
