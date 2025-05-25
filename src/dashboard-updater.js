// Updated src/dashboard-updater.js with tag filtering support

const { EmbedBuilder, MessageFlags } = require("discord.js");
const TargetModel = require("./models/target");
const ContributionModel = require("./models/contribution");
const ResourceModel = require("./models/resource");
const ActionTypeModel = require("./models/actionType");
const { DashboardModel } = require("./models/dashboard");
const { pool } = require("./database");

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
    mine: "⛏️",
    mining: "⛏️",
    salvage: "🏭",
    haul: "🚚",
    earn: "💰",
  };

  return emojiMap[actionName] || "📦";
}

// Generate insights and stats for a specific guild with optional tag filtering
async function generateDashboardInsights(guildId, targetTags = null) {
  try {
    if (!guildId) {
      throw new Error("Guild ID is required for dashboard insights");
    }

    // Get targets with optional tag filtering
    const targets = await TargetModel.getAllWithProgress(guildId, targetTags);
    const actionTypes = await ActionTypeModel.getAll();

    // FIXED: Validate target IDs before getting top contributors
    const validTargets = targets.filter((t) => t && t.id && !isNaN(t.id));
    const targetIds = validTargets.map((t) => parseInt(t.id));

    console.log(
      `Dashboard insights: Found ${targets.length} targets, ${validTargets.length} valid, ${targetIds.length} IDs`
    );

    // For top contributors, we need to filter by the targets in this dashboard
    let topContributors = [];
    if (targetIds.length > 0) {
      try {
        topContributors = await ContributionModel.getTopContributorsForTargets(
          targetIds,
          3
        );
      } catch (contributorError) {
        console.error(
          "Error getting top contributors, continuing without them:",
          contributorError
        );
        topContributors = [];
      }
    }

    // Calculate overall stats using valid targets
    const totalTargets = validTargets.length;
    const uniqueResourceTypes = new Set(validTargets.map((t) => t.resource))
      .size;
    const totalContributions = validTargets.reduce(
      (sum, target) => sum + (parseInt(target.current_amount) || 0),
      0
    );
    const totalTargetAmount = validTargets.reduce(
      (sum, target) => sum + (parseInt(target.target_amount) || 0),
      0
    );
    const overallProgress =
      totalTargetAmount > 0
        ? Math.floor((totalContributions / totalTargetAmount) * 100)
        : 0;

    // Resource type breakdown using valid targets
    const resourceBreakdown = validTargets.reduce((acc, target) => {
      const action = target.action;
      if (!acc[action]) acc[action] = { total: 0, current: 0 };
      acc[action].total += parseInt(target.target_amount) || 0;
      acc[action].current += parseInt(target.current_amount) || 0;
      return acc;
    }, {});

    // Closest to completion and furthest from completion using valid targets
    const sortedTargets = validTargets
      .map((target) => ({
        ...target,
        current_amount: parseInt(target.current_amount) || 0,
        target_amount: parseInt(target.target_amount) || 0,
        percentage: Math.floor(
          ((parseInt(target.current_amount) || 0) /
            (parseInt(target.target_amount) || 1)) *
            100
        ),
      }))
      .sort((a, b) => b.percentage - a.percentage);

    // Rest of the function continues as before...
    const insights = {
      totalTargets,
      uniqueResourceTypes,
      totalContributions,
      overallProgress,
      progressBar: createProgressBar(overallProgress),
      resourceBreakdown: Object.entries(resourceBreakdown).map(
        ([action, data]) => {
          // Find the corresponding action type
          const actionType = actionTypes.find((at) => at.name === action) || {
            display_name: action.charAt(0).toUpperCase() + action.slice(1),
            emoji: null,
            unit: "SCU",
          };

          return {
            action,
            displayName: actionType.display_name,
            emoji: actionType.emoji,
            unit: actionType.unit,
            percentage:
              data.total > 0
                ? Math.floor((data.current / data.total) * 100)
                : 0,
            current: data.current,
            total: data.total,
            progressBar: createProgressBar(
              data.total > 0 ? Math.floor((data.current / data.total) * 100) : 0
            ),
          };
        }
      ),
      closestTarget: sortedTargets[0] || null,
      furthestTarget: sortedTargets[sortedTargets.length - 1] || null,
      topContributors,
      targetTags,
    };

    return insights;
  } catch (error) {
    console.error("Error generating dashboard insights:", error);
    return null;
  }
}

