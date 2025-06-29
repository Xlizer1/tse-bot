const {
  ModalBuilder,
  TextInputBuilder,
  ActionRowBuilder,
  TextInputStyle,
  MessageFlags,
  StringSelectMenuBuilder,
} = require("discord.js");

const ResourceModel = require("./models/resource");
const TargetModel = require("./models/target");
const ContributionModel = require("./models/contribution");
const ActionTypeModel = require("./models/actionType");
const {
  handleRefreshDashboard,
  updateDashboards,
} = require("./dashboard-updater");
const { DashboardModel } = require("./models/dashboard");

// Handler for button interactions
async function handleButtonInteraction(interaction, guildId) {
  // Use provided guildId or fallback to interaction guild
  const currentGuildId = guildId || interaction.guild?.id;

  if (!currentGuildId) {
    return interaction.reply({
      content: "This command can only be used in a server.",
      flags: MessageFlags.Ephemeral,
    });
  }

  // Get the button ID that was clicked
  const buttonId = interaction.customId;

  // Extract source guild ID from shared dashboard buttons
  let sourceGuildId = currentGuildId;
  if (buttonId.includes("_")) {
    const parts = buttonId.split("_");
    if (parts.length > 2) {
      // Format: action_name_guildId
      sourceGuildId = parts[parts.length - 1];
      // Reform the original button ID without the guild suffix
      const buttonParts = parts.slice(0, parts.length - 1);
      const buttonBase = buttonParts.join("_");
    }
  }

  // Handle admin buttons
  if (buttonId.startsWith("admin_")) {
    // Import admin handlers dynamically to avoid circular dependency
    const adminHandlers = require("./admin-handlers");
    await adminHandlers.handleAdminButtonInteraction(
      interaction,
      currentGuildId
    );
    return;
  }

  switch (buttonId) {
    case "add_resources":
      await handleAddResourcesButton(interaction, currentGuildId);
      break;
    case "view_progress":
      await handleViewProgressButton(interaction, currentGuildId);
      break;
    case "view_leaderboard":
      await handleViewLeaderboardButton(interaction, currentGuildId);
      break;
    case "view_locations":
      await handleViewLocationsButton(interaction, currentGuildId);
      break;
    case "refresh_dashboard":
      await handleRefreshDashboard(interaction);
      break;
    default:
      // Handle shared dashboard buttons
      if (buttonId.startsWith("view_progress_")) {
        await handleViewProgressButton(interaction, sourceGuildId);
      } else if (buttonId.startsWith("view_leaderboard_")) {
        await handleViewLeaderboardButton(interaction, sourceGuildId);
      } else if (buttonId.startsWith("refresh_dashboard_")) {
        await handleRefreshDashboard(interaction);
      }
  }
}

