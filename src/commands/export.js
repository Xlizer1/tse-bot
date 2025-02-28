const {
  SlashCommandBuilder,
  AttachmentBuilder,
  MessageFlags,
} = require("discord.js");
const ExcelJS = require("exceljs");
const path = require("path");
const fs = require("fs");
const TargetModel = require("../models/target");
const ContributionModel = require("../models/contribution");

module.exports = {
  data: new SlashCommandBuilder()
    .setName("export")
    .setDescription("Export resource collection data as Excel spreadsheet"),

  async execute(interaction) {
    try {
      // Check permissions for admin-only command
      if (!interaction.member.permissions.has("Administrator")) {
        return interaction.reply({
          content:
            "You do not have permission to use this command. Only administrators can export data.",
          flags: MessageFlags.Ephemeral,
        });
      }

      // Defer reply as this might take a moment
      await interaction.deferReply();

      // Get all targets with progress
      const targets = await TargetModel.getAllWithProgress();

      if (targets.length === 0) {
        return interaction.editReply({
          content: "No data available to export.",
          flags: MessageFlags.Ephemeral,
        });
      }

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
      summarySheet.getCell(`A4`).border = {
        top: { style: "medium" },
        left: { style: "medium" },
      };
      summarySheet.getCell(`E4`).border = {
        top: { style: "medium" },
        right: { style: "medium" },
      };
      summarySheet.getCell(`A${lastRowNum}`).border = {
        bottom: { style: "medium" },
        left: { style: "medium" },
      };
      summarySheet.getCell(`E${lastRowNum}`).border = {
        bottom: { style: "medium" },
        right: { style: "medium" },
      };

      // Add border to all cells in the table
      for (let i = 4; i <= lastRowNum; i++) {
        for (let j = 1; j <= 5; j++) {
          const cell = summarySheet.getCell(i, j);
          cell.border = {
            ...cell.border,
            top: cell.border?.top || { style: "thin" },
            left: cell.border?.left || { style: "thin" },
            bottom: cell.border?.bottom || { style: "thin" },
            right: cell.border?.right || { style: "thin" },
          };
        }
      }

      // Create Details worksheet
      const detailsSheet = workbook.addWorksheet("Detailed Contributions");

      // Add title
      detailsSheet.mergeCells("A1:F1");
      const detailsTitle = detailsSheet.getCell("A1");
      detailsTitle.value = "Detailed Resource Contributions";
      detailsTitle.font = {
        size: 16,
        bold: true,
        color: { argb: "4F33FF" },
      };
      detailsTitle.alignment = { horizontal: "center" };

      // Add headers
      detailsSheet.addRow([]);
      const detailsHeaders = detailsSheet.addRow([
        "Timestamp",
        "User",
        "Resource",
        "Action",
        "Amount (SCU)",
        "Location",
      ]);
      detailsHeaders.eachCell((cell) => {
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
      detailsSheet.getColumn("A").width = 22; // Timestamp
      detailsSheet.getColumn("B").width = 20; // User
      detailsSheet.getColumn("C").width = 15; // Resource
      detailsSheet.getColumn("D").width = 15; // Action
      detailsSheet.getColumn("E").width = 15; // Amount
      detailsSheet.getColumn("F").width = 30; // Location

      // Collect all contributions
      const allContributions = [];

      // Get all contributions for each target
      for (const target of targets) {
        const contributions = await ContributionModel.getByTargetId(
          target.id,
          1000
        );

        for (const contribution of contributions) {
          allContributions.push({
            timestamp: new Date(contribution.timestamp),
            username: contribution.username,
            resource:
              target.resource_name ||
              target.resource.charAt(0).toUpperCase() +
                target.resource.slice(1),
            action:
              target.action.charAt(0).toUpperCase() + target.action.slice(1),
            amount: contribution.amount,
            location: contribution.location,
          });
        }
      }

      // Sort contributions by timestamp (newest first)
      allContributions.sort((a, b) => b.timestamp - a.timestamp);

      // Add contribution rows
      allContributions.forEach((contribution) => {
        const row = detailsSheet.addRow([
          contribution.timestamp.toLocaleString(),
          contribution.username,
          contribution.resource,
          contribution.action,
          contribution.amount,
          contribution.location,
        ]);

        // Alternate row coloring for readability
        if (row.number % 2 === 0) {
          row.eachCell((cell) => {
            cell.fill = {
              type: "pattern",
              pattern: "solid",
              fgColor: { argb: "F2F2F2" },
              bgColor: { argb: "F2F2F2" },
            };
          });
        }
      });

      // Add borders to details table
      const detailsLastRowNum = detailsSheet.rowCount;
      for (let i = 3; i <= detailsLastRowNum; i++) {
        for (let j = 1; j <= 6; j++) {
          const cell = detailsSheet.getCell(i, j);
          cell.border = {
            top: { style: "thin" },
            left: { style: "thin" },
            bottom: { style: "thin" },
            right: { style: "thin" },
          };
        }
      }

      // Add outer borders
      detailsSheet.getCell(`A3`).border = {
        ...detailsSheet.getCell(`A3`).border,
        top: { style: "medium" },
        left: { style: "medium" },
      };
      detailsSheet.getCell(`F3`).border = {
        ...detailsSheet.getCell(`F3`).border,
        top: { style: "medium" },
        right: { style: "medium" },
      };
      detailsSheet.getCell(`A${detailsLastRowNum}`).border = {
        ...detailsSheet.getCell(`A${detailsLastRowNum}`).border,
        bottom: { style: "medium" },
        left: { style: "medium" },
      };
      detailsSheet.getCell(`F${detailsLastRowNum}`).border = {
        ...detailsSheet.getCell(`F${detailsLastRowNum}`).border,
        bottom: { style: "medium" },
        right: { style: "medium" },
      };

      // Create User Summary worksheet
      const userSummarySheet = workbook.addWorksheet("User Summary");

      // Add title
      userSummarySheet.mergeCells("A1:C1");
      const userTitle = userSummarySheet.getCell("A1");
      userTitle.value = "User Contribution Summary";
      userTitle.font = {
        size: 16,
        bold: true,
        color: { argb: "4F33FF" },
      };
      userTitle.alignment = { horizontal: "center" };

      // Add headers
      userSummarySheet.addRow([]);
      const userHeaders = userSummarySheet.addRow([
        "User",
        "Total Contributions (SCU)",
        "Percentage of Total",
      ]);
      userHeaders.eachCell((cell) => {
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
      userSummarySheet.getColumn("A").width = 25; // User
      userSummarySheet.getColumn("B").width = 25; // Total
      userSummarySheet.getColumn("C").width = 25; // Percentage

      // Calculate user totals
      const userTotals = new Map();
      let grandTotal = 0;
      allContributions.forEach((contribution) => {
        if (!userTotals.has(contribution.username)) {
          userTotals.set(contribution.username, 0);
        }
        userTotals.set(
          contribution.username,
          userTotals.get(contribution.username) + contribution.amount
        );
        grandTotal += contribution.amount;
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
        const row = userSummarySheet.addRow([
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
        } else if (index % 2 === 0) {
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
      });

      // Add total row
      const totalRow = userSummarySheet.addRow(["TOTAL", grandTotal, "100.0%"]);
      totalRow.eachCell((cell) => {
        cell.font = { bold: true };
        cell.fill = {
          type: "pattern",
          pattern: "solid",
          fgColor: { argb: "4472C4" },
          bgColor: { argb: "4472C4" },
        };
        cell.font = { bold: true, color: { argb: "FFFFFF" } };
      });

      // Add borders to user summary table
      const userLastRowNum = userSummarySheet.rowCount;
      for (let i = 3; i <= userLastRowNum; i++) {
        for (let j = 1; j <= 3; j++) {
          const cell = userSummarySheet.getCell(i, j);
          cell.border = {
            top: { style: "thin" },
            left: { style: "thin" },
            bottom: { style: "thin" },
            right: { style: "thin" },
          };
        }
      }

      // Add outer borders
      userSummarySheet.getCell(`A3`).border = {
        ...userSummarySheet.getCell(`A3`).border,
        top: { style: "medium" },
        left: { style: "medium" },
      };
      userSummarySheet.getCell(`C3`).border = {
        ...userSummarySheet.getCell(`C3`).border,
        top: { style: "medium" },
        right: { style: "medium" },
      };
      userSummarySheet.getCell(`A${userLastRowNum}`).border = {
        ...userSummarySheet.getCell(`A${userLastRowNum}`).border,
        bottom: { style: "medium" },
        left: { style: "medium" },
      };
      userSummarySheet.getCell(`C${userLastRowNum}`).border = {
        ...userSummarySheet.getCell(`C${userLastRowNum}`).border,
        bottom: { style: "medium" },
        right: { style: "medium" },
      };

      // Create data directory if it doesn't exist
      const dataDir = path.join(__dirname, "..", "data");
      if (!fs.existsSync(dataDir)) {
        fs.mkdirSync(dataDir, { recursive: true });
      }

      // Save the workbook to a buffer
      const tempFile = path.join(
        __dirname,
        "..",
        "data",
        "resource_report.xlsx"
      );
      await workbook.xlsx.writeFile(tempFile);

      // Create attachment
      const attachment = new AttachmentBuilder(tempFile, {
        name: "resource_report.xlsx",
      });

      // Reply with the file
      await interaction.editReply({
        content: "Here is your exported data with detailed formatting:",
        files: [attachment],
      });

      // Clean up temp file after a short delay
      setTimeout(() => {
        fs.unlinkSync(tempFile);
      }, 5000);
    } catch (error) {
      console.error("Export error:", error);
      await interaction.editReply(
        "There was an error exporting the data. Please try again later."
      );
    }
  },
};
