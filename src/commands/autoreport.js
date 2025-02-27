const { SlashCommandBuilder } = require('discord.js');
const fs = require('fs');
const path = require('path');

// Path to store settings
const settingsPath = path.join(__dirname, '..', 'data', 'settings.json');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('autoreport')
        .setDescription('Configure automatic daily resource reports')
        .addSubcommand(subcommand =>
            subcommand
                .setName('enable')
                .setDescription('Enable automatic daily reports')
                .addChannelOption(option =>
                    option.setName('channel')
                        .setDescription('Channel to post reports in')
                        .setRequired(true))
                .addStringOption(option =>
                    option.setName('time')
                        .setDescription('Time to post reports (24h format, UTC)')
                        .setRequired(true)))
        .addSubcommand(subcommand =>
            subcommand
                .setName('disable')
                .setDescription('Disable automatic daily reports')),
    
    async execute(interaction) {
        // Check admin permissions
        if (!interaction.member.permissions.has('Administrator')) {
            return interaction.reply({ 
                content: 'You do not have permission to use this command. Only administrators can configure automatic reports.', 
                ephemeral: true 
            });
        }
        
        // Create settings file if it doesn't exist
        if (!fs.existsSync(settingsPath)) {
            fs.writeFileSync(settingsPath, JSON.stringify({ autoReport: { enabled: false } }), 'utf8');
        }
        
        // Load settings
        let settings = JSON.parse(fs.readFileSync(settingsPath, 'utf8'));
        
        const subcommand = interaction.options.getSubcommand();
        
        if (subcommand === 'enable') {
            const channel = interaction.options.getChannel('channel');
            const timeStr = interaction.options.getString('time');
            
            // Validate time format (24h: HH:MM)
            const timeRegex = /^([01]?[0-9]|2[0-3]):([0-5][0-9])$/;
            if (!timeRegex.test(timeStr)) {
                return interaction.reply({ 
                    content: 'Invalid time format. Please use 24h format (e.g., 08:00 or 20:30).', 
                    ephemeral: true 
                });
            }
            
            // Save settings
            settings.autoReport = {
                enabled: true,
                channelId: channel.id,
                time: timeStr,
                guildId: interaction.guild.id
            };
            
            fs.writeFileSync(settingsPath, JSON.stringify(settings, null, 2), 'utf8');
            
            await interaction.reply(`Automatic daily reports enabled! Reports will be posted in ${channel} at ${timeStr} UTC.`);
            
        } else if (subcommand === 'disable') {
            // Disable auto reports
            settings.autoReport = {
                enabled: false
            };
            
            fs.writeFileSync(settingsPath, JSON.stringify(settings, null, 2), 'utf8');
            
            await interaction.reply('Automatic daily reports have been disabled.');
        }
    },
};