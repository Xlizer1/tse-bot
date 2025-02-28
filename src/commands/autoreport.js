const { SlashCommandBuilder } = require('discord.js');
const { SettingModel } = require('../models/dashboard');

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
        try {
            // Check admin permissions
            if (!interaction.member.permissions.has('Administrator')) {
                return interaction.reply({ 
                    content: 'You do not have permission to use this command. Only administrators can configure automatic reports.', 
                    ephemeral: true 
                });
            }
            
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
                
                // Save settings to database
                const autoReportSettings = {
                    enabled: true,
                    channelId: channel.id,
                    time: timeStr,
                    guildId: interaction.guild.id,
                    lastReportDate: null
                };
                
                await SettingModel.setAutoReport(autoReportSettings);
                
                await interaction.reply(`Automatic daily reports enabled! Reports will be posted in ${channel} at ${timeStr} UTC.`);
                
            } else if (subcommand === 'disable') {
                // Get current settings first
                const currentSettings = await SettingModel.getAutoReport();
                
                // Disable auto reports but keep other settings
                const autoReportSettings = {
                    ...currentSettings,
                    enabled: false
                };
                
                await SettingModel.setAutoReport(autoReportSettings);
                
                await interaction.reply('Automatic daily reports have been disabled.');
            }
        } catch (error) {
            console.error('Error in autoreport command:', error);
            await interaction.reply({ 
                content: 'An error occurred while configuring automatic reports.', 
                ephemeral: true 
            });
        }
    },
};