// Fixed version of src/commands/leaderboard.js with correct percentage calculations

const {
  SlashCommandBuilder,
  EmbedBuilder,
  MessageFlags,
} = require("discord.js");
const TargetModel = require("../models/target");
const ContributionModel = require("../models/contribution");

function createContributionBar(percentage, length = 10) {
  const filledLength = Math.round((percentage / 100) * length);
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

// FIXED: Proper percentage calculation with rounding and validation
function calculatePercentage(part, total, decimals = 1) {
  if (!total || total === 0) return 0;
  const percentage = (part / total) * 100;
  return (
    Math.round(percentage * Math.pow(10, decimals)) / Math.pow(10, decimals)
  );
}

// FIXED: Ensure proper number conversion
function ensureNumber(value) {
  const num = typeof value === "string" ? parseInt(value, 10) : value;
  return isNaN(num) ? 0 : num;
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

  async execute(interaction, guildId = null) {
    try {
      // Use provided guildId or fallback to interaction guild
      const currentGuildId = guildId || interaction.guild?.id;

      if (!currentGuildId) {
        return interaction.reply({
          content: "This command can only be used in a server.",
          flags: MessageFlags.Ephemeral,
        });
      }

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
        `📊 Showing top ${limit} contributors for this server`,
        actionFilter !== "all" ? `for ${actionFilter}` : "",
        resourceFilter ? `of ${resourceFilter}` : "",
        fromDate ? `\n📅 From: ${fromDate.toISOString().split("T")[0]}` : "",
        toDate ? `To: ${toDate.toISOString().split("T")[0]}` : "",
      ];
      embed.setDescription(descriptionParts.join(" "));

      // Get all targets for this guild
      const targets = await TargetModel.getAllWithProgress(currentGuildId);

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
          "No matching targets found with the specified filters for this server."
        );
        return interaction.editReply({ embeds: [embed] });
      }

      // FIXED: Collect and calculate user contributions with proper number handling
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

        // FIXED: Count contributions by user with proper number conversion
        for (const contribution of filteredContributions) {
          const userId = contribution.user_id;
          const amount = ensureNumber(contribution.amount); // Ensure it's a number

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
          userData.total += amount;
          grandTotal += amount;

          // Track by action type
          if (!userData.actions.has(target.action)) {
            userData.actions.set(target.action, 0);
          }
          userData.actions.set(
            target.action,
            userData.actions.get(target.action) + amount
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
        if (resourceFilter) {
          embed.setDescription(
            `No contributions found for resource: ${resourceFilter} in this server.`
          );
        } else {
          embed.setDescription(
            "No contributions found with the specified filters for this server."
          );
        }
        return interaction.editReply({ embeds: [embed] });
      }

      // FIXED: Validate grandTotal before percentage calculations
      if (grandTotal === 0) {
        embed.setDescription(
          "No contributions found for the specified criteria."
        );
        return interaction.editReply({ embeds: [embed] });
      }

      // Sort users by total contribution
      const sortedUsers = Array.from(userContributions.values())
        .sort((a, b) => b.total - a.total)
        .slice(0, limit);

      // Find max contribution for bar scaling
      const maxContribution = sortedUsers[0]?.total || 1;

      // FIXED: Add field for each user with proper percentage calculations
      sortedUsers.forEach((userData, index) => {
        // Calculate the user's percentage of total contributions
        const contributionPercentage = calculatePercentage(
          userData.total,
          grandTotal,
          1
        );

        // ✅ NEW: Bar filled based on actual percentage, not relative to max user
        const contributionBar = createContributionBar(contributionPercentage);

        // Breakdown by action type with validation
        let detailText = "";
        let actionTotalCheck = 0;

        userData.actions.forEach((amount, action) => {
          const actionPercentage = calculatePercentage(
            amount,
            userData.total,
            1
          );
          actionTotalCheck += amount;

          detailText += `${
            action.charAt(0).toUpperCase() + action.slice(1)
          }: ${amount} SCU (${actionPercentage}%)\n`;
        });

        // Add validation warning if totals don't match
        if (Math.abs(actionTotalCheck - userData.total) > 0.01) {
          console.warn(
            `User ${userData.username}: Action totals (${actionTotalCheck}) don't match user total (${userData.total})`
          );
        }

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

      // FIXED: Add comprehensive statistics field with validation
      const totalContributors = userContributions.size;
      const averageContribution =
        totalContributors > 0 ? Math.round(grandTotal / totalContributors) : 0;

      embed.addFields({
        name: "📊 Collection Overview",
        value: [
          `**Total Contributions**: ${grandTotal.toLocaleString()} SCU`,
          `**Average Contribution**: ${averageContribution.toLocaleString()} SCU per contributor`,
          `**Unique Contributors**: ${totalContributors}`,
          `**Percentage Calculation**: Based on ${grandTotal.toLocaleString()} total SCU`,
        ].join("\n"),
      });

      // FIXED: Conditional field for action type stats with proper calculations
      if (actionFilter !== "all") {
        const actionTotal = sortedUsers.reduce((sum, user) => {
          const actionAmount = ensureNumber(
            user.actions.get(actionFilter) || 0
          );
          return sum + actionAmount;
        }, 0);

        const actionPercentage = calculatePercentage(
          actionTotal,
          grandTotal,
          1
        );

        embed.addFields({
          name: `🎯 ${
            actionFilter.charAt(0).toUpperCase() + actionFilter.slice(1)
          } Contribution Insights`,
          value: [
            `**Total ${actionFilter} Contributions**: ${actionTotal.toLocaleString()} SCU`,
            `**Percentage of Overall**: ${actionPercentage}%`,
            `**Average per Top ${
              sortedUsers.length
            } Contributors**: ${Math.round(
              actionTotal / sortedUsers.length
            )} SCU`,
          ].join("\n"),
        });
      }

      // FIXED: Add debug info for percentage validation (only in development)
      if (process.env.NODE_ENV === "development") {
        const percentageSum = sortedUsers.reduce((sum, user) => {
          return sum + calculatePercentage(user.total, grandTotal, 1);
        }, 0);

        console.log(
          `DEBUG: Total percentage sum: ${percentageSum}% (should be ≤ 100%)`
        );
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