// Handle the Log Resource button
async function handleAddResourcesButton(interaction, guildId) {
  try {
    // Check if this interaction is from a dashboard with specific filters
    let targetTags = null;
    const dashboard = await DashboardModel.getByMessageId(
      interaction.message.id
    );

    if (dashboard && dashboard.config && dashboard.config.targetTags) {
      targetTags = dashboard.config.targetTags;
    }

    // Get targets with optional filtering based on dashboard configuration
    const targets = await TargetModel.getAllWithProgress(guildId, targetTags);

    if (targets.length === 0) {
      let message = "No targets have been set";
      if (targetTags && targetTags.length > 0) {
        message += ` for this dashboard (filtering by: ${targetTags.join(
          ", "
        )})`;
      } else {
        message += " for this server";
      }
      message += ". Ask an admin to set targets first.";

      return interaction.reply({
        content: message,
        flags: MessageFlags.Ephemeral,
      });
    }

    // Group targets by action type
    const actionTypes = await ActionTypeModel.getAll();
    const actionMap = new Map();

    actionTypes.forEach((type) => {
      actionMap.set(type.name, {
        id: type.id,
        name: type.name,
        displayName: type.display_name,
        unit: type.unit,
        emoji: type.emoji,
        targets: [],
      });
    });

    // Add targets to their respective action types
    targets.forEach((target) => {
      if (actionMap.has(target.action)) {
        actionMap.get(target.action).targets.push(target);
      }
    });

    // Create a select menu for action type selection first
    const selectMenu = new ActionRowBuilder().addComponents(
      new StringSelectMenuBuilder()
        .setCustomId(`action_select_${guildId}`)
        .setPlaceholder("Select an action type")
    );

    // Add options for each action type that has targets
    actionMap.forEach((action) => {
      if (action.targets.length > 0) {
        let description = `${action.targets.length} ${
          action.targets.length === 1 ? "target" : "targets"
        } (${action.unit})`;

        // Add tag info if filtering
        if (targetTags && targetTags.length > 0) {
          description += ` - ${targetTags.join(", ")}`;
        }

        selectMenu.components[0].addOptions({
          label: action.displayName,
          description: description,
          value: action.name,
          emoji: action.emoji,
        });
      }
    });

    // Send the selection menu
    let replyContent = "Please select which action type you want to log:";
    if (targetTags && targetTags.length > 0) {
      replyContent += `\n🏷️ *Showing only targets tagged with: ${targetTags.join(
        ", "
      )}*`;
    }

    await interaction.reply({
      content: replyContent,
      components: [selectMenu],
      flags: MessageFlags.Ephemeral,
    });
  } catch (error) {
    console.error("Error in log resource button handler:", error);
    await interaction.reply({
      content: "An error occurred while processing your request.",
      flags: MessageFlags.Ephemeral,
    });
  }
}

// Handle the View Progress button
async function handleViewProgressButton(interaction, guildId) {
  try {
    // Execute the progress command
    const progressCommand = interaction.client.commands.get("progress");

    if (!progressCommand) {
      return interaction.reply({
        content: "Error: Progress command not found.",
        flags: MessageFlags.Ephemeral,
      });
    }

    // Create a mock interaction with no options
    const mockOptions = {
      getString: () => null,
      getInteger: () => null,
      getFocused: () => null,
    };

    interaction.options = mockOptions;

    // Execute the command with the specified guild ID
    await progressCommand.execute(interaction, guildId);
  } catch (error) {
    console.error("Error in view progress button handler:", error);
    await interaction.reply({
      content: "An error occurred while processing your request.",
      flags: MessageFlags.Ephemeral,
    });
  }
}

// Handle the View Leaderboard button
async function handleViewLeaderboardButton(interaction, guildId) {
  try {
    // Execute the leaderboard command
    const leaderboardCommand = interaction.client.commands.get("leaderboard");

    if (!leaderboardCommand) {
      return interaction.reply({
        content: "Error: Leaderboard command not found.",
        flags: MessageFlags.Ephemeral,
      });
    }

    // Create a mock interaction with no options
    const mockOptions = {
      getString: () => null,
      getInteger: () => null,
      getFocused: () => null,
    };

    interaction.options = mockOptions;

    // Execute the command with the specified guild ID
    await leaderboardCommand.execute(interaction, guildId);
  } catch (error) {
    console.error("Error in view leaderboard button handler:", error);
    await interaction.reply({
      content: "An error occurred while processing your request.",
      flags: MessageFlags.Ephemeral,
    });
  }
}

// Handle the View Locations button
async function handleViewLocationsButton(interaction, guildId) {
  try {
    // Execute the location command
    const locationCommand = interaction.client.commands.get("location");

    if (!locationCommand) {
      return interaction.reply({
        content: "Error: Location command not found.",
        flags: MessageFlags.Ephemeral,
      });
    }

    // Create a mock interaction with no options
    const mockOptions = {
      getString: () => null,
      getFocused: () => null,
    };

    interaction.options = mockOptions;

    // Execute the command with the specified guild ID
    await locationCommand.execute(interaction, guildId);
  } catch (error) {
    console.error("Error in view locations button handler:", error);
    await interaction.reply({
      content: "An error occurred while processing your request.",
      flags: MessageFlags.Ephemeral,
    });
  }
}