// Create a progress embed based on targets for a specific guild with optional filtering
async function createProgressEmbed(
  guildIdOrConfig,
  targetTags = null,
  customTitle = null
) {
  const embed = new EmbedBuilder().setColor(0x0099ff).setTimestamp();

  try {
    // Handle both old format (just guildId) and new format (config object)
    let guildId, title, tags;

    if (typeof guildIdOrConfig === "object" && guildIdOrConfig !== null) {
      guildId = guildIdOrConfig.guildId;
      tags = targetTags || guildIdOrConfig.targetTags || null;
      title =
        customTitle ||
        guildIdOrConfig.title ||
        "🚀 Terra Star Expeditionary Dashboard";
    } else {
      guildId = guildIdOrConfig;
      tags = targetTags;
      title = customTitle || "🚀 Terra Star Expeditionary Dashboard";
    }

    embed.setTitle(title);

    if (!guildId) {
      embed.setDescription(
        "❌ Error: Guild ID is required to display dashboard data."
      );
      embed.setColor(0xff0000);
      return embed;
    }

    const insights = await generateDashboardInsights(guildId, tags);

    if (!insights) {
      embed.setDescription(
        "⚠️ Unable to generate dashboard insights at this time."
      );
      embed.setColor(0xffaa00);
      return embed;
    }

    // Check if there's any data
    if (insights.totalTargets === 0) {
      let noDataMessage = "📋 No targets have been set";

      if (tags && tags.length > 0) {
        noDataMessage += ` with tags: ${tags.join(", ")}`;
      } else {
        noDataMessage += " for this dashboard";
      }

      noDataMessage += ".\nUse `/settarget` to create collection targets!";

      embed.setDescription(noDataMessage);
      embed.setColor(0x888888);
      return embed;
    }

    // Construct detailed description
    const descriptionParts = [
      `**📊 Overall Progress**: ${insights.progressBar} ${insights.overallProgress}%`,
      `**🎯 Total Targets**: ${insights.totalTargets}`,
      `**💎 Unique Resource Types**: ${insights.uniqueResourceTypes}`,
      `**📦 Total Contributions**: ${insights.totalContributions}`,
    ];

    // Add tag info if filtering
    if (tags && tags.length > 0) {
      descriptionParts.push(`**🏷️ Filter**: ${tags.join(", ")}`);
    }

    embed.setDescription(descriptionParts.join("\n"));

    // Resource Breakdown
    if (insights.resourceBreakdown.length > 0) {
      const resourceBreakdownField = insights.resourceBreakdown
        .map((rb) => {
          const emoji = getActionEmoji(rb.action, rb.emoji);
          return `${emoji} **${rb.displayName}**: ${rb.progressBar} ${rb.percentage}% (${rb.current}/${rb.total} ${rb.unit})`;
        })
        .join("\n");

      embed.addFields({
        name: "📈 Resource Type Breakdown",
        value:
          resourceBreakdownField.length > 1024
            ? resourceBreakdownField.substring(0, 1020) + "..."
            : resourceBreakdownField,
      });
    }

    // Top Contributors
    if (insights.topContributors && insights.topContributors.length > 0) {
      const topContributorsField = insights.topContributors
        .map((contributor, index) => {
          const medal = index === 0 ? "🥇" : index === 1 ? "🥈" : "🥉";
          return `${medal} ${contributor.username}: ${contributor.total_amount} total`;
        })
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

      const resourceName = (target) =>
        target.resource_name ||
        target.resource.charAt(0).toUpperCase() + target.resource.slice(1);

      const targetsInsight = [];

      if (closestTarget.percentage >= 100) {
        targetsInsight.push(
          `**🎉 Completed**: ${resourceName(closestTarget)} (100%)`
        );
      } else {
        targetsInsight.push(
          `**🎯 Closest Target**: ${resourceName(closestTarget)} (${
            closestTarget.percentage
          }%)`
        );
      }

      if (furthestTarget.id !== closestTarget.id) {
        targetsInsight.push(
          `**📈 Needs Attention**: ${resourceName(furthestTarget)} (${
            furthestTarget.percentage
          }%)`
        );
      }

      embed.addFields({
        name: "🎯 Target Status",
        value: targetsInsight.join("\n"),
      });
    }

    return embed;
  } catch (error) {
    console.error("Error creating progress embed:", error);
    embed.setDescription(
      "❌ An error occurred while loading dashboard data for this server."
    );
    embed.setColor(0xff0000);
    return embed;
  }
}

