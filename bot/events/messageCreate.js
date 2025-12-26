const { Collection, EmbedBuilder, PermissionsBitField } = require("discord.js");
const { PREFIX } = require("../settings/config");
const User = require("../Models/User");
const BlackList = require("../Models/BlackList");
const AutoResponder = require("../Models/AutoResponder");

function cooldown(message, cmd) {
    if (!message || !cmd) return;
    let { client, member } = message;
    if (!client.cooldowns.has(cmd.name)) {
        client.cooldowns.set(cmd.name, new Collection());
    }
    const now = Date.now();
    const timestamps = client.cooldowns.get(cmd.name);
    const cooldownAmount = cmd.cooldown * 1000;
    if (timestamps.has(member.id)) {
        const expirationTime = timestamps.get(member.id) + cooldownAmount;
        if (now < expirationTime) {
            const timeLeft = (expirationTime - now) / 1000;
            return timeLeft;
        } else {
            timestamps.set(member.id, now);
            setTimeout(() => timestamps.delete(member.id), cooldownAmount);
            return false;
        }
    } else {
        timestamps.set(member.id, now);
        setTimeout(() => timestamps.delete(member.id), cooldownAmount);
        return false;
    }
}

module.exports = {
  name: 'messageCreate',
  async execute(message) {
    console.log(`[DEBUG] messageCreate event received from user ${message.author.tag} in channel ${message.channel.id}`);
    const client = message.client;
    if (message.author.bot || !message.guild || !message.content) return;

    try {
      // Command Handler
      if (message.content.startsWith(PREFIX)) {
        let args = message.content.slice(PREFIX.length).trim().split(/ +/);
        let cmd = args.shift()?.toLowerCase();
        const command = client.mcommands.get(cmd);

        if (command) {
          let serverdb = client.userSettings.get(message.guild.id);
          if (!serverdb) {
            serverdb = await User.findOneAndUpdate({ Id: message.guild.id }, { $setOnInsert: { Id: message.guild.id } }, { upsert: true, new: true });
            client.userSettings.set(message.guild.id, serverdb);
          }

          let serverdbbl = client.userSettings.get(`${message.guild.id}_bl`);
          if (!serverdbbl) {
            serverdbbl = await BlackList.findOne({ guildIds: message.guild.id });
            if (serverdbbl) client.userSettings.set(`${message.guild.id}_bl`, serverdbbl);
          }

          if (serverdbbl?.isBlacklisted === 'true') {
            return message.reply(`> \`${message.guild.name}\` is blacklisted.`).then(msg => setTimeout(() => msg.delete().catch(() => {}), 5000));
          }
          if (command.userPermissions && !message.member.permissions.has(command.userPermissions)) {
            return message.reply("You don't have enough permissions.");
          }
          if (command.botPermissions && !message.guild.members.me.permissions.has(command.botPermissions)) {
            return message.reply("I don't have enough permissions.");
          }
          const cd = cooldown(message, command);
          if (cd) {
            return message.reply(`You are on cooldown, wait \`${cd.toFixed(1)}\` seconds.`);
          }
          if (command.membership && !serverdb?.ismembership) {
            return message.reply("This is a membership-only command.").then(msg => setTimeout(() => msg.delete().catch(() => {}), 5000));
          }

          await command.run(client, message, args, PREFIX);
          return;
        }
      }

      // Auto Responder (only if no command was executed)
      const autoResponders = await AutoResponder.find({ guildId: message.guild.id });
      for (const autoResponder of autoResponders) {
        if (message.content.includes(autoResponder.trigger)) {
          if (autoResponder.replyType === 'reply') {
            await message.reply(autoResponder.response);
          } else {
            await message.channel.send(autoResponder.response);
          }
          break;
        }
      }

    } catch (error) {
      console.error(`Error in messageCreate event for guild ${message.guild.id}:`, error);
      message.reply("An error occurred. Please try again later.").catch(() => {});
    }
  }
};