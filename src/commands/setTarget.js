const { SlashCommandBuilder, MessageFlags } = require("discord.js");
const ResourceModel = require("../models/resource");
const TargetModel = require("../models/target");
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
        .addChoices(
          { name: "Mine", value: "mine" },
          { name: "Salvage", value: "salvage" },
          { name: "Haul", value: "haul" }
        )
    )
    .addStringOption((option) => {
      const resourceOption = option
        .setName("resource")
        .setDescription("Resource type")
        .setRequired(true);

      // We'll add the choices dynamically when the command is executed
      return resourceOption;
    })
    .addIntegerOption((option) =>
      option
        .setName("amount")
        .setDescription("Target amount in SCU")
        .setRequired(true)
        .setMinValue(1)
    ),

  async execute(interaction) {
    try {
      // Permissions check for admins
      if (!interaction.member.permissions.has("Administrator")) {
        return interaction.reply({
          content:
            "You do not have permission to use this command. Only administrators can set targets.",
          flags: MessageFlags.Ephemeral,
        });
      }

      const action = interaction.options.getString("action");
      const resource = interaction.options.getString("resource").toLowerCase();
      const amount = interaction.options.getInteger("amount");

      // Check if resource exists
      const resourceCategory =
        action === "mine"
          ? "mining"
          : action === "salvage"
          ? "salvage"
          : "haul";

      const resourceInfo = await ResourceModel.getByValueAndType(
        resource,
        resourceCategory
      );

      if (!resourceInfo) {
        return interaction.reply({
          content: `Resource "${resource}" not found for the ${action} action. Please check the resource name or add it first.`,
          flags: MessageFlags.Ephemeral,
        });
      }

      // Check if target already exists
      const existingTarget = await TargetModel.getByActionAndResource(
        action,
        resource
      );

      if (existingTarget) {
        // Update existing target
        await TargetModel.updateAmount(existingTarget.id, amount);
        await interaction.reply(
          `Target updated: ${action} ${amount} SCU of ${resourceInfo.name}`
        );
      } else {
        // Create new target
        await TargetModel.create(action, resource, amount, interaction.user.id);
        await interaction.reply(
          `Target set: ${action} ${amount} SCU of ${resourceInfo.name}`
        );
      }

      // Update dashboards
      await updateDashboards(interaction.client);
    } catch (error) {
      console.error("Error in settarget command:", error);
      await interaction.reply({
        content: "An error occurred while setting the target.",
        flags: MessageFlags.Ephemeral,
      });
    }
  },

  // Function to dynamically update the resources choices based on the selected action
  // This will be used when registering the command in deploy-commands.js
  async getResourceChoices(action) {
    try {
      const actionType =
        action === "mine"
          ? "mining"
          : action === "salvage"
          ? "salvage"
          : "haul";

      const resources = await ResourceModel.getByActionType(actionType);
      return resources.map((r) => ({ name: r.name, value: r.value }));
    } catch (error) {
      console.error("Error loading resource choices:", error);
      return [];
    }
  },
};