// Handle select menu interaction for action and resource selection
async function handleSelectMenuInteraction(interaction) {
  // Handle admin select menus
  if (interaction.customId.startsWith("admin_")) {
    // Import admin handlers dynamically to avoid circular dependency
    const adminHandlers = require("./admin-handlers");
    await adminHandlers.handleAdminSelectMenuInteraction(interaction);
    return;
  }

  // Extract guild ID from custom ID for guild-specific menus
  let guildId = interaction.guild?.id;
  if (interaction.customId.includes("_")) {
    const parts = interaction.customId.split("_");
    if (parts.length > 2) {
      guildId = parts[parts.length - 1];
    }
  }

  if (interaction.customId.startsWith("action_select")) {
    try {
      const actionType = interaction.values[0];

      // Check if this is from a filtered dashboard
      let targetTags = null;
      const dashboard = await DashboardModel.getByMessageId(
        interaction.message.reference?.messageId || interaction.message.id
      );

      if (dashboard && dashboard.config && dashboard.config.targetTags) {
        targetTags = dashboard.config.targetTags;
      }

      // Get all targets for this action type in this guild with optional filtering
      const targets = await TargetModel.getAllWithProgress(guildId, targetTags);
      const filteredTargets = targets.filter(
        (target) => target.action === actionType
      );

      if (filteredTargets.length === 0) {
        return interaction.reply({
          content:
            "No targets found for this action type in this dashboard context.",
          flags: MessageFlags.Ephemeral,
        });
      }

      // Get the action type info
      const actionTypeInfo = await ActionTypeModel.getByName(actionType);

      // Create a select menu for resource selection based on action type
      const selectMenu = new ActionRowBuilder().addComponents(
        new StringSelectMenuBuilder()
          .setCustomId(`resource_select_${guildId}`)
          .setPlaceholder(
            `Select a ${actionTypeInfo.display_name.toLowerCase()} resource`
          )
      );

      // Add options for each target within this action type
      filteredTargets.forEach((target) => {
        const resourceName =
          target.resource_name ||
          target.resource.charAt(0).toUpperCase() + target.resource.slice(1);

        // Include tags in description if they exist
        let description = `Target: ${target.target_amount} ${
          target.unit || actionTypeInfo.unit
        }`;
        if (target.tags) {
          const tags =
            typeof target.tags === "string"
              ? JSON.parse(target.tags)
              : target.tags;
          if (tags && tags.length > 0) {
            description += ` | Tags: ${tags.join(", ")}`;
          }
        }

        selectMenu.components[0].addOptions({
          label: resourceName,
          description: description,
          value: `${target.action}_${target.resource}`,
        });
      });

      // Send the resource selection menu
      let updateContent = `Please select which ${actionTypeInfo.display_name.toLowerCase()} resource you want to log:`;
      if (targetTags && targetTags.length > 0) {
        updateContent += `\n🏷️ *Dashboard filter: ${targetTags.join(", ")}*`;
      }

      await interaction.update({
        content: updateContent,
        components: [selectMenu],
      });
    } catch (error) {
      console.error("Error handling action selection:", error);
      await interaction.reply({
        content: "An error occurred while processing your selection.",
        flags: MessageFlags.Ephemeral,
      });
    }
  } else if (interaction.customId.startsWith("resource_select")) {
    try {
      const [action, resource] = interaction.values[0].split("_");

      // Get target details for this guild
      const target = await TargetModel.getByActionAndResource(
        action,
        resource,
        guildId
      );

      if (!target) {
        return interaction.reply({
          content:
            "The selected target could not be found in this server. Please try again.",
          flags: MessageFlags.Ephemeral,
        });
      }

      // Get action type info for unit
      const actionType = await ActionTypeModel.getByName(action);
      const unit = target.unit || (actionType ? actionType.unit : "SCU");
      const actionDisplay =
        target.action_display_name ||
        (actionType
          ? actionType.display_name
          : action.charAt(0).toUpperCase() + action.slice(1));

      // Get resource name
      const resourceInfo = await ResourceModel.getByValueAndType(
        resource,
        action,
        guildId
      );
      const resourceName =
        target.resource_name ||
        (resourceInfo
          ? resourceInfo.name
          : resource.charAt(0).toUpperCase() + resource.slice(1));

      // Create a modal for inputting details
      const modal = new ModalBuilder()
        .setCustomId(`add_modal_${target.id}`)
        .setTitle(`Log ${actionDisplay} ${resourceName}`);

      // Add input fields
      const amountInput = new TextInputBuilder()
        .setCustomId("amount")
        .setLabel(`Amount (${unit})`)
        .setStyle(TextInputStyle.Short)
        .setPlaceholder(`Enter the amount in ${unit}`)
        .setRequired(true);

      const locationInput = new TextInputBuilder()
        .setCustomId("location")
        .setLabel("Location")
        .setStyle(TextInputStyle.Short)
        .setPlaceholder("Enter where you delivered or found the resource")
        .setRequired(true);

      const row1 = new ActionRowBuilder().addComponents(amountInput);
      const row2 = new ActionRowBuilder().addComponents(locationInput);

      modal.addComponents(row1, row2);

      // Show the modal
      await interaction.showModal(modal);
    } catch (error) {
      console.error("Error handling resource selection:", error);
      await interaction.reply({
        content: "An error occurred while processing your selection.",
        flags: MessageFlags.Ephemeral,
      });
    }
  }
}

