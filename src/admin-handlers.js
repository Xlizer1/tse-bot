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
const { safeEmbedReply, addLongContentField } = require("./utils/embedUtils");

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
    // NEW: Action Types Management
    case "admin_actiontypes":
      await handleActionTypesButton(interaction);
      break;
    case "admin_add_actiontype":
      await handleAddActionTypeButton(interaction);
      break;
    case "admin_edit_actiontype":
      await handleEditActionTypeButton(interaction);
      break;
    case "admin_delete_actiontype":
      await handleDeleteActionTypeButton(interaction);
      break;

    // NEW: Tag Management
    case "admin_managetags":
      await handleManageTagsButton(interaction);
      break;
    case "admin_add_tags":
      await handleAddTagsButton(interaction);
      break;
    case "admin_remove_tags":
      await handleRemoveTagsButton(interaction);
      break;
    case "admin_view_tags":
      await handleViewTagsButton(interaction);
      break;

    // NEW: Shared Dashboard Management
    case "admin_sharedashboard":
      await handleSharedDashboardButton(interaction);
      break;
    case "admin_create_shared":
      await handleCreateSharedButton(interaction);
      break;
    case "admin_list_servers":
      await handleListServersButton(interaction);
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

async function handleAddActionTypeButton(interaction) {
  const modal = new ModalBuilder()
    .setCustomId("admin_add_actiontype_modal")
    .setTitle("Add New Action Type");

  const nameInput = new TextInputBuilder()
    .setCustomId("actiontype_name")
    .setLabel("System Name")
    .setPlaceholder("e.g., trading (lowercase, no spaces)")
    .setStyle(TextInputStyle.Short)
    .setRequired(true);

  const displayNameInput = new TextInputBuilder()
    .setCustomId("actiontype_display_name")
    .setLabel("Display Name")
    .setPlaceholder("e.g., Trading Operations")
    .setStyle(TextInputStyle.Short)
    .setRequired(true);

  const unitInput = new TextInputBuilder()
    .setCustomId("actiontype_unit")
    .setLabel("Unit of Measurement")
    .setPlaceholder("e.g., aUEC, SCU, Units")
    .setStyle(TextInputStyle.Short)
    .setRequired(true);

  const emojiInput = new TextInputBuilder()
    .setCustomId("actiontype_emoji")
    .setLabel("Emoji (optional)")
    .setPlaceholder("e.g., 💱")
    .setStyle(TextInputStyle.Short)
    .setRequired(false);

  modal.addComponents(
    new ActionRowBuilder().addComponents(nameInput),
    new ActionRowBuilder().addComponents(displayNameInput),
    new ActionRowBuilder().addComponents(unitInput),
    new ActionRowBuilder().addComponents(emojiInput)
  );

  await interaction.showModal(modal);
}

async function handleEditActionTypeButton(interaction) {
  try {
    const actionTypes = await ActionTypeModel.getAll();

    if (actionTypes.length === 0) {
      return interaction.update({
        content: "No action types available to edit.",
        components: [
          new ActionRowBuilder().addComponents(
            new ButtonBuilder()
              .setCustomId("admin_actiontypes")
              .setLabel("Back to Action Types")
              .setStyle(ButtonStyle.Secondary)
          ),
        ],
      });
    }

    const selectMenu = new ActionRowBuilder().addComponents(
      new StringSelectMenuBuilder()
        .setCustomId("admin_edit_actiontype_select")
        .setPlaceholder("Select action type to edit")
        .addOptions(
          actionTypes.map((type) => ({
            label: `${type.display_name} (${type.name})`,
            value: type.id.toString(),
            description: `Unit: ${type.unit}`,
            emoji: type.emoji || undefined,
          }))
        )
    );

    const backButton = new ActionRowBuilder().addComponents(
      new ButtonBuilder()
        .setCustomId("admin_actiontypes")
        .setLabel("Back to Action Types")
        .setStyle(ButtonStyle.Secondary)
    );

    await interaction.update({
      content: "Select the action type you want to edit:",
      embeds: [],
      components: [selectMenu, backButton],
    });
  } catch (error) {
    console.error("Error in handleEditActionTypeButton:", error);
    await interaction.update({
      content: "An error occurred while loading action types for editing.",
      components: [
        new ActionRowBuilder().addComponents(
          new ButtonBuilder()
            .setCustomId("admin_actiontypes")
            .setLabel("Back to Action Types")
            .setStyle(ButtonStyle.Secondary)
        ),
      ],
    });
  }
}

async function handleDeleteActionTypeButton(interaction) {
  try {
    const actionTypes = await ActionTypeModel.getAll();

    if (actionTypes.length === 0) {
      return interaction.update({
        content: "No action types available to delete.",
        components: [
          new ActionRowBuilder().addComponents(
            new ButtonBuilder()
              .setCustomId("admin_actiontypes")
              .setLabel("Back to Action Types")
              .setStyle(ButtonStyle.Secondary)
          ),
        ],
      });
    }

    const selectMenu = new ActionRowBuilder().addComponents(
      new StringSelectMenuBuilder()
        .setCustomId("admin_delete_actiontype_select")
        .setPlaceholder("Select action type to delete")
        .addOptions(
          actionTypes.map((type) => ({
            label: `${type.display_name} (${type.name})`,
            value: type.id.toString(),
            description: `Unit: ${type.unit} - ⚠️ Permanent deletion`,
            emoji: type.emoji || undefined,
          }))
        )
    );

    const backButton = new ActionRowBuilder().addComponents(
      new ButtonBuilder()
        .setCustomId("admin_actiontypes")
        .setLabel("Back to Action Types")
        .setStyle(ButtonStyle.Secondary)
    );

    await interaction.update({
      content:
        "⚠️ **Warning**: Deleting an action type will fail if it's being used by resources or targets.\n\nSelect the action type you want to delete:",
      embeds: [],
      components: [selectMenu, backButton],
    });
  } catch (error) {
    console.error("Error in handleDeleteActionTypeButton:", error);
    await interaction.update({
      content: "An error occurred while loading action types for deletion.",
      components: [
        new ActionRowBuilder().addComponents(
          new ButtonBuilder()
            .setCustomId("admin_actiontypes")
            .setLabel("Back to Action Types")
            .setStyle(ButtonStyle.Secondary)
        ),
      ],
    });
  }
}

