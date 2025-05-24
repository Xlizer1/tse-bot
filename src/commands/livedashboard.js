// Updated src/commands/livedashboard.js with filtering support

const {
  SlashCommandBuilder,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  MessageFlags,
} = require("discord.js");
const { DashboardModel } = require("../models/dashboard");
const TargetModel = require("../models/target");
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
    )
    // NEW: Add filtering options
    .addStringOption((option) =>
      option
        .setName("filter")
        .setDescription(
          "Comma-separated tags to filter targets (e.g., 'idris,critical')"
        )
        .setRequired(false)
    )
    .addStringOption((option) =>
      option
        .setName("title")
        .setDescription("Custom title for the dashboard")
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

      // Get filter tags
      const filterInput = interaction.options.getString("filter");
      let targetTags = null;

      if (filterInput) {
        // Parse comma-separated tags
        targetTags = filterInput
          .split(",")
          .map((tag) => tag.trim())
          .filter((tag) => tag.length > 0);
      }

      // Get custom title
      const customTitle = interaction.options.getString("title") || null;

      // Create dashboard configuration
      const dashboardConfig = {
        guildId: interaction.guild.id,
        targetTags: targetTags,
        title:
          customTitle ||
          (targetTags
            ? `📊 ${targetTags.join(" & ")} Dashboard`
            : "🚀 Terra Star Expeditionary Dashboard"),
        showAllIfNoFilter: !targetTags, // Show all targets if no filter specified
      };

      // Create dashboard embed from configuration
      const progressEmbed = await createProgressEmbed(dashboardConfig);

      // Add filter info to footer if filtering
      if (targetTags && targetTags.length > 0) {
        const currentFooter = progressEmbed.data.footer?.text || "";
        progressEmbed.setFooter({
          text:
            currentFooter +
            (currentFooter ? " | " : "") +
            `Filter: ${targetTags.join(", ")}`,
        });
      }

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

      // Store the message ID in database with configuration
      await DashboardModel.addWithConfig(
        message.id,
        targetChannel.id,
        interaction.guild.id,
        dashboardConfig
      );

      // Create confirmation message
      let confirmationMessage = `Live dashboard created in ${targetChannel}!`;

      if (targetTags && targetTags.length > 0) {
        confirmationMessage += `\n🏷️ Filtering targets with tags: ${targetTags.join(
          ", "
        )}`;
      }

      if (customTitle) {
        confirmationMessage += `\n📝 Custom title: "${customTitle}"`;
      }

      confirmationMessage +=
        "\n\nThe dashboard will automatically update whenever resources are logged.";

      // Suggest tags if available
      const allTags = await TargetModel.getAllTags(interaction.guild.id);
      if (allTags.length > 0 && (!targetTags || targetTags.length === 0)) {
        confirmationMessage += `\n\n💡 **Available tags**: ${allTags.join(
          ", "
        )}`;
        confirmationMessage += `\nUse \`/livedashboard filter:tag1,tag2\` to create filtered dashboards.`;
      }

      // Confirm to the user
      await interaction.reply({
        content: confirmationMessage,
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

  // Add autocomplete for tags
  async autocomplete(interaction) {
    const focusedOption = interaction.options.getFocused(true);

    try {
      if (focusedOption.name === "filter") {
        const guildId = interaction.guild?.id;

        if (guildId) {
          // Get existing tags and dashboard tags
          const targetTags = await TargetModel.getAllTags(guildId);
          const dashboardTags = await DashboardModel.getAllDashboardTags(
            guildId
          );

          // Combine and deduplicate
          const allTags = [...new Set([...targetTags, ...dashboardTags])];

          // Filter based on user input
          const userInput = focusedOption.value.toLowerCase();
          const currentTags = userInput.split(",").map((t) => t.trim());
          const lastTag = currentTags[currentTags.length - 1];

          const filtered = allTags
            .filter((tag) => tag.toLowerCase().includes(lastTag))
            .slice(0, 25);

          // Provide tag combinations
          await interaction.respond(
            filtered.map((tag) => {
              const newTags = currentTags.slice(0, -1).concat(tag);
              return {
                name: newTags.join(", "),
                value: newTags.join(", "),
              };
            })
          );
        } else {
          await interaction.respond([]);
        }
      }
    } catch (error) {
      console.error("Error during livedashboard autocomplete:", error);
      await interaction.respond([]);
    }
  },
};
