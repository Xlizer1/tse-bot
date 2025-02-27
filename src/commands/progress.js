const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const fs = require('fs');
const path = require('path');

// Path to store targets data
const targetsPath = path.join(__dirname, '..', 'data', 'targets.json');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('progress')
        .setDescription('Show progress towards resource targets')
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
                content: 'No targets have been set yet.', 
                ephemeral: true 
            });
        }
        
        // Load data
        let targetsData = JSON.parse(fs.readFileSync(targetsPath, 'utf8'));
        
        // Get filter options
        const filter = interaction.options.getString('filter') || 'all';
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
            .setTitle('Resource Collection Progress')
            .setDescription('Current progress towards collection targets' + 
                (fromDate ? `\nFrom: ${fromDate.toISOString().split('T')[0]}` : '') +
                (toDate ? `\nTo: ${toDate.toISOString().split('T')[0]}` : ''))
            .setTimestamp();
        
        // Filter and add fields for each resource
        let resourcesFound = false;
        
        Object.entries(targetsData.resources).forEach(([key, resourceData]) => {
            // Skip if doesn't match filter
            if (filter !== 'all' && resourceData.action !== filter) return;
            
            resourcesFound = true;
            let progress = targetsData.progress[key] || { current: 0, contributions: [] };
            
            // Apply date filters if provided
            if (fromDate || toDate) {
                // Filter contributions by date
                const filteredContributions = progress.contributions?.filter(contribution => {
                    const contributionDate = new Date(contribution.timestamp);
                    
                    if (fromDate && contributionDate < fromDate) {
                        return false;
                    }
                    
                    if (toDate && contributionDate > toDate) {
                        return false;
                    }
                    
                    return true;
                }) || [];
                
                // Calculate filtered total
                const filteredTotal = filteredContributions.reduce((sum, contribution) => sum + contribution.amount, 0);
                
                // Create a filtered progress object
                progress = {
                    current: filteredTotal,
                    contributions: filteredContributions
                };
            }
            
            const percentage = Math.floor((progress.current / resourceData.target) * 100);
            
            // Create progress bar
            const barLength = 20;
            const filledChars = Math.round((percentage / 100) * barLength);
            const progressBar = '█'.repeat(filledChars) + '░'.repeat(barLength - filledChars);
            
            embed.addFields({
                name: `${resourceData.action.charAt(0).toUpperCase() + resourceData.action.slice(1)} ${resourceData.resource.charAt(0).toUpperCase() + resourceData.resource.slice(1)}`,
                value: `${progressBar} ${progress.current}/${resourceData.target} SCU (${percentage}%)`
            });
        });
        
        if (!resourcesFound) {
            if (filter === 'all') {
                embed.setDescription('No targets have been set yet.');
            } else {
                embed.setDescription(`No targets found for action: ${filter}`);
            }
        }
        
        await interaction.reply({ embeds: [embed] });
    },
};