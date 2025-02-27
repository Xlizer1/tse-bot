const { SlashCommandBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, EmbedBuilder } = require('discord.js');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('dashboard')
        .setDescription('Creates an interactive resource tracking dashboard (admin only)')
        .addChannelOption(option => 
            option.setName('channel')
                .setDescription('Channel to post the dashboard (defaults to current channel)')
                .setRequired(false)),
    
    async execute(interaction) {
        // Check admin permissions
        if (!interaction.member.permissions.has('Administrator')) {
            return interaction.reply({ 
                content: 'You do not have permission to use this command. Only administrators can create dashboards.', 
                ephemeral: true 
            });
        }
        
        // Get target channel or use current channel
        const targetChannel = interaction.options.getChannel('channel') || interaction.channel;
        
        // Create dashboard embed
        const dashboardEmbed = new EmbedBuilder()
            .setColor(0x0099FF)
            .setTitle('Terra Star Expeditionary Resource Tracker')
            .setDescription('Use the buttons below to interact with the resource tracking system')
            .addFields(
                { name: 'Add Resources', value: 'Use the "Add Resources" button to record your contributions' },
                { name: 'View Progress', value: 'Use the "View Progress" button to see current progress toward targets' },
                { name: 'Leaderboard', value: 'Use the "Leaderboard" button to see top contributors' },
                { name: 'Locations', value: 'Use the "Locations" button to see where resources have been delivered' }
            )
            .setFooter({ text: 'Terra Star Expeditionary' })
            .setTimestamp();
        
        // Create buttons
        const row1 = new ActionRowBuilder()
            .addComponents(
                new ButtonBuilder()
                    .setCustomId('add_resources')
                    .setLabel('Add Resources')
                    .setStyle(ButtonStyle.Primary),
                new ButtonBuilder()
                    .setCustomId('view_progress')
                    .setLabel('View Progress')
                    .setStyle(ButtonStyle.Success)
            );
            
        const row2 = new ActionRowBuilder()
            .addComponents(
                new ButtonBuilder()
                    .setCustomId('view_leaderboard')
                    .setLabel('Leaderboard')
                    .setStyle(ButtonStyle.Secondary),
                new ButtonBuilder()
                    .setCustomId('view_locations')
                    .setLabel('Locations')
                    .setStyle(ButtonStyle.Secondary)
            );
        
        // Send the dashboard
        await targetChannel.send({
            embeds: [dashboardEmbed],
            components: [row1, row2]
        });
        
        // Confirm to the user
        await interaction.reply({ 
            content: `Dashboard created in ${targetChannel}!`, 
            ephemeral: true 
        });
    },
};