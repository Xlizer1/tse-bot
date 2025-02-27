const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const fs = require('fs');
const path = require('path');

// Path to store targets data
const targetsPath = path.join(__dirname, '..', 'data', 'targets.json');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('location')
        .setDescription('Show where resources have been delivered/found')
        .addStringOption(option => 
            option.setName('resource')
                .setDescription('Resource to check (leave empty for all)')
                .setRequired(false)),
    
    async execute(interaction) {
        // Check if targets file exists
        if (!fs.existsSync(targetsPath)) {
            return interaction.reply({ 
                content: 'No resources have been logged yet.', 
                ephemeral: true 
            });
        }
        
        // Load data
        let targetsData = JSON.parse(fs.readFileSync(targetsPath, 'utf8'));
        
        // Get specific resource filter if provided
        const resourceFilter = interaction.options.getString('resource')?.toLowerCase();
        
        // Create embed for the response
        const embed = new EmbedBuilder()
            .setColor(0x0099FF)
            .setTitle('Resource Locations')
            .setDescription('Where resources have been delivered/found')
            .setTimestamp();
        
        // Collect and organize location data
        const locationMap = new Map();
        let resourcesFound = false;
        
        // Process all contributions
        Object.entries(targetsData.progress).forEach(([key, progressData]) => {
            // Extract resource name from key (format: action_resource)
            const [action, ...resourceParts] = key.split('_');
            const resource = resourceParts.join('_');
            
            // Skip if doesn't match filter
            if (resourceFilter && resource !== resourceFilter) return;
            
            // Process contributions for this resource
            if (progressData.contributions && progressData.contributions.length > 0) {
                resourcesFound = true;
                
                // Group by location
                progressData.contributions.forEach(contribution => {
                    const locationKey = contribution.location.toLowerCase();
                    
                    if (!locationMap.has(locationKey)) {
                        locationMap.set(locationKey, {
                            name: contribution.location,
                            resources: new Map()
                        });
                    }
                    
                    const locationData = locationMap.get(locationKey);
                    const resourceKey = `${action}_${resource}`;
                    
                    if (!locationData.resources.has(resourceKey)) {
                        locationData.resources.set(resourceKey, {
                            action,
                            resource,
                            total: 0
                        });
                    }
                    
                    locationData.resources.get(resourceKey).total += contribution.amount;
                });
            }
        });
        
        // No resources found with the filter
        if (!resourcesFound) {
            if (resourceFilter) {
                embed.setDescription(`No data found for resource: ${resourceFilter}`);
            } else {
                embed.setDescription('No resources have been logged yet.');
            }
        } else {
            // Add location fields to the embed
            locationMap.forEach(location => {
                let fieldValue = '';
                
                location.resources.forEach(resourceData => {
                    const resourceName = resourceData.resource.charAt(0).toUpperCase() + resourceData.resource.slice(1);
                    const actionName = resourceData.action.charAt(0).toUpperCase() + resourceData.action.slice(1);
                    
                    fieldValue += `${actionName} ${resourceName}: ${resourceData.total} SCU\n`;
                });
                
                embed.addFields({ name: location.name, value: fieldValue });
            });
        }
        
        await interaction.reply({ embeds: [embed] });
    },
};