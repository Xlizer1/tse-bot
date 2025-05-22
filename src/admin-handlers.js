const {
  EmbedBuilder,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  StringSelectMenuBuilder,
  ModalBuilder,
  TextInputBuilder,
  TextInputStyle,
  AttachmentBuilder,
  MessageFlags,
} = require("discord.js");
const fs = require("fs");
const path = require("path");
const ExcelJS = require("exceljs");

const ResourceModel = require("./models/resource");
const TargetModel = require("./models/target");
const ContributionModel = require("./models/contribution");
const { DashboardModel, SettingModel } = require("./models/dashboard");

const { updateDashboards } = require("./dashboard-updater");
const ActionTypeModel = require("./models/actionType");

async function handleAdminButtonInteraction(interaction) {
  if (!interaction.member.permissions.has("Administrator")) {
    return interaction.reply({
      content: "You do not have permission to use admin controls.",
      flags: MessageFlags.Ephemeral,
    });
  }

  const buttonId = interaction.customId;

  switch (buttonId) {
    case "admin_resources":
      await handleResourcesButton(interaction);
      break;
    case "admin_targets":
      await handleTargetsButton(interaction);
      break;
    case "admin_export":
      await handleExportButton(interaction);
      break;
    case "admin_display":
      await handleDisplayButton(interaction);
      break;
    case "admin_stats":
      await handleStatsButton(interaction);
      break;
    case "admin_back":
      await handleBackButton(interaction);
      break;
    case "admin_add_resource":
      await handleAddResourceButton(interaction);
      break;
    case "admin_remove_resource":
      await handleRemoveResourceButton(interaction);
      break;
    case "admin_add_target":
      await handleAddTargetButton(interaction);
      break;
    case "admin_reset_target":
      await handleResetTargetButton(interaction);
      break;
    case "admin_reset_progress":
      await handleResetProgressButton(interaction);
      break;
    case "admin_create_dashboard":
      await handleCreateDashboardButton(interaction);
      break;
    case "admin_auto_report":
      await handleAutoReportButton(interaction);
      break;
  }
}

const getResourceEmoji = (resourceName) => {
  const lowercaseName = resourceName.toLowerCase();
  const emojiMap = {
    // Mining emojis
    copper: "🟤",
    iron: "⚙️",
    gold: "✨",
    diamond: "💎",
    titanium: "🔧",
    aluminum: "🛠️",

    // Salvage emojis
    rmc: "♻️",
    "construction materials": "🏗️",
    "scrap metal": "🔩",
    "ship parts": "🚀",

    // Haul emojis
    "medical supplies": "🩺",
    "agricultural supplies": "🌾",
    hydrogen: "🧪",
    chlorine: "🧪",
  };

  return emojiMap[lowercaseName] || "📦";
};

// Resource Management Button Handler
async function handleResourcesButton(interaction) {
  try {
    const guildId = interaction.guild.id;
    // Load resources from database with action types
    const groupedResources = await ResourceModel.getGroupedResources(guildId);

    // Get all action types
    const actionTypes = await ActionTypeModel.getAll();

    // Create resources embed
    const resourcesEmbed = new EmbedBuilder()
      .setColor(0x0099ff)
      .setTitle("🗃️ Resource Management")
      .setDescription(
        "Comprehensive overview of resources for all action types\n" +
          "Use these resources to track and manage your collection targets"
      )
      .setTimestamp();

    // Function to generate resource description
    const formatResourceDescription = (resource) => {
      return `${resource.emoji || "📦"} **${resource.name}** \`${
        resource.value
      }\``;
    };

    // Add fields for each action type
    for (const actionType of actionTypes) {
      const resources = groupedResources[actionType.name] || [];

      resourcesEmbed.addFields({
        name: `${actionType.emoji || "📦"} ${
          actionType.display_name
        } Resources (${actionType.unit})`,
        value:
          resources.length > 0
            ? resources.map(formatResourceDescription).join("\n")
            : `No ${actionType.display_name.toLowerCase()} resources defined`,
        inline: false,
      });
    }

    // Add statistics
    const totalResources = Object.values(groupedResources).flat().length;

    const resourceStats = [`**Total Resource Types**: ${totalResources}`];

    // Add count per action type
    actionTypes.forEach((type) => {
      const count = (groupedResources[type.name] || []).length;
      resourceStats.push(`• ${type.display_name}: ${count}`);
    });

    resourcesEmbed.addFields({
      name: "📊 Resource Overview",
      value: resourceStats.join("\n"),
      inline: false,
    });

    // Create button row
    const row = new ActionRowBuilder().addComponents(
      new ButtonBuilder()
        .setCustomId("admin_add_resource")
        .setLabel("Add Resource")
        .setStyle(ButtonStyle.Success)
        .setEmoji("➕"),
      new ButtonBuilder()
        .setCustomId("admin_remove_resource")
        .setLabel("Remove Resource")
        .setStyle(ButtonStyle.Danger)
        .setEmoji("➖"),
      new ButtonBuilder()
        .setCustomId("admin_back")
        .setLabel("Back to Admin")
        .setStyle(ButtonStyle.Secondary)
        .setEmoji("🔙")
    );

    // Reply with the resources embed
    await interaction.update({
      embeds: [resourcesEmbed],
      components: [row],
    });
  } catch (error) {
    console.error("Error in handleResourcesButton:", error);
    await interaction.update({
      content: "An error occurred while loading resources. Please try again.",
      embeds: [],
      components: [
        new ActionRowBuilder().addComponents(
          new ButtonBuilder()
            .setCustomId("admin_back")
            .setLabel("Back to Admin")
            .setStyle(ButtonStyle.Secondary)
        ),
      ],
    });
  }
}

// Target Management
async function handleTargetsButton(interaction) {
  try {
    const guildId = interaction.guild.id;
    // Get all targets with progress from database
    const targets = await TargetModel.getAllWithProgress(guildId);

    // Create targets embed
    const targetsEmbed = new EmbedBuilder()
      .setColor(0x0099ff)
      .setTitle("Target Management")
      .setDescription(
        "Set collection targets or reset progress for specific resources"
      )
      .setTimestamp();

    // Add targets and progress
    if (targets.length === 0) {
      targetsEmbed.addFields({
        name: "No Targets Set",
        value: "Use the buttons below to add new targets",
      });
    } else {
      // Group targets by action type for better organization
      const actionGroups = {};

      targets.forEach((target) => {
        if (!actionGroups[target.action]) {
          actionGroups[target.action] = [];
        }
        actionGroups[target.action].push(target);
      });

      // Add targets for each action type with character limit handling
      for (const [action, actionTargets] of Object.entries(actionGroups)) {
        // Get first target to determine action display name and emoji
        const sampleTarget = actionTargets[0];
        const actionDisplay =
          sampleTarget.action_display_name ||
          sampleTarget.action.charAt(0).toUpperCase() +
            sampleTarget.action.slice(1);
        const actionEmoji =
          sampleTarget.action_emoji || getActionEmoji(sampleTarget.action);

        // Create field values for this action type
        const targetStrings = actionTargets.map((target) => {
          const current = target.current_amount || 0;
          const percentage = Math.floor((current / target.target_amount) * 100);

          // Use target's custom unit or fall back to action type unit
          const unit = target.unit || "SCU";

          const resourceName =
            target.resource_name ||
            target.resource.charAt(0).toUpperCase() + target.resource.slice(1);

          // Show unit in the display - this is the key change!
          return `**${resourceName}**\nTarget: ${target.target_amount} ${unit}\nCurrent: ${current} ${unit} (${percentage}%)`;
        });

        // Split into multiple fields if content is too long (Discord limit: 1024 chars per field)
        let currentFieldValue = "";
        let fieldCounter = 1;
        const maxFieldLength = 1000; // Leave some buffer under 1024 limit

        for (let i = 0; i < targetStrings.length; i++) {
          const targetString = targetStrings[i];

          // Check if adding this target would exceed the limit
          const testValue =
            currentFieldValue +
            (currentFieldValue ? "\n\n" : "") +
            targetString;

          if (testValue.length > maxFieldLength && currentFieldValue) {
            // Add current field and start a new one
            const fieldName =
              fieldCounter === 1
                ? `${actionEmoji} ${actionDisplay} Targets`
                : `${actionEmoji} ${actionDisplay} Targets (${fieldCounter})`;

            targetsEmbed.addFields({
              name: fieldName,
              value: currentFieldValue,
            });

            // Start new field
            currentFieldValue = targetString;
            fieldCounter++;
          } else {
            // Add to current field
            currentFieldValue = testValue;
          }
        }

        // Add the final field if there's content
        if (currentFieldValue) {
          const fieldName =
            fieldCounter === 1
              ? `${actionEmoji} ${actionDisplay} Targets`
              : `${actionEmoji} ${actionDisplay} Targets (${fieldCounter})`;

          targetsEmbed.addFields({
            name: fieldName,
            value: currentFieldValue,
          });
        }
      }
    }

    // Create button row
    const row = new ActionRowBuilder().addComponents(
      new ButtonBuilder()
        .setCustomId("admin_add_target")
        .setLabel("Add Target")
        .setStyle(ButtonStyle.Success),
      new ButtonBuilder()
        .setCustomId("admin_reset_target")
        .setLabel("Remove Target")
        .setStyle(ButtonStyle.Danger),
      new ButtonBuilder()
        .setCustomId("admin_reset_progress")
        .setLabel("Reset Progress")
        .setStyle(ButtonStyle.Primary),
      new ButtonBuilder()
        .setCustomId("admin_back")
        .setLabel("Back to Admin")
        .setStyle(ButtonStyle.Secondary)
    );

    // Reply with the targets embed
    await interaction.update({
      embeds: [targetsEmbed],
      components: [row],
    });
  } catch (error) {
    console.error("Error in handleTargetsButton:", error);
    await interaction.update({
      content: "An error occurred while loading targets. Please try again.",
      embeds: [],
      components: [
        new ActionRowBuilder().addComponents(
          new ButtonBuilder()
            .setCustomId("admin_back")
            .setLabel("Back to Admin")
            .setStyle(ButtonStyle.Secondary)
        ),
      ],
    });
  }
}

