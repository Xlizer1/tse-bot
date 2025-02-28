const { EmbedBuilder } = require("discord.js");
const TargetModel = require("../models/target");
const ContributionModel = require("../models/contribution");
const { SettingModel } = require("../models/dashboard");

function setupAutoReporting(client) {
  // Check for settings every minute
  setInterval(() => checkAndSendReport(client), 60 * 1000);
  console.log("Auto-reporting scheduler initialized");
}

async function checkAndSendReport(client) {
  try {
    // Get auto-report settings from database
    const autoReport = await SettingModel.getAutoReport();

    // Check if auto-reporting is enabled
    if (!autoReport || !autoReport.enabled) return;

    const { channelId, time, guildId, lastReportDate } = autoReport;

    // Get current date and time
    const now = new Date();
    const currentTime = `${String(now.getUTCHours()).padStart(2, "0")}:${String(
      now.getUTCMinutes()
    ).padStart(2, "0")}`;
    const currentDate = now.toISOString().split("T")[0];

    // Check if it's time to send the report and we haven't sent one today
    if (currentTime === time && currentDate !== lastReportDate) {
      console.log(`Time to send report: ${currentTime} UTC`);
      // Get the guild and channel
      const guild = client.guilds.cache.get(guildId);
      if (!guild) {
        console.log(`Guild ${guildId} not found for auto report`);
        return;
      }

      const channel = guild.channels.cache.get(channelId);
      if (!channel) {
        console.log(`Channel ${channelId} not found for auto report`);
        return;
      }

      // Generate and send the report
      await sendDailyReport(channel);

      // Update last report date
      autoReport.lastReportDate = currentDate;
      await SettingModel.setAutoReport(autoReport);
      console.log(
        `Auto report sent and last report date updated to ${currentDate}`
      );
    }
  } catch (error) {
    console.error("Error in auto-reporting:", error);
  }
}

async function sendDailyReport(channel) {
  try {
    // Get all targets with progress
    const targets = await TargetModel.getAllWithProgress();

    // Create embed for progress report
    const progressEmbed = new EmbedBuilder()
      .setColor(0x0099ff)
      .setTitle("Daily Resource Collection Report")
      .setDescription("Current progress towards collection targets")
      .setTimestamp();

    // Check if there are any targets
    if (targets.length === 0) {
      progressEmbed.setDescription("No resource targets have been set yet.");
      return channel.send({ embeds: [progressEmbed] });
    }

    // Add progress for each resource
    for (const target of targets) {
      const current = target.current_amount || 0;
      const percentage = Math.floor((current / target.target_amount) * 100);

      // Create progress bar
      const barLength = 20;
      const filledChars = Math.round((percentage / 100) * barLength);
      const progressBar =
        "█".repeat(filledChars) + "░".repeat(barLength - filledChars);

      // Get resource name
      const resourceName =
        target.resource_name ||
        target.resource.charAt(0).toUpperCase() + target.resource.slice(1);
      const actionName =
        target.action.charAt(0).toUpperCase() + target.action.slice(1);

      progressEmbed.addFields({
        name: `${actionName} ${resourceName}`,
        value: `${progressBar} ${current}/${target.target_amount} SCU (${percentage}%)`,
      });
    }

    // Get top contributors for the day
    const today = new Date().toISOString().split("T")[0]; // Format: YYYY-MM-DD
    const userContributions = new Map();

    // Process all contributions from today for each target
    for (const target of targets) {
      // Get all contributions for this target
      const contributions = await ContributionModel.getByTargetId(
        target.id,
        1000
      );

      // Filter today's contributions - FIX: handling different timestamp formats
      const todayContributions = contributions.filter((contribution) => {
        // Convert timestamp to string if it's not already a string
        let timestampStr;
        if (typeof contribution.timestamp === "string") {
          timestampStr = contribution.timestamp;
        } else if (contribution.timestamp instanceof Date) {
          timestampStr = contribution.timestamp.toISOString();
        } else {
          // Try to create a date from whatever format we have
          try {
            timestampStr = new Date(contribution.timestamp).toISOString();
          } catch (e) {
            console.warn("Unable to parse timestamp:", contribution.timestamp);
            return false;
          }
        }

        // Check if the timestamp is from today
        return timestampStr.startsWith(today);
      });

      for (const contribution of todayContributions) {
        const userId = contribution.user_id;

        if (!userContributions.has(userId)) {
          userContributions.set(userId, {
            username: contribution.username,
            total: 0,
          });
        }

        userContributions.get(userId).total += contribution.amount;
      }
    }

    // Add today's top contributors if any
    if (userContributions.size > 0) {
      // Sort and get top 5
      const topContributors = Array.from(userContributions.values())
        .sort((a, b) => b.total - a.total)
        .slice(0, 5);

      let contributorsText = "";
      topContributors.forEach((user, index) => {
        contributorsText += `${index + 1}. ${user.username}: ${
          user.total
        } SCU\n`;
      });

      progressEmbed.addFields({
        name: `Today's Top Contributors`,
        value: contributorsText || "No contributions today.",
      });
    } else {
      progressEmbed.addFields({
        name: `Today's Top Contributors`,
        value: "No contributions made today.",
      });
    }

    // Send the report
    await channel.send({ embeds: [progressEmbed] });
    console.log("Daily report sent successfully");
  } catch (error) {
    console.error("Error sending daily report:", error);
    try {
      await channel.send(
        "An error occurred while generating the daily report."
      );
    } catch (sendError) {
      console.error("Could not send error message to channel:", sendError);
    }
  }
}

module.exports = { setupAutoReporting };
