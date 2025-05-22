// Option 1: Add unit selection to settarget command
// In src/commands/settarget.js

const { SlashCommandBuilder, MessageFlags } = require("discord.js");
const ResourceModel = require("../models/resource");
const TargetModel = require("../models/target");
const ActionTypeModel = require("../models/actionType");
const { updateDashboards } = require("../dashboard-updater");

module.exports = {
  data: new SlashCommandBuilder()
    .setName("settarget")
    .setDescription("Set a target amount for resources to be collected")
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
        .setDescription("Target amount")
        .setRequired(true)
        .setMinValue(1)
    )
    // NEW: Add unit selection option
    .addStringOption((option) =>
      option
        .setName("unit")
        .setDescription("Unit of measurement")
        .setRequired(false)
        .addChoices(
          { name: "SCU (Standard Cargo Units)", value: "SCU" },
          { name: "Units (Individual Items)", value: "Units" },
          { name: "Tons", value: "Tons" },
          { name: "aUEC (Credits)", value: "aUEC" },
          { name: "Kg (Kilograms)", value: "Kg" },
          { name: "Liters", value: "L" }
        )
    ),

  async execute(interaction, guildId = null) {
    try {
      const currentGuildId = guildId || interaction.guild?.id;

      if (!currentGuildId) {
        return interaction.reply({
          content: "This command can only be used in a server.",
          flags: MessageFlags.Ephemeral,
        });
      }

      if (!interaction.member.permissions.has("Administrator")) {
        return interaction.reply({
          content: "You do not have permission to use this command. Only administrators can set targets.",
          flags: MessageFlags.Ephemeral,
        });
      }

      const action = interaction.options.getString("action");
      const resource = interaction.options.getString("resource").toLowerCase();
      const amount = interaction.options.getInteger("amount");
      
      // NEW: Get custom unit or fall back to action type default
      let customUnit = interaction.options.getString("unit");
      
      // Get action type info for default unit
      const actionType = await ActionTypeModel.getByName(action);
      const defaultUnit = actionType ? actionType.unit : "SCU";
      const finalUnit = customUnit || defaultUnit;

      // Check if resource exists
      const resourceCategory = action === "mine" ? "mining" : 
                              action === "salvage" ? "salvage" : "haul";
      const resourceInfo = await ResourceModel.getByValueAndType(
        resource, resourceCategory, currentGuildId
      );

      if (!resourceInfo) {
        return interaction.reply({
          content: `Resource "${resource}" not found for the ${action} action in this server.`,
          flags: MessageFlags.Ephemeral,
        });
      }

      // Check if target already exists
      const existingTarget = await TargetModel.getByActionAndResource(
        action, resource, currentGuildId
      );

      if (existingTarget) {
        // Update existing target with new unit
        await TargetModel.updateAmountAndUnit(existingTarget.id, amount, finalUnit);
        await interaction.reply(
          `Target updated: ${action} ${amount} ${finalUnit} of ${resourceInfo.name}`
        );
      } else {
        // Create new target with custom unit
        await TargetModel.createWithUnit(
          action, resource, amount, finalUnit, interaction.user.id, currentGuildId
        );
        await interaction.reply(
          `Target set: ${action} ${amount} ${finalUnit} of ${resourceInfo.name}`
        );
      }

      await updateDashboards(interaction.client);
    } catch (error) {
      console.error("Error in settarget command:", error);
      await interaction.reply({
        content: "An error occurred while setting the target.",
        flags: MessageFlags.Ephemeral,
      });
    }
  },

  // Add autocomplete for action types
  async autocomplete(interaction, guildId = null) {
    const focusedOption = interaction.options.getFocused(true);
    
    try {
      const currentGuildId = guildId || interaction.guild?.id;
      
      if (focusedOption.name === "action") {
        const actionTypes = await ActionTypeModel.getAll();
        const filtered = actionTypes.filter(type => 
          type.name.toLowerCase().includes(focusedOption.value.toLowerCase()) ||
          type.display_name.toLowerCase().includes(focusedOption.value.toLowerCase())
        );
        
        await interaction.respond(
          filtered.map(type => ({
            name: `${type.emoji || ''} ${type.display_name} (Default: ${type.unit})`,
            value: type.name
          }))
        );
      } else if (focusedOption.name === "resource") {
        const selectedAction = interaction.options.getString("action");
        let resources = [];
        
        if (selectedAction && currentGuildId) {
          resources = await ResourceModel.getByActionType(selectedAction, currentGuildId);
        } else if (currentGuildId) {
          resources = await ResourceModel.getAll(currentGuildId);
        }
        
        const filtered = resources.filter(resource => 
          resource.name.toLowerCase().includes(focusedOption.value.toLowerCase()) ||
          resource.value.toLowerCase().includes(focusedOption.value.toLowerCase())
        );
        
        await interaction.respond(
          filtered.map(resource => ({
            name: resource.name,
            value: resource.value
          }))
        );
      }
    } catch (error) {
      console.error('Error during settarget autocomplete:', error);
      await interaction.respond([]);
    }
  }
};