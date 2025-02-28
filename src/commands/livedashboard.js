const {
  SlashCommandBuilder,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  MessageFlags,
} = require("discord.js");
const { DashboardModel } = require("../models/dashboard");
const { createProgressEmbed } = require("../dashboard-updater");

module.exports = {
  data: new SlashCommandBuilder()
    .setName("livedashboard")
    .setDescription(
      "Creates a live-updating resource tracking dashboard (admin only)"
    )
    .addChannelOption((option) =>
      option
        .setName("channel")
        .setDescription(
          "Channel to post the dashboard (defaults to current channel)"
        )
        .setRequired(false)
    ),

  async execute(interaction) {
    try {
      // Check admin permissions
      if (!interaction.member.permissions.has("Administrator")) {
        return interaction.reply({
          content:
            "You do not have permission to use this command. Only administrators can create dashboards.",
          flags: MessageFlags.Ephemeral,
        });
      }

      // Get target channel or use current channel
      const targetChannel =
        interaction.options.getChannel("channel") || interaction.channel;

      // Create dashboard embed from latest data
      const progressEmbed = await createProgressEmbed();

      // Create buttons for actions
      const actionRow = new ActionRowBuilder().addComponents(
        new ButtonBuilder()
          .setCustomId("add_resources")
          .setLabel("Add Resources")
          .setStyle(ButtonStyle.Primary),
        new ButtonBuilder()
          .setCustomId("view_leaderboard")
          .setLabel("Leaderboard")
          .setStyle(ButtonStyle.Secondary),
        new ButtonBuilder()
          .setCustomId("view_locations")
          .setLabel("Locations")
          .setStyle(ButtonStyle.Secondary),
        new ButtonBuilder()
          .setCustomId("refresh_dashboard")
          .setLabel("Refresh")
          .setStyle(ButtonStyle.Success)
      );

      // Send the dashboard
      const message = await targetChannel.send({
        embeds: [progressEmbed],
        components: [actionRow],
      });

      // Store the message ID in database for later updates
      await DashboardModel.add(
        message.id,
        targetChannel.id,
        interaction.guild.id
      );

      // Confirm to the user
      await interaction.reply({
        content: `Live dashboard created in ${targetChannel}! The dashboard will automatically update whenever resources are logged.`,
        flags: MessageFlags.Ephemeral,
      });
    } catch (error) {
      console.error("Error in livedashboard command:", error);

      await interaction.reply({
        content: "An error occurred while creating the dashboard.",
        flags: MessageFlags.Ephemeral,
      });
    }
  },
};
