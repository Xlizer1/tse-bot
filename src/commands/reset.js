const { SlashCommandBuilder } = require('discord.js');
const fs = require('fs');
const path = require('path');

// Path to store targets data
const targetsPath = path.join(__dirname, '..', 'data', 'targets.json');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('reset')
        .setDescription('Reset resource targets or progress')
        .addSubcommand(subcommand =>
            subcommand
                .setName('all')
                .setDescription('Reset all targets and progress (admin only)'))
        .addSubcommand(subcommand =>
            subcommand
                .setName('target')
                .setDescription('Reset a specific target and its progress (admin only)')
                .addStringOption(option => 
                    option.setName('action')
                        .setDescription('Action type')
                        .setRequired(true)
                        .addChoices(
                            { name: 'Mine', value: 'mine' },
                            { name: 'Salvage', value: 'salvage' },
                            { name: 'Haul', value: 'haul' }
                        ))
                .addStringOption(option =>
                    option.setName('resource')
                        .setDescription('Resource type')
                        .setRequired(true)))
        .addSubcommand(subcommand =>
            subcommand
                .setName('progress')
                .setDescription('Reset progress for a target but keep the target (admin only)')
                .addStringOption(option => 
                    option.setName('action')
                        .setDescription('Action type')
                        .setRequired(true)
                        .addChoices(
                            { name: 'Mine', value: 'mine' },
                            { name: 'Salvage', value: 'salvage' },
                            { name: 'Haul', value: 'haul' }
                        ))
                .addStringOption(option =>
                    option.setName('resource')
                        .setDescription('Resource type')
                        .setRequired(true))),
    
    async execute(interaction) {
        // Check admin permissions
        if (!interaction.member.permissions.has('Administrator')) {
            return interaction.reply({ 
                content: 'You do not have permission to use this command. Only administrators can reset data.', 
                ephemeral: true 
            });
        }

        // Check if targets file exists
        if (!fs.existsSync(targetsPath)) {
            return interaction.reply({ 
                content: 'No targets have been set yet.', 
                ephemeral: true 
            });
        }
        
        // Load data
        let targetsData = JSON.parse(fs.readFileSync(targetsPath, 'utf8'));
        const subcommand = interaction.options.getSubcommand();
        
        if (subcommand === 'all') {
            // Reset all data
            // Create backup before reset
            const backupPath = path.join(__dirname, '..', 'data', `backup_${Date.now()}.json`);
            fs.writeFileSync(backupPath, JSON.stringify(targetsData, null, 2), 'utf8');
            
            // Reset to empty data structure
            targetsData = {
                resources: {},
                progress: {}
            };
            
            fs.writeFileSync(targetsPath, JSON.stringify(targetsData, null, 2), 'utf8');
            await interaction.reply(`All targets and progress have been reset. A backup was saved at ${backupPath}`);
            
        } else if (subcommand === 'target' || subcommand === 'progress') {
            const action = interaction.options.getString('action');
            const resource = interaction.options.getString('resource').toLowerCase();
            const resourceKey = `${action}_${resource}`;
            
            // Check if the target exists
            if (!targetsData.resources[resourceKey]) {
                return interaction.reply({ 
                    content: `No target found for ${action} ${resource}.`, 
                    ephemeral: true 
                });
            }
            
            if (subcommand === 'target') {
                // Remove both target and progress
                delete targetsData.resources[resourceKey];
                delete targetsData.progress[resourceKey];
                
                fs.writeFileSync(targetsPath, JSON.stringify(targetsData, null, 2), 'utf8');
                await interaction.reply(`Target and progress for ${action} ${resource} have been reset.`);
                
            } else if (subcommand === 'progress') {
                // Reset progress but keep target
                targetsData.progress[resourceKey] = {
                    current: 0,
                    contributions: []
                };
                
                fs.writeFileSync(targetsPath, JSON.stringify(targetsData, null, 2), 'utf8');
                await interaction.reply(`Progress for ${action} ${resource} has been reset. Target remains unchanged.`);
            }
        }
    },
};