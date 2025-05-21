const { SlashCommandBuilder, MessageFlags } = require("discord.js");
const TargetModel = require("../models/target");
const ContributionModel = require("../models/contribution");
const ResourceModel = require("../models/resource");
const ActionTypeModel = require("../models/actionType");
const { updateDashboards } = require("../dashboard-updater");

module.exports = {
  data: new SlashCommandBuilder()
    .setName("log")
    .setDescription("Log a contribution towards a resource target")
    .addStringOption((option) =>
      option
        .setName("action")
        .setDescription("Action type")
        .setRequired(true)
        .setAutocomplete(true)
    )
    .addStringOption((option) =>
      option
        .setName("resource")
        .setDescription("Resource type")
        .setRequired(true)
        .setAutocomplete(true)
    )
    .addIntegerOption((option) =>
      option
        .setName("amount")
        .setDescription("Amount")
        .setRequired(true)
        .setMinValue(1)
    )
    .addStringOption((option) =>
      option
        .setName("location")
        .setDescription("Where you delivered/found the resource")
        .setRequired(true)
    ),

  async execute(interaction) {
    try {
      const action = interaction.options.getString("action");
      const resource = interaction.options.getString("resource").toLowerCase();
      const amount = interaction.options.getInteger("amount");
      const location = interaction.options.getString("location");

      // Get the target for this action and resource
      const target = await TargetModel.getByActionAndResource(action, resource);

      if (!target) {
        return interaction.reply({
          content: `No target found for ${action} ${resource}. Please check the resource name or ask an admin to set this target.`,
          flags: MessageFlags.Ephemeral,
        });
      }

      // Add contribution to database
      await ContributionModel.add(
        target.id,
        interaction.user.id,
        interaction.user.username,
        amount,
        location
      );

      // Get updated target data
      const updatedTarget = await TargetModel.getById(target.id);

      // Calculate percentage
      const current = updatedTarget.current_amount || 0;
      const percentage = Math.floor(
        (current / updatedTarget.target_amount) * 100
      );

      // Get action type for display and unit
      const actionType = await ActionTypeModel.getByName(action);
      const unit = actionType ? actionType.unit : "SCU";
      const actionDisplay = actionType ? actionType.display_name : action.charAt(0).toUpperCase() + action.slice(1);

      // Get resource name for display
      const resourceInfo = await ResourceModel.getByValueAndType(resource, action);
      const resourceName = resourceInfo
        ? resourceInfo.name
        : resource.charAt(0).toUpperCase() + resource.slice(1);

      // Reply with acknowledgment and progress
      await interaction.reply(
        `Logged: ${interaction.user.username} ${actionDisplay}d ${amount} ${unit} of ${resourceName} at ${location}\n` +
          `Progress: ${current}/${updatedTarget.target_amount} ${unit} (${percentage}%)`
      );

      // Update dashboards with the new information
      await updateDashboards(interaction.client);
    } catch (error) {
      console.error("Error in log command:", error);
      await interaction.reply({
        content: "An error occurred while logging your contribution.",
        flags: MessageFlags.Ephemeral,
      });
    }
  },

  // Autocomplete handler for action and resource options
  async autocomplete(interaction) {
    const focusedOption = interaction.options.getFocused(true);
    
    try {
      if (focusedOption.name === "action") {
        // Get all action types
        const actionTypes = await ActionTypeModel.getAll();
        
        const filtered = actionTypes.filter(type => 
          type.name.toLowerCase().includes(focusedOption.value.toLowerCase()) ||
          type.display_name.toLowerCase().includes(focusedOption.value.toLowerCase())
        );
        
        await interaction.respond(
          filtered.map(type => ({
            name: `${type.emoji || ''} ${type.display_name} (${type.unit})`,
            value: type.name
          }))
        );
      } else if (focusedOption.name === "resource") {
        // Get the selected action (if any)
        const selectedAction = interaction.options.getString("action");
        
        let resources = [];
        
        if (selectedAction) {
          // Get resources for this action type
          resources = await ResourceModel.getByActionType(selectedAction);
        } else {
          // Get all resources
          resources = await ResourceModel.getAll();
        }
        
        const filtered = resources.filter(resource => 
          resource.name.toLowerCase().includes(focusedOption.value.toLowerCase()) ||
          resource.value.toLowerCase().includes(focusedOption.value.toLowerCase())
        );
        
        await interaction.respond(
          filtered.map(resource => ({
            name: `${resource.name}`,
            value: resource.value
          }))
        );
      }
    } catch (error) {
      console.error('Error during log command autocomplete:', error);
      // Return empty results if there's an error
      await interaction.respond([]);
    }
  }
};