// Helper function to get emoji for action type
function getActionEmoji(action) {
  const emojiMap = {
    mine: "⛏️",
    salvage: "🏭",
    haul: "🚚",
    earn: "💰",
  };

  return emojiMap[action] || "📦";
}

// Export data
async function handleExportButton(interaction) {
  await interaction.deferUpdate();

  try {
    // Get all targets with progress
    const guildId = interaction.guild.id;
    const targets = await TargetModel.getAllWithProgress(guildId);

    // Create a new workbook
    const workbook = new ExcelJS.Workbook();
    workbook.creator = "Terra Star Expeditionary Bot";
    workbook.created = new Date();

    // Create Summary worksheet
    const summarySheet = workbook.addWorksheet("Resource Summary");

    // Add title to summary sheet
    summarySheet.mergeCells("A1:E1");
    const titleRow = summarySheet.getCell("A1");
    titleRow.value = "Terra Star Expeditionary Resource Summary";
    titleRow.font = {
      size: 16,
      bold: true,
      color: { argb: "4F33FF" },
    };
    titleRow.alignment = { horizontal: "center" };

    // Add current date
    summarySheet.mergeCells("A2:E2");
    const dateRow = summarySheet.getCell("A2");
    dateRow.value = `Report generated on ${new Date().toLocaleString()}`;
    dateRow.font = { italic: true };
    dateRow.alignment = { horizontal: "center" };

    // Add headers
    summarySheet.addRow([]);
    const summaryHeaders = summarySheet.addRow([
      "Resource",
      "Action",
      "Target (SCU)",
      "Current (SCU)",
      "Progress",
    ]);
    summaryHeaders.eachCell((cell) => {
      cell.font = { bold: true };
      cell.fill = {
        type: "pattern",
        pattern: "solid",
        fgColor: { argb: "4472C4" },
        bgColor: { argb: "4472C4" },
      };
      cell.font = { bold: true, color: { argb: "FFFFFF" } };
    });

    // Format columns
    summarySheet.getColumn("A").width = 20; // Resource
    summarySheet.getColumn("B").width = 15; // Action
    summarySheet.getColumn("C").width = 15; // Target
    summarySheet.getColumn("D").width = 15; // Current
    summarySheet.getColumn("E").width = 15; // Progress

    // Add data rows
    for (const target of targets) {
      const current = target.current_amount || 0;
      const percentage = Math.floor((current / target.target_amount) * 100);

      // Capitalize resource and action
      const resourceName =
        target.resource_name ||
        target.resource.charAt(0).toUpperCase() + target.resource.slice(1);
      const actionName =
        target.action.charAt(0).toUpperCase() + target.action.slice(1);

      const row = summarySheet.addRow([
        resourceName,
        actionName,
        target.target_amount,
        current,
        `${percentage}%`,
      ]);

      // Add conditional formatting to progress column
      const progressCell = row.getCell(5);
      if (percentage >= 100) {
        progressCell.fill = {
          type: "pattern",
          pattern: "solid",
          fgColor: { argb: "92D050" }, // Green
        };
      } else if (percentage >= 70) {
        progressCell.fill = {
          type: "pattern",
          pattern: "solid",
          fgColor: { argb: "FFEB84" }, // Yellow
        };
      } else if (percentage >= 30) {
        progressCell.fill = {
          type: "pattern",
          pattern: "solid",
          fgColor: { argb: "FFC000" }, // Orange
        };
      } else {
        progressCell.fill = {
          type: "pattern",
          pattern: "solid",
          fgColor: { argb: "FF7676" }, // Red
        };
      }
    }

    // Add border to the table
    const lastRowNum = summarySheet.rowCount;
    for (let i = 4; i <= lastRowNum; i++) {
      for (let j = 1; j <= 5; j++) {
        const cell = summarySheet.getCell(i, j);
        cell.border = {
          top: { style: "thin" },
          left: { style: "thin" },
          bottom: { style: "thin" },
          right: { style: "thin" },
        };
      }
    }

    // Create Contributions worksheet
    const contributionsSheet = workbook.addWorksheet("Detailed Contributions");

    // Add title
    contributionsSheet.mergeCells("A1:F1");
    const contribTitle = contributionsSheet.getCell("A1");
    contribTitle.value = "Detailed Resource Contributions";
    contribTitle.font = {
      size: 16,
      bold: true,
      color: { argb: "4F33FF" },
    };
    contribTitle.alignment = { horizontal: "center" };

    // Add headers
    contributionsSheet.addRow([]);
    const contribHeaders = contributionsSheet.addRow([
      "Timestamp",
      "User",
      "Resource",
      "Action",
      "Amount (SCU)",
      "Location",
    ]);
    contribHeaders.eachCell((cell) => {
      cell.font = { bold: true };
      cell.fill = {
        type: "pattern",
        pattern: "solid",
        fgColor: { argb: "4472C4" },
        bgColor: { argb: "4472C4" },
      };
      cell.font = { bold: true, color: { argb: "FFFFFF" } };
    });

    // Format columns
    contributionsSheet.getColumn("A").width = 22; // Timestamp
    contributionsSheet.getColumn("B").width = 20; // User
    contributionsSheet.getColumn("C").width = 15; // Resource
    contributionsSheet.getColumn("D").width = 15; // Action
    contributionsSheet.getColumn("E").width = 15; // Amount
    contributionsSheet.getColumn("F").width = 30; // Location

    // Collect all contributions
    const allContributions = [];

    // Get all contributions for each target
    for (const target of targets) {
      const contributions = await ContributionModel.getByTargetId(
        target.id,
        1000
      );

      for (const contribution of contributions) {
        const resourceName =
          target.resource_name ||
          target.resource.charAt(0).toUpperCase() + target.resource.slice(1);
        const actionName =
          target.action.charAt(0).toUpperCase() + target.action.slice(1);

        allContributions.push({
          timestamp: new Date(contribution.timestamp),
          username: contribution.username,
          resource: resourceName,
          action: actionName,
          amount: contribution.amount,
          location: contribution.location,
        });
      }
    }

    // Sort contributions by timestamp (newest first)
    allContributions.sort((a, b) => b.timestamp - a.timestamp);

    // Add contribution rows
    allContributions.forEach((contribution, index) => {
      const row = contributionsSheet.addRow([
        contribution.timestamp.toLocaleString(),
        contribution.username,
        contribution.resource,
        contribution.action,
        contribution.amount,
        contribution.location,
      ]);

      // Alternate row coloring for readability
      if (index % 2 === 1) {
        row.eachCell((cell) => {
          cell.fill = {
            type: "pattern",
            pattern: "solid",
            fgColor: { argb: "F2F2F2" },
            bgColor: { argb: "F2F2F2" },
          };
        });
      }

      // Add borders
      row.eachCell((cell) => {
        cell.border = {
          top: { style: "thin" },
          left: { style: "thin" },
          bottom: { style: "thin" },
          right: { style: "thin" },
        };
      });
    });

    // Create Leaderboard worksheet
    const leaderboardSheet = workbook.addWorksheet("User Leaderboard");

    // Add title
    leaderboardSheet.mergeCells("A1:C1");
    const leaderTitle = leaderboardSheet.getCell("A1");
    leaderTitle.value = "User Contribution Summary";
    leaderTitle.font = {
      size: 16,
      bold: true,
      color: { argb: "4F33FF" },
    };
    leaderTitle.alignment = { horizontal: "center" };

    // Add headers
    leaderboardSheet.addRow([]);
    const leaderHeaders = leaderboardSheet.addRow([
      "User",
      "Total Contributions (SCU)",
      "Percentage of Total",
    ]);
    leaderHeaders.eachCell((cell) => {
      cell.font = { bold: true };
      cell.fill = {
        type: "pattern",
        pattern: "solid",
        fgColor: { argb: "4472C4" },
        bgColor: { argb: "4472C4" },
      };
      cell.font = { bold: true, color: { argb: "FFFFFF" } };
    });

    // Format columns
    leaderboardSheet.getColumn("A").width = 25; // User
    leaderboardSheet.getColumn("B").width = 25; // Total
    leaderboardSheet.getColumn("C").width = 25; // Percentage

    // Calculate user totals
    const userTotals = new Map();
    let grandTotal = 0;

    allContributions.forEach((contribution) => {
      if (!userTotals.has(contribution.username)) {
        userTotals.set(contribution.username, 0);
      }
      const amount = contribution.amount;
      userTotals.set(
        contribution.username,
        userTotals.get(contribution.username) + amount
      );
      grandTotal += amount;
    });

    // Sort users by total contribution (highest first)
    const sortedUsers = Array.from(userTotals.entries())
      .sort((a, b) => b[1] - a[1])
      .map(([username, total]) => ({
        username,
        total,
        percentage: grandTotal > 0 ? (total / grandTotal) * 100 : 0,
      }));

    // Add user rows
    sortedUsers.forEach((user, index) => {
      const row = leaderboardSheet.addRow([
        user.username,
        user.total,
        `${user.percentage.toFixed(1)}%`,
      ]);

      // Highlight top 3 contributors
      if (index < 3) {
        row.eachCell((cell) => {
          cell.font = { bold: true };
          if (index === 0) {
            cell.fill = {
              type: "pattern",
              pattern: "solid",
              fgColor: { argb: "FFD700" }, // Gold
            };
          } else if (index === 1) {
            cell.fill = {
              type: "pattern",
              pattern: "solid",
              fgColor: { argb: "C0C0C0" }, // Silver
            };
          } else if (index === 2) {
            cell.fill = {
              type: "pattern",
              pattern: "solid",
              fgColor: { argb: "CD7F32" }, // Bronze
            };
          }
        });
      } else if (index % 2 === 1) {
        // Alternate row coloring
        row.eachCell((cell) => {
          cell.fill = {
            type: "pattern",
            pattern: "solid",
            fgColor: { argb: "F2F2F2" },
            bgColor: { argb: "F2F2F2" },
          };
        });
      }

      // Add borders
      row.eachCell((cell) => {
        cell.border = {
          top: { style: "thin" },
          left: { style: "thin" },
          bottom: { style: "thin" },
          right: { style: "thin" },
        };
      });
    });

    // Add total row
    const totalRow = leaderboardSheet.addRow(["TOTAL", grandTotal, "100.0%"]);
    totalRow.eachCell((cell) => {
      cell.font = { bold: true };
      cell.fill = {
        type: "pattern",
        pattern: "solid",
        fgColor: { argb: "4472C4" },
        bgColor: { argb: "4472C4" },
      };
      cell.font = { bold: true, color: { argb: "FFFFFF" } };
      cell.border = {
        top: { style: "thin" },
        left: { style: "thin" },
        bottom: { style: "thin" },
        right: { style: "thin" },
      };
    });

    // Ensure data directory exists
    const dataDir = path.join(__dirname, "data");
    if (!fs.existsSync(dataDir)) {
      fs.mkdirSync(dataDir, { recursive: true });
    }

    // Save the workbook
    const tempFile = path.join(__dirname, "data", "resource_export.xlsx");
    await workbook.xlsx.writeFile(tempFile);

    // Create attachment
    const attachment = new AttachmentBuilder(tempFile, {
      name: "TSE_Resource_Report.xlsx",
    });

    // Create dashboard embed
    const dashboardEmbed = new EmbedBuilder()
      .setColor(0x0099ff)
      .setTitle("TSE Admin Dashboard")
      .setDescription(
        "Export completed successfully! The file has been attached."
      )
      .addFields(
        {
          name: "Export Contents",
          value:
            "The export includes:\n- Resource summary\n- Detailed contributions\n- User leaderboard",
        },
        {
          name: "Usage",
          value:
            "This spreadsheet can be opened in Excel, Google Sheets, or any other compatible application.",
        }
      )
      .setFooter({ text: "Terra Star Expeditionary Admin Dashboard" })
      .setTimestamp();

    // Create button rows for main menu
    const row1 = new ActionRowBuilder().addComponents(
      new ButtonBuilder()
        .setCustomId("admin_resources")
        .setLabel("Resource Management")
        .setStyle(ButtonStyle.Primary),
      new ButtonBuilder()
        .setCustomId("admin_targets")
        .setLabel("Target Management")
        .setStyle(ButtonStyle.Primary)
    );

    const row2 = new ActionRowBuilder().addComponents(
      new ButtonBuilder()
        .setCustomId("admin_export")
        .setLabel("Export Data")
        .setStyle(ButtonStyle.Success),
      new ButtonBuilder()
        .setCustomId("admin_display")
        .setLabel("Display Controls")
        .setStyle(ButtonStyle.Secondary),
      new ButtonBuilder()
        .setCustomId("admin_stats")
        .setLabel("System Stats")
        .setStyle(ButtonStyle.Secondary)
    );

    // Create original admin dashboard embed for reverting
    const originalDashboardEmbed = new EmbedBuilder()
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

    // Send the dashboard with attachment
    const originalMessage = await interaction.editReply({
      embeds: [dashboardEmbed],
      components: [row1, row2],
      files: [attachment],
    });

    // Clean up and revert after 10 seconds
    setTimeout(async () => {
      try {
        // Remove the temporary file
        fs.unlinkSync(tempFile);

        // Edit the message back to the original dashboard
        await interaction.editReply({
          embeds: [originalDashboardEmbed],
          components: [row1, row2],
          files: [], // Remove the attachment
        });
      } catch (error) {
        console.error("Error reverting dashboard or cleaning up file:", error);
      }
    }, 10000); // 10 seconds
  } catch (error) {
    console.error("Export error:", error);

    // Create error embed
    const errorEmbed = new EmbedBuilder()
      .setColor(0xff0000)
      .setTitle("Export Error")
      .setDescription(
        "There was an error exporting the data. Please try again later."
      )
      .addFields({ name: "Error Details", value: error.message })
      .setTimestamp();

    // Back button
    const row = new ActionRowBuilder().addComponents(
      new ButtonBuilder()
        .setCustomId("admin_back")
        .setLabel("Back to Admin")
        .setStyle(ButtonStyle.Secondary)
    );

    await interaction.editReply({
      embeds: [errorEmbed],
      components: [row],
    });
  }
}

