const { ApplicationCommandType, PermissionFlagsBits } = require("discord.js");
const util = require('util');
const { inspect } = require('util');

module.exports = {
  name: "eval",
  description: "Evaluate JavaScript code and explore objects",
  userPermissions: PermissionFlagsBits.Administrator,
  category: "Owner",
  type: ApplicationCommandType.ChatInput,
  options: [
    {
      name: "code",
      description: "JavaScript code to evaluate",
      type: 3, // String
      required: true
    },
    {
      name: "depth",
      description: "Inspection depth (default: 1)",
      type: 4, // Integer
      required: false
    },
    {
      name: "hidden",
      description: "Hide output from others (default: true)",
      type: 5, // Boolean
      required: false
    }
  ],
  /**
   * @param {Client} client
   * @param {CommandInteraction} interaction
   */
  run: async (client, interaction) => {
    const ephemeral = interaction.options.getBoolean("hidden") !== false;
    await interaction.deferReply({
      ephemeral
    });

    if (!process.env.OWNER_ID || interaction.user.id !== process.env.OWNER_ID) {
      return interaction.editReply({
        content: "❌ This command is restricted to the bot owner!",
      });
    }

    const code = interaction.options.getString("code");
    const depth = interaction.options.getInteger("depth") || 1;

    const context = {
      client,
      interaction,
      util,
      require: (name) => {
        if (!/^[\w@./-]+$/.test(name)) throw new Error("Invalid module name");
        return require(name);
      },
      process,
      console,
    };

    try {
      const evalStart = Date.now();
      const asyncFunc = new Function(...Object.keys(context), `
        "use strict";
        return (async () => { 
          ${code.includes('\n') ? code : `return ${code}`}
        })();
      `);

      let evaled = await asyncFunc(...Object.values(context));
      const evalTime = Date.now() - evalStart;

      if (typeof evaled !== "string") {
        evaled = inspect(evaled, {
          depth,
          showHidden: false,
          colors: false,
          maxArrayLength: 20
        });
      }

      let truncated = false;
      if (evaled.length > 1900) {
        truncated = true;
        evaled = evaled.substring(0, 1900) + "...";
      }

      const footer = `⏱️ ${evalTime}ms${truncated ? " | ✂️ Truncated" : ""}`;
      await interaction.editReply({
        content: `✅ **Evaluation Successful** ${footer}\n\`\`\`js\n${evaled || "undefined"}\n\`\`\``,
      });

    } catch (err) {
      let errorMessage = err.toString();
      if (err instanceof ReferenceError) {
        errorMessage = `ReferenceError: ${err.message}`;
      }
      errorMessage = errorMessage.replace(new RegExp(client.token, "g"), "[REDACTED]");

      await interaction.editReply({
        content: `❌ **Evaluation Error**\n\`\`\`js\n${errorMessage}\n\`\`\``,
      });
    }
  },
};