const { EmbedBuilder } = require("discord.js");
const TargetModel = require("./models/target");
const ContributionModel = require("./models/contribution");
const { DashboardModel } = require("./models/dashboard");

// Create a progress embed based on targets
async function createProgressEmbed() {
  const embed = new EmbedBuilder()
    .setColor(0x0099ff)
    .setTitle("Resource Collection Progress")
    .setDescription("Current progress towards resource targets")
    .setTimestamp();

  try {
    // Get all targets with progress
    const targets = await TargetModel.getAllWithProgress();

    // Check if there are any targets
    if (targets.length === 0) {
      embed.setDescription(
        "No resource targets have been set yet. Ask an admin to set targets using the /settarget command."
      );
      return embed;
    }

    // Add progress for each resource
    for (const target of targets) {
      const current = target.current_amount || 0;
      const percentage = Math.floor((current / target.target_amount) * 100);

      // Create progress bar
      const barLength = 15;
      const filledChars = Math.round((percentage / 100) * barLength);
      const progressBar =
        "█".repeat(filledChars) + "░".repeat(barLength - filledChars);

      // Get last contributor if any
      let lastContributor = "No contributions yet";

      const latestContribution = await ContributionModel.getLatestForTarget(
        target.id
      );

      if (latestContribution) {
        const date = new Date(latestContribution.timestamp);
        const timeString = date.toLocaleString();

        lastContributor = `Last: ${latestContribution.username} added ${latestContribution.amount} SCU (${timeString})`;
      }

      // Capitalize resource and action names
      const resourceName =
        target.resource_name ||
        target.resource.charAt(0).toUpperCase() + target.resource.slice(1);
      const actionName =
        target.action.charAt(0).toUpperCase() + target.action.slice(1);

      embed.addFields({
        name: `${actionName} ${resourceName}`,
        value: `${progressBar} ${current}/${target.target_amount} SCU (${percentage}%)\n${lastContributor}`,
      });
    }

    return embed;
  } catch (error) {
    console.error("Error creating progress embed:", error);
    embed.setDescription("An error occurred while loading progress data.");
    return embed;
  }
}

// Update all dashboards when resource data changes
async function updateDashboards(client) {
  try {
    try {
      // Get all dashboard records
      const dashboards = await DashboardModel.getAll();

      // Check if there are any dashboards
      if (dashboards.length === 0) return;

      // Create updated embed
      const updatedEmbed = await createProgressEmbed();

      // Update each dashboard
      const validDashboards = [];

      for (const dashboard of dashboards) {
        const { guild_id, channel_id, message_id } = dashboard;

        try {
          // Get guild
          const guild = client.guilds.cache.get(guild_id);
          if (!guild) continue;

          // Get channel
          const channel = guild.channels.cache.get(channel_id);
          if (!channel) continue;

          // Get message
          const message = await channel.messages
            .fetch(message_id)
            .catch(() => null);
          if (!message) {
            // Remove invalid dashboard
            await DashboardModel.remove(message_id);
            continue;
          }

          // Update the message
          await message.edit({ embeds: [updatedEmbed] });

          // This dashboard is valid, keep it
          validDashboards.push(dashboard);
        } catch (error) {
          console.error(`Error updating dashboard ${message_id}:`, error);
          // Remove problematic dashboard
          await DashboardModel.remove(message_id);
        }
      }
    } catch (error) {
      if (error.code === "ER_NO_SUCH_TABLE") {
        console.log(
          "Dashboards table not found. This will be created during database initialization."
        );
        return; // Exit the function without throwing an error
      }
      throw error; // Rethrow other errors
    }
  } catch (error) {
    console.error("Error in updateDashboards:", error);
  }
}

// Handle dashboard refresh button
async function handleRefreshDashboard(interaction) {
  try {
    // Create updated embed
    const updatedEmbed = await createProgressEmbed();

    // Update the message
    await interaction.message.edit({ embeds: [updatedEmbed] });

    // Acknowledge the interaction
    await interaction.reply({
      content: "Dashboard refreshed!",
      ephemeral: true,
    });
  } catch (error) {
    console.error("Error in handleRefreshDashboard:", error);
    await interaction.reply({
      content: "An error occurred while refreshing the dashboard.",
      ephemeral: true,
    });
  }
}

module.exports = {
  updateDashboards,
  handleRefreshDashboard,
  createProgressEmbed,
};