async function handleAddTagsButton(interaction) {
  try {
    const guildId = interaction.guild.id;
    const targets = await TargetModel.getAllWithProgress(guildId);

    if (targets.length === 0) {
      return interaction.update({
        content: "No targets available to add tags to.",
        components: [
          new ActionRowBuilder().addComponents(
            new ButtonBuilder()
              .setCustomId("admin_managetags")
              .setLabel("Back to Tag Management")
              .setStyle(ButtonStyle.Secondary)
          ),
        ],
      });
    }

    const selectMenu = new ActionRowBuilder().addComponents(
      new StringSelectMenuBuilder()
        .setCustomId("admin_add_tags_target_select")
        .setPlaceholder("Select target to add tags to")
        .addOptions(
          targets.slice(0, 25).map((target) => {
            const resourceName = target.resource_name || target.resource;
            const actionName =
              target.action.charAt(0).toUpperCase() + target.action.slice(1);
            let currentTags = target.tags || [];
            if (typeof currentTags === "string") {
              currentTags = JSON.parse(currentTags);
            }

            return {
              label: `${actionName} ${resourceName}`,
              value: target.id.toString(),
              description:
                currentTags.length > 0
                  ? `Current tags: ${currentTags.join(", ")}`
                  : "No tags currently",
            };
          })
        )
    );

    const backButton = new ActionRowBuilder().addComponents(
      new ButtonBuilder()
        .setCustomId("admin_managetags")
        .setLabel("Back to Tag Management")
        .setStyle(ButtonStyle.Secondary)
    );

    await interaction.update({
      content: "Select the target you want to add tags to:",
      embeds: [],
      components: [selectMenu, backButton],
    });
  } catch (error) {
    console.error("Error in handleAddTagsButton:", error);
    await interaction.update({
      content: "An error occurred while loading targets for tag addition.",
      components: [
        new ActionRowBuilder().addComponents(
          new ButtonBuilder()
            .setCustomId("admin_managetags")
            .setLabel("Back to Tag Management")
            .setStyle(ButtonStyle.Secondary)
        ),
      ],
    });
  }
}

async function handleRemoveTagsButton(interaction) {
  try {
    const guildId = interaction.guild.id;
    const targets = await TargetModel.getAllWithProgress(guildId);

    // Filter to only targets with tags
    const taggedTargets = targets.filter((target) => {
      let tags = target.tags || [];
      if (typeof tags === "string") {
        tags = JSON.parse(tags);
      }
      return tags && tags.length > 0;
    });

    if (taggedTargets.length === 0) {
      return interaction.update({
        content: "No targets have tags to remove.",
        components: [
          new ActionRowBuilder().addComponents(
            new ButtonBuilder()
              .setCustomId("admin_managetags")
              .setLabel("Back to Tag Management")
              .setStyle(ButtonStyle.Secondary)
          ),
        ],
      });
    }

    const selectMenu = new ActionRowBuilder().addComponents(
      new StringSelectMenuBuilder()
        .setCustomId("admin_remove_tags_target_select")
        .setPlaceholder("Select target to remove tags from")
        .addOptions(
          taggedTargets.slice(0, 25).map((target) => {
            const resourceName = target.resource_name || target.resource;
            const actionName =
              target.action.charAt(0).toUpperCase() + target.action.slice(1);
            let currentTags = target.tags || [];
            if (typeof currentTags === "string") {
              currentTags = JSON.parse(currentTags);
            }

            return {
              label: `${actionName} ${resourceName}`,
              value: target.id.toString(),
              description: `Current tags: ${currentTags.join(", ")}`,
            };
          })
        )
    );

    const backButton = new ActionRowBuilder().addComponents(
      new ButtonBuilder()
        .setCustomId("admin_managetags")
        .setLabel("Back to Tag Management")
        .setStyle(ButtonStyle.Secondary)
    );

    await interaction.update({
      content: "Select the target you want to remove tags from:",
      embeds: [],
      components: [selectMenu, backButton],
    });
  } catch (error) {
    console.error("Error in handleRemoveTagsButton:", error);
    await interaction.update({
      content: "An error occurred while loading targets for tag removal.",
      components: [
        new ActionRowBuilder().addComponents(
          new ButtonBuilder()
            .setCustomId("admin_managetags")
            .setLabel("Back to Tag Management")
            .setStyle(ButtonStyle.Secondary)
        ),
      ],
    });
  }
}

async function handleViewTagsButton(interaction) {
  try {
    const guildId = interaction.guild.id;
    const allTags = await TargetModel.getAllTags(guildId);

    if (allTags.length === 0) {
      return interaction.update({
        content: "No tags available to view targets for.",
        components: [
          new ActionRowBuilder().addComponents(
            new ButtonBuilder()
              .setCustomId("admin_managetags")
              .setLabel("Back to Tag Management")
              .setStyle(ButtonStyle.Secondary)
          ),
        ],
      });
    }

    const selectMenu = new ActionRowBuilder().addComponents(
      new StringSelectMenuBuilder()
        .setCustomId("admin_view_tags_select")
        .setPlaceholder("Select tag to view targets")
        .addOptions(
          allTags.slice(0, 25).map((tag) => ({
            label: tag,
            value: tag,
            description: `View all targets with the "${tag}" tag`,
          }))
        )
    );

    const backButton = new ActionRowBuilder().addComponents(
      new ButtonBuilder()
        .setCustomId("admin_managetags")
        .setLabel("Back to Tag Management")
        .setStyle(ButtonStyle.Secondary)
    );

    await interaction.update({
      content: "Select a tag to view all targets with that tag:",
      embeds: [],
      components: [selectMenu, backButton],
    });
  } catch (error) {
    console.error("Error in handleViewTagsButton:", error);
    await interaction.update({
      content: "An error occurred while loading tags for viewing.",
      components: [
        new ActionRowBuilder().addComponents(
          new ButtonBuilder()
            .setCustomId("admin_managetags")
            .setLabel("Back to Tag Management")
            .setStyle(ButtonStyle.Secondary)
        ),
      ],
    });
  }
}

// NEW: Shared Dashboard Button Handlers
async function handleCreateSharedButton(interaction) {
  const modal = new ModalBuilder()
    .setCustomId("admin_create_shared_modal")
    .setTitle("Create Shared Dashboard");

  const serverIdInput = new TextInputBuilder()
    .setCustomId("shared_server_id")
    .setLabel("Source Server ID")
    .setPlaceholder("Enter the Discord server ID to share data from")
    .setStyle(TextInputStyle.Short)
    .setRequired(true);

  const channelIdInput = new TextInputBuilder()
    .setCustomId("shared_channel_id")
    .setLabel("Channel ID (Optional)")
    .setPlaceholder("Leave empty to post in the current channel)")
    .setStyle(TextInputStyle.Short)
    .setRequired(false);

  const filterInput = new TextInputBuilder()
    .setCustomId("shared_filter")
    .setLabel("Tag Filter (Optional)")
    .setPlaceholder("e.g., idris,critical (comma-separated)")
    .setStyle(TextInputStyle.Short)
    .setRequired(false);

  const titleInput = new TextInputBuilder()
    .setCustomId("shared_title")
    .setLabel("Custom Title (Optional)")
    .setPlaceholder("e.g., Alliance Idris Progress")
    .setStyle(TextInputStyle.Short)
    .setRequired(false);

  modal.addComponents(
    new ActionRowBuilder().addComponents(serverIdInput),
    new ActionRowBuilder().addComponents(channelIdInput),
    new ActionRowBuilder().addComponents(filterInput),
    new ActionRowBuilder().addComponents(titleInput)
  );

  await interaction.showModal(modal);
}

