// New src/commands/managetags.js - Command to manage tags on existing targets

const {
  SlashCommandBuilder,
  EmbedBuilder,
  MessageFlags,
} = require("discord.js");
const TargetModel = require("../models/target");
const { updateDashboards } = require("../dashboard-updater");

module.exports = {
  data: new SlashCommandBuilder()
    .setName("managetags")
    .setDescription(
      "Manage tags on existing targets for dashboard organization"
    )
    .addSubcommand((subcommand) =>
      subcommand
        .setName("add")
        .setDescription("Add tags to a target")
        .addStringOption((option) =>
          option
            .setName("action")
            .setDescription("Action type of the target")
            .setRequired(true)
            .setAutocomplete(true)
        )
        .addStringOption((option) =>
          option
            .setName("resource")
            .setDescription("Resource of the target")
            .setRequired(true)
            .setAutocomplete(true)
        )
        .addStringOption((option) =>
          option
            .setName("tags")
            .setDescription("Comma-separated tags to add")
            .setRequired(true)
        )
    )
    .addSubcommand((subcommand) =>
      subcommand
        .setName("remove")
        .setDescription("Remove tags from a target")
        .addStringOption((option) =>
          option
            .setName("action")
            .setDescription("Action type of the target")
            .setRequired(true)
            .setAutocomplete(true)
        )
        .addStringOption((option) =>
          option
            .setName("resource")
            .setDescription("Resource of the target")
            .setRequired(true)
            .setAutocomplete(true)
        )
        .addStringOption((option) =>
          option
            .setName("tags")
            .setDescription("Comma-separated tags to remove")
            .setRequired(true)
        )
    )
    .addSubcommand((subcommand) =>
      subcommand
        .setName("set")
        .setDescription("Replace all tags on a target")
        .addStringOption((option) =>
          option
            .setName("action")
            .setDescription("Action type of the target")
            .setRequired(true)
            .setAutocomplete(true)
        )
        .addStringOption((option) =>
          option
            .setName("resource")
            .setDescription("Resource of the target")
            .setRequired(true)
            .setAutocomplete(true)
        )
        .addStringOption((option) =>
          option
            .setName("tags")
            .setDescription("Comma-separated tags (replaces all existing tags)")
            .setRequired(true)
        )
    )
    .addSubcommand((subcommand) =>
      subcommand.setName("list").setDescription("List all tags in use")
    )
    .addSubcommand((subcommand) =>
      subcommand
        .setName("view")
        .setDescription("View targets with specific tags")
        .addStringOption((option) =>
          option
            .setName("tags")
            .setDescription("Comma-separated tags to filter by")
            .setRequired(true)
        )
    ),

  async execute(interaction) {
    try {
      // Check admin permissions
      if (!interaction.member.permissions.has("Administrator")) {
        return interaction.reply({
          content:
            "You do not have permission to use this command. Only administrators can manage tags.",
          flags: MessageFlags.Ephemeral,
        });
      }

      const subcommand = interaction.options.getSubcommand();
      const guildId = interaction.guild.id;

      if (subcommand === "list") {
        // List all tags in use
        const allTags = await TargetModel.getAllTags(guildId);

        if (allTags.length === 0) {
          return interaction.reply({
            content: "No tags are currently in use.",
            flags: MessageFlags.Ephemeral,
          });
        }

        const embed = new EmbedBuilder()
          .setColor(0x0099ff)
          .setTitle("🏷️ Target Tags")
          .setDescription("All tags currently in use for organizing targets")
          .addFields({
            name: "Available Tags",
            value: allTags.map((tag) => `\`${tag}\``).join(", "),
          })
          .setTimestamp();

        await interaction.reply({ embeds: [embed] });
      } else if (subcommand === "view") {
        // View targets with specific tags
        const tagsInput = interaction.options.getString("tags");
        const tags = tagsInput
          .split(",")
          .map((tag) => tag.trim())
          .filter((tag) => tag.length > 0);

        const targets = await TargetModel.getAllWithProgress(guildId, tags);

        if (targets.length === 0) {
          return interaction.reply({
            content: `No targets found with tags: ${tags.join(", ")}`,
            flags: MessageFlags.Ephemeral,
          });
        }

        const embed = new EmbedBuilder()
          .setColor(0x0099ff)
          .setTitle(`🏷️ Targets with tags: ${tags.join(", ")}`)
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
              const percentage = Math.floor(
                (current / target.target_amount) * 100
              );
              const targetTags =
                typeof target.tags === "string"
                  ? JSON.parse(target.tags)
                  : target.tags || [];

              return `• **${resourceName}**: ${current}/${
                target.target_amount
              } ${target.unit} (${percentage}%)\n  Tags: ${targetTags.join(
                ", "
              )}`;
            })
            .join("\n");

          embed.addFields({
            name: `${action.charAt(0).toUpperCase() + action.slice(1)} Targets`,
            value: fieldValue || "None",
            inline: false,
          });
        });

        await interaction.reply({ embeds: [embed] });
      } else {
        // Add, Remove, or Set tags
        const action = interaction.options.getString("action");
        const resource = interaction.options
          .getString("resource")
          .toLowerCase();
        const tagsInput = interaction.options.getString("tags");

        // Parse tags
        const tags = tagsInput
          .split(",")
          .map((tag) => tag.trim())
          .filter((tag) => tag.length > 0);

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

        // Get current tags
        let currentTags = target.tags || [];
        if (typeof currentTags === "string") {
          currentTags = JSON.parse(currentTags);
        }

        let newTags;
        let message;

        if (subcommand === "add") {
          // Add tags
          newTags = [...new Set([...currentTags, ...tags])];
          message = `Added tags to ${action} ${resource}:\nNew tags: ${tags.join(
            ", "
          )}\nAll tags: ${newTags.join(", ")}`;
        } else if (subcommand === "remove") {
          // Remove tags
          newTags = currentTags.filter((tag) => !tags.includes(tag));
          message = `Removed tags from ${action} ${resource}:\nRemoved: ${tags.join(
            ", "
          )}\nRemaining tags: ${newTags.join(", ")}`;
        } else if (subcommand === "set") {
          // Set tags (replace all)
          newTags = tags;
          message = `Set tags for ${action} ${resource}:\nNew tags: ${newTags.join(
            ", "
          )}`;
        }

        // Update the target
        await TargetModel.updateTags(target.id, newTags);

        // Update dashboards
        await updateDashboards(interaction.client);

        await interaction.reply({
          content: message,
          flags: MessageFlags.Ephemeral,
        });
      }
    } catch (error) {
      console.error("Error in managetags command:", error);
      await interaction.reply({
        content: "An error occurred while managing tags.",
        flags: MessageFlags.Ephemeral,
      });
    }
  },

  // Autocomplete for action types and resources
  async autocomplete(interaction) {
    const focusedOption = interaction.options.getFocused(true);
    const guildId = interaction.guild?.id;

    try {
      if (focusedOption.name === "action") {
        // Get unique actions from targets
        const targets = await TargetModel.getAllWithProgress(guildId);
        const actions = [...new Set(targets.map((t) => t.action))];

        const filtered = actions.filter((action) =>
          action.toLowerCase().includes(focusedOption.value.toLowerCase())
        );

        await interaction.respond(
          filtered.map((action) => ({
            name: action.charAt(0).toUpperCase() + action.slice(1),
            value: action,
          }))
        );
      } else if (focusedOption.name === "resource") {
        const selectedAction = interaction.options.getString("action");

        if (selectedAction && guildId) {
          const targets = await TargetModel.getAllWithProgress(guildId);
          const resources = targets
            .filter((t) => t.action === selectedAction)
            .map((t) => ({
              name: t.resource_name || t.resource,
              value: t.resource,
            }));

          const filtered = resources.filter(
            (resource) =>
              resource.name
                .toLowerCase()
                .includes(focusedOption.value.toLowerCase()) ||
              resource.value
                .toLowerCase()
                .includes(focusedOption.value.toLowerCase())
          );

          await interaction.respond(filtered.slice(0, 25));
        } else {
          await interaction.respond([]);
        }
      } else if (focusedOption.name === "tags") {
        // Suggest existing tags
        if (guildId) {
          const existingTags = await TargetModel.getAllTags(guildId);
          const userInput = focusedOption.value.toLowerCase();
          const currentTags = userInput.split(",").map((t) => t.trim());
          const lastTag = currentTags[currentTags.length - 1];

          const filtered = existingTags
            .filter((tag) => tag.toLowerCase().includes(lastTag))
            .slice(0, 25);

          await interaction.respond(
            filtered.map((tag) => ({
              name: tag,
              value: currentTags.slice(0, -1).concat(tag).join(", "),
            }))
          );
        } else {
          await interaction.respond([]);
        }
      }
    } catch (error) {
      console.error("Error during managetags autocomplete:", error);
      await interaction.respond([]);
    }
  },
};
