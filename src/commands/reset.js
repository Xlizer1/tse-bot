const { SlashCommandBuilder, MessageFlags } = require("discord.js");
const TargetModel = require("../models/target");
const { updateDashboards } = require("../dashboard-updater");

module.exports = {
  data: new SlashCommandBuilder()
    .setName("reset")
    .setDescription("Reset resource targets or progress")
    .addSubcommand((subcommand) =>
      subcommand
        .setName("all")
        .setDescription("Reset all targets and progress (admin only)")
    )
    .addSubcommand((subcommand) =>
      subcommand
        .setName("target")
        .setDescription("Reset a specific target and its progress (admin only)")
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
    )
    .addSubcommand((subcommand) =>
      subcommand
        .setName("progress")
        .setDescription(
          "Reset progress for a target but keep the target (admin only)"
        )
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
    ),

  async execute(interaction) {
    try {
      // Check admin permissions
      if (!interaction.member.permissions.has("Administrator")) {
        return interaction.reply({
          content:
            "You do not have permission to use this command. Only administrators can reset data.",
          flags: MessageFlags.Ephemeral,
        });
      }

      const subcommand = interaction.options.getSubcommand();

      if (subcommand === "all") {
        // This operation is more complex with a database
        // We'll list all targets first
        const guildId = interaction.guild.id;
        const targets = await TargetModel.getAllWithProgress(guildId);

        if (targets.length === 0) {
          return interaction.reply({
            content: "No targets have been set yet.",
            flags: MessageFlags.Ephemeral,
          });
        }

        // Delete all targets one by one
        for (const target of targets) {
          await TargetModel.delete(target.id);
        }

        await interaction.reply("All targets and progress have been reset.");

        // Update dashboards
        await updateDashboards(interaction.client);
      } else if (subcommand === "target" || subcommand === "progress") {
        const action = interaction.options.getString("action");
        const resource = interaction.options
          .getString("resource")
          .toLowerCase();

        const guildId = interaction.guild.id;
        // Get the target
        const target = await TargetModel.getByActionAndResource(
          action,
          resource,
          guildId
        );

        if (!target) {
          return interaction.reply({
            content: `No target found for ${action} ${resource}.`,
            flags: MessageFlags.Ephemeral,
          });
        }

        if (subcommand === "target") {
          // Delete the target completely
          await TargetModel.delete(target.id);
          await interaction.reply(
            `Target and progress for ${action} ${resource} have been reset.`
          );
        } else if (subcommand === "progress") {
          // Reset progress but keep target
          await TargetModel.resetProgress(target.id);
          await interaction.reply(
            `Progress for ${action} ${resource} has been reset. Target remains unchanged.`
          );
        }

        // Update dashboards
        await updateDashboards(interaction.client);
      }
    } catch (error) {
      console.error("Error in reset command:", error);
      await interaction.reply({
        content: "An error occurred while resetting data.",
        flags: MessageFlags.Ephemeral,
      });
    }
  },
};
