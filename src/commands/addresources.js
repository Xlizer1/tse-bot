const { SlashCommandBuilder } = require('discord.js');
const fs = require('fs');
const path = require('path');
const { updateDashboards } = require('../dashboard-updater');

// Path to store targets data
const targetsPath = path.join(__dirname, '..', 'data', 'targets.json');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('addresources')
        .setDescription('Add your collected resources to the group total')
        .addStringOption(option => 
            option.setName('action')
                .setDescription('What you did')
                .setRequired(true)
                .addChoices(
                    { name: 'Mine', value: 'mine' },
                    { name: 'Salvage', value: 'salvage' },
                    { name: 'Haul', value: 'haul' }
                ))
        .addStringOption(option =>
            option.setName('resource')
                .setDescription('Resource type')
                .setRequired(true))
        .addIntegerOption(option =>
            option.setName('amount')
                .setDescription('Amount in SCU')
                .setRequired(true)
                .setMinValue(1))
        .addStringOption(option =>
            option.setName('location')
                .setDescription('Where you delivered/found the resource')
                .setRequired(true)),
    
    async execute(interaction) {
        const action = interaction.options.getString('action');
        const resource = interaction.options.getString('resource').toLowerCase();
        const amount = interaction.options.getInteger('amount');
        const location = interaction.options.getString('location');
        
        // Load current targets and progress
        if (!fs.existsSync(targetsPath)) {
            return interaction.reply({ 
                content: 'No targets have been set yet. Ask an admin to set targets first.', 
                ephemeral: true 
            });
        }
        
        let targetsData = JSON.parse(fs.readFileSync(targetsPath, 'utf8'));
        
        // Check if the target exists
        const resourceKey = `${action}_${resource}`;
        if (!targetsData.resources[resourceKey]) {
            return interaction.reply({ 
                content: `No target found for ${action} ${resource}. Please check the resource name or ask an admin to set this target.`, 
                ephemeral: true 
            });
        }
        
        // Create progress entry if it doesn't exist
        if (!targetsData.progress[resourceKey]) {
            targetsData.progress[resourceKey] = {
                current: 0,
                contributions: []
            };
        }
        
        // Update progress
        targetsData.progress[resourceKey].current += amount;
        
        // Record the contribution
        targetsData.progress[resourceKey].contributions.push({
            userId: interaction.user.id,
            username: interaction.user.username,
            amount,
            location,
            timestamp: new Date().toISOString()
        });
        
        // Save the updated data
        fs.writeFileSync(targetsPath, JSON.stringify(targetsData, null, 2), 'utf8');
        
        // Get the target amount
        const target = targetsData.resources[resourceKey].target;
        const current = targetsData.progress[resourceKey].current;
        
        // Reply with acknowledgment and progress
        await interaction.reply(
            `Added: ${interaction.user.username} ${action}d ${amount} SCU of ${resource} at ${location}\n` +
            `Progress: ${current}/${target} SCU (${Math.floor((current/target) * 100)}%)`
        );
        
        // Update dashboards with the new information
        await updateDashboards(interaction.client);
    },
};