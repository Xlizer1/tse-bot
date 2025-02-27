const { SlashCommandBuilder } = require('discord.js');
const fs = require('fs');
const path = require('path');
const { updateDashboards } = require('../dashboard-updater');

// Path to store targets data
const targetsPath = path.join(__dirname, '..', 'data', 'targets.json');

// Path to store resource definitions
const resourcesPath = path.join(__dirname, '..', 'data', 'resources.json');

// Ensure data directory exists
const dataDir = path.join(__dirname, '..', 'data');
if (!fs.existsSync(dataDir)) {
    fs.mkdirSync(dataDir, { recursive: true });
}

// Initialize targets file if it doesn't exist
if (!fs.existsSync(targetsPath)) {
    fs.writeFileSync(targetsPath, JSON.stringify({
        resources: {},
        progress: {}
    }), 'utf8');
}

// Initialize resources file if it doesn't exist
if (!fs.existsSync(resourcesPath)) {
    // Default resources list
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

// Load resources for choices
let resourceChoices;
try {
    resourceChoices = JSON.parse(fs.readFileSync(resourcesPath, 'utf8'));
} catch (error) {
    console.error('Error loading resources file:', error);
    resourceChoices = { mining: [], salvage: [], haul: [] };
}

module.exports = {
    data: new SlashCommandBuilder()
        .setName('settarget')
        .setDescription('Set a target amount for resources to be collected')
        .addStringOption(option => 
            option.setName('action')
                .setDescription('Action type')
                .setRequired(true)
                .addChoices(
                    { name: 'Mine', value: 'mine' },
                    { name: 'Salvage', value: 'salvage' },
                    { name: 'Haul', value: 'haul' }
                ))
        .addStringOption(option => {
            const resourceOption = option
                .setName('resource')
                .setDescription('Resource type')
                .setRequired(true);
            
            // We'll add the choices dynamically when the command is executed
            return resourceOption;
        })
        .addIntegerOption(option =>
            option.setName('amount')
                .setDescription('Target amount in SCU')
                .setRequired(true)
                .setMinValue(1)),
    
    async execute(interaction) {
        // Permissions check for admins
        if (!interaction.member.permissions.has('Administrator')) {
            return interaction.reply({ content: 'You do not have permission to use this command. Only administrators can set targets.', ephemeral: true });
        }

        const action = interaction.options.getString('action');
        const resource = interaction.options.getString('resource');
        const amount = interaction.options.getInteger('amount');
        
        // Load current targets
        let targetsData = JSON.parse(fs.readFileSync(targetsPath, 'utf8'));
        
        // Set the target
        const resourceKey = `${action}_${resource.toLowerCase()}`;
        targetsData.resources[resourceKey] = {
            action,
            resource: resource.toLowerCase(),
            target: amount,
            createdAt: new Date().toISOString(),
            createdBy: interaction.user.id
        };
        
        // Initialize progress if it doesn't exist
        if (!targetsData.progress[resourceKey]) {
            targetsData.progress[resourceKey] = {
                current: 0,
                contributions: []
            };
        }
        
        // Save the updated targets
        fs.writeFileSync(targetsPath, JSON.stringify(targetsData, null, 2), 'utf8');
        
        await interaction.reply(`Target set: ${action} ${amount} SCU of ${resource}`);
        
        // Update dashboards
        await updateDashboards(interaction.client);
    },
    
    // Function to dynamically update the resources choices based on the selected action
    // This will be used when registering the command in deploy-commands.js
    getResourceChoices(action) {
        try {
            if (!resourceChoices) {
                resourceChoices = JSON.parse(fs.readFileSync(resourcesPath, 'utf8'));
            }
            
            // Return the appropriate choices based on action
            switch (action) {
                case 'mine':
                    return resourceChoices.mining || [];
                case 'salvage':
                    return resourceChoices.salvage || [];
                case 'haul':
                    return resourceChoices.haul || [];
                default:
                    return [];
            }
        } catch (error) {
            console.error('Error loading resource choices:', error);
            return [];
        }
    }
};