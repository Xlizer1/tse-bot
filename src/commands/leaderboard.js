// src/commands/leaderboard.js
const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const TargetModel = require('../models/target');
const ContributionModel = require('../models/contribution');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('leaderboard')
        .setDescription('Show top contributors for resource collection')
        .addStringOption(option => 
            option.setName('filter')
                .setDescription('Filter by action type')
                .setRequired(false)
                .addChoices(
                    { name: 'All', value: 'all' },
                    { name: 'Mine', value: 'mine' },
                    { name: 'Salvage', value: 'salvage' },
                    { name: 'Haul', value: 'haul' }
                ))
        .addStringOption(option =>
            option.setName('resource')
                .setDescription('Filter by specific resource')
                .setRequired(false))
        .addIntegerOption(option =>
            option.setName('limit')
                .setDescription('Number of top contributors to show')
                .setRequired(false)
                .setMinValue(1)
                .setMaxValue(25))
        .addStringOption(option =>
            option.setName('date_from')
                .setDescription('Filter from date (YYYY-MM-DD)')
                .setRequired(false))
        .addStringOption(option =>
            option.setName('date_to')
                .setDescription('Filter to date (YYYY-MM-DD)')
                .setRequired(false)),
    
    async execute(interaction) {
        try {
            await interaction.deferReply(); // Use defer since this might take time
            
            // Get filter options
            const actionFilter = interaction.options.getString('filter') || 'all';
            const resourceFilter = interaction.options.getString('resource')?.toLowerCase();
            const limit = interaction.options.getInteger('limit') || 10;
            const dateFrom = interaction.options.getString('date_from');
            const dateTo = interaction.options.getString('date_to');
            
            // Parse date filters if provided
            const fromDate = dateFrom ? new Date(dateFrom) : null;
            const toDate = dateTo ? new Date(dateTo + 'T23:59:59') : null; // End of the day
            
            // Validate dates if provided
            if ((fromDate && isNaN(fromDate.getTime())) || (toDate && isNaN(toDate.getTime()))) {
                return interaction.editReply({
                    content: 'Invalid date format. Please use YYYY-MM-DD.',
                    ephemeral: true
                });
            }
            
            // Create embed for the response
            const embed = new EmbedBuilder()
                .setColor(0x0099FF)
                .setTitle('Resource Collection Leaderboard')
                .setDescription(`Top ${limit} contributors ${actionFilter !== 'all' ? `for ${actionFilter}` : ''} ${resourceFilter ? `of ${resourceFilter}` : ''}` + 
                    (fromDate ? `\nFrom: ${fromDate.toISOString().split('T')[0]}` : '') +
                    (toDate ? `\nTo: ${toDate.toISOString().split('T')[0]}` : ''))
                .setTimestamp();
            
            // Get all targets
            const targets = await TargetModel.getAllWithProgress();
            
            // Filter targets by action type and resource if specified
            let filteredTargets = targets;
            
            if (actionFilter !== 'all') {
                filteredTargets = filteredTargets.filter(target => target.action === actionFilter);
            }
            
            if (resourceFilter) {
                filteredTargets = filteredTargets.filter(target => target.resource === resourceFilter);
            }
            
            if (filteredTargets.length === 0) {
                embed.setDescription('No matching targets found with the specified filters.');
                return interaction.editReply({ embeds: [embed] });
            }
            
            // Collect and calculate user contributions
            const userContributions = new Map();
            let contributionsFound = false;
            
            // Process contributions for each target
            for (const target of filteredTargets) {
                const contributions = await ContributionModel.getByTargetId(target.id, 1000);
                
                // Apply date filters if provided
                const filteredContributions = contributions.filter(contribution => {
                    if (fromDate || toDate) {
                        const contributionDate = new Date(contribution.timestamp);
                        
                        if (fromDate && contributionDate < fromDate) {
                            return false;
                        }
                        
                        if (toDate && contributionDate > toDate) {
                            return false;
                        }
                    }
                    
                    contributionsFound = true;
                    return true;
                });
                
                // Count contributions by user
                for (const contribution of filteredContributions) {
                    const userId = contribution.user_id;
                    
                    if (!userContributions.has(userId)) {
                        userContributions.set(userId, {
                            userId,
                            username: contribution.username,
                            total: 0,
                            actions: new Map()
                        });
                    }
                    
                    const userData = userContributions.get(userId);
                    userData.total += contribution.amount;
                    
                    // Track by action type
                    if (!userData.actions.has(target.action)) {
                        userData.actions.set(target.action, 0);
                    }
                    userData.actions.set(target.action, userData.actions.get(target.action) + contribution.amount);
                }
            }
            
            if (!contributionsFound) {
                embed.setDescription('No contributions found with the specified filters.');
            } else {
                // Sort users by total contribution
                const sortedUsers = Array.from(userContributions.values())
                    .sort((a, b) => b.total - a.total)
                    .slice(0, limit);
                
                // Add field for each user
                sortedUsers.forEach((userData, index) => {
                    let detailText = '';
                    
                    userData.actions.forEach((amount, action) => {
                        detailText += `${action.charAt(0).toUpperCase() + action.slice(1)}: ${amount} SCU\n`;
                    });
                    
                    embed.addFields({
                        name: `#${index + 1}: ${userData.username} (${userData.total} SCU)`,
                        value: detailText || 'No details available'
                    });
                });
            }
            
            await interaction.editReply({ embeds: [embed] });
        } catch (error) {
            console.error('Error in leaderboard command:', error);
            
            // If already deferred, editReply, otherwise reply
            if (interaction.deferred) {
                await interaction.editReply({
                    content: 'An error occurred while fetching leaderboard data.',
                    ephemeral: true
                });
            } else {
                await interaction.reply({
                    content: 'An error occurred while fetching leaderboard data.',
                    ephemeral: true
                });
            }
        }
    },
};