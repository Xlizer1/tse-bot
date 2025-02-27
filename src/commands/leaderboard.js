const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const fs = require('fs');
const path = require('path');

// Path to store targets data
const targetsPath = path.join(__dirname, '..', 'data', 'targets.json');

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
        // Check if targets file exists
        if (!fs.existsSync(targetsPath)) {
            return interaction.reply({ 
                content: 'No data available for leaderboard.', 
                ephemeral: true 
            });
        }
        
        // Load data
        let targetsData = JSON.parse(fs.readFileSync(targetsPath, 'utf8'));
        
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
            return interaction.reply({
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
        
        // Collect and calculate user contributions
        const userContributions = new Map();
        let contributionsFound = false;
        
        // Process all contributions
        Object.entries(targetsData.progress).forEach(([key, progressData]) => {
            if (!progressData.contributions || progressData.contributions.length === 0) return;
            
            // Extract action and resource from key
            const [action, ...resourceParts] = key.split('_');
            const resource = resourceParts.join('_');
            
            // Apply filters
            if (actionFilter !== 'all' && action !== actionFilter) return;
            if (resourceFilter && resource !== resourceFilter) return;
            
            // Count contributions by user (with date filtering if applicable)
            progressData.contributions.forEach(contribution => {
                // Apply date filters if provided
                if (fromDate || toDate) {
                    const contributionDate = new Date(contribution.timestamp);
                    
                    if (fromDate && contributionDate < fromDate) {
                        return; // Skip this contribution
                    }
                    
                    if (toDate && contributionDate > toDate) {
                        return; // Skip this contribution
                    }
                }
                
                contributionsFound = true;
                const userId = contribution.userId;
                
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
                if (!userData.actions.has(action)) {
                    userData.actions.set(action, 0);
                }
                userData.actions.set(action, userData.actions.get(action) + contribution.amount);
            });
        });
        
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
        
        await interaction.reply({ embeds: [embed] });
    },
};