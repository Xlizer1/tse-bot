const {
  SlashCommandBuilder,
  EmbedBuilder,
  MessageFlags,
} = require("discord.js");
const TargetModel = require("../models/target");
const ContributionModel = require("../models/contribution");

function createContributionBar(amount, maxAmount, length = 10) {
  const filledLength = Math.round((amount / maxAmount) * length);
  const emptyLength = length - filledLength;

  const filledEmoji = "🟩"; // Green square for filled
  const emptyEmoji = "⬜"; // White square for empty

  return filledEmoji.repeat(filledLength) + emptyEmoji.repeat(emptyLength);
}

function getContributionColor(percentage) {
  if (percentage >= 25) return 0x4caf50; // Green for substantial contributors
  if (percentage >= 10) return 0x2196f3; // Blue for moderate contributors
  return 0x9e9e9e; // Gray for minor contributors
}

module.exports = {
  data: new SlashCommandBuilder()
    .setName("leaderboard")
    .setDescription("Show top contributors for resource collection")
    .addStringOption((option) =>
      option
        .setName("filter")
        .setDescription("Filter by action type")
        .setRequired(false)
        .addChoices(
          { name: "All", value: "all" },
          { name: "Mine", value: "mine" },
          { name: "Salvage", value: "salvage" },
          { name: "Haul", value: "haul" }
        )
    )
    .addStringOption((option) =>
      option
        .setName("resource")
        .setDescription("Filter by specific resource")
        .setRequired(false)
    )
    .addIntegerOption((option) =>
      option
        .setName("limit")
        .setDescription("Number of top contributors to show")
        .setRequired(false)
        .setMinValue(1)
        .setMaxValue(25)
    )
    .addStringOption((option) =>
      option
        .setName("date_from")
        .setDescription("Filter from date (YYYY-MM-DD)")
        .setRequired(false)
    )
    .addStringOption((option) =>
      option
        .setName("date_to")
        .setDescription("Filter to date (YYYY-MM-DD)")
        .setRequired(false)
    ),

  async execute(interaction) {
    try {
      await interaction.deferReply(); // Use defer since this might take time

      // Get filter options
      const actionFilter = interaction.options.getString("filter") || "all";
      const resourceFilter = interaction.options
        .getString("resource")
        ?.toLowerCase();
      const limit = interaction.options.getInteger("limit") || 10;
      const dateFrom = interaction.options.getString("date_from");
      const dateTo = interaction.options.getString("date_to");

      // Parse date filters if provided
      const fromDate = dateFrom ? new Date(dateFrom) : null;
      const toDate = dateTo ? new Date(dateTo + "T23:59:59") : null; // End of the day

      // Validate dates if provided
      if (
        (fromDate && isNaN(fromDate.getTime())) ||
        (toDate && isNaN(toDate.getTime()))
      ) {
        return interaction.editReply({
          content: "Invalid date format. Please use YYYY-MM-DD.",
          flags: MessageFlags.Ephemeral,
        });
      }

      // Create embed for the response
      const embed = new EmbedBuilder()
        .setColor(0x0099ff)
        .setTitle("🏆 Resource Collection Leaderboard")
        .setTimestamp();

      // Detailed description with filter information
      const descriptionParts = [
        `📊 Showing top ${limit} contributors`,
        actionFilter !== "all" ? `for ${actionFilter}` : "",
        resourceFilter ? `of ${resourceFilter}` : "",
        fromDate ? `\n📅 From: ${fromDate.toISOString().split("T")[0]}` : "",
        toDate ? `To: ${toDate.toISOString().split("T")[0]}` : "",
      ];
      embed.setDescription(descriptionParts.join(" "));

      // Get all targets
      const targets = await TargetModel.getAllWithProgress();

      // Filter targets by action type and resource if specified
      let filteredTargets = targets;

      if (actionFilter !== "all") {
        filteredTargets = filteredTargets.filter(
          (target) => target.action === actionFilter
        );
      }

      if (resourceFilter) {
        filteredTargets = filteredTargets.filter(
          (target) => target.resource === resourceFilter
        );
      }

      if (filteredTargets.length === 0) {
        embed.setDescription(
          "No matching targets found with the specified filters."
        );
        return interaction.editReply({ embeds: [embed] });
      }

      // Collect and calculate user contributions
      const userContributions = new Map();
      let contributionsFound = false;
      let grandTotal = 0;

      // Process contributions for each target
      for (const target of filteredTargets) {
        const contributions = await ContributionModel.getByTargetId(
          target.id,
          1000
        );

        // Apply date filters if provided
        const filteredContributions = contributions.filter((contribution) => {
          const contributionDate = new Date(contribution.timestamp);

          if (fromDate && contributionDate < fromDate) {
            return false;
          }

          if (toDate && contributionDate > toDate) {
            return false;
          }

          contributionsFound = true;
          return true;
        });

        // Count contributions by user
        for (const contribution of filteredContributions) {
          const userId = contribution.user_id;

          if (!userContributions.has(userId)) {
            userContributions.set(userId, {
              userId,
              username: contribution.username,
              total: 0,
              actions: new Map(),
              latestContribution: contribution.timestamp,
            });
          }

          const userData = userContributions.get(userId);
          userData.total += contribution.amount;
          grandTotal += contribution.amount;

          // Track by action type
          if (!userData.actions.has(target.action)) {
            userData.actions.set(target.action, 0);
          }
          userData.actions.set(
            target.action,
            userData.actions.get(target.action) + contribution.amount
          );

          // Update latest contribution time
          if (
            new Date(contribution.timestamp) >
            new Date(userData.latestContribution)
          ) {
            userData.latestContribution = contribution.timestamp;
          }
        }
      }

      if (!contributionsFound) {
        embed.setDescription(
          "No contributions found with the specified filters."
        );
        return interaction.editReply({ embeds: [embed] });
      }

      // Sort users by total contribution
      const sortedUsers = Array.from(userContributions.values())
        .sort((a, b) => b.total - a.total)
        .slice(0, limit);

      // Find max contribution for bar scaling
      const maxContribution = sortedUsers[0]?.total || 1;

      // Add field for each user
      sortedUsers.forEach((userData, index) => {
        // Create detailed contribution breakdown
        let detailText = "";
        const contributionPercentage = Math.floor(
          (userData.total / grandTotal) * 100
        );
        const contributionBar = createContributionBar(
          userData.total,
          maxContribution
        );

        // Breakdown by action type
        userData.actions.forEach((amount, action) => {
          const actionPercentage = Math.floor((amount / userData.total) * 100);
          detailText += `${
            action.charAt(0).toUpperCase() + action.slice(1)
          }: ${amount} SCU (${actionPercentage}%)\n`;
        });

        // Add emoji for top 3
        const rankEmoji =
          index === 0 ? "🥇" : index === 1 ? "🥈" : index === 2 ? "🥉" : "🏅";

        // Latest contribution details
        const latestContributionDate = new Date(
          userData.latestContribution
        ).toLocaleString();

        embed.addFields({
          name: `${rankEmoji} #${index + 1}: ${userData.username} (${
            userData.total
          } SCU)`,
          value: [
            `${contributionBar} ${contributionPercentage}% of total`,
            `🕒 Latest contribution: ${latestContributionDate}`,
            `\n**Breakdown:**\n${detailText}`,
          ].join("\n"),
          color: getContributionColor(contributionPercentage),
        });
      });

      // Add comprehensive statistics field
      embed.addFields({
        name: "📊 Collection Overview",
        value: [
          `**Total Contributions**: ${grandTotal} SCU`,
          `**Average Contribution**: ${Math.floor(
            grandTotal / sortedUsers.length
          )} SCU per top contributor`,
          `**Unique Contributors**: ${userContributions.size}`,
        ].join("\n"),
      });

      // Conditional field for action type stats if filtered
      if (actionFilter !== "all") {
        const actionTotal = sortedUsers.reduce((sum, user) => {
          const actionAmount = user.actions.get(actionFilter) || 0;
          return sum + actionAmount;
        }, 0);

        embed.addFields({
          name: `🎯 ${
            actionFilter.charAt(0).toUpperCase() + actionFilter.slice(1)
          } Contribution Insights`,
          value: [
            `**Total ${actionFilter} Contributions**: ${actionTotal} SCU`,
            `**Percentage of Overall**: ${Math.floor(
              (actionTotal / grandTotal) * 100
            )}%`,
          ].join("\n"),
        });
      }

      await interaction.editReply({ embeds: [embed] });
    } catch (error) {
      console.error("Error in leaderboard command:", error);

      // If already deferred, editReply, otherwise reply
      if (interaction.deferred) {
        await interaction.editReply({
          content: "An error occurred while fetching leaderboard data.",
          flags: MessageFlags.Ephemeral,
        });
      } else {
        await interaction.reply({
          content: "An error occurred while fetching leaderboard data.",
          flags: MessageFlags.Ephemeral,
        });
      }
    }
  },
};
