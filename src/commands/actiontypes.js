const { SlashCommandBuilder, EmbedBuilder, MessageFlags } = require("discord.js");
const ActionTypeModel = require("../models/actionType");

module.exports = {
  data: new SlashCommandBuilder()
    .setName("actiontypes")
    .setDescription("Manage action types for resource collection")
    .addSubcommand(subcommand =>
      subcommand
        .setName("list")
        .setDescription("List all action types")
    )
    .addSubcommand(subcommand =>
      subcommand
        .setName("add")
        .setDescription("Add a new action type (admin only)")
        .addStringOption(option =>
          option
            .setName("name")
            .setDescription("System value name (lowercase, no spaces)")
            .setRequired(true)
        )
        .addStringOption(option =>
          option
            .setName("display_name")
            .setDescription("Display name shown to users")
            .setRequired(true)
        )
        .addStringOption(option =>
          option
            .setName("unit")
            .setDescription("Unit of measurement (e.g., SCU, aUEC)")
            .setRequired(true)
        )
        .addStringOption(option =>
          option
            .setName("emoji")
            .setDescription("Emoji to represent this action type")
            .setRequired(false)
        )
    )
    .addSubcommand(subcommand =>
      subcommand
        .setName("update")
        .setDescription("Update an action type (admin only)")
        .addStringOption(option =>
          option
            .setName("name")
            .setDescription("System name of the action type to update")
            .setRequired(true)
            .setAutocomplete(true)
        )
        .addStringOption(option =>
          option
            .setName("display_name")
            .setDescription("New display name")
            .setRequired(false)
        )
        .addStringOption(option =>
          option
            .setName("unit")
            .setDescription("New unit of measurement")
            .setRequired(false)
        )
        .addStringOption(option =>
          option
            .setName("emoji")
            .setDescription("New emoji")
            .setRequired(false)
        )
    )
    .addSubcommand(subcommand =>
      subcommand
        .setName("delete")
        .setDescription("Delete an action type (admin only)")
        .addStringOption(option =>
          option
            .setName("name")
            .setDescription("System name of the action type to delete")
            .setRequired(true)
            .setAutocomplete(true)
        )
    ),

  async execute(interaction) {
    try {
      const subcommand = interaction.options.getSubcommand();

      // List action types (available to all users)
      if (subcommand === "list") {
        const actionTypes = await ActionTypeModel.getAll();

        const embed = new EmbedBuilder()
          .setColor(0x0099ff)
          .setTitle("Available Action Types")
          .setDescription("Action types define how resources are collected")
          .setTimestamp();

        if (actionTypes.length === 0) {
          embed.setDescription("No action types have been defined yet.");
        } else {
          actionTypes.forEach(type => {
            embed.addFields({
              name: `${type.emoji || '📦'} ${type.display_name}`,
              value: `System name: \`${type.name}\`\nUnit: ${type.unit}`,
              inline: true
            });
          });
        }

        await interaction.reply({ embeds: [embed] });
        return;
      }

      // For all other commands, check admin permissions
      if (!interaction.member.permissions.has("Administrator")) {
        return interaction.reply({
          content: "You do not have permission to manage action types. Only administrators can do this.",
          flags: MessageFlags.Ephemeral,
        });
      }

      // Add a new action type
      if (subcommand === "add") {
        const name = interaction.options.getString("name").toLowerCase().replace(/\s+/g, "_");
        const displayName = interaction.options.getString("display_name");
        const unit = interaction.options.getString("unit");
        const emoji = interaction.options.getString("emoji") || null;

        // Check if action type already exists
        const existingType = await ActionTypeModel.getByName(name);
        if (existingType) {
          return interaction.reply({
            content: `Action type "${name}" already exists.`,
            flags: MessageFlags.Ephemeral,
          });
        }

        // Add the action type
        await ActionTypeModel.add(name, displayName, unit, emoji);

        await interaction.reply({
          content: `Added new action type: ${displayName} (${name}) with unit: ${unit}`,
          flags: MessageFlags.Ephemeral,
        });
      }
      // Update an action type
      else if (subcommand === "update") {
        const name = interaction.options.getString("name");
        const displayName = interaction.options.getString("display_name");
        const unit = interaction.options.getString("unit");
        const emoji = interaction.options.getString("emoji");

        // Get the action type
        const actionType = await ActionTypeModel.getByName(name);
        if (!actionType) {
          return interaction.reply({
            content: `Action type "${name}" not found.`,
            flags: MessageFlags.Ephemeral,
          });
        }

        // Prepare update data
        const updateData = {
          name: actionType.name,
          display_name: displayName || actionType.display_name,
          unit: unit || actionType.unit,
          emoji: emoji !== undefined ? emoji : actionType.emoji
        };

        // Update the action type
        await ActionTypeModel.update(actionType.id, updateData);

        await interaction.reply({
          content: `Updated action type: ${updateData.display_name} (${name}) with unit: ${updateData.unit}`,
          flags: MessageFlags.Ephemeral,
        });
      }
      // Delete an action type
      else if (subcommand === "delete") {
        const name = interaction.options.getString("name");

        // Get the action type
        const actionType = await ActionTypeModel.getByName(name);
        if (!actionType) {
          return interaction.reply({
            content: `Action type "${name}" not found.`,
            flags: MessageFlags.Ephemeral,
          });
        }

        try {
          // Delete the action type
          await ActionTypeModel.delete(actionType.id);

          await interaction.reply({
            content: `Deleted action type: ${actionType.display_name} (${name})`,
            flags: MessageFlags.Ephemeral,
          });
        } catch (error) {
          await interaction.reply({
            content: `Cannot delete action type "${name}": ${error.message}`,
            flags: MessageFlags.Ephemeral,
          });
        }
      }
    } catch (error) {
      console.error("Error in actiontypes command:", error);
      await interaction.reply({
        content: "An error occurred while managing action types.",
        flags: MessageFlags.Ephemeral,
      });
    }
  },

  // Autocomplete handler for action types
  async autocomplete(interaction) {
    try {
      const focusedOption = interaction.options.getFocused(true);
      
      if (focusedOption.name === 'name') {
        const actionTypes = await ActionTypeModel.getAll();
        const filtered = actionTypes.filter(type => 
          type.name.toLowerCase().includes(focusedOption.value.toLowerCase()) ||
          type.display_name.toLowerCase().includes(focusedOption.value.toLowerCase())
        );
        
        await interaction.respond(
          filtered.map(type => ({
            name: `${type.display_name} (${type.name})`,
            value: type.name
          }))
        );
      }
    } catch (error) {
      console.error('Error during actiontypes autocomplete:', error);
    }
  }
};