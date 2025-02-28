const { SlashCommandBuilder, MessageFlags } = require("discord.js");
const TargetModel = require("../models/target");
const ContributionModel = require("../models/contribution");
const ResourceModel = require("../models/resource");
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
        .addChoices(
          { name: "Mine", value: "mine" },
          { name: "Salvage", value: "salvage" },
          { name: "Haul", value: "haul" }
        )
    )
    .addStringOption((option) =>
      option
        .setName("resource")
        .setDescription("Resource type")
        .setRequired(true)
    )
    .addIntegerOption((option) =>
      option
        .setName("amount")
        .setDescription("Amount in SCU")
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

      // Get resource name for display
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
      const resourceName = resourceInfo
        ? resourceInfo.name
        : resource.charAt(0).toUpperCase() + resource.slice(1);

      // Reply with acknowledgment and progress
      await interaction.reply(
        `Logged: ${interaction.user.username} ${action}d ${amount} SCU of ${resourceName} at ${location}\n` +
          `Progress: ${current}/${updatedTarget.target_amount} SCU (${percentage}%)`
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
};
