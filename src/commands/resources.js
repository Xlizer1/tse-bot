const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const fs = require('fs');
const path = require('path');

// Path to store resource definitions
const resourcesPath = path.join(__dirname, '..', 'data', 'resources.json');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('resources')
        .setDescription('Manage resource list for the bot')
        .addSubcommand(subcommand =>
            subcommand
                .setName('list')
                .setDescription('List all available resources')
                .addStringOption(option =>
                    option.setName('action')
                        .setDescription('Action type to list resources for')
                        .setRequired(false)
                        .addChoices(
                            { name: 'Mine', value: 'mining' },
                            { name: 'Salvage', value: 'salvage' },
                            { name: 'Haul', value: 'haul' },
                            { name: 'All', value: 'all' }
                        )))
        .addSubcommand(subcommand =>
            subcommand
                .setName('add')
                .setDescription('Add a new resource (admin only)')
                .addStringOption(option =>
                    option.setName('action')
                        .setDescription('Action type for this resource')
                        .setRequired(true)
                        .addChoices(
                            { name: 'Mine', value: 'mining' },
                            { name: 'Salvage', value: 'salvage' },
                            { name: 'Haul', value: 'haul' }
                        ))
                .addStringOption(option =>
                    option.setName('name')
                        .setDescription('Display name of the resource (e.g., "Copper")')
                        .setRequired(true))
                .addStringOption(option =>
                    option.setName('value')
                        .setDescription('System value of the resource (e.g., "copper" - lowercase, no spaces)')
                        .setRequired(true)))
        .addSubcommand(subcommand =>
            subcommand
                .setName('remove')
                .setDescription('Remove a resource (admin only)')
                .addStringOption(option =>
                    option.setName('action')
                        .setDescription('Action type for this resource')
                        .setRequired(true)
                        .addChoices(
                            { name: 'Mine', value: 'mining' },
                            { name: 'Salvage', value: 'salvage' },
                            { name: 'Haul', value: 'haul' }
                        ))
                .addStringOption(option =>
                    option.setName('value')
                        .setDescription('System value of the resource to remove')
                        .setRequired(true))),
    
    async execute(interaction) {
        // Ensure resources file exists
        if (!fs.existsSync(resourcesPath)) {
            // Create default resources list
            const defaultResources = {
                mining: [
                    { name: 'Copper', value: 'copper' },
                    { name: 'Iron', value: 'iron' },
                    { name: 'Gold', value: 'gold' },
                    { name: 'Diamond', value: 'diamond' },
                    { name: 'Quantainium', value: 'quantainium' },
                    { name: 'Titanium', value: 'titanium' },
                    { name: 'Aluminum', value: 'aluminum' }
                ],
                salvage: [
                    { name: 'RMC', value: 'rmc' },
                    { name: 'CM', value: 'cm' },
                    { name: 'Scrap Metal', value: 'scrap_metal' },
                    { name: 'Ship Parts', value: 'ship_parts' }
                ],
                haul: [
                    { name: 'Iron', value: 'iron' },
                    { name: 'Copper', value: 'copper' },
                    { name: 'Medical Supplies', value: 'medical_supplies' },
                    { name: 'Agricultural Supplies', value: 'agricultural_supplies' },
                    { name: 'Titanium', value: 'titanium' },
                    { name: 'Hydrogen', value: 'hydrogen' },
                    { name: 'Chlorine', value: 'chlorine' }
                ]
            };
            
            fs.writeFileSync(resourcesPath, JSON.stringify(defaultResources, null, 2), 'utf8');
        }
        
        // Load resources
        const resources = JSON.parse(fs.readFileSync(resourcesPath, 'utf8'));
        
        const subcommand = interaction.options.getSubcommand();
        
        if (subcommand === 'list') {
            const actionType = interaction.options.getString('action') || 'all';
            
            const embed = new EmbedBuilder()
                .setColor(0x0099FF)
                .setTitle('Available Resources')
                .setDescription('Resources that can be selected for operations')
                .setTimestamp();
            
            if (actionType === 'all') {
                // Add all action types
                if (resources.mining && resources.mining.length > 0) {
                    embed.addFields({
                        name: 'Mining Resources',
                        value: resources.mining.map(r => `• ${r.name} (${r.value})`).join('\n') || 'None defined'
                    });
                }
                
                if (resources.salvage && resources.salvage.length > 0) {
                    embed.addFields({
                        name: 'Salvage Resources',
                        value: resources.salvage.map(r => `• ${r.name} (${r.value})`).join('\n') || 'None defined'
                    });
                }
                
                if (resources.haul && resources.haul.length > 0) {
                    embed.addFields({
                        name: 'Haul Resources',
                        value: resources.haul.map(r => `• ${r.name} (${r.value})`).join('\n') || 'None defined'
                    });
                }
            } else {
                // Add specific action type
                const typeResources = resources[actionType] || [];
                embed.addFields({
                    name: `${actionType.charAt(0).toUpperCase() + actionType.slice(1)} Resources`,
                    value: typeResources.map(r => `• ${r.name} (${r.value})`).join('\n') || 'None defined'
                });
            }
            
            await interaction.reply({ embeds: [embed] });
            
        } else if (subcommand === 'add') {
            // Check admin permissions
            if (!interaction.member.permissions.has('Administrator')) {
                return interaction.reply({ 
                    content: 'You do not have permission to add resources. Only administrators can manage resources.', 
                    ephemeral: true 
                });
            }
            
            const actionType = interaction.options.getString('action');
            const name = interaction.options.getString('name');
            const value = interaction.options.getString('value').toLowerCase().replace(/\s+/g, '_');
            
            // Ensure the category exists
            if (!resources[actionType]) {
                resources[actionType] = [];
            }
            
            // Check if resource already exists
            const exists = resources[actionType].some(r => r.value === value);
            if (exists) {
                return interaction.reply({ 
                    content: `Resource "${value}" already exists for the ${actionType} action type.`, 
                    ephemeral: true 
                });
            }
            
            // Add the resource
            resources[actionType].push({ name, value });
            
            // Save the updated resources
            fs.writeFileSync(resourcesPath, JSON.stringify(resources, null, 2), 'utf8');
            
            await interaction.reply(`Added "${name}" (${value}) to the ${actionType} resources list.`);
            
        } else if (subcommand === 'remove') {
            // Check admin permissions
            if (!interaction.member.permissions.has('Administrator')) {
                return interaction.reply({ 
                    content: 'You do not have permission to remove resources. Only administrators can manage resources.', 
                    ephemeral: true 
                });
            }
            
            const actionType = interaction.options.getString('action');
            const value = interaction.options.getString('value').toLowerCase();
            
            // Check if the category exists
            if (!resources[actionType]) {
                return interaction.reply({ 
                    content: `No resources found for the ${actionType} action type.`, 
                    ephemeral: true 
                });
            }
            
            // Check if resource exists
            const initialLength = resources[actionType].length;
            resources[actionType] = resources[actionType].filter(r => r.value !== value);
            
            if (resources[actionType].length === initialLength) {
                return interaction.reply({ 
                    content: `Resource "${value}" not found in the ${actionType} resources list.`, 
                    ephemeral: true 
                });
            }
            
            // Save the updated resources
            fs.writeFileSync(resourcesPath, JSON.stringify(resources, null, 2), 'utf8');
            
            await interaction.reply(`Removed "${value}" from the ${actionType} resources list.`);
        }
    },
};