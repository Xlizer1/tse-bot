const {
  SlashCommandBuilder,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  MessageFlags,
  EmbedBuilder,
} = require("discord.js");
const { DashboardModel } = require("../models/dashboard");
const TargetModel = require("../models/target");
const ContributionModel = require("../models/contribution");
const { createProgressEmbed } = require("../dashboard-updater");

module.exports = {
  data: new SlashCommandBuilder()
    .setName("sharedashboard")
    .setDescription("Creates a dashboard sharing data from another server")
    .addSubcommand(subcommand =>
      subcommand
        .setName("create")
        .setDescription("Create a dashboard showing data from specified server")
        .addStringOption(option =>
          option
            .setName("server_id")
            .setDescription("Server ID to show data from")
            .setRequired(true)
        )
        .addChannelOption(option =>
          option
            .setName("channel")
            .setDescription("Channel to post the dashboard (defaults to current channel)")
            .setRequired(false)
        )
    )
    .addSubcommand(subcommand =>
      subcommand
        .setName("list")
        .setDescription("List available servers to share from")
    ),

  async execute(interaction, guildId) {
    try {
      // Check admin permissions
      if (!interaction.member.permissions.has("Administrator")) {
        return interaction.reply({
          content:
            "You do not have permission to use this command. Only administrators can create shared dashboards.",
          flags: MessageFlags.Ephemeral,
        });
      }

      const subcommand = interaction.options.getSubcommand();

      if (subcommand === "list") {
        // Get unique list of guilds that have targets
        const [rows] = await interaction.client.db.execute(
          "SELECT DISTINCT guild_id FROM targets"
        );

        if (rows.length === 0) {
          return interaction.reply({
            content: "No servers have any targets defined yet.",
            flags: MessageFlags.Ephemeral,
          });
        }

        // Create embed for available servers
        const embed = new EmbedBuilder()
          .setColor(0x0099ff)
          .setTitle("Available Servers for Dashboard Sharing")
          .setDescription("These servers have resource collection data that can be shared")
          .setTimestamp();

        // Add server information
        for (const row of rows) {
          const serverId = row.guild_id;
          
          // Try to get server name
          let serverName = "Unknown Server";
          try {
            const guild = await interaction.client.guilds.fetch(serverId);
            if (guild) {
              serverName = guild.name;
            }
          } catch (err) {
            console.log(`Could not fetch guild info for ${serverId}`);
          }

          // Get some stats about the server's data
          const [targetStats] = await interaction.client.db.execute(
            "SELECT COUNT(*) as target_count FROM targets WHERE guild_id = ?",
            [serverId]
          );

          embed.addFields({
            name: serverName,
            value: `Server ID: \`${serverId}\`\nTargets: ${targetStats[0].target_count || 0}`,
            inline: true,
          });
        }

        return interaction.reply({ embeds: [embed], flags: MessageFlags.Ephemeral });
      }
      
      if (subcommand === "create") {
        const sourceGuildId = interaction.options.getString("server_id");
        
        // Verify source guild has data
        const [targets] = await interaction.client.db.execute(
          "SELECT COUNT(*) as count FROM targets WHERE guild_id = ?",
          [sourceGuildId]
        );
        
        if (!targets[0] || targets[0].count === 0) {
          return interaction.reply({
            content: `The server with ID ${sourceGuildId} doesn't have any targets defined.`,
            flags: MessageFlags.Ephemeral,
          });
        }
        
        // Get target channel or use current channel
        const targetChannel =
          interaction.options.getChannel("channel") || interaction.channel;

        await interaction.deferReply({ flags: MessageFlags.Ephemeral });
          
        // Create progress embed with data from source guild
        const progressEmbed = await createProgressEmbed(sourceGuildId);
        
        // Add source attribution
        let sourceName = sourceGuildId;
        try {
          const guild = await interaction.client.guilds.fetch(sourceGuildId);
          if (guild) {
            sourceName = guild.name;
          }
        } catch (err) {
          console.log(`Could not fetch guild info for ${sourceGuildId}`);
        }
        
        progressEmbed.setFooter({ 
          text: `Data from: ${sourceName} | ID: ${sourceGuildId}`,
          iconURL: interaction.guild.iconURL({ dynamic: true }) 
        });

        // Create buttons for interactivity
        const actionRow = new ActionRowBuilder().addComponents(
          new ButtonBuilder()
            .setCustomId(`view_leaderboard_${sourceGuildId}`)
            .setLabel("Leaderboard")
            .setStyle(ButtonStyle.Secondary),
          new ButtonBuilder()
            .setCustomId(`view_progress_${sourceGuildId}`)
            .setLabel("Progress Details")
            .setStyle(ButtonStyle.Secondary),
          new ButtonBuilder()
            .setCustomId(`refresh_dashboard_${sourceGuildId}`)
            .setLabel("Refresh")
            .setStyle(ButtonStyle.Success)
        );

        // Send the dashboard
        const message = await targetChannel.send({
          embeds: [progressEmbed],
          components: [actionRow],
        });

        // Store as a special shared dashboard type
        await interaction.client.db.execute(
          "INSERT INTO dashboards (message_id, channel_id, guild_id, source_guild_id) VALUES (?, ?, ?, ?)",
          [message.id, targetChannel.id, guildId, sourceGuildId]
        );

        await interaction.editReply({
          content: `Shared dashboard created in ${targetChannel}! The dashboard shows data from ${sourceName} and will update when refreshed.`,
        });
      }
    } catch (error) {
      console.error("Error in sharedashboard command:", error);

      if (interaction.deferred) {
        await interaction.editReply({
          content: "An error occurred while creating the shared dashboard.",
        });
      } else {
        await interaction.reply({
          content: "An error occurred while creating the shared dashboard.",
          flags: MessageFlags.Ephemeral,
        });
      }
    }
  },
};