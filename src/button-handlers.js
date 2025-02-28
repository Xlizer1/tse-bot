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
const {
  handleRefreshDashboard,
  updateDashboards,
} = require("./dashboard-updater");

// Handler for button interactions
async function handleButtonInteraction(interaction) {
  // Get the button ID that was clicked
  const buttonId = interaction.customId;

  // Handle admin buttons
  if (buttonId.startsWith("admin_")) {
    // Import admin handlers dynamically to avoid circular dependency
    const adminHandlers = require("./admin-handlers");
    await adminHandlers.handleAdminButtonInteraction(interaction);
    return;
  }

  switch (buttonId) {
    case "add_resources":
      await handleAddResourcesButton(interaction);
      break;
    case "view_progress":
      await handleViewProgressButton(interaction);
      break;
    case "view_leaderboard":
      await handleViewLeaderboardButton(interaction);
      break;
    case "view_locations":
      await handleViewLocationsButton(interaction);
      break;
    case "refresh_dashboard":
      await handleRefreshDashboard(interaction);
      break;
  }
}

// Handle the Log Resource button
async function handleAddResourcesButton(interaction) {
  try {
    // Get all targets with progress
    const targets = await TargetModel.getAllWithProgress();

    if (targets.length === 0) {
      return interaction.reply({
        content:
          "No targets have been set yet. Ask an admin to set targets first.",
        flags: MessageFlags.Ephemeral,
      });
    }

    // Create a select menu for resource selection
    const selectMenu = new ActionRowBuilder().addComponents(
      new StringSelectMenuBuilder()
        .setCustomId("resource_select")
        .setPlaceholder("Select a resource to log")
    );

    // Add options for each target
    targets.forEach((target) => {
      const capitalized = (word) =>
        word.charAt(0).toUpperCase() + word.slice(1);
      const resourceName =
        target.resource_name ||
        target.resource.charAt(0).toUpperCase() + target.resource.slice(1);

      selectMenu.components[0].addOptions({
        label: `${capitalized(target.action)} ${resourceName}`,
        description: `Target: ${target.target_amount} SCU`,
        value: target.id.toString(),
      });
    });

    // Send the selection menu
    await interaction.reply({
      content: "Please select which resource you want to log:",
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
async function handleViewProgressButton(interaction) {
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
    };

    interaction.options = mockOptions;

    // Execute the command
    await progressCommand.execute(interaction);
  } catch (error) {
    console.error("Error in view progress button handler:", error);
    await interaction.reply({
      content: "An error occurred while processing your request.",
      flags: MessageFlags.Ephemeral,
    });
  }
}

// Handle the View Leaderboard button
async function handleViewLeaderboardButton(interaction) {
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
    };

    interaction.options = mockOptions;

    // Execute the command
    await leaderboardCommand.execute(interaction);
  } catch (error) {
    console.error("Error in view leaderboard button handler:", error);
    await interaction.reply({
      content: "An error occurred while processing your request.",
      flags: MessageFlags.Ephemeral,
    });
  }
}

// Handle the View Locations button
async function handleViewLocationsButton(interaction) {
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
    };

    interaction.options = mockOptions;

    // Execute the command
    await locationCommand.execute(interaction);
  } catch (error) {
    console.error("Error in view locations button handler:", error);
    await interaction.reply({
      content: "An error occurred while processing your request.",
      flags: MessageFlags.Ephemeral,
    });
  }
}

// Handle select menu interaction for resource selection
async function handleSelectMenuInteraction(interaction) {
  // Handle admin select menus
  if (interaction.customId.startsWith("admin_")) {
    // Import admin handlers dynamically to avoid circular dependency
    const adminHandlers = require("./admin-handlers");
    await adminHandlers.handleAdminSelectMenuInteraction(interaction);
    return;
  }

  if (interaction.customId === "resource_select") {
    try {
      const targetId = interaction.values[0];

      // Get target details
      const target = await TargetModel.getById(targetId);

      if (!target) {
        return interaction.reply({
          content: "The selected target could not be found. Please try again.",
          flags: MessageFlags.Ephemeral,
        });
      }

      // Get resource details
      const resourceCategory =
        target.action === "mine"
          ? "mining"
          : target.action === "salvage"
          ? "salvage"
          : "haul";

      const resource = await ResourceModel.getByValueAndType(
        target.resource,
        resourceCategory
      );
      const resourceName = resource
        ? resource.name
        : target.resource.charAt(0).toUpperCase() + target.resource.slice(1);

      // Create a modal for inputting details
      const modal = new ModalBuilder()
        .setCustomId(`add_modal_${targetId}`)
        .setTitle(
          `Log ${
            target.action.charAt(0).toUpperCase() + target.action.slice(1)
          } ${resourceName}`
        );

      // Add input fields
      const amountInput = new TextInputBuilder()
        .setCustomId("amount")
        .setLabel("Amount (SCU)")
        .setStyle(TextInputStyle.Short)
        .setPlaceholder("Enter the amount in SCU")
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

      // Get resource name
      const resourceCategory =
        target.action === "mine"
          ? "mining"
          : target.action === "salvage"
          ? "salvage"
          : "haul";

      const resource = await ResourceModel.getByValueAndType(
        target.resource,
        resourceCategory
      );
      const resourceName = resource
        ? resource.name
        : target.resource.charAt(0).toUpperCase() + target.resource.slice(1);

      // Calculate progress percentage
      const current = updatedTarget.current_amount || 0;
      const percentage = Math.floor(
        (current / updatedTarget.target_amount) * 100
      );

      // Reply with acknowledgment and progress
      await interaction.reply({
        content:
          `Logged: You ${target.action}d ${amount} SCU of ${resourceName} at ${location}\n` +
          `Progress: ${current}/${updatedTarget.target_amount} SCU (${percentage}%)`,
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
