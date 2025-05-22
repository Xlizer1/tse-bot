const {
  SlashCommandBuilder,
  EmbedBuilder,
  MessageFlags,
} = require("discord.js");
const TargetModel = require("../models/target");
const ContributionModel = require("../models/contribution");
const ActionTypeModel = require("../models/actionType");

module.exports = {
  data: new SlashCommandBuilder()
    .setName("progress")
    .setDescription("Show progress towards resource targets")
    .addStringOption((option) =>
      option
        .setName("filter")
        .setDescription("Filter by action type")
        .setRequired(false)
        .setAutocomplete(true)
    )
    .addStringOption((option) =>
      option
        .setName("date_from")
        .setDescription("Filter from date (YYYY-MM-DD)")
        .setRequired(false)
    )
    .addStringOption((option) =>
      option
        .setName("date_to")
        .setDescription("Filter to date (YYYY-MM-DD)")
        .setRequired(false)
    ),

  async execute(interaction, guildId = null) {
    try {
      // Use provided guildId or fallback to interaction guild
      const currentGuildId = guildId || interaction.guild?.id;
      
      if (!currentGuildId) {
        return interaction.reply({
          content: "This command can only be used in a server.",
          flags: MessageFlags.Ephemeral,
        });
      }
      
      await interaction.deferReply(); // Use defer since this might take time

      // Get filter options
      const filter = interaction.options.getString("filter") || "all";
      const dateFrom = interaction.options.getString("date_from");
      const dateTo = interaction.options.getString("date_to");

      // Parse date filters if provided
      const fromDate = dateFrom ? new Date(dateFrom) : null;
      const toDate = dateTo ? new Date(dateTo + "T23:59:59") : null; // End of the day

      // Validate dates if provided
      if (
        (fromDate && isNaN(fromDate.getTime())) ||
        (toDate && isNaN(toDate.getTime()))
      ) {
        return interaction.editReply({
          content: "Invalid date format. Please use YYYY-MM-DD.",
          flags: MessageFlags.Ephemeral,
        });
      }

      // Get all action types for filtering
      const actionTypes = await ActionTypeModel.getAll();
      
      // Get all targets with progress for this guild
      const targets = await TargetModel.getAllWithProgress(currentGuildId);

      // Create embed for the response
      const embed = new EmbedBuilder()
        .setColor(0x0099ff)
        .setTitle("Resource Collection Progress")
        .setDescription(
          "Current progress towards collection targets for this server" +
            (fromDate
              ? `\nFrom: ${fromDate.toISOString().split("T")[0]}`
              : "") +
            (toDate ? `\nTo: ${toDate.toISOString().split("T")[0]}` : "")
        )
        .setTimestamp();

      // Filter targets by action type
      let filteredTargets = [];
      
      if (filter === "all") {
        filteredTargets = targets;
      } else {
        filteredTargets = targets.filter((target) => target.action === filter);
      }

      if (filteredTargets.length === 0) {
        if (filter === "all") {
          embed.setDescription("No targets have been set yet for this server.");
        } else {
          // Get the action type display name
          const actionType = actionTypes.find(a => a.name === filter);
          const actionDisplay = actionType ? actionType.display_name : filter;
          
          embed.setDescription(`No targets found for action: ${actionDisplay} in this server`);
        }

        return interaction.editReply({ embeds: [embed] });
      }

      // Process each target
      for (const target of filteredTargets) {
        let current =
          target.current_amount > target.target_amount
            ? target.target_amount
            : target.current_amount || 0;

        // Apply date filters if provided
        if (fromDate || toDate) {
          // Get all contributions for this target
          let contributions = await ContributionModel.getByTargetId(
            target.id,
            1000
          );

          // Filter contributions by date
          contributions = contributions.filter((contribution) => {
            const contributionDate = new Date(contribution.timestamp);

            if (fromDate && contributionDate < fromDate) {
              return false;
            }

            if (toDate && contributionDate > toDate) {
              return false;
            }

            return true;
          });

          // Calculate filtered total
          current = contributions.reduce(
            (sum, contribution) => sum + contribution.amount,
            0
          );
        }

        const percentage = Math.floor((current / target.target_amount) * 100);

        // Create progress bar
        const barLength = 20;
        const filledChars = Math.round((percentage / 100) * barLength);
        const progressBar =
          "█".repeat(filledChars) + "░".repeat(barLength - filledChars);

        // Get resource name (from join or fallback)
        const resourceName =
          target.resource_name ||
          target.resource.charAt(0).toUpperCase() + target.resource.slice(1);
        
        // Get action display name (from join or fallback)
        const actionName =
          target.action_display_name ||
          target.action.charAt(0).toUpperCase() + target.action.slice(1);
        
        // Get unit from target
        const unit = target.unit || "SCU";

        embed.addFields({
          name: `${actionName} ${resourceName}`,
          value: `${progressBar} ${current}/${target.target_amount} ${unit} (${percentage}%)`,
        });
      }

      await interaction.editReply({ embeds: [embed] });
    } catch (error) {
      console.error("Error in progress command:", error);

      // If already deferred, editReply, otherwise reply
      if (interaction.deferred) {
        await interaction.editReply({
          content: "An error occurred while fetching progress data.",
          flags: MessageFlags.Ephemeral,
        });
      } else {
        await interaction.reply({
          content: "An error occurred while fetching progress data.",
          flags: MessageFlags.Ephemeral,
        });
      }
    }
  },
  
  // Autocomplete handler for action types
  async autocomplete(interaction, guildId = null) {
    const focusedOption = interaction.options.getFocused(true);
    
    try {
      if (focusedOption.name === "filter") {
        // Get all action types
        const actionTypes = await ActionTypeModel.getAll();
        
        // Add "all" option
        const choices = [{ name: "All Action Types", value: "all" }];
        
        // Filter action types based on input
        const filtered = actionTypes.filter(type => 
          type.name.toLowerCase().includes(focusedOption.value.toLowerCase()) ||
          type.display_name.toLowerCase().includes(focusedOption.value.toLowerCase())
        );
        
        // Add filtered action types to choices
        filtered.forEach(type => {
          choices.push({
            name: `${type.emoji || ''} ${type.display_name}`,
            value: type.name
          });
        });
        
        await interaction.respond(choices);
      }
    } catch (error) {
      console.error('Error during progress command autocomplete:', error);
      // Return basic choice if there's an error
      await interaction.respond([
        { name: "All Action Types", value: "all" }
      ]);
    }
  }
};