async function handleListServersButton(interaction) {
  try {
    // Get all servers with targets
    const [servers] = await interaction.client.db.execute(
      "SELECT guild_id, COUNT(*) as target_count FROM targets GROUP BY guild_id ORDER BY target_count DESC"
    );

    if (servers.length === 0) {
      return interaction.update({
        content: "No servers have any targets defined yet.",
        components: [
          new ActionRowBuilder().addComponents(
            new ButtonBuilder()
              .setCustomId("admin_sharedashboard")
              .setLabel("Back to Shared Dashboards")
              .setStyle(ButtonStyle.Secondary)
          ),
        ],
      });
    }

    const embed = new EmbedBuilder()
      .setColor(0x0099ff)
      .setTitle("📋 Available Servers for Dashboard Sharing")
      .setDescription(
        "These servers have resource collection data that can be shared"
      )
      .setTimestamp();

    // Add server information
    const serverList = await Promise.all(
      servers.map(async (server) => {
        const serverId = server.guild_id;

        let serverName = "Unknown Server";
        let serverIcon = null;
        try {
          const guild = await interaction.client.guilds.fetch(serverId);
          if (guild) {
            serverName = guild.name;
            serverIcon = guild.iconURL({ dynamic: true });
          }
        } catch (err) {
          // Guild not accessible
        }

        return {
          name: serverName,
          value: `**Server ID**: \`${serverId}\`\n**Targets**: ${server.target_count}`,
          inline: true,
        };
      })
    );

    // Add up to 10 servers to avoid embed limits
    embed.addFields(serverList.slice(0, 10));

    if (servers.length > 10) {
      embed.setFooter({ text: `Showing 10 of ${servers.length} servers` });
    }

    const backButton = new ActionRowBuilder().addComponents(
      new ButtonBuilder()
        .setCustomId("admin_sharedashboard")
        .setLabel("Back to Shared Dashboards")
        .setStyle(ButtonStyle.Secondary)
    );

    await interaction.update({
      embeds: [embed],
      components: [backButton],
    });
  } catch (error) {
    console.error("Error in handleListServersButton:", error);
    await interaction.update({
      content: "An error occurred while loading server list.",
      components: [
        new ActionRowBuilder().addComponents(
          new ButtonBuilder()
            .setCustomId("admin_sharedashboard")
            .setLabel("Back to Shared Dashboards")
            .setStyle(ButtonStyle.Secondary)
        ),
      ],
    });
  }
}

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

    // Add fields for each action type using the utility function
    for (const actionType of actionTypes) {
      const resources = groupedResources[actionType.name] || [];
      const fieldName = `${actionType.emoji || "📦"} ${
        actionType.display_name
      } Resources (${actionType.unit})`;

      if (resources.length > 0) {
        const resourceDescriptions = resources.map(formatResourceDescription);

        // Use utility function to handle long content
        addLongContentField(resourcesEmbed, fieldName, resourceDescriptions, {
          emptyMessage: `No ${actionType.display_name.toLowerCase()} resources defined`,
        });
      } else {
        resourcesEmbed.addFields({
          name: fieldName,
          value: `No ${actionType.display_name.toLowerCase()} resources defined`,
          inline: false,
        });
      }
    }

    // Add statistics
    const totalResources = Object.values(groupedResources).flat().length;
    const resourceStats = [`**Total Resource Types**: ${totalResources}`];

    // Add count per action type
    actionTypes.forEach((type) => {
      const count = (groupedResources[type.name] || []).length;
      resourceStats.push(`• ${type.display_name}: ${count}`);
    });

    // Use utility function for stats field
    addLongContentField(resourcesEmbed, "📊 Resource Overview", resourceStats, {
      separator: "\n",
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

    // Use safe embed reply
    await safeEmbedReply(interaction, {
      embeds: [resourcesEmbed],
      components: [row],
    });

    // Alternative: if you prefer to keep the original structure
    // await interaction.update({
    //   embeds: [resourcesEmbed],
    //   components: [row],
    // });
  } catch (error) {
    console.error("Error in handleResourcesButton:", error);

    await safeEmbedReply(interaction, {
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

// ENHANCED: Update main admin dashboard to include new buttons
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
        name: "Action Types Management", // NEW
        value:
          "Create, update, or delete action types (mining, salvage, etc.).",
      },
      {
        name: "Tag Management", // NEW
        value:
          "Manage tags on targets for dashboard organization and filtering.",
      },
      {
        name: "Shared Dashboards", // NEW
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

  // Create button rows - ENHANCED with new buttons
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
      .setCustomId("admin_actiontypes") // NEW
      .setLabel("Action Types")
      .setStyle(ButtonStyle.Primary)
  );

  const row2 = new ActionRowBuilder().addComponents(
    new ButtonBuilder()
      .setCustomId("admin_managetags") // NEW
      .setLabel("Tag Management")
      .setStyle(ButtonStyle.Primary),
    new ButtonBuilder()
      .setCustomId("admin_sharedashboard") // NEW
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

  // Send the dashboard
  await interaction.update({
    embeds: [dashboardEmbed],
    components: [row1, row2, row3],
  });
}

// NEW: Action Types Management Handler
async function handleActionTypesButton(interaction) {
  try {
    const actionTypes = await ActionTypeModel.getAll();

    const actionTypesEmbed = new EmbedBuilder()
      .setColor(0x0099ff)
      .setTitle("🔧 Action Types Management")
      .setDescription(
        "Manage the types of actions users can log (mining, salvage, etc.)"
      )
      .setTimestamp();

    if (actionTypes.length === 0) {
      actionTypesEmbed.addFields({
        name: "No Action Types",
        value: "No action types have been defined yet.",
      });
    } else {
      // Add current action types
      const actionTypesList = actionTypes
        .map((type) => {
          return (
            `${type.emoji || "📦"} **${type.display_name}**\n` +
            `System Name: \`${type.name}\`\n` +
            `Unit: ${type.unit}`
          );
        })
        .join("\n\n");

      actionTypesEmbed.addFields({
        name: `Current Action Types (${actionTypes.length})`,
        value:
          actionTypesList.length > 1024
            ? actionTypesList.substring(0, 1020) + "..."
            : actionTypesList,
      });
    }

    // Create button row
    const row = new ActionRowBuilder().addComponents(
      new ButtonBuilder()
        .setCustomId("admin_add_actiontype")
        .setLabel("Add Action Type")
        .setStyle(ButtonStyle.Success)
        .setEmoji("➕"),
      new ButtonBuilder()
        .setCustomId("admin_edit_actiontype")
        .setLabel("Edit Action Type")
        .setStyle(ButtonStyle.Primary)
        .setEmoji("✏️"),
      new ButtonBuilder()
        .setCustomId("admin_delete_actiontype")
        .setLabel("Delete Action Type")
        .setStyle(ButtonStyle.Danger)
        .setEmoji("🗑️"),
      new ButtonBuilder()
        .setCustomId("admin_back")
        .setLabel("Back to Admin")
        .setStyle(ButtonStyle.Secondary)
        .setEmoji("🔙")
    );

    await interaction.update({
      embeds: [actionTypesEmbed],
      components: [row],
    });
  } catch (error) {
    console.error("Error in handleActionTypesButton:", error);
    await interaction.update({
      content:
        "An error occurred while loading action types. Please try again.",
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

// NEW: Tag Management Handler
async function handleManageTagsButton(interaction) {
  try {
    const guildId = interaction.guild.id;
    const allTags = await TargetModel.getAllTags(guildId);
    const targets = await TargetModel.getAllWithProgress(guildId);

    const tagsEmbed = new EmbedBuilder()
      .setColor(0x0099ff)
      .setTitle("🏷️ Tag Management")
      .setDescription(
        "Manage tags on targets for dashboard organization and filtering"
      )
      .setTimestamp();

    if (allTags.length === 0) {
      tagsEmbed.addFields({
        name: "No Tags Found",
        value: "No tags are currently in use on any targets.",
      });
    } else {
      // Show tag usage statistics
      const tagUsage = new Map();
      targets.forEach((target) => {
        let targetTags = target.tags || [];
        if (typeof targetTags === "string") {
          targetTags = JSON.parse(targetTags);
        }
        targetTags.forEach((tag) => {
          tagUsage.set(tag, (tagUsage.get(tag) || 0) + 1);
        });
      });

      const tagList = allTags
        .map((tag) => {
          const usage = tagUsage.get(tag) || 0;
          return `\`${tag}\` (${usage} target${usage !== 1 ? "s" : ""})`;
        })
        .join(", ");

      tagsEmbed.addFields(
        {
          name: `Available Tags (${allTags.length})`,
          value:
            tagList.length > 1024
              ? tagList.substring(0, 1020) + "..."
              : tagList,
        },
        {
          name: "Statistics",
          value: `**Total Targets**: ${targets.length}\n**Tagged Targets**: ${
            targets.filter((t) => t.tags && t.tags.length > 0).length
          }`,
        }
      );
    }

    // Create button row
    const row = new ActionRowBuilder().addComponents(
      new ButtonBuilder()
        .setCustomId("admin_add_tags")
        .setLabel("Add Tags to Target")
        .setStyle(ButtonStyle.Success)
        .setEmoji("🏷️"),
      new ButtonBuilder()
        .setCustomId("admin_remove_tags")
        .setLabel("Remove Tags from Target")
        .setStyle(ButtonStyle.Danger)
        .setEmoji("🚫"),
      new ButtonBuilder()
        .setCustomId("admin_view_tags")
        .setLabel("View Targets by Tag")
        .setStyle(ButtonStyle.Primary)
        .setEmoji("👁️"),
      new ButtonBuilder()
        .setCustomId("admin_back")
        .setLabel("Back to Admin")
        .setStyle(ButtonStyle.Secondary)
        .setEmoji("🔙")
    );

    await interaction.update({
      embeds: [tagsEmbed],
      components: [row],
    });
  } catch (error) {
    console.error("Error in handleManageTagsButton:", error);
    await interaction.update({
      content:
        "An error occurred while loading tag management. Please try again.",
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

// NEW: Shared Dashboard Handler
async function handleSharedDashboardButton(interaction) {
  try {
    const guildId = interaction.guild.id;

    // Get shared dashboards for this guild
    const [sharedDashboards] = await interaction.client.db.execute(
      "SELECT * FROM dashboards WHERE guild_id = ? AND source_guild_id IS NOT NULL",
      [guildId]
    );

    // Get available servers with data
    const [availableServers] = await interaction.client.db.execute(
      "SELECT DISTINCT guild_id, COUNT(*) as target_count FROM targets GROUP BY guild_id"
    );

    const sharedEmbed = new EmbedBuilder()
      .setColor(0x0099ff)
      .setTitle("🔗 Shared Dashboard Management")
      .setDescription(
        "Create dashboards that display resource data from other Discord servers"
      )
      .setTimestamp();

    // Show current shared dashboards
    if (sharedDashboards.length === 0) {
      sharedEmbed.addFields({
        name: "Current Shared Dashboards",
        value: "No shared dashboards are currently active.",
      });
    } else {
      const dashboardList = await Promise.all(
        sharedDashboards.map(async (dashboard) => {
          let sourceName = dashboard.source_guild_id;
          try {
            const guild = await interaction.client.guilds.fetch(
              dashboard.source_guild_id
            );
            if (guild) sourceName = guild.name;
          } catch (e) {
            // Guild name not available
          }

          return `<#${dashboard.channel_id}> - Data from **${sourceName}**`;
        })
      );

      sharedEmbed.addFields({
        name: `Current Shared Dashboards (${sharedDashboards.length})`,
        value: dashboardList.join("\n"),
      });
    }

    // Show available servers
    if (availableServers.length > 1) {
      const serverList = await Promise.all(
        availableServers.slice(0, 5).map(async (server) => {
          if (server.guild_id === guildId) return null; // Skip own server

          let serverName = server.guild_id;
          try {
            const guild = await interaction.client.guilds.fetch(
              server.guild_id
            );
            if (guild) serverName = guild.name;
          } catch (e) {
            // Guild name not available
          }

          return `**${serverName}** (${server.target_count} targets)`;
        })
      );

      const filteredList = serverList.filter((item) => item !== null);
      if (filteredList.length > 0) {
        sharedEmbed.addFields({
          name: "Available Servers",
          value:
            filteredList.join("\n") +
            (availableServers.length > 6 ? "\n*...and more*" : ""),
        });
      }
    }

    // Create button row
    const row = new ActionRowBuilder().addComponents(
      new ButtonBuilder()
        .setCustomId("admin_create_shared")
        .setLabel("Create Shared Dashboard")
        .setStyle(ButtonStyle.Success)
        .setEmoji("➕"),
      new ButtonBuilder()
        .setCustomId("admin_list_servers")
        .setLabel("List Available Servers")
        .setStyle(ButtonStyle.Primary)
        .setEmoji("📋"),
      new ButtonBuilder()
        .setCustomId("admin_back")
        .setLabel("Back to Admin")
        .setStyle(ButtonStyle.Secondary)
        .setEmoji("🔙")
    );

    await interaction.update({
      embeds: [sharedEmbed],
      components: [row],
    });
  } catch (error) {
    console.error("Error in handleSharedDashboardButton:", error);
    await interaction.update({
      content:
        "An error occurred while loading shared dashboard management. Please try again.",
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
    // Existing cases...
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

    // NEW: Action Type Select Menus
    case "admin_edit_actiontype_select":
      await handleEditActionTypeSelect(interaction, selectedValue);
      break;
    case "admin_delete_actiontype_select":
      await handleDeleteActionTypeSelect(interaction, selectedValue);
      break;

    // NEW: Tag Management Select Menus
    case "admin_add_tags_target_select":
      await handleAddTagsTargetSelect(interaction, selectedValue);
      break;
    case "admin_remove_tags_target_select":
      await handleRemoveTagsTargetSelect(interaction, selectedValue);
      break;
    case "admin_remove_tags_tag_select":
      await handleRemoveTagsTagSelect(interaction, selectedValue);
      break;
    case "admin_view_tags_select":
      await handleViewTagsSelect(interaction, selectedValue);
      break;
  }
}

// Action Type Select Handlers
async function handleEditActionTypeSelect(interaction, actionTypeId) {
  try {
    const actionType = await ActionTypeModel.getById(actionTypeId);

    if (!actionType) {
      return interaction.update({
        content: "Action type not found.",
        components: [
          new ActionRowBuilder().addComponents(
            new ButtonBuilder()
              .setCustomId("admin_actiontypes")
              .setLabel("Back to Action Types")
              .setStyle(ButtonStyle.Secondary)
          ),
        ],
      });
    }

    const modal = new ModalBuilder()
      .setCustomId(`admin_edit_actiontype_modal_${actionTypeId}`)
      .setTitle(`Edit Action Type: ${actionType.display_name}`);

    const displayNameInput = new TextInputBuilder()
      .setCustomId("actiontype_display_name")
      .setLabel("Display Name")
      .setValue(actionType.display_name)
      .setStyle(TextInputStyle.Short)
      .setRequired(true);

    const unitInput = new TextInputBuilder()
      .setCustomId("actiontype_unit")
      .setLabel("Unit of Measurement")
      .setValue(actionType.unit)
      .setStyle(TextInputStyle.Short)
      .setRequired(true);

    const emojiInput = new TextInputBuilder()
      .setCustomId("actiontype_emoji")
      .setLabel("Emoji (optional)")
      .setValue(actionType.emoji || "")
      .setStyle(TextInputStyle.Short)
      .setRequired(false);

    modal.addComponents(
      new ActionRowBuilder().addComponents(displayNameInput),
      new ActionRowBuilder().addComponents(unitInput),
      new ActionRowBuilder().addComponents(emojiInput)
    );

    await interaction.showModal(modal);
  } catch (error) {
    console.error("Error in handleEditActionTypeSelect:", error);
    await interaction.update({
      content: "An error occurred while loading action type for editing.",
      components: [
        new ActionRowBuilder().addComponents(
          new ButtonBuilder()
            .setCustomId("admin_actiontypes")
            .setLabel("Back to Action Types")
            .setStyle(ButtonStyle.Secondary)
        ),
      ],
    });
  }
}

async function handleDeleteActionTypeSelect(interaction, actionTypeId) {
  try {
    const actionType = await ActionTypeModel.getById(actionTypeId);

    if (!actionType) {
      return interaction.update({
        content: "Action type not found.",
        components: [
          new ActionRowBuilder().addComponents(
            new ButtonBuilder()
              .setCustomId("admin_actiontypes")
              .setLabel("Back to Action Types")
              .setStyle(ButtonStyle.Secondary)
          ),
        ],
      });
    }

    // Try to delete the action type
    try {
      await ActionTypeModel.delete(actionTypeId);

      await interaction.update({
        content: `✅ Successfully deleted action type: **${actionType.display_name}** (\`${actionType.name}\`)`,
        components: [
          new ActionRowBuilder().addComponents(
            new ButtonBuilder()
              .setCustomId("admin_actiontypes")
              .setLabel("Back to Action Types")
              .setStyle(ButtonStyle.Primary),
            new ButtonBuilder()
              .setCustomId("admin_back")
              .setLabel("Back to Admin")
              .setStyle(ButtonStyle.Secondary)
          ),
        ],
      });
    } catch (deleteError) {
      await interaction.update({
        content: `❌ Cannot delete action type "${actionType.display_name}": ${deleteError.message}`,
        components: [
          new ActionRowBuilder().addComponents(
            new ButtonBuilder()
              .setCustomId("admin_actiontypes")
              .setLabel("Back to Action Types")
              .setStyle(ButtonStyle.Secondary)
          ),
        ],
      });
    }
  } catch (error) {
    console.error("Error in handleDeleteActionTypeSelect:", error);
    await interaction.update({
      content: "An error occurred while deleting action type.",
      components: [
        new ActionRowBuilder().addComponents(
          new ButtonBuilder()
            .setCustomId("admin_actiontypes")
            .setLabel("Back to Action Types")
            .setStyle(ButtonStyle.Secondary)
        ),
      ],
    });
  }
}

async function handleAddTagsTargetSelect(interaction, targetId) {
  try {
    const target = await TargetModel.getById(targetId);

    if (!target) {
      return interaction.update({
        content: "Target not found.",
        components: [
          new ActionRowBuilder().addComponents(
            new ButtonBuilder()
              .setCustomId("admin_managetags")
              .setLabel("Back to Tag Management")
              .setStyle(ButtonStyle.Secondary)
          ),
        ],
      });
    }

    const resourceName = target.resource_name || target.resource;
    const actionName =
      target.action.charAt(0).toUpperCase() + target.action.slice(1);

    let currentTags = target.tags || [];
    if (typeof currentTags === "string") {
      currentTags = JSON.parse(currentTags);
    }

    const modal = new ModalBuilder()
      .setCustomId(`admin_add_tags_modal_${targetId}`)
      .setTitle(`Add Tags: ${actionName} ${resourceName}`);

    const tagsInput = new TextInputBuilder()
      .setCustomId("target_tags")
      .setLabel("Tags to Add")
      .setPlaceholder("e.g., idris,critical,event (comma-separated)")
      .setStyle(TextInputStyle.Short)
      .setRequired(true);

    const currentTagsDisplay = new TextInputBuilder()
      .setCustomId("current_tags_display")
      .setLabel("Current Tags (read-only)")
      .setValue(
        currentTags.length > 0 ? currentTags.join(", ") : "No current tags"
      )
      .setStyle(TextInputStyle.Short)
      .setRequired(false);

    modal.addComponents(
      new ActionRowBuilder().addComponents(currentTagsDisplay),
      new ActionRowBuilder().addComponents(tagsInput)
    );

    await interaction.showModal(modal);
  } catch (error) {
    console.error("Error in handleAddTagsTargetSelect:", error);
    await interaction.update({
      content: "An error occurred while loading target for tag addition.",
      components: [
        new ActionRowBuilder().addComponents(
          new ButtonBuilder()
            .setCustomId("admin_managetags")
            .setLabel("Back to Tag Management")
            .setStyle(ButtonStyle.Secondary)
        ),
      ],
    });
  }
}

async function handleRemoveTagsTargetSelect(interaction, targetId) {
  try {
    const target = await TargetModel.getById(targetId);

    if (!target) {
      return interaction.update({
        content: "Target not found.",
        components: [
          new ActionRowBuilder().addComponents(
            new ButtonBuilder()
              .setCustomId("admin_managetags")
              .setLabel("Back to Tag Management")
              .setStyle(ButtonStyle.Secondary)
          ),
        ],
      });
    }

    let currentTags = target.tags || [];
    if (typeof currentTags === "string") {
      currentTags = JSON.parse(currentTags);
    }

    if (currentTags.length === 0) {
      return interaction.update({
        content: "This target has no tags to remove.",
        components: [
          new ActionRowBuilder().addComponents(
            new ButtonBuilder()
              .setCustomId("admin_managetags")
              .setLabel("Back to Tag Management")
              .setStyle(ButtonStyle.Secondary)
          ),
        ],
      });
    }

    const resourceName = target.resource_name || target.resource;
    const actionName =
      target.action.charAt(0).toUpperCase() + target.action.slice(1);

    const selectMenu = new ActionRowBuilder().addComponents(
      new StringSelectMenuBuilder()
        .setCustomId(`admin_remove_tags_tag_select_${targetId}`)
        .setPlaceholder("Select tags to remove")
        .setMaxValues(currentTags.length)
        .addOptions(
          currentTags.map((tag) => ({
            label: tag,
            value: tag,
            description: `Remove "${tag}" tag`,
          }))
        )
    );

    const backButton = new ActionRowBuilder().addComponents(
      new ButtonBuilder()
        .setCustomId("admin_managetags")
        .setLabel("Back to Tag Management")
        .setStyle(ButtonStyle.Secondary)
    );

    await interaction.update({
      content: `Select tags to remove from **${actionName} ${resourceName}**:`,
      embeds: [],
      components: [selectMenu, backButton],
    });
  } catch (error) {
    console.error("Error in handleRemoveTagsTargetSelect:", error);
    await interaction.update({
      content: "An error occurred while loading target tags for removal.",
      components: [
        new ActionRowBuilder().addComponents(
          new ButtonBuilder()
            .setCustomId("admin_managetags")
            .setLabel("Back to Tag Management")
            .setStyle(ButtonStyle.Secondary)
        ),
      ],
    });
  }
}

async function handleRemoveTagsTagSelect(interaction) {
  try {
    // Extract target ID from custom ID
    const customIdParts = interaction.customId.split("_");
    const targetId = customIdParts[customIdParts.length - 1];

    const target = await TargetModel.getById(targetId);

    if (!target) {
      return interaction.update({
        content: "Target not found.",
        components: [
          new ActionRowBuilder().addComponents(
            new ButtonBuilder()
              .setCustomId("admin_managetags")
              .setLabel("Back to Tag Management")
              .setStyle(ButtonStyle.Secondary)
          ),
        ],
      });
    }

    let currentTags = target.tags || [];
    if (typeof currentTags === "string") {
      currentTags = JSON.parse(currentTags);
    }

    // Get selected tags to remove from interaction.values (multi-select)
    const selectedTagList = interaction.values;
    const newTags = currentTags.filter((tag) => !selectedTagList.includes(tag));

    // Update target tags
    await TargetModel.updateTags(targetId, newTags);

    // Update dashboards
    await updateDashboards(interaction.client);

    const resourceName = target.resource_name || target.resource;
    const actionName =
      target.action.charAt(0).toUpperCase() + target.action.slice(1);

    await interaction.update({
      content:
        `✅ Successfully removed tags from **${actionName} ${resourceName}**:\n` +
        `**Removed**: ${selectedTagList.join(", ")}\n` +
        `**Remaining**: ${newTags.length > 0 ? newTags.join(", ") : "No tags"}`,
      components: [
        new ActionRowBuilder().addComponents(
          new ButtonBuilder()
            .setCustomId("admin_managetags")
            .setLabel("Back to Tag Management")
            .setStyle(ButtonStyle.Primary),
          new ButtonBuilder()
            .setCustomId("admin_back")
            .setLabel("Back to Admin")
            .setStyle(ButtonStyle.Secondary)
        ),
      ],
    });
  } catch (error) {
    console.error("Error in handleRemoveTagsTagSelect:", error);
    await interaction.update({
      content: "An error occurred while removing tags.",
      components: [
        new ActionRowBuilder().addComponents(
          new ButtonBuilder()
            .setCustomId("admin_managetags")
            .setLabel("Back to Tag Management")
            .setStyle(ButtonStyle.Secondary)
        ),
      ],
    });
  }
}

async function handleViewTagsSelect(interaction, selectedTag) {
  try {
    const guildId = interaction.guild.id;
    const targets = await TargetModel.getAllWithProgress(guildId, [
      selectedTag,
    ]);

    if (targets.length === 0) {
      return interaction.update({
        content: `No targets found with tag: "${selectedTag}"`,
        components: [
          new ActionRowBuilder().addComponents(
            new ButtonBuilder()
              .setCustomId("admin_managetags")
              .setLabel("Back to Tag Management")
              .setStyle(ButtonStyle.Secondary)
          ),
        ],
      });
    }

    const embed = new EmbedBuilder()
      .setColor(0x0099ff)
      .setTitle(`🏷️ Targets with tag: "${selectedTag}"`)
      .setDescription(`Found ${targets.length} targets`)
      .setTimestamp();

    // Group by action type
    const grouped = {};
    targets.forEach((target) => {
      if (!grouped[target.action]) grouped[target.action] = [];
      grouped[target.action].push(target);
    });

    Object.entries(grouped).forEach(([action, actionTargets]) => {
      const fieldValue = actionTargets
        .map((target) => {
          const resourceName = target.resource_name || target.resource;
          const current = target.current_amount || 0;
          const percentage = Math.floor((current / target.target_amount) * 100);
          let targetTags = target.tags || [];
          if (typeof targetTags === "string") {
            targetTags = JSON.parse(targetTags);
          }

          return `• **${resourceName}**: ${current}/${target.target_amount} ${
            target.unit || "SCU"
          } (${percentage}%)\n  Tags: ${targetTags.join(", ")}`;
        })
        .join("\n");

      embed.addFields({
        name: `${action.charAt(0).toUpperCase() + action.slice(1)} Targets`,
        value: fieldValue || "None",
        inline: false,
      });
    });

    const backButton = new ActionRowBuilder().addComponents(
      new ButtonBuilder()
        .setCustomId("admin_managetags")
        .setLabel("Back to Tag Management")
        .setStyle(ButtonStyle.Secondary)
    );

    await interaction.update({
      embeds: [embed],
      components: [backButton],
    });
  } catch (error) {
    console.error("Error in handleViewTagsSelect:", error);
    await interaction.update({
      content: "An error occurred while viewing targets with this tag.",
      components: [
        new ActionRowBuilder().addComponents(
          new ButtonBuilder()
            .setCustomId("admin_managetags")
            .setLabel("Back to Tag Management")
            .setStyle(ButtonStyle.Secondary)
        ),
      ],
    });
  }
}

async function handleEditActionTypeModalSubmit(interaction) {
  await interaction.deferReply({ flags: MessageFlags.Ephemeral });

  try {
    const actionTypeId = interaction.customId.replace(
      "admin_edit_actiontype_modal_",
      ""
    );

    const displayName = interaction.fields.getTextInputValue(
      "actiontype_display_name"
    );
    const unit = interaction.fields.getTextInputValue("actiontype_unit");
    const emoji =
      interaction.fields.getTextInputValue("actiontype_emoji") || null;

    const actionType = await ActionTypeModel.getById(actionTypeId);
    if (!actionType) {
      return interaction.editReply({
        content: "Action type not found.",
        components: [
          new ActionRowBuilder().addComponents(
            new ButtonBuilder()
              .setCustomId("admin_actiontypes")
              .setLabel("Back to Action Types")
              .setStyle(ButtonStyle.Secondary)
          ),
        ],
      });
    }

    // Update the action type
    const updateData = {
      name: actionType.name, // Keep the same system name
      display_name: displayName,
      unit: unit,
      emoji: emoji,
    };

    await ActionTypeModel.update(actionTypeId, updateData);

    await interaction.editReply({
      content: `✅ Successfully updated action type: **${displayName}** (\`${actionType.name}\`) with unit: **${unit}**`,
      components: [
        new ActionRowBuilder().addComponents(
          new ButtonBuilder()
            .setCustomId("admin_actiontypes")
            .setLabel("Back to Action Types")
            .setStyle(ButtonStyle.Primary),
          new ButtonBuilder()
            .setCustomId("admin_back")
            .setLabel("Back to Admin")
            .setStyle(ButtonStyle.Secondary)
        ),
      ],
    });
  } catch (error) {
    console.error("Error updating action type:", error);
    await interaction.editReply({
      content: `❌ Error updating action type: ${error.message}`,
      components: [
        new ActionRowBuilder().addComponents(
          new ButtonBuilder()
            .setCustomId("admin_actiontypes")
            .setLabel("Back to Action Types")
            .setStyle(ButtonStyle.Secondary)
        ),
      ],
    });
  }
}

async function handleAddTagsModalSubmit(interaction) {
  await interaction.deferReply({ flags: MessageFlags.Ephemeral });

  try {
    const targetId = interaction.customId.replace("admin_add_tags_modal_", "");
    const tagsInput = interaction.fields.getTextInputValue("target_tags");

    // Parse tags
    const newTags = tagsInput
      .split(",")
      .map((tag) => tag.trim())
      .filter((tag) => tag.length > 0);

    if (newTags.length === 0) {
      return interaction.editReply({
        content: "No valid tags provided.",
        components: [
          new ActionRowBuilder().addComponents(
            new ButtonBuilder()
              .setCustomId("admin_managetags")
              .setLabel("Back to Tag Management")
              .setStyle(ButtonStyle.Secondary)
          ),
        ],
      });
    }

    // Get the target
    const target = await TargetModel.getById(targetId);
    if (!target) {
      return interaction.editReply({
        content: "Target not found.",
        components: [
          new ActionRowBuilder().addComponents(
            new ButtonBuilder()
              .setCustomId("admin_managetags")
              .setLabel("Back to Tag Management")
              .setStyle(ButtonStyle.Secondary)
          ),
        ],
      });
    }

    // Get current tags
    let currentTags = target.tags || [];
    if (typeof currentTags === "string") {
      currentTags = JSON.parse(currentTags);
    }

    // Add new tags (avoid duplicates)
    const combinedTags = [...new Set([...currentTags, ...newTags])];

    // Update the target
    await TargetModel.updateTags(targetId, combinedTags);

    // Update dashboards
    await updateDashboards(interaction.client);

    const resourceName = target.resource_name || target.resource;
    const actionName =
      target.action.charAt(0).toUpperCase() + target.action.slice(1);

    await interaction.editReply({
      content:
        `✅ Successfully added tags to **${actionName} ${resourceName}**:\n` +
        `**Added**: ${newTags.join(", ")}\n` +
        `**All tags**: ${combinedTags.join(", ")}`,
      components: [
        new ActionRowBuilder().addComponents(
          new ButtonBuilder()
            .setCustomId("admin_managetags")
            .setLabel("Back to Tag Management")
            .setStyle(ButtonStyle.Primary),
          new ButtonBuilder()
            .setCustomId("admin_back")
            .setLabel("Back to Admin")
            .setStyle(ButtonStyle.Secondary)
        ),
      ],
    });
  } catch (error) {
    console.error("Error adding tags:", error);
    await interaction.editReply({
      content: `❌ Error adding tags: ${error.message}`,
      components: [
        new ActionRowBuilder().addComponents(
          new ButtonBuilder()
            .setCustomId("admin_managetags")
            .setLabel("Back to Tag Management")
            .setStyle(ButtonStyle.Secondary)
        ),
      ],
    });
  }
}

async function handleCreateSharedModalSubmit(interaction) {
  await interaction.deferReply({ flags: MessageFlags.Ephemeral });

  try {
    const sourceGuildId =
      interaction.fields.getTextInputValue("shared_server_id");
    const channelIdInput =
      interaction.fields.getTextInputValue("shared_channel_id");
    const filterInput = interaction.fields.getTextInputValue("shared_filter");
    const customTitle = interaction.fields.getTextInputValue("shared_title");

    // Get target channel
    let targetChannel;
    if (channelIdInput) {
      try {
        targetChannel = await interaction.client.channels.fetch(channelIdInput);
      } catch (error) {
        return interaction.editReply({
          content: `❌ Could not find channel with ID: ${channelIdInput}`,
          components: [
            new ActionRowBuilder().addComponents(
              new ButtonBuilder()
                .setCustomId("admin_sharedashboard")
                .setLabel("Back to Shared Dashboards")
                .setStyle(ButtonStyle.Secondary)
            ),
          ],
        });
      }
    } else {
      targetChannel = interaction.channel;
    }

    // Parse filter tags
    let targetTags = null;
    if (filterInput) {
      targetTags = filterInput
        .split(",")
        .map((tag) => tag.trim())
        .filter((tag) => tag.length > 0);
    }

    // Verify source guild has data
    const [targets] = await interaction.client.db.execute(
      "SELECT COUNT(*) as count FROM targets WHERE guild_id = ?",
      [sourceGuildId]
    );

    if (!targets[0] || targets[0].count === 0) {
      return interaction.editReply({
        content: `❌ The server with ID ${sourceGuildId} doesn't have any targets defined.`,
        components: [
          new ActionRowBuilder().addComponents(
            new ButtonBuilder()
              .setCustomId("admin_sharedashboard")
              .setLabel("Back to Shared Dashboards")
              .setStyle(ButtonStyle.Secondary)
          ),
        ],
      });
    }

    // Create dashboard configuration
    const dashboardConfig = {
      guildId: sourceGuildId,
      targetTags: targetTags,
      title:
        customTitle ||
        (targetTags ? `📊 ${targetTags.join(" & ")} Dashboard` : null) ||
        "🚀 Shared Resource Dashboard",
      showAllIfNoFilter: !targetTags,
    };

    // Create progress embed
    const { createProgressEmbed } = require("../dashboard-updater");
    const progressEmbed = await createProgressEmbed(dashboardConfig);

    // Add source attribution
    let sourceName = sourceGuildId;
    try {
      const guild = await interaction.client.guilds.fetch(sourceGuildId);
      if (guild) {
        sourceName = guild.name;
      }
    } catch (err) {
      console.log(`Could not fetch guild info for ${sourceGuildId}`);
    }

    let footerText = `Data from: ${sourceName} | ID: ${sourceGuildId}`;
    if (targetTags && targetTags.length > 0) {
      footerText += ` | Filter: ${targetTags.join(", ")}`;
    }

    progressEmbed.setFooter({
      text: footerText,
      iconURL: interaction.guild.iconURL({ dynamic: true }),
    });

    // Create buttons
    const actionRow = new ActionRowBuilder().addComponents(
      new ButtonBuilder()
        .setCustomId(`view_leaderboard_${sourceGuildId}`)
        .setLabel("Leaderboard")
        .setStyle(ButtonStyle.Secondary),
      new ButtonBuilder()
        .setCustomId(`view_progress_${sourceGuildId}`)
        .setLabel("Progress Details")
        .setStyle(ButtonStyle.Secondary),
      new ButtonBuilder()
        .setCustomId(`refresh_dashboard_${sourceGuildId}`)
        .setLabel("Refresh")
        .setStyle(ButtonStyle.Success)
    );

    // Send the dashboard
    const message = await targetChannel.send({
      embeds: [progressEmbed],
      components: [actionRow],
    });

    // Store dashboard in database
    await interaction.client.db.execute(
      "INSERT INTO dashboards (message_id, channel_id, guild_id, source_guild_id, config) VALUES (?, ?, ?, ?, ?)",
      [
        message.id,
        targetChannel.id,
        interaction.guild.id,
        sourceGuildId,
        JSON.stringify(dashboardConfig),
      ]
    );

    // Create confirmation message
    let confirmationMessage = `✅ Shared dashboard created in ${targetChannel}!\n**Data Source**: ${sourceName}`;

    if (targetTags && targetTags.length > 0) {
      confirmationMessage += `\n**Filter**: ${targetTags.join(", ")}`;
    }

    if (customTitle) {
      confirmationMessage += `\n**Title**: "${customTitle}"`;
    }

    await interaction.editReply({
      content: confirmationMessage,
      components: [
        new ActionRowBuilder().addComponents(
          new ButtonBuilder()
            .setCustomId("admin_sharedashboard")
            .setLabel("Back to Shared Dashboards")
            .setStyle(ButtonStyle.Primary),
          new ButtonBuilder()
            .setCustomId("admin_back")
            .setLabel("Back to Admin")
            .setStyle(ButtonStyle.Secondary)
        ),
      ],
    });
  } catch (error) {
    console.error("Error creating shared dashboard:", error);
    await interaction.editReply({
      content: `❌ Error creating shared dashboard: ${error.message}`,
      components: [
        new ActionRowBuilder().addComponents(
          new ButtonBuilder()
            .setCustomId("admin_sharedashboard")
            .setLabel("Back to Shared Dashboards")
            .setStyle(ButtonStyle.Secondary)
        ),
      ],
    });
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
async function handleAddTargetResourceSelect(interaction, combined) {
  try {
    // Split the combined value to get action and resource
    const [actionType, resourceValue] = combined.split("_", 2);

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

    // Create a shorter custom ID to avoid Discord's 100-character limit
    // Use a hash or shortened version of the resource value
    const shortResourceId =
      resourceValue.length > 30
        ? resourceValue.substring(0, 30) + "_" + resourceValue.length
        : resourceValue;

    const customId = `admin_add_target_modal_${actionType}_${shortResourceId}`;

    // Ensure the custom ID doesn't exceed 100 characters
    const finalCustomId =
      customId.length > 100 ? customId.substring(0, 100) : customId;

    // Create modal for target amount AND unit selection
    const modal = new ModalBuilder()
      .setCustomId(finalCustomId)
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

    // Store the full resource value in a hidden field so we can retrieve it later
    const resourceValueInput = new TextInputBuilder()
      .setCustomId("resource_value_full")
      .setLabel("Resource ID (do not edit)")
      .setValue(resourceValue)
      .setStyle(TextInputStyle.Short)
      .setRequired(true);

    // Add action type as hidden field too
    const actionTypeInput = new TextInputBuilder()
      .setCustomId("action_type_full")
      .setLabel("Action Type (do not edit)")
      .setValue(actionType)
      .setStyle(TextInputStyle.Short)
      .setRequired(true);

    // Add rows to modal
    const firstActionRow = new ActionRowBuilder().addComponents(amountInput);
    const secondActionRow = new ActionRowBuilder().addComponents(unitInput);
    const thirdActionRow = new ActionRowBuilder().addComponents(
      resourceValueInput
    );
    const fourthActionRow = new ActionRowBuilder().addComponents(
      actionTypeInput
    );

    modal.addComponents(
      firstActionRow,
      secondActionRow,
      thirdActionRow,
      fourthActionRow
    );

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

// NEW: Modal Submit Handlers
async function handleAddActionTypeModalSubmit(interaction) {
  await interaction.deferReply({ flags: MessageFlags.Ephemeral });

  try {
    const name = interaction.fields
      .getTextInputValue("actiontype_name")
      .toLowerCase()
      .replace(/\s+/g, "_");
    const displayName = interaction.fields.getTextInputValue(
      "actiontype_display_name"
    );
    const unit = interaction.fields.getTextInputValue("actiontype_unit");
    const emoji =
      interaction.fields.getTextInputValue("actiontype_emoji") || null;

    // Check if action type already exists
    const existingType = await ActionTypeModel.getByName(name);
    if (existingType) {
      return interaction.editReply({
        content: `Action type "${name}" already exists.`,
        components: [
          new ActionRowBuilder().addComponents(
            new ButtonBuilder()
              .setCustomId("admin_actiontypes")
              .setLabel("Back to Action Types")
              .setStyle(ButtonStyle.Secondary)
          ),
        ],
      });
    }

    // Add the action type
    await ActionTypeModel.add(name, displayName, unit, emoji);

    await interaction.editReply({
      content: `✅ Successfully added action type: **${displayName}** (\`${name}\`) with unit: **${unit}**`,
      components: [
        new ActionRowBuilder().addComponents(
          new ButtonBuilder()
            .setCustomId("admin_actiontypes")
            .setLabel("Back to Action Types")
            .setStyle(ButtonStyle.Primary),
          new ButtonBuilder()
            .setCustomId("admin_back")
            .setLabel("Back to Admin")
            .setStyle(ButtonStyle.Secondary)
        ),
      ],
    });
  } catch (error) {
    console.error("Error adding action type:", error);
    await interaction.editReply({
      content: `❌ Error adding action type: ${error.message}`,
      components: [
        new ActionRowBuilder().addComponents(
          new ButtonBuilder()
            .setCustomId("admin_actiontypes")
            .setLabel("Back to Action Types")
            .setStyle(ButtonStyle.Secondary)
        ),
      ],
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
    // NEW APPROACH: Get action type and resource from hidden fields instead of parsing modalId

    // First, acknowledge the interaction to prevent timeout
    await interaction.deferReply({ flags: MessageFlags.Ephemeral });

    try {
      // Get values from the modal fields (including our hidden fields)
      const amount = parseInt(
        interaction.fields.getTextInputValue("target_amount")
      );
      const customUnit = interaction.fields
        .getTextInputValue("target_unit")
        .trim();

      // Get the full values from hidden fields
      const resourceValue = interaction.fields.getTextInputValue(
        "resource_value_full"
      );
      const actionType =
        interaction.fields.getTextInputValue("action_type_full");

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

      // Get action type info
      const actionTypeInfo = await ActionTypeModel.getByName(actionType);
      if (!actionTypeInfo) {
        throw new Error(`Action type "${actionType}" not found`);
      }

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
  } else if (modalId === "admin_add_actiontype_modal") {
    await handleAddActionTypeModalSubmit(interaction);
  } else if (modalId.startsWith("admin_edit_actiontype_modal_")) {
    await handleEditActionTypeModalSubmit(interaction);
  } else if (modalId.startsWith("admin_add_tags_modal_")) {
    await handleAddTagsModalSubmit(interaction);
  } else if (modalId.startsWith("admin_remove_tags_modal_")) {
    await handleRemoveTagsModalSubmit(interaction);
  } else if (modalId === "admin_create_shared_modal") {
    await handleCreateSharedModalSubmit(interaction);
  }
}

module.exports = {
  handleAdminButtonInteraction,
  handleAdminSelectMenuInteraction,
  handleAdminModalSubmit,
};