// Display controls
async function handleDisplayButton(interaction) {
  try {
    const guildId = interaction.guild.id;
    // Load dashboards and settings from database
    const dashboards = await DashboardModel.getAll(guildId);
    const autoReport = await SettingModel.getAutoReport(guildId);

    // Create display embed
    const displayEmbed = new EmbedBuilder()
      .setColor(0x0099ff)
      .setTitle("Display Controls")
      .setDescription("Configure dashboards and reporting features")
      .setTimestamp();

    // Add dashboard info
    if (dashboards.length === 0) {
      displayEmbed.addFields({
        name: "Live Dashboards",
        value: "No live dashboards currently active",
      });
    } else {
      displayEmbed.addFields({
        name: "Live Dashboards",
        value: `${dashboards.length} active dashboard${
          dashboards.length === 1 ? "" : "s"
        }`,
      });
    }

    // Add auto-report info
    if (autoReport.enabled) {
      displayEmbed.addFields({
        name: "Auto Reports",
        value: `Enabled - Daily reports at ${autoReport.time} UTC in <#${autoReport.channelId}>`,
      });
    } else {
      displayEmbed.addFields({ name: "Auto Reports", value: "Disabled" });
    }

    // Create button row
    const row = new ActionRowBuilder().addComponents(
      new ButtonBuilder()
        .setCustomId("admin_create_dashboard")
        .setLabel("Create Dashboard")
        .setStyle(ButtonStyle.Success),
      new ButtonBuilder()
        .setCustomId("admin_auto_report")
        .setLabel(
          autoReport.enabled ? "Update Auto Reports" : "Enable Auto Reports"
        )
        .setStyle(ButtonStyle.Primary),
      new ButtonBuilder()
        .setCustomId("admin_back")
        .setLabel("Back to Admin")
        .setStyle(ButtonStyle.Secondary)
    );

    // Reply with the display embed
    await interaction.update({
      embeds: [displayEmbed],
      components: [row],
    });
  } catch (error) {
    console.error("Error in handleDisplayButton:", error);
    await interaction.update({
      content:
        "An error occurred while loading display settings. Please try again.",
      embeds: [],
      components: [
        new ActionRowBuilder().addComponents(
          new ButtonBuilder()
            .setCustomId("admin_back")
            .setLabel("Back to Admin")
            .setStyle(ButtonStyle.Secondary)
        ),
      ],
    });
  }
}

