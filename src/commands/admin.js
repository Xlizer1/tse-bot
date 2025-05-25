// Updated src/commands/admin.js to match the enhanced admin-handlers.js
const {
  SlashCommandBuilder,
  EmbedBuilder,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  MessageFlags,
} = require("discord.js");

module.exports = {
  data: new SlashCommandBuilder()
    .setName("admin")
    .setDescription("Administrator dashboard for Terra Star Expeditionary bot"),

  async execute(interaction) {
    try {
      // Check admin permissions
      if (!interaction.member.permissions.has("Administrator")) {
        return interaction.reply({
          content:
            "You do not have permission to use this command. Admin dashboard is restricted to administrators only.",
          flags: MessageFlags.Ephemeral,
        });
      }

      // Create dashboard embed - ENHANCED with all features
      const dashboardEmbed = new EmbedBuilder()
        .setColor(0x0099ff)
        .setTitle("TSE Admin Dashboard")
        .setDescription("Terra Star Expeditionary Bot Admin Controls")
        .addFields(
          {
            name: "Resource Management",
            value:
              "Add, remove or view resources for mining, salvage, and hauling operations.",
          },
          {
            name: "Target Management",
            value:
              "Set collection targets or reset progress for specific resources.",
          },
          {
            name: "Action Types Management",
            value:
              "Create, update, or delete action types (mining, salvage, etc.).",
          },
          {
            name: "Tag Management",
            value:
              "Manage tags on targets for dashboard organization and filtering.",
          },
          {
            name: "Shared Dashboards",
            value:
              "Create dashboards that display data from other Discord servers.",
          },
          {
            name: "Data Export",
            value: "Export resource collection data as an Excel spreadsheet.",
          },
          {
            name: "Display Controls",
            value: "Create or update dashboards and reporting features.",
          },
          {
            name: "System Stats",
            value: "View system statistics and status information.",
          }
        )
        .setFooter({ text: "Terra Star Expeditionary Admin Dashboard" })
        .setTimestamp();

      // Create button rows - ENHANCED with new buttons (8 total)
      const row1 = new ActionRowBuilder().addComponents(
        new ButtonBuilder()
          .setCustomId("admin_resources")
          .setLabel("Resource Management")
          .setStyle(ButtonStyle.Primary),
        new ButtonBuilder()
          .setCustomId("admin_targets")
          .setLabel("Target Management")
          .setStyle(ButtonStyle.Primary),
        new ButtonBuilder()
          .setCustomId("admin_actiontypes")
          .setLabel("Action Types")
          .setStyle(ButtonStyle.Primary)
      );

      const row2 = new ActionRowBuilder().addComponents(
        new ButtonBuilder()
          .setCustomId("admin_managetags")
          .setLabel("Tag Management")
          .setStyle(ButtonStyle.Primary),
        new ButtonBuilder()
          .setCustomId("admin_sharedashboard")
          .setLabel("Shared Dashboards")
          .setStyle(ButtonStyle.Primary),
        new ButtonBuilder()
          .setCustomId("admin_export")
          .setLabel("Export Data")
          .setStyle(ButtonStyle.Success)
      );

      const row3 = new ActionRowBuilder().addComponents(
        new ButtonBuilder()
          .setCustomId("admin_display")
          .setLabel("Display Controls")
          .setStyle(ButtonStyle.Secondary),
        new ButtonBuilder()
          .setCustomId("admin_stats")
          .setLabel("System Stats")
          .setStyle(ButtonStyle.Secondary)
      );

      // Send the dashboard with all 8 buttons
      await interaction.reply({
        embeds: [dashboardEmbed],
        components: [row1, row2, row3],
        flags: MessageFlags.Ephemeral,
      });
    } catch (error) {
      console.error("Error in admin command:", error);
      await interaction.reply({
        content: "An error occurred while loading the admin dashboard.",
        flags: MessageFlags.Ephemeral,
      });
    }
  },
};