// Update all dashboards when resource data changes
async function updateDashboards(client) {
  if (!client || !client.db) {
    console.warn("⚠️ Client or database not available for dashboard updates");
    return;
  }

  try {
    // Get all dashboard records with configs
    const dashboards = await DashboardModel.getAll();

    if (dashboards.length === 0) {
      return; // No dashboards to update
    }

    console.log(`🔄 Updating ${dashboards.length} dashboards...`);

    // Update each dashboard with proper error handling and cleanup
    let updatedCount = 0;
    let cleanedCount = 0;

    for (const dashboard of dashboards) {
      const { id, guild_id, channel_id, message_id, config, source_guild_id } =
        dashboard;

      // Determine which guild's data to use
      const dataGuildId = source_guild_id || guild_id;

      try {
        // Get guild with timeout
        const guild = await Promise.race([
          client.guilds.fetch(guild_id),
          new Promise((_, reject) =>
            setTimeout(() => reject(new Error("Guild fetch timeout")), 5000)
          ),
        ]);

        if (!guild) {
          console.log(`🗑️ Guild ${guild_id} not found, removing dashboard`);
          await DashboardModel.remove(message_id);
          cleanedCount++;
          continue;
        }

        // Get channel
        const channel = guild.channels.cache.get(channel_id);
        if (!channel) {
          console.log(`🗑️ Channel ${channel_id} not found, removing dashboard`);
          await DashboardModel.remove(message_id);
          cleanedCount++;
          continue;
        }

        // Get message with timeout
        const message = await Promise.race([
          channel.messages.fetch(message_id),
          new Promise((_, reject) =>
            setTimeout(() => reject(new Error("Message fetch timeout")), 5000)
          ),
        ]).catch(() => null);

        if (!message) {
          console.log(`🗑️ Message ${message_id} not found, removing dashboard`);
          await DashboardModel.remove(message_id);
          cleanedCount++;
          continue;
        }

        // Create updated embed with dashboard-specific configuration
        const dashboardConfig = {
          guildId: dataGuildId,
          targetTags: config?.targetTags || null,
          title: config?.title || "🚀 Terra Star Expeditionary Dashboard",
        };

        const updatedEmbed = await createProgressEmbed(dashboardConfig);

        // Add source attribution for shared dashboards
        if (dataGuildId !== guild_id) {
          let sourceName = dataGuildId;
          try {
            const sourceGuild = await client.guilds.fetch(dataGuildId);
            if (sourceGuild) {
              sourceName = sourceGuild.name;
            }
          } catch (err) {
            console.log(
              `⚠️ Could not fetch source guild info for ${dataGuildId}`
            );
          }

          updatedEmbed.setFooter({
            text: `Data from: ${sourceName} | ID: ${dataGuildId}`,
            iconURL: guild.iconURL({ dynamic: true }),
          });
        }

        // Update the message with timeout
        await Promise.race([
          message.edit({ embeds: [updatedEmbed] }),
          new Promise((_, reject) =>
            setTimeout(() => reject(new Error("Message edit timeout")), 10000)
          ),
        ]);

        updatedCount++;
      } catch (error) {
        console.error(
          `❌ Error updating dashboard ${message_id}:`,
          error.message
        );

        // If it's a permission or not found error, clean up the dashboard
        if (
          error.code === 50013 ||
          error.code === 10008 ||
          error.code === 10003
        ) {
          console.log(`🗑️ Removing invalid dashboard ${message_id}`);
          await DashboardModel.remove(message_id);
          cleanedCount++;
        }
      }
    }

    if (updatedCount > 0 || cleanedCount > 0) {
      console.log(
        `✅ Dashboard update complete: ${updatedCount} updated, ${cleanedCount} cleaned up`
      );
    }
  } catch (error) {
    console.error("💥 Error in updateDashboards:", error);
  }
}