// System stats
async function handleStatsButton(interaction) {
  try {
    const guildId = interaction.guild.id;
    // Get targets with progress
    const targets = await TargetModel.getAllWithProgress(guildId);

    // Get dashboards
    const dashboards = await DashboardModel.getAll();

    // Count unique users and total contributions
    const uniqueUsers = new Set();
    let totalContributions = 0;
    let totalAmount = 0;
    let lastContribution = null;

    // Process contribution stats
    for (const target of targets) {
      const contributions = await ContributionModel.getByTargetId(
        target.id,
        1000
      );

      totalContributions += contributions.length;

      for (const contribution of contributions) {
        totalAmount += contribution.amount;
        uniqueUsers.add(contribution.user_id);

        // Find latest contribution
        if (
          !lastContribution ||
          new Date(contribution.timestamp) >
            new Date(lastContribution.timestamp)
        ) {
          lastContribution = contribution;
        }
      }
    }
    // Get resource counts by type
    const resources = await ResourceModel.getGroupedResources(guildId);
    const resourceCounts = {
      mining: resources.mining ? resources.mining.length : 0,
      salvage: resources.salvage ? resources.salvage.length : 0,
      haul: resources.haul ? resources.haul.length : 0,
      earn: resources.earn ? resources.earn.length : 0,
    };

    // Create stats embed
    const statsEmbed = new EmbedBuilder()
      .setColor(0x0099ff)
      .setTitle("System Statistics")
      .setDescription("Current state of Terra Star Expeditionary Bot")
      .addFields(
        {
          name: "Targets",
          value: `${targets.length} active targets`,
          inline: true,
        },
        {
          name: "Resources Defined",
          value: `${
            resourceCounts.mining + resourceCounts.salvage + resourceCounts.haul
          } total resources`,
          inline: true,
        },
        {
          name: "Contributions",
          value: `${totalContributions} logged contributions`,
          inline: true,
        },
        {
          name: "Total Amount",
          value: `${totalAmount} SCU collected`,
          inline: true,
        },
        {
          name: "Unique Contributors",
          value: `${uniqueUsers.size} unique users`,
          inline: true,
        },
        {
          name: "Live Dashboards",
          value: `${dashboards.length} active`,
          inline: true,
        }
      )
      .setTimestamp();

    // Add latest contribution if exists
    if (lastContribution) {
      const timestamp = new Date(lastContribution.timestamp).toLocaleString();
      statsEmbed.addFields({
        name: "Latest Contribution",
        value: `${lastContribution.username} added ${lastContribution.amount} SCU at ${timestamp}`,
      });
    }

    // Create button row
    const row = new ActionRowBuilder().addComponents(
      new ButtonBuilder()
        .setCustomId("admin_back")
        .setLabel("Back to Admin")
        .setStyle(ButtonStyle.Secondary)
    );

    // Reply with the stats embed
    await interaction.update({
      embeds: [statsEmbed],
      components: [row],
    });
  } catch (error) {
    console.error("Error in handleStatsButton:", error);
    await interaction.update({
      content: "An error occurred while loading statistics. Please try again.",
      embeds: [],
      components: [
        new ActionRowBuilder().addComponents(
          new ButtonBuilder()
            .setCustomId("admin_back")
            .setLabel("Back to Admin")
            .setStyle(ButtonStyle.Secondary)
        ),
      ],
    });
  }
}

// Back button handler
async function handleBackButton(interaction) {
  // Create dashboard embed
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

  // Create button rows
  const row1 = new ActionRowBuilder().addComponents(
    new ButtonBuilder()
      .setCustomId("admin_resources")
      .setLabel("Resource Management")
      .setStyle(ButtonStyle.Primary),
    new ButtonBuilder()
      .setCustomId("admin_targets")
      .setLabel("Target Management")
      .setStyle(ButtonStyle.Primary)
  );
  const row2 = new ActionRowBuilder().addComponents(
    new ButtonBuilder()
      .setCustomId("admin_export")
      .setLabel("Export Data")
      .setStyle(ButtonStyle.Success),
    new ButtonBuilder()
      .setCustomId("admin_display")
      .setLabel("Display Controls")
      .setStyle(ButtonStyle.Secondary),
    new ButtonBuilder()
      .setCustomId("admin_stats")
      .setLabel("System Stats")
      .setStyle(ButtonStyle.Secondary)
  );

  // Send the dashboard
  await interaction.update({
    embeds: [dashboardEmbed],
    components: [row1, row2],
  });
}

// Helper function to safely handle emoji values for Discord.js
function safeEmoji(emoji) {
  return emoji && emoji !== null ? emoji : undefined;
}

// Handle the Add Resource button
async function handleAddResourceButton(interaction) {
  try {
    // Get all action types
    const actionTypes = await ActionTypeModel.getAll();

    // Create select menu for action type
    const selectMenu = new ActionRowBuilder().addComponents(
      new StringSelectMenuBuilder()
        .setCustomId("admin_resource_action")
        .setPlaceholder("Select action type")
    );

    // Add options for all action types
    actionTypes.forEach((type) => {
      const option = {
        label: type.display_name,
        value: type.name,
        description: `Add a new ${type.display_name.toLowerCase()} resource (${
          type.unit
        })`,
      };

      // Only add emoji if it exists and is not null
      if (type.emoji && type.emoji !== null) {
        option.emoji = type.emoji;
      }

      selectMenu.components[0].addOptions(option);
    });

    // Update the message
    await interaction.update({
      content: "Select the action type for the new resource:",
      embeds: [],
      components: [selectMenu],
    });
  } catch (error) {
    console.error("Error in handleAddResourceButton:", error);
    await interaction.reply({
      content: "An error occurred while listing action types.",
      flags: MessageFlags.Ephemeral,
    });
  }
}

// Remove resource button handler
async function handleRemoveResourceButton(interaction) {
  try {
    // Load grouped resources from database
    const guildId = interaction.guild.id;
    const groupedResources = await ResourceModel.getGroupedResources(guildId);

    // Create select menu for resource selection
    const row1 = new ActionRowBuilder().addComponents(
      new StringSelectMenuBuilder()
        .setCustomId("admin_remove_resource_action")
        .setPlaceholder("Select action type")
        .addOptions([
          { label: "Mining Resource", value: "mining" },
          { label: "Salvage Resource", value: "salvage" },
          { label: "Hauling Resource", value: "haul" },
        ])
    );

    // Back button
    const row2 = new ActionRowBuilder().addComponents(
      new ButtonBuilder()
        .setCustomId("admin_back")
        .setLabel("Back to Admin")
        .setStyle(ButtonStyle.Secondary)
    );

    // Update the message
    await interaction.update({
      content: "Select the action type for the resource you want to remove:",
      embeds: [],
      components: [row1, row2],
    });
  } catch (error) {
    console.error("Error in handleRemoveResourceButton:", error);
    await interaction.update({
      content: "An error occurred while loading resources. Please try again.",
      embeds: [],
      components: [
        new ActionRowBuilder().addComponents(
          new ButtonBuilder()
            .setCustomId("admin_back")
            .setLabel("Back to Admin")
            .setStyle(ButtonStyle.Secondary)
        ),
      ],
    });
  }
}

