const {
  SlashCommandBuilder,
  EmbedBuilder,
  MessageFlags,
} = require("discord.js");
const { getDebugLog, clearDebugLog } = require("../debugger");

module.exports = {
  data: new SlashCommandBuilder()
    .setName("debug")
    .setDescription("Admin debug tools for the bot")
    .addSubcommand((subcommand) =>
      subcommand
        .setName("log")
        .setDescription("Get the debug log")
        .addIntegerOption((option) =>
          option
            .setName("lines")
            .setDescription("Number of lines to show")
            .setRequired(false)
        )
    )
    .addSubcommand((subcommand) =>
      subcommand.setName("clear").setDescription("Clear the debug log")
    ),

  async execute(interaction) {
    // Check admin permissions
    if (!interaction.member.permissions.has("Administrator")) {
      return interaction.reply({
        content:
          "You do not have permission to use this command. Only administrators can access debug tools.",
        flags: MessageFlags.Ephemeral,
      });
    }

    const subcommand = interaction.options.getSubcommand();

    if (subcommand === "log") {
      const lines = interaction.options.getInteger("lines") || 50;

      const logContent = getDebugLog(lines);

      // Only send the last 4000 characters to not exceed Discord limits
      const truncatedLog =
        logContent.length > 4000 ? "..." + logContent.slice(-3997) : logContent;

      // Create embed for debug log
      const debugEmbed = new EmbedBuilder()
        .setColor(0x0099ff)
        .setTitle("Bot Debug Log")
        .setDescription("```\n" + truncatedLog + "\n```")
        .setFooter({
          text: `Showing last ${lines} lines (truncated to 4000 chars if needed)`,
        })
        .setTimestamp();

      await interaction.reply({
        embeds: [debugEmbed],
        flags: MessageFlags.Ephemeral,
      });
    } else if (subcommand === "clear") {
      clearDebugLog();

      await interaction.reply({
        content: "Debug log has been cleared.",
        flags: MessageFlags.Ephemeral,
      });
    }
  },
};