// Handle dashboard refresh button
async function handleRefreshDashboard(interaction) {
  try {
    // Get the dashboard config
    const dashboard = await DashboardModel.getByMessageId(
      interaction.message.id
    );

    // Check if this is a shared dashboard button (format: refresh_dashboard_GUILDID)
    const buttonId = interaction.customId;
    let sourceGuildId = dashboard?.source_guild_id || interaction.guild?.id;

    if (buttonId.startsWith("refresh_dashboard_")) {
      sourceGuildId = buttonId.replace("refresh_dashboard_", "");
    }

    if (!sourceGuildId) {
      return interaction.reply({
        content: "❌ Error: Could not determine guild context for refresh.",
        flags: MessageFlags.Ephemeral,
      });
    }

    // Defer the reply to prevent timeout
    await interaction.deferReply({ flags: MessageFlags.Ephemeral });

    try {
      // Create updated embed with dashboard-specific configuration
      const dashboardConfig = {
        guildId: sourceGuildId,
        targetTags: dashboard?.config?.targetTags || null,
        title:
          dashboard?.config?.title || "🚀 Terra Star Expeditionary Dashboard",
      };

      const updatedEmbed = await createProgressEmbed(dashboardConfig);

      // Add source attribution for shared dashboards
      if (sourceGuildId !== interaction.guild?.id) {
        let sourceName = sourceGuildId;
        try {
          const sourceGuild = await interaction.client.guilds.fetch(
            sourceGuildId
          );
          if (sourceGuild) {
            sourceName = sourceGuild.name;
          }
        } catch (err) {
          console.log(`⚠️ Could not fetch guild info for ${sourceGuildId}`);
        }

        updatedEmbed.setFooter({
          text: `Data from: ${sourceName} | ID: ${sourceGuildId}`,
          iconURL: interaction.guild?.iconURL({ dynamic: true }),
        });
      }

      // Update the message
      await interaction.message.edit({ embeds: [updatedEmbed] });

      // Acknowledge the interaction
      await interaction.editReply({
        content: "✅ Dashboard refreshed successfully!",
      });
    } catch (updateError) {
      console.error("Error updating dashboard:", updateError);
      await interaction.editReply({
        content:
          "⚠️ Dashboard refreshed, but there was an issue updating the display.",
      });
    }
  } catch (error) {
    console.error("Error in handleRefreshDashboard:", error);

    try {
      if (interaction.deferred) {
        await interaction.editReply({
          content: "❌ An error occurred while refreshing the dashboard.",
        });
      } else {
        await interaction.reply({
          content: "❌ An error occurred while refreshing the dashboard.",
          flags: MessageFlags.Ephemeral,
        });
      }
    } catch (replyError) {
      console.error("Error sending error reply:", replyError);
    }
  }
}

// Add to ContributionModel - new method to get top contributors for specific targets
ContributionModel.getTopContributorsForTargets = async function (
  targetIds,
  limit = 10
) {
  try {
    // Validate inputs
    if (!targetIds || !Array.isArray(targetIds) || targetIds.length === 0) {
      return [];
    }

    // Filter and validate target IDs
    const validTargetIds = targetIds
      .filter((id) => id !== null && id !== undefined && !isNaN(id))
      .map((id) => parseInt(id))
      .filter((id) => id > 0);

    if (validTargetIds.length === 0) {
      return [];
    }

    const validLimit = Math.max(1, Math.min(parseInt(limit) || 10, 100));

    // Use a simpler approach that avoids the prepared statement issue
    const userContributions = new Map();

    // Process each target ID individually to avoid the IN clause issue
    for (const targetId of validTargetIds) {
      const [contributions] = await pool.execute(
        `SELECT user_id, username, amount FROM contributions WHERE target_id = ?`,
        [targetId]
      );

      contributions.forEach((contrib) => {
        const userId = contrib.user_id;
        if (!userContributions.has(userId)) {
          userContributions.set(userId, {
            user_id: userId,
            username: contrib.username,
            total_amount: 0,
          });
        }
        userContributions.get(userId).total_amount += contrib.amount;
      });
    }

    // Convert to array, sort by total, and limit results
    const results = Array.from(userContributions.values())
      .sort((a, b) => b.total_amount - a.total_amount)
      .slice(0, validLimit);

    return results;
  } catch (error) {
    console.error("Error getting top contributors for targets:", error);
    return []; // Always return empty array on error to prevent crashes
  }
};

module.exports = {
  updateDashboards,
  handleRefreshDashboard,
  createProgressEmbed,
};