// Handle the Add Target button
async function handleAddTargetButton(interaction) {
  try {
    // Get all action types
    const actionTypes = await ActionTypeModel.getAll();

    // Create select menu for action type
    const row = new ActionRowBuilder().addComponents(
      new StringSelectMenuBuilder()
        .setCustomId("admin_target_action")
        .setPlaceholder("Select action type")
    );

    // Add options for all action types
    actionTypes.forEach((type) => {
      const option = {
        label: type.display_name,
        value: type.name,
        description: `Add a new ${type.display_name.toLowerCase()} target (${
          type.unit
        })`,
      };

      // Only add emoji if it exists and is not null
      if (type.emoji && type.emoji !== null) {
        option.emoji = type.emoji;
      }

      row.components[0].addOptions(option);
    });

    // Update the message
    await interaction.update({
      content: "Select the action type for the new target:",
      embeds: [],
      components: [row],
    });
  } catch (error) {
    console.error("Error in handleAddTargetButton:", error);
    await interaction.reply({
      content: "An error occurred while listing action types.",
      flags: MessageFlags.Ephemeral,
    });
  }
}

// Reset target button handler
async function handleResetTargetButton(interaction) {
  try {
    const guildId = interaction.guild.id;
    // Get all targets with progress
    const targets = await TargetModel.getAllWithProgress(guildId);

    // Check if there are any targets
    if (targets.length === 0) {
      return interaction.update({
        content: "There are no targets to reset.",
        embeds: [],
        components: [
          new ActionRowBuilder().addComponents(
            new ButtonBuilder()
              .setCustomId("admin_back")
              .setLabel("Back to Admin")
              .setStyle(ButtonStyle.Secondary)
          ),
        ],
      });
    }

    // Create select menu options for targets
    const options = targets.map((target) => {
      const resourceName =
        target.resource_name ||
        target.resource.charAt(0).toUpperCase() + target.resource.slice(1);
      const actionName =
        target.action.charAt(0).toUpperCase() + target.action.slice(1);

      return {
        label: `${actionName} ${resourceName}`,
        value: target.id.toString(),
        description: `Target: ${target.target_amount} SCU`,
      };
    });

    // Create select menu
    const row1 = new ActionRowBuilder().addComponents(
      new StringSelectMenuBuilder()
        .setCustomId("admin_reset_target_select")
        .setPlaceholder("Select target to remove")
        .addOptions(options)
    );

    // Back button
    const row2 = new ActionRowBuilder().addComponents(
      new ButtonBuilder()
        .setCustomId("admin_back")
        .setLabel("Back to Admin")
        .setStyle(ButtonStyle.Secondary)
    );

    // Update the message
    await interaction.update({
      content: "Select the target you want to remove:",
      embeds: [],
      components: [row1, row2],
    });
  } catch (error) {
    console.error("Error in handleResetTargetButton:", error);
    await interaction.update({
      content: "An error occurred while loading targets. Please try again.",
      embeds: [],
      components: [
        new ActionRowBuilder().addComponents(
          new ButtonBuilder()
            .setCustomId("admin_back")
            .setLabel("Back to Admin")
            .setStyle(ButtonStyle.Secondary)
        ),
      ],
    });
  }
}

// Reset progress button handler
async function handleResetProgressButton(interaction) {
  try {
    const guildId = interaction.guild.id;
    // Get all targets with progress
    const targets = await TargetModel.getAllWithProgress(guildId);

    // Check if there are any targets
    if (targets.length === 0) {
      return interaction.update({
        content: "There are no targets to reset progress for.",
        embeds: [],
        components: [
          new ActionRowBuilder().addComponents(
            new ButtonBuilder()
              .setCustomId("admin_back")
              .setLabel("Back to Admin")
              .setStyle(ButtonStyle.Secondary)
          ),
        ],
      });
    }

    // Create select menu options for targets
    const options = targets.map((target) => {
      const resourceName =
        target.resource_name ||
        target.resource.charAt(0).toUpperCase() + target.resource.slice(1);
      const actionName =
        target.action.charAt(0).toUpperCase() + target.action.slice(1);
      const current = target.current_amount || 0;

      return {
        label: `${actionName} ${resourceName}`,
        value: target.id.toString(),
        description: `Current Progress: ${current}/${target.target_amount} SCU`,
      };
    });

    // Create select menu
    const row1 = new ActionRowBuilder().addComponents(
      new StringSelectMenuBuilder()
        .setCustomId("admin_reset_progress_select")
        .setPlaceholder("Select target to reset progress")
        .addOptions(options)
    );

    // Back button
    const row2 = new ActionRowBuilder().addComponents(
      new ButtonBuilder()
        .setCustomId("admin_back")
        .setLabel("Back to Admin")
        .setStyle(ButtonStyle.Secondary)
    );

    // Update the message
    await interaction.update({
      content:
        "Select the target to reset progress for (this will keep the target but reset all progress to 0):",
      embeds: [],
      components: [row1, row2],
    });
  } catch (error) {
    console.error("Error in handleResetProgressButton:", error);
    await interaction.update({
      content: "An error occurred while loading targets. Please try again.",
      embeds: [],
      components: [
        new ActionRowBuilder().addComponents(
          new ButtonBuilder()
            .setCustomId("admin_back")
            .setLabel("Back to Admin")
            .setStyle(ButtonStyle.Secondary)
        ),
      ],
    });
  }
}

// Create dashboard button handler
async function handleCreateDashboardButton(interaction) {
  // Create modal for channel input
  const modal = new ModalBuilder()
    .setCustomId("admin_create_dashboard_modal")
    .setTitle("Create Live Dashboard");

  // Add input field for channel ID
  const channelInput = new TextInputBuilder()
    .setCustomId("dashboard_channel")
    .setLabel("Channel ID")
    .setPlaceholder("Enter the ID of the channel for the dashboard")
    .setStyle(TextInputStyle.Short)
    .setRequired(true);

  // Add rows and fields to modal
  const firstActionRow = new ActionRowBuilder().addComponents(channelInput);
  modal.addComponents(firstActionRow);

  // Show the modal
  await interaction.showModal(modal);
}

// Auto report button handler
async function handleAutoReportButton(interaction) {
  try {
    const guildId = interaction.guild.id;
    // Load auto report settings from database
    const autoReport = await SettingModel.getAutoReport(guildId);

    // Create modal for auto-report settings
    const modal = new ModalBuilder()
      .setCustomId("admin_auto_report_modal")
      .setTitle("Configure Auto Reports");

    // Add input field for channel ID
    const channelInput = new TextInputBuilder()
      .setCustomId("auto_report_channel")
      .setLabel("Channel ID")
      .setPlaceholder("Enter the ID of the channel for reports")
      .setValue(autoReport.channelId || "")
      .setStyle(TextInputStyle.Short)
      .setRequired(true);

    // Add input field for time
    const timeInput = new TextInputBuilder()
      .setCustomId("auto_report_time")
      .setLabel("Time (24h format, UTC)")
      .setPlaceholder("Enter time in 24h format (e.g., 08:00 or 20:30)")
      .setValue(autoReport.time || "")
      .setStyle(TextInputStyle.Short)
      .setRequired(true);

    // Add field for enabled/disabled
    const enabledInput = new TextInputBuilder()
      .setCustomId("auto_report_enabled")
      .setLabel("Enable reports (true/false)")
      .setPlaceholder('Type "true" to enable, "false" to disable')
      .setValue(autoReport.enabled ? "true" : "false")
      .setStyle(TextInputStyle.Short)
      .setRequired(true);

    // Add rows and fields to modal
    const firstActionRow = new ActionRowBuilder().addComponents(channelInput);
    const secondActionRow = new ActionRowBuilder().addComponents(timeInput);
    const thirdActionRow = new ActionRowBuilder().addComponents(enabledInput);
    modal.addComponents(firstActionRow, secondActionRow, thirdActionRow);

    // Show the modal
    await interaction.showModal(modal);
  } catch (error) {
    console.error("Error in handleAutoReportButton:", error);
    await interaction.update({
      content:
        "An error occurred while loading auto report settings. Please try again.",
      embeds: [],
      components: [
        new ActionRowBuilder().addComponents(
          new ButtonBuilder()
            .setCustomId("admin_back")
            .setLabel("Back to Admin")
            .setStyle(ButtonStyle.Secondary)
        ),
      ],
    });
  }
}

