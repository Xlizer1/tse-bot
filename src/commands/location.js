// src/commands/location.js
const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const TargetModel = require('../models/target');
const ContributionModel = require('../models/contribution');
const ResourceModel = require('../models/resource');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('location')
        .setDescription('Show where resources have been delivered/found')
        .addStringOption(option => 
            option.setName('resource')
                .setDescription('Resource to check (leave empty for all)')
                .setRequired(false)),
    
    async execute(interaction) {
        try {
            await interaction.deferReply(); // Use defer since this might take time
            
            // Get specific resource filter if provided
            const resourceFilter = interaction.options.getString('resource')?.toLowerCase();
            
            // Create embed for the response
            const embed = new EmbedBuilder()
                .setColor(0x0099FF)
                .setTitle('Resource Locations')
                .setDescription('Where resources have been delivered/found')
                .setTimestamp();
            
            // Get all targets
            let targets = await TargetModel.getAllWithProgress();
            
            // Filter targets if resource filter provided
            if (resourceFilter) {
                targets = targets.filter(target => target.resource === resourceFilter);
                
                if (targets.length === 0) {
                    embed.setDescription(`No data found for resource: ${resourceFilter}`);
                    return interaction.editReply({ embeds: [embed] });
                }
            }
            
            // Collect and organize location data
            const locationMap = new Map();
            let resourcesFound = false;
            
            // Process contributions for each target
            for (const target of targets) {
                const contributions = await ContributionModel.getByTargetId(target.id, 1000);
                
                if (contributions && contributions.length > 0) {
                    resourcesFound = true;
                    
                    // Group by location
                    for (const contribution of contributions) {
                        const locationKey = contribution.location.toLowerCase();
                        
                        if (!locationMap.has(locationKey)) {
                            locationMap.set(locationKey, {
                                name: contribution.location,
                                resources: new Map()
                            });
                        }
                        
                        const locationData = locationMap.get(locationKey);
                        const resourceKey = `${target.action}_${target.resource}`;
                        
                        if (!locationData.resources.has(resourceKey)) {
                            locationData.resources.set(resourceKey, {
                                action: target.action,
                                resource: target.resource,
                                total: 0
                            });
                        }
                        
                        locationData.resources.get(resourceKey).total += contribution.amount;
                    }
                }
            }
            
            // No resources found
            if (!resourcesFound) {
                if (resourceFilter) {
                    embed.setDescription(`No data found for resource: ${resourceFilter}`);
                } else {
                    embed.setDescription('No resources have been logged yet.');
                }
            } else {
                // Get resource info for display names
                const resources = await ResourceModel.getAll();
                const resourceMap = new Map();
                resources.forEach(resource => {
                    resourceMap.set(`${resource.value}_${resource.action_type}`, resource.name);
                });
                
                // Add location fields to the embed
                locationMap.forEach(location => {
                    let fieldValue = '';
                    
                    location.resources.forEach(resourceData => {
                        // Get proper resource name either from map or fallback
                        const resourceMapKey = `${resourceData.resource}_${resourceData.action === 'mine' ? 'mining' : 
                                                             resourceData.action === 'salvage' ? 'salvage' : 'haul'}`;
                        const resourceName = resourceMap.get(resourceMapKey) || 
                                            (resourceData.resource.charAt(0).toUpperCase() + resourceData.resource.slice(1));
                        const actionName = resourceData.action.charAt(0).toUpperCase() + resourceData.action.slice(1);
                        
                        fieldValue += `${actionName} ${resourceName}: ${resourceData.total} SCU\n`;
                    });
                    
                    embed.addFields({ name: location.name, value: fieldValue });
                });
            }
            
            await interaction.editReply({ embeds: [embed] });
        } catch (error) {
            console.error('Error in location command:', error);
            
            // If already deferred, editReply, otherwise reply
            if (interaction.deferred) {
                await interaction.editReply({
                    content: 'An error occurred while fetching location data.',
                    ephemeral: true
                });
            } else {
                await interaction.reply({
                    content: 'An error occurred while fetching location data.',
                    ephemeral: true
                });
            }
        }
    },
};