// Handle modal submit interaction for logging resources
async function handleModalSubmitInteraction(interaction) {
  // Handle admin modals
  if (interaction.customId.startsWith("admin_")) {
    // Import admin handlers dynamically to avoid circular dependency
    const adminHandlers = require("./admin-handlers");
    await adminHandlers.handleAdminModalSubmit(interaction);
    return;
  }

  if (interaction.customId.startsWith("add_modal_")) {
    try {
      // Extract the target ID from the modal ID
      const targetId = interaction.customId.replace("add_modal_", "");

      // Get the values from the modal
      const amount = parseInt(interaction.fields.getTextInputValue("amount"));
      const location = interaction.fields.getTextInputValue("location");

      // Check if amount is valid
      if (isNaN(amount) || amount <= 0) {
        return interaction.reply({
          content: "Invalid amount. Please enter a positive number.",
          flags: MessageFlags.Ephemeral,
        });
      }

      // Get target details
      const target = await TargetModel.getById(targetId);

      if (!target) {
        return interaction.reply({
          content: "The selected target could not be found. Please try again.",
          flags: MessageFlags.Ephemeral,
        });
      }

      // Add the contribution
      await ContributionModel.add(
        targetId,
        interaction.user.id,
        interaction.user.username,
        amount,
        location
      );

      // Get updated target with current progress
      const updatedTarget = await TargetModel.getById(targetId);

      // Get action type info for unit and display name
      const actionType = await ActionTypeModel.getByName(target.action);
      const unit = target.unit || (actionType ? actionType.unit : "SCU");
      const actionDisplay =
        target.action_display_name ||
        (actionType
          ? actionType.display_name
          : target.action.charAt(0).toUpperCase() + target.action.slice(1));

      // Get resource name
      const resourceInfo = await ResourceModel.getByValueAndType(
        target.resource,
        target.action,
        target.guild_id
      );
      const resourceName =
        target.resource_name ||
        (resourceInfo
          ? resourceInfo.name
          : target.resource.charAt(0).toUpperCase() + target.resource.slice(1));

      // Calculate progress percentage
      const current = updatedTarget.current_amount || 0;
      const percentage = Math.floor(
        (current / updatedTarget.target_amount) * 100
      );

      // Reply with acknowledgment and progress
      await interaction.reply({
        content:
          `Logged: You ${actionDisplay.toLowerCase()}d ${amount} ${unit} of ${resourceName} at ${location}\n` +
          `Progress: ${current}/${updatedTarget.target_amount} ${unit} (${percentage}%)`,
        flags: MessageFlags.Ephemeral,
      });

      // Update all dashboard messages
      await updateDashboards(interaction.client);
    } catch (error) {
      console.error("Error in modal submit handler:", error);
      await interaction.reply({
        content: "An error occurred while processing your contribution.",
        flags: MessageFlags.Ephemeral,
      });
    }
  }
}

module.exports = {
  handleButtonInteraction,
  handleSelectMenuInteraction,
  handleModalSubmitInteraction,
};
