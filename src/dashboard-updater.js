const { EmbedBuilder, MessageFlags } = require("discord.js");
const TargetModel = require("./models/target");
const ContributionModel = require("./models/contribution");
const ResourceModel = require("./models/resource");
const ActionTypeModel = require("./models/actionType");
const { DashboardModel } = require("./models/dashboard");

// Create emoji-based visuals for progress
function createProgressBar(percentage, length = 10) {
  const filledLength = Math.round((percentage / 100) * length);
  const emptyLength = length - filledLength;

  const filledEmoji = "🟦"; // Blue square for filled
  const emptyEmoji = "⬜"; // White square for empty

  return filledEmoji.repeat(filledLength) + emptyEmoji.repeat(emptyLength);
}

// Get emoji for action type
function getActionEmoji(actionName, actionEmoji = null) {
  if (actionEmoji) return actionEmoji;
  
  const emojiMap = {
    "mine": "⛏️",
    "salvage": "🏭",
    "haul": "🚚",
    "earn": "💰"
  };
  
  return emojiMap[actionName] || "📦";
}

// Generate insights and stats
async function generateDashboardInsights() {
  try {
    // Get all targets
    const targets = await TargetModel.getAllWithProgress();
    const actionTypes = await ActionTypeModel.getAll();
    const topContributors = await ContributionModel.getTopContributors(3);

    // Calculate overall stats
    const totalTargets = targets.length;
    const uniqueResourceTypes = new Set(targets.map((t) => t.resource)).size;
    const totalContributions = targets.reduce(
      (sum, target) => sum + (target.current_amount || 0),
      0
    );
    const totalTargetAmount = targets.reduce(
      (sum, target) => sum + target.target_amount,
      0
    );
    const overallProgress = Math.floor(
      (totalContributions / totalTargetAmount) * 100
    );

    // Resource type breakdown
    const resourceBreakdown = targets.reduce((acc, target) => {
      const action = target.action;
      if (!acc[action]) acc[action] = { total: 0, current: 0 };
      acc[action].total += target.target_amount;
      acc[action].current += target.current_amount || 0;
      return acc;
    }, {});

    // Closest to completion and furthest from completion
    const sortedTargets = targets
      .map((target) => ({
        ...target,
        percentage: Math.floor(
          ((target.current_amount || 0) / target.target_amount) * 100
        ),
      }))
      .sort((a, b) => b.percentage - a.percentage);

    // Prepare insights
    const insights = {
      totalTargets,
      uniqueResourceTypes,
      totalContributions,
      overallProgress,
      progressBar: createProgressBar(overallProgress),
      resourceBreakdown: Object.entries(resourceBreakdown).map(
        ([action, data]) => {
          // Find the corresponding action type
          const actionType = actionTypes.find(at => at.name === action) || {
            display_name: action.charAt(0).toUpperCase() + action.slice(1),
            emoji: null,
            unit: "SCU"
          };
          
          return {
            action,
            displayName: actionType.display_name,
            emoji: actionType.emoji,
            unit: actionType.unit,
            percentage: Math.floor((data.current / data.total) * 100),
            progressBar: createProgressBar(
              Math.floor((data.current / data.total) * 100)
            ),
          };
        }
      ),
      closestTarget: sortedTargets[0],
      furthestTarget: sortedTargets[sortedTargets.length - 1],
      topContributors,
    };

    return insights;
  } catch (error) {
    console.error("Error generating dashboard insights:", error);
    return null;
  }
}

// Create a progress embed based on targets
async function createProgressEmbed() {
  const embed = new EmbedBuilder()
    .setColor(0x0099ff)
    .setTitle("🚀 Terra Star Expeditionary Dashboard")
    .setTimestamp();

  try {
    const insights = await generateDashboardInsights();

    if (!insights) {
      embed.setDescription(
        "Unable to generate dashboard insights at this time."
      );
      return embed;
    }

    // Construct detailed description
    const description = [
      `**📊 Overall Progress**: ${insights.progressBar} ${insights.overallProgress}%`,
      `**🎯 Total Targets**: ${insights.totalTargets}`,
      `**💎 Unique Resource Types**: ${insights.uniqueResourceTypes}`,
      `**📦 Total Contributions**: ${insights.totalContributions}`,
    ].join("\n");

    embed.setDescription(description);

    // Resource Breakdown
    const resourceBreakdownField = insights.resourceBreakdown
      .map(
        (rb) =>
          `${getActionEmoji(rb.action, rb.emoji)} **${rb.displayName}**: ${
            rb.progressBar
          } ${rb.percentage}%`
      )
      .join("\n");

    embed.addFields({
      name: "📈 Resource Type Breakdown",
      value: resourceBreakdownField || "No active targets",
    });

    // Top Contributors
    if (insights.topContributors && insights.topContributors.length > 0) {
      const topContributorsField = insights.topContributors
        .map(
          (contributor, index) =>
            `${index === 0 ? "🥇" : index === 1 ? "🥈" : "🥉"} ${
              contributor.username
            }: ${contributor.total_amount} total contributions`
        )
        .join("\n");

      embed.addFields({
        name: "🏆 Top Contributors",
        value: topContributorsField,
      });
    }

    // Targets Insights
    if (insights.closestTarget && insights.furthestTarget) {
      const closestTarget = insights.closestTarget;
      const furthestTarget = insights.furthestTarget;
      
      // Get unit for each target
      const closestUnit = closestTarget.unit || "SCU";
      const furthestUnit = furthestTarget.unit || "SCU";
      
      const resourceName = target => target.resource_name || target.resource.charAt(0).toUpperCase() + target.resource.slice(1);
      
      const targetsInsight = [
        `**🎉 Closest Target**: ${resourceName(closestTarget)} (${closestTarget.percentage}%)`,
        `**🏃 Furthest Target**: ${resourceName(furthestTarget)} (${furthestTarget.percentage}%)`,
      ].join("\n");

      embed.addFields({
        name: "🎯 Target Insights",
        value: targetsInsight,
      });
    }

    return embed;
  } catch (error) {
    console.error("Error creating progress embed:", error);

    embed.setDescription("An error occurred while loading dashboard data.");
    return embed;
  }
}

// Update all dashboards when resource data changes
async function updateDashboards(client) {
  try {
    // Check if dashboards table exists
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
        return;
      }
      throw error;
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
      flags: MessageFlags.Ephemeral,
    });
  } catch (error) {
    console.error("Error in handleRefreshDashboard:", error);
    await interaction.reply({
      content: "An error occurred while refreshing the dashboard.",
      flags: MessageFlags.Ephemeral,
    });
  }
}

module.exports = {
  updateDashboards,
  handleRefreshDashboard,
  createProgressEmbed,
};