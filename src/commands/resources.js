const { SlashCommandBuilder, EmbedBuilder } = require("discord.js");
const ResourceModel = require("../models/resource");

module.exports = {
  data: new SlashCommandBuilder()
    .setName("resources")
    .setDescription("Manage resource list for the bot")
    .addSubcommand((subcommand) =>
      subcommand
        .setName("list")
        .setDescription("List all available resources")
        .addStringOption((option) =>
          option
            .setName("action")
            .setDescription("Action type to list resources for")
            .setRequired(false)
            .addChoices(
              { name: "Mine", value: "mining" },
              { name: "Salvage", value: "salvage" },
              { name: "Haul", value: "haul" },
              { name: "All", value: "all" }
            )
        )
    )
    .addSubcommand((subcommand) =>
      subcommand
        .setName("add")
        .setDescription("Add a new resource (admin only)")
        .addStringOption((option) =>
          option
            .setName("action")
            .setDescription("Action type for this resource")
            .setRequired(true)
            .addChoices(
              { name: "Mine", value: "mining" },
              { name: "Salvage", value: "salvage" },
              { name: "Haul", value: "haul" }
            )
        )
        .addStringOption((option) =>
          option
            .setName("name")
            .setDescription('Display name of the resource (e.g., "Copper")')
            .setRequired(true)
        )
        .addStringOption((option) =>
          option
            .setName("value")
            .setDescription(
              'System value of the resource (e.g., "copper" - lowercase, no spaces)'
            )
            .setRequired(true)
        )
    ),

  async execute(interaction) {
    try {
      const subcommand = interaction.options.getSubcommand();

      if (subcommand === "list") {
        const actionType = interaction.options.getString("action") || "all";

        const embed = new EmbedBuilder()
          .setColor(0x0099ff)
          .setTitle("Available Resources")
          .setDescription("Resources that can be selected for operations")
          .setTimestamp();

        if (actionType === "all") {
          // Get all resources grouped by type
          const groupedResources = await ResourceModel.getGroupedResources();

          // Add mining resources
          if (groupedResources.mining && groupedResources.mining.length > 0) {
            embed.addFields({
              name: "Mining Resources",
              value:
                groupedResources.mining
                  .map((r) => `• ${r.name} (${r.value})`)
                  .join("\n") || "None defined",
            });
          }

          // Add salvage resources
          if (groupedResources.salvage && groupedResources.salvage.length > 0) {
            embed.addFields({
              name: "Salvage Resources",
              value:
                groupedResources.salvage
                  .map((r) => `• ${r.name} (${r.value})`)
                  .join("\n") || "None defined",
            });
          }

          // Add haul resources
          if (groupedResources.haul && groupedResources.haul.length > 0) {
            embed.addFields({
              name: "Haul Resources",
              value:
                groupedResources.haul
                  .map((r) => `• ${r.name} (${r.value})`)
                  .join("\n") || "None defined",
            });
          }
        } else {
          // Get specific action type resources
          const resources = await ResourceModel.getByActionType(actionType);

          embed.addFields({
            name: `${
              actionType.charAt(0).toUpperCase() + actionType.slice(1)
            } Resources`,
            value:
              resources.length > 0
                ? resources.map((r) => `• ${r.name} (${r.value})`).join("\n")
                : "None defined",
          });
        }

        await interaction.reply({ embeds: [embed] });
      } else if (subcommand === "add") {
        // Check admin permissions
        if (!interaction.member.permissions.has("Administrator")) {
          return interaction.reply({
            content:
              "You do not have permission to add resources. Only administrators can manage resources.",
            ephemeral: true,
          });
        }

        const actionType = interaction.options.getString("action");
        const name = interaction.options.getString("name");
        const value = interaction.options
          .getString("value")
          .toLowerCase()
          .replace(/\s+/g, "_");

        // Check if resource already exists
        const existingResource = await ResourceModel.getByValueAndType(
          value,
          actionType
        );

        if (existingResource) {
          return interaction.reply({
            content: `Resource "${value}" already exists for the ${actionType} action type.`,
            ephemeral: true,
          });
        }

        // Add the resource (with auto-generated emoji)
        await ResourceModel.add(name, value, actionType);

        await interaction.reply({
          content: `Added "${name}" (${value}) to the ${actionType} resources list.`,
          ephemeral: true,
        });
      }
    } catch (error) {
      console.error("Error in resources command:", error);
      await interaction.reply({
        content: "An error occurred while managing resources.",
        ephemeral: true,
      });
    }
  },
};