// Handle select menu interactions for admin functions
async function handleAdminSelectMenuInteraction(interaction) {
  // Verify admin permissions again
  if (!interaction.member.permissions.has("Administrator")) {
    return interaction.reply({
      content: "You do not have permission to use admin controls.",
      flags: MessageFlags.Ephemeral,
    });
  }

  const menuId = interaction.customId;
  const selectedValue = interaction.values[0];

  switch (menuId) {
    case "admin_resource_action":
      await handleResourceActionSelect(interaction, selectedValue);
      break;
    case "admin_remove_resource_action":
      await handleRemoveResourceActionSelect(interaction, selectedValue);
      break;
    case "admin_target_action":
      await handleTargetActionSelect(interaction, selectedValue);
      break;
    case "admin_reset_target_select":
      await handleResetTargetSelect(interaction, selectedValue);
      break;
    case "admin_reset_progress_select":
      await handleResetProgressSelect(interaction, selectedValue);
      break;
    case "admin_remove_resource_select":
      await handleRemoveResourceSelect(interaction, selectedValue);
      break;
    case "admin_add_target_resource":
      await handleAddTargetResourceSelect(interaction, selectedValue);
      break;
  }
}

// Handle resource action selection for adding new resource
async function handleResourceActionSelect(interaction, actionType) {
  try {
    // Get the action type details
    const actionTypeInfo = await ActionTypeModel.getByName(actionType);

    if (!actionTypeInfo) {
      return interaction.reply({
        content: `Action type "${actionType}" not found.`,
        flags: MessageFlags.Ephemeral,
      });
    }

    // Create modal for new resource info
    const modal = new ModalBuilder()
      .setCustomId(`admin_add_resource_modal_${actionType}`)
      .setTitle(`Add ${actionTypeInfo.display_name} Resource`);

    // Add input field for display name
    const nameInput = new TextInputBuilder()
      .setCustomId("resource_name")
      .setLabel("Display Name")
      .setPlaceholder(`Enter the display name (e.g., "Copper")`)
      .setStyle(TextInputStyle.Short)
      .setRequired(true);

    // Add input field for system value
    const valueInput = new TextInputBuilder()
      .setCustomId("resource_value")
      .setLabel("System Value")
      .setPlaceholder(`Enter the system value (lowercase, e.g., "copper")`)
      .setStyle(TextInputStyle.Short)
      .setRequired(true);

    // Add rows and fields to modal
    const firstActionRow = new ActionRowBuilder().addComponents(nameInput);
    const secondActionRow = new ActionRowBuilder().addComponents(valueInput);
    modal.addComponents(firstActionRow, secondActionRow);

    // Show the modal
    await interaction.showModal(modal);
  } catch (error) {
    console.error(`Error in handleResourceActionSelect:`, error);
    await interaction.reply({
      content: "An error occurred while setting up the resource form.",
      flags: MessageFlags.Ephemeral,
    });
  }
}

// Handle remove resource action selection
async function handleRemoveResourceActionSelect(interaction, actionType) {
  try {
    const guildId = interaction.guild.id;
    // Get resources for this action type
    const resources = await ResourceModel.getByActionType(actionType, guildId);

    // Check if there are resources to remove
    if (resources.length === 0) {
      return interaction.update({
        content: `There are no ${actionType} resources to remove.`,
        components: [
          new ActionRowBuilder().addComponents(
            new ButtonBuilder()
              .setCustomId("admin_back")
              .setLabel("Back to Admin")
              .setStyle(ButtonStyle.Secondary)
          ),
        ],
      });
    }

    // Create select menu options for resources
    const options = resources.map((resource) => ({
      label: resource.name,
      value: resource.value,
      description: `Remove ${resource.name} (${resource.value})`,
    }));

    // Create select menu
    const row1 = new ActionRowBuilder().addComponents(
      new StringSelectMenuBuilder()
        .setCustomId("admin_remove_resource_select")
        .setPlaceholder(`Select ${actionType} resource to remove`)
        .addOptions(options)
    );

    // Back button
    const row2 = new ActionRowBuilder().addComponents(
      new ButtonBuilder()
        .setCustomId("admin_back")
        .setLabel("Back to Admin")
        .setStyle(ButtonStyle.Secondary)
    );

    // Update the message
    await interaction.update({
      content: `Select the ${actionType} resource you want to remove:`,
      components: [row1, row2],
    });
  } catch (error) {
    console.error("Error in handleRemoveResourceActionSelect:", error);
    await interaction.update({
      content: "An error occurred while loading resources. Please try again.",
      embeds: [],
      components: [
        new ActionRowBuilder().addComponents(
          new ButtonBuilder()
            .setCustomId("admin_back")
            .setLabel("Back to Admin")
            .setStyle(ButtonStyle.Secondary)
        ),
      ],
    });
  }
}

// Handle target action selection for new target
async function handleTargetActionSelect(interaction, actionType) {
  try {
    // Get the action type details
    const actionTypeInfo = await ActionTypeModel.getByName(actionType);

    if (!actionTypeInfo) {
      return interaction.reply({
        content: `Action type "${actionType}" not found.`,
        flags: MessageFlags.Ephemeral,
      });
    }

    const guildId = interaction.guild.id;

    // Get resources for the action type
    const resources = await ResourceModel.getByActionType(actionType, guildId);

    // Check if there are resources available
    if (resources.length === 0) {
      return interaction.update({
        content: `There are no resources defined for ${actionTypeInfo.display_name.toLowerCase()} action. Please add resources first.`,
        components: [
          new ActionRowBuilder().addComponents(
            new ButtonBuilder()
              .setCustomId("admin_back")
              .setLabel("Back to Admin")
              .setStyle(ButtonStyle.Secondary)
          ),
        ],
      });
    }

    // Create select menu options for resources
    const options = resources.map((resource) => ({
      label: resource.name,
      value: `${actionType}_${resource.value}`,
      description: `${resource.name} (${resource.value})`,
    }));

    // Create select menu
    const row1 = new ActionRowBuilder().addComponents(
      new StringSelectMenuBuilder()
        .setCustomId("admin_add_target_resource")
        .setPlaceholder(
          `Select ${actionTypeInfo.display_name.toLowerCase()} resource`
        )
        .addOptions(options)
    );

    // Back button
    const row2 = new ActionRowBuilder().addComponents(
      new ButtonBuilder()
        .setCustomId("admin_back")
        .setLabel("Back to Admin")
        .setStyle(ButtonStyle.Secondary)
    );

    // Update the message
    await interaction.update({
      content: `Select the resource for the new ${actionTypeInfo.display_name.toLowerCase()} target:`,
      components: [row1, row2],
    });
  } catch (error) {
    console.error("Error in handleTargetActionSelect:", error);
    await interaction.update({
      content: "An error occurred while loading resources. Please try again.",
      embeds: [],
      components: [
        new ActionRowBuilder().addComponents(
          new ButtonBuilder()
            .setCustomId("admin_back")
            .setLabel("Back to Admin")
            .setStyle(ButtonStyle.Secondary)
        ),
      ],
    });
  }
}

// Handle reset target selection
async function handleResetTargetSelect(interaction, targetId) {
  try {
    // Get target details
    const target = await TargetModel.getById(targetId);

    if (!target) {
      throw new Error("Target not found");
    }

    // Delete the target
    await TargetModel.delete(targetId);

    // Get resource name
    const resourceCategory =
      target.action === "mine"
        ? "mining"
        : target.action === "salvage"
        ? "salvage"
        : "haul";

    const guildId = interaction.guild.id;
    const resource = await ResourceModel.getByValueAndType(
      target.resource,
      resourceCategory,
      guildId
    );
    const resourceName = resource
      ? resource.name
      : target.resource.charAt(0).toUpperCase() + target.resource.slice(1);
    const actionName =
      target.action.charAt(0).toUpperCase() + target.action.slice(1);

    // Update dashboards
    await updateDashboards(interaction.client);

    // Success message
    await interaction.update({
      content: `Successfully removed target for ${actionName} ${resourceName}.`,
      components: [
        new ActionRowBuilder().addComponents(
          new ButtonBuilder()
            .setCustomId("admin_targets")
            .setLabel("Back to Targets")
            .setStyle(ButtonStyle.Primary),
          new ButtonBuilder()
            .setCustomId("admin_back")
            .setLabel("Back to Admin")
            .setStyle(ButtonStyle.Secondary)
        ),
      ],
    });
  } catch (error) {
    console.error("Error removing target:", error);

    await interaction.update({
      content: `Error removing target: ${error.message}`,
      components: [
        new ActionRowBuilder().addComponents(
          new ButtonBuilder()
            .setCustomId("admin_back")
            .setLabel("Back to Admin")
            .setStyle(ButtonStyle.Secondary)
        ),
      ],
    });
  }
}

