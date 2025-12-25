const {
  Message,
  PermissionFlagsBits,
  Client,
  EmbedBuilder,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
} = require("discord.js");
const Membership = require("../../../Models/User");

module.exports = {
  name: "mslist",
  description: `Show all membership servers`,
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
      const membershipServers = await Membership.find({ ismembership: true });

      if (membershipServers.length === 0) {
        return message.reply({
          embeds: [
            new EmbedBuilder()
              .setTitle(`All Membership Servers`)
              .setColor("Blurple")
              .setDescription("No membership servers found."),
          ],
        });
      }

      const servers = membershipServers.map(server => ({
        id: server.Id,
        name: client.guilds.cache.get(server.Id)?.name || "Unknown Server",
        plan: server.membership.plan || 'N/A',
        expiresAt: Math.floor(server.membership.expiresAt / 1000),
      }));

      let page = 0;
      const pageSize = 5;
      const totalPages = Math.ceil(servers.length / pageSize);

      const generateEmbed = (currentPage) => {
        const start = currentPage * pageSize;
        const end = start + pageSize;
        const serverList = servers.slice(start, end)
          .map(s => `**${s.name}** (\`${s.id}\`)\n**Plan**: \`${s.plan}\` | **Expires**: <t:${s.expiresAt}:R>`)
          .join("\n\n");

        return new EmbedBuilder()
          .setTitle(`Membership Servers (Page ${currentPage + 1}/${totalPages})`)
          .setColor("Blurple")
          .setDescription(serverList || "No servers on this page.");
      };

      const generateButtons = (currentPage) => {
        return new ActionRowBuilder().addComponents(
          new ButtonBuilder()
            .setCustomId('previous_page')
            .setLabel('Previous')
            .setStyle(ButtonStyle.Primary)
            .setDisabled(currentPage === 0),
          new ButtonBuilder()
            .setCustomId('next_page')
            .setLabel('Next')
            .setStyle(ButtonStyle.Primary)
            .setDisabled(currentPage >= totalPages - 1)
        );
      };

      const embedMessage = await message.reply({
        embeds: [generateEmbed(page)],
        components: [generateButtons(page)],
      });

      const collector = embedMessage.createMessageComponentCollector({
        filter: (i) => i.user.id === message.author.id,
        time: 120000,
      });

      collector.on('collect', async (i) => {
        if (i.customId === 'previous_page') {
          page--;
        } else if (i.customId === 'next_page') {
          page++;
        }
        await i.update({
          embeds: [generateEmbed(page)],
          components: [generateButtons(page)],
        }).catch(() => {});
      });

      collector.on('end', () => {
        const disabledButtons = generateButtons(page);
        disabledButtons.components.forEach(c => c.setDisabled(true));
        embedMessage.edit({ components: [disabledButtons] }).catch(() => {});
      });

    } catch (error) {
      console.error("Error in mslist message command:", error);
      await message.reply("An error occurred while fetching the membership list.").catch(() => {});
    }
  },
};
