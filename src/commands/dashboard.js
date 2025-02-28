// src/commands/dashboard.js
const { SlashCommandBuilder, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');
const TargetModel = require('../models/target');
const ContributionModel = require('../models/contribution');
const ResourceModel = require('../models/resource');

// Utility function to create a progress bar
function createProgressBar(percentage, length = 10) {
  const filledLength = Math.round((percentage / 100) * length);
  const emptyLength = length - filledLength;
  
  const filledEmoji = '🟩'; // Green square for filled
  const emptyEmoji = '⬜'; // White square for empty
  
  return filledEmoji.repeat(filledLength) + emptyEmoji.repeat(emptyLength);
}

// Function to get an emoji for an action type
function getActionEmoji(action) {
  switch(action) {
    case 'mine': return '⛏️';
    case 'salvage': return '🏭';
    case 'haul': return '🚚';
    default: return '📦';
  }
}

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
        
        try {
            // Fetch comprehensive data
            const targets = await TargetModel.getAllWithProgress();
            const resources = await ResourceModel.getAll();
            const topContributors = await ContributionModel.getTopContributors(3);

            // Calculate overall statistics
            const totalTargets = targets.length;
            const totalResourceTypes = new Set(targets.map(t => t.resource)).size;
            const totalContributions = targets.reduce((sum, target) => 
                sum + (target.current_amount || 0), 0);
            const totalTargetAmount = targets.reduce((sum, target) => 
                sum + target.target_amount, 0);
            const overallProgress = Math.floor((totalContributions / totalTargetAmount) * 100);

            // Group targets by action type
            const actionBreakdown = targets.reduce((acc, target) => {
                if (!acc[target.action]) {
                    acc[target.action] = { 
                        total: 0, 
                        current: 0,
                        targets: 0
                    };
                }
                acc[target.action].total += target.target_amount;
                acc[target.action].current += (target.current_amount || 0);
                acc[target.action].targets++;
                return acc;
            }, {});

            // Create dashboard embed
            const dashboardEmbed = new EmbedBuilder()
                .setColor(0x0099FF)
                .setTitle('🚀 Terra Star Expeditionary Resource Tracker')
                .setDescription(`Comprehensive overview of our resource collection efforts`)
                .addFields(
                    {
                        name: '📊 Overall Progress',
                        value: [
                            `${createProgressBar(overallProgress)} ${overallProgress}%`,
                            `**Total Contributions**: ${totalContributions} SCU`,
                            `**Total Targets**: ${totalTargets}`,
                            `**Unique Resource Types**: ${totalResourceTypes}`
                        ].join('\n'),
                        inline: false
                    },
                    {
                        name: '🎯 Action Type Breakdown',
                        value: Object.entries(actionBreakdown).map(([action, data]) => {
                            const progress = Math.floor((data.current / data.total) * 100);
                            return `${getActionEmoji(action)} **${action.charAt(0).toUpperCase() + action.slice(1)}**:\n` +
                                   `${createProgressBar(progress)} ${progress}% (${data.targets} targets)`;
                        }).join('\n\n'),
                        inline: false
                    },
                    {
                        name: '🏆 Top Contributors',
                        value: topContributors.length > 0
                            ? topContributors.map((contributor, index) => 
                                `${index === 0 ? '🥇' : index === 1 ? '🥈' : '🥉'} ` +
                                `${contributor.username}: ${contributor.total_amount} SCU`
                              ).join('\n')
                            : 'No contributions yet',
                        inline: false
                    }
                )
                .setFooter({ 
                    text: 'Last updated', 
                    iconURL: 'https://cdn.discordapp.com/embed/avatars/0.png' 
                })
                .setTimestamp();

            // Create buttons for interaction
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
        } catch (error) {
            console.error('Error in dashboard command:', error);
            
            await interaction.reply({ 
                content: 'An error occurred while creating the dashboard.', 
                ephemeral: true 
            });
        }
    }
};