// Handle reset progress selection
async function handleResetProgressSelect(interaction, targetId) {
  try {
    // Get target details
    const target = await TargetModel.getById(targetId);

    if (!target) {
      throw new Error("Target not found");
    }

    // Reset progress for the target
    await TargetModel.resetProgress(targetId);

    // Get resource name
    const resourceCategory =
      target.action === "mine"
        ? "mining"
        : target.action === "salvage"
        ? "salvage"
        : "haul";

    const guildId = interaction.guild.id;
    const resource = await ResourceModel.getByValueAndType(
      target.resource,
      resourceCategory,
      guildId
    );
    const resourceName = resource
      ? resource.name
      : target.resource.charAt(0).toUpperCase() + target.resource.slice(1);
    const actionName =
      target.action.charAt(0).toUpperCase() + target.action.slice(1);

    // Update dashboards
    await updateDashboards(interaction.client);

    // Success message
    await interaction.update({
      content: `Successfully reset progress for ${actionName} ${resourceName}. Progress is now 0/${target.target_amount} SCU.`,
      components: [
        new ActionRowBuilder().addComponents(
          new ButtonBuilder()
            .setCustomId("admin_targets")
            .setLabel("Back to Targets")
            .setStyle(ButtonStyle.Primary),
          new ButtonBuilder()
            .setCustomId("admin_back")
            .setLabel("Back to Admin")
            .setStyle(ButtonStyle.Secondary)
        ),
      ],
    });
  } catch (error) {
    console.error("Error resetting progress:", error);

    await interaction.update({
      content: `Error resetting progress: ${error.message}`,
      components: [
        new ActionRowBuilder().addComponents(
          new ButtonBuilder()
            .setCustomId("admin_back")
            .setLabel("Back to Admin")
            .setStyle(ButtonStyle.Secondary)
        ),
      ],
    });
  }
}

// Handle resource selection for removal
async function handleRemoveResourceSelect(interaction, resourceValue) {
  try {
    // Get action type from message content
    const content = interaction.message.content;
    const actionMatch = content.match(/Select the (\w+) resource/);

    if (!actionMatch) {
      return interaction.update({
        content: "Error: Could not determine action type",
        components: [
          new ActionRowBuilder().addComponents(
            new ButtonBuilder()
              .setCustomId("admin_back")
              .setLabel("Back to Admin")
              .setStyle(ButtonStyle.Secondary)
          ),
        ],
      });
    }

    const actionType = actionMatch[1];

    const guildId = interaction.guild.id;
    // Find the resource
    const resource = await ResourceModel.getByValueAndType(
      resourceValue,
      actionType,
      guildId
    );

    if (!resource) {
      throw new Error("Resource not found");
    }

    // Remove the resource
    await ResourceModel.remove(resourceValue, actionType, guildId);

    // Success message
    await interaction.update({
      content: `Successfully removed ${resource.name} (${resource.value}) from ${actionType} resources.`,
      components: [
        new ActionRowBuilder().addComponents(
          new ButtonBuilder()
            .setCustomId("admin_resources")
            .setLabel("Back to Resources")
            .setStyle(ButtonStyle.Primary),
          new ButtonBuilder()
            .setCustomId("admin_back")
            .setLabel("Back to Admin")
            .setStyle(ButtonStyle.Secondary)
        ),
      ],
    });
  } catch (error) {
    console.error("Error removing resource:", error);

    await interaction.update({
      content: `Error removing resource: ${error.message}`,
      components: [
        new ActionRowBuilder().addComponents(
          new ButtonBuilder()
            .setCustomId("admin_back")
            .setLabel("Back to Admin")
            .setStyle(ButtonStyle.Secondary)
        ),
      ],
    });
  }
}

// Handle resource selection for new target
// Handle resource selection for new target
async function handleAddTargetResourceSelect(interaction, combined) {
  try {
    // Split the combined value to get action and resource
    const [actionType, resourceValue] = combined.split("_");

    // Get the action type info for the unit
    const actionTypeInfo = await ActionTypeModel.getByName(actionType);
    if (!actionTypeInfo) {
      throw new Error(`Action type "${actionType}" not found`);
    }

    const guildId = interaction.guild.id;

    // Get the resource info for the name
    const resourceInfo = await ResourceModel.getByValueAndType(
      resourceValue,
      actionType,
      guildId
    );
    if (!resourceInfo) {
      throw new Error(
        `Resource "${resourceValue}" not found for action type "${actionType}"`
      );
    }

    // Create modal for target amount AND unit selection
    const modal = new ModalBuilder()
      .setCustomId(`admin_add_target_modal_${actionType}_${resourceValue}`)
      .setTitle(`Set Target for ${resourceInfo.name}`);

    // Add input field for amount
    const amountInput = new TextInputBuilder()
      .setCustomId("target_amount")
      .setLabel(`Target Amount`)
      .setPlaceholder(`Enter the target amount`)
      .setStyle(TextInputStyle.Short)
      .setRequired(true);

    // Add input field for unit (with default suggestion)
    const unitInput = new TextInputBuilder()
      .setCustomId("target_unit")
      .setLabel(`Unit of Measurement`)
      .setPlaceholder(
        `Default: ${actionTypeInfo.unit} (or enter: Units, Tons, Kg, L, etc.)`
      )
      .setValue(actionTypeInfo.unit) // Pre-fill with default
      .setStyle(TextInputStyle.Short)
      .setRequired(true);

    // Add rows to modal
    const firstActionRow = new ActionRowBuilder().addComponents(amountInput);
    const secondActionRow = new ActionRowBuilder().addComponents(unitInput);
    modal.addComponents(firstActionRow, secondActionRow);

    // Show the modal
    await interaction.showModal(modal);
  } catch (error) {
    console.error("Error in handleAddTargetResourceSelect:", error);
    await interaction.reply({
      content: `Error: ${error.message}`,
      flags: MessageFlags.Ephemeral,
    });
  }
}

// Handle modal submissions for admin functions
async function handleAdminModalSubmit(interaction) {
  // Verify admin permissions again
  if (!interaction.member.permissions.has("Administrator")) {
    return interaction.reply({
      content: "You do not have permission to use admin controls.",
      flags: MessageFlags.Ephemeral,
    });
  }

  const modalId = interaction.customId;

  if (modalId.startsWith("admin_add_resource_modal_")) {
    // Add new resource
    const actionType = modalId.replace("admin_add_resource_modal_", "");
    const name = interaction.fields.getTextInputValue("resource_name");
    const value = interaction.fields
      .getTextInputValue("resource_value")
      .toLowerCase()
      .replace(/\s+/g, "_");

    try {
      // Get action type info
      const actionTypeInfo = await ActionTypeModel.getByName(actionType);
      if (!actionTypeInfo) {
        throw new Error(`Action type "${actionType}" not found`);
      }

      const guildId = interaction.guild.id;
      // Add resource to database
      await ResourceModel.add(name, value, actionType, guildId);

      // Success message
      await interaction.reply({
        content: `Successfully added ${name} (${value}) to ${actionTypeInfo.display_name} resources.`,
        flags: MessageFlags.Ephemeral,
        components: [
          new ActionRowBuilder().addComponents(
            new ButtonBuilder()
              .setCustomId("admin_resources")
              .setLabel("Back to Resources")
              .setStyle(ButtonStyle.Primary),
            new ButtonBuilder()
              .setCustomId("admin_back")
              .setLabel("Back to Admin")
              .setStyle(ButtonStyle.Secondary)
          ),
        ],
      });
    } catch (error) {
      console.error("Error adding resource:", error);

      await interaction.reply({
        content: `Error adding resource: ${error.message}`,
        flags: MessageFlags.Ephemeral,
        components: [
          new ActionRowBuilder().addComponents(
            new ButtonBuilder()
              .setCustomId("admin_back")
              .setLabel("Back to Admin")
              .setStyle(ButtonStyle.Secondary)
          ),
        ],
      });
    }
  } else if (modalId.startsWith("admin_add_target_modal_")) {
    // Extract actionType and resourceValue from the modal ID
    // The format is admin_add_target_modal_ACTION_RESOURCE
    // Remove the prefix to get ACTION_RESOURCE

    // Extract actionType and resourceValue from the modal ID
    const rawValue = modalId.replace("admin_add_target_modal_", "");

    // Find the first underscore to split action and resource
    const firstUnderscoreIndex = rawValue.indexOf("_");
    if (firstUnderscoreIndex === -1) {
      return interaction.reply({
        content:
          "Invalid modal ID format. Cannot determine action and resource.",
        flags: MessageFlags.Ephemeral,
      });
    }

    const actionType = rawValue.substring(0, firstUnderscoreIndex);
    const resourceValue = rawValue.substring(firstUnderscoreIndex + 1);

    // First, acknowledge the interaction to prevent timeout
    await interaction.deferReply({ flags: MessageFlags.Ephemeral });

    try {
      // Get action type info
      const actionTypeInfo = await ActionTypeModel.getByName(actionType);
      if (!actionTypeInfo) {
        throw new Error(`Action type "${actionType}" not found`);
      }

      // Parse the amount and unit
      const amount = parseInt(
        interaction.fields.getTextInputValue("target_amount")
      );
      const customUnit = interaction.fields
        .getTextInputValue("target_unit")
        .trim();

      if (isNaN(amount) || amount <= 0) {
        return interaction.editReply({
          content: "Invalid amount. Please enter a positive number.",
          components: [
            new ActionRowBuilder().addComponents(
              new ButtonBuilder()
                .setCustomId("admin_back")
                .setLabel("Back to Admin")
                .setStyle(ButtonStyle.Secondary)
            ),
          ],
        });
      }

      // Validate unit input (basic validation)
      if (!customUnit || customUnit.length === 0) {
        return interaction.editReply({
          content:
            "Unit cannot be empty. Please specify a unit of measurement.",
          components: [
            new ActionRowBuilder().addComponents(
              new ButtonBuilder()
                .setCustomId("admin_back")
                .setLabel("Back to Admin")
                .setStyle(ButtonStyle.Secondary)
            ),
          ],
        });
      }

      // Limit unit length for database storage
      const finalUnit =
        customUnit.length > 50 ? customUnit.substring(0, 50) : customUnit;

      const guildId = interaction.guild.id;

      // Get resource info
      const resourceInfo = await ResourceModel.getByValueAndType(
        resourceValue,
        actionType,
        guildId
      );
      if (!resourceInfo) {
        throw new Error(
          `Resource "${resourceValue}" not found for action type "${actionType}"`
        );
      }

      // Check if target already exists
      const existingTarget = await TargetModel.getByActionAndResource(
        actionType,
        resourceValue,
        guildId
      );

      if (existingTarget) {
        // Update existing target with new amount and unit
        await TargetModel.updateAmountAndUnit(
          existingTarget.id,
          amount,
          finalUnit
        );

        await interaction.editReply({
          content: `Updated existing target: ${actionTypeInfo.display_name} ${amount} ${finalUnit} of ${resourceInfo.name}`,
          components: [
            new ActionRowBuilder().addComponents(
              new ButtonBuilder()
                .setCustomId("admin_targets")
                .setLabel("Back to Targets")
                .setStyle(ButtonStyle.Primary),
              new ButtonBuilder()
                .setCustomId("admin_back")
                .setLabel("Back to Admin")
                .setStyle(ButtonStyle.Secondary)
            ),
          ],
        });
      } else {
        // Create new target with custom unit
        await TargetModel.createWithUnit(
          actionType,
          resourceValue,
          amount,
          finalUnit,
          interaction.user.id,
          guildId
        );

        await interaction.editReply({
          content: `Successfully set target: ${actionTypeInfo.display_name} ${amount} ${finalUnit} of ${resourceInfo.name}`,
          components: [
            new ActionRowBuilder().addComponents(
              new ButtonBuilder()
                .setCustomId("admin_targets")
                .setLabel("Back to Targets")
                .setStyle(ButtonStyle.Primary),
              new ButtonBuilder()
                .setCustomId("admin_back")
                .setLabel("Back to Admin")
                .setStyle(ButtonStyle.Secondary)
            ),
          ],
        });
      }

      // Update dashboards
      await updateDashboards(interaction.client);
    } catch (error) {
      console.error("Error adding target with unit:", error);

      await interaction.editReply({
        content: `Error adding target: ${error.message}`,
        components: [
          new ActionRowBuilder().addComponents(
            new ButtonBuilder()
              .setCustomId("admin_back")
              .setLabel("Back to Admin")
              .setStyle(ButtonStyle.Secondary)
          ),
        ],
      });
    }
  } else if (modalId === "admin_create_dashboard_modal") {
    // Create dashboard
    const channelId = interaction.fields.getTextInputValue("dashboard_channel");

    try {
      // Get the channel
      const channel = await interaction.client.channels.fetch(channelId);

      if (!channel) {
        throw new Error("Channel not found");
      }

      // Create LiveDashboard command
      const dashboardCommand = interaction.client.commands.get("livedashboard");
      if (!dashboardCommand) {
        throw new Error("LiveDashboard command not found");
      }

      // Create options for the command
      const options = {
        getChannel: () => channel,
      };
      // Create a mock interaction
      const mockInteraction = {
        ...interaction,
        options,
        deferReply: async () => {},
        editReply: async (data) => {
          await interaction.reply({
            content: "Dashboard created successfully!",
            flags: MessageFlags.Ephemeral,
            components: [
              new ActionRowBuilder().addComponents(
                new ButtonBuilder()
                  .setCustomId("admin_display")
                  .setLabel("Back to Display Controls")
                  .setStyle(ButtonStyle.Primary),
                new ButtonBuilder()
                  .setCustomId("admin_back")
                  .setLabel("Back to Admin")
                  .setStyle(ButtonStyle.Secondary)
              ),
            ],
          });
        },
      };

      // Execute the command
      await dashboardCommand.execute(mockInteraction);
    } catch (error) {
      console.error("Error creating dashboard:", error);

      await interaction.reply({
        content: `Error creating dashboard: ${error.message}`,
        flags: MessageFlags.Ephemeral,
        components: [
          new ActionRowBuilder().addComponents(
            new ButtonBuilder()
              .setCustomId("admin_back")
              .setLabel("Back to Admin")
              .setStyle(ButtonStyle.Secondary)
          ),
        ],
      });
    }
  } else if (modalId === "admin_auto_report_modal") {
    // Configure auto reports
    const channelId = interaction.fields.getTextInputValue(
      "auto_report_channel"
    );
    const time = interaction.fields.getTextInputValue("auto_report_time");
    const enabled =
      interaction.fields
        .getTextInputValue("auto_report_enabled")
        .toLowerCase() === "true";

    // Validate time format (24h: HH:MM)
    const timeRegex = /^([01]?[0-9]|2[0-3]):([0-5][0-9])$/;
    if (!timeRegex.test(time)) {
      return interaction.reply({
        content:
          "Invalid time format. Please use 24h format (e.g., 08:00 or 20:30).",
        flags: MessageFlags.Ephemeral,
        components: [
          new ActionRowBuilder().addComponents(
            new ButtonBuilder()
              .setCustomId("admin_display")
              .setLabel("Back to Display Controls")
              .setStyle(ButtonStyle.Primary)
          ),
        ],
      });
    }

    try {
      // Get the channel
      const channel = await interaction.client.channels.fetch(channelId);

      if (!channel) {
        throw new Error("Channel not found");
      }

      // Update auto report settings in database
      const autoReportSettings = {
        enabled,
        channelId,
        time,
        guildId: interaction.guild.id,
        lastReportDate: null, // Reset last report date to ensure next report runs
      };

      await SettingModel.setAutoReport(autoReportSettings);

      // Success message
      await interaction.reply({
        content: `Auto reports ${enabled ? "enabled" : "disabled"}. ${
          enabled
            ? `Reports will be posted in <#${channelId}> at ${time} UTC.`
            : ""
        }`,
        flags: MessageFlags.Ephemeral,
        components: [
          new ActionRowBuilder().addComponents(
            new ButtonBuilder()
              .setCustomId("admin_display")
              .setLabel("Back to Display Controls")
              .setStyle(ButtonStyle.Primary),
            new ButtonBuilder()
              .setCustomId("admin_back")
              .setLabel("Back to Admin")
              .setStyle(ButtonStyle.Secondary)
          ),
        ],
      });
    } catch (error) {
      console.error("Error configuring auto reports:", error);

      await interaction.reply({
        content: `Error configuring auto reports: ${error.message}`,
        flags: MessageFlags.Ephemeral,
        components: [
          new ActionRowBuilder().addComponents(
            new ButtonBuilder()
              .setCustomId("admin_back")
              .setLabel("Back to Admin")
              .setStyle(ButtonStyle.Secondary)
          ),
        ],
      });
    }
  }
}

module.exports = {
  handleAdminButtonInteraction,
  handleAdminSelectMenuInteraction,
  handleAdminModalSubmit,
};
