const { 
    SlashCommandBuilder, 
    EmbedBuilder, 
    ActionRowBuilder, 
    ButtonBuilder, 
    ButtonStyle,
    AttachmentBuilder
} = require('discord.js');
const fs = require('fs');
const path = require('path');
const { updateDashboards } = require('../dashboard-updater');
const ExcelJS = require('exceljs');

// Path to store targets data
const targetsPath = path.join(__dirname, '..', 'data', 'targets.json');
// Path to store resource definitions
const resourcesPath = path.join(__dirname, '..', 'data', 'resources.json');
// Path to store settings
const settingsPath = path.join(__dirname, '..', 'data', 'settings.json');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('admin')
        .setDescription('Administrator dashboard for Terra Star Expeditionary bot'),
    
    async execute(interaction) {
        // Check admin permissions
        if (!interaction.member.permissions.has('Administrator')) {
            return interaction.reply({ 
                content: 'You do not have permission to use this command. Admin dashboard is restricted to administrators only.', 
                ephemeral: true 
            });
        }
        
        // Create dashboard embed
        const dashboardEmbed = new EmbedBuilder()
            .setColor(0x0099FF)
            .setTitle('TSE Admin Dashboard')
            .setDescription('Terra Star Expeditionary Bot Admin Controls')
            .addFields(
                { name: 'Resource Management', value: 'Add, remove or view resources for mining, salvage, and hauling operations.' },
                { name: 'Target Management', value: 'Set collection targets or reset progress for specific resources.' },
                { name: 'Data Export', value: 'Export resource collection data as an Excel spreadsheet.' },
                { name: 'Display Controls', value: 'Create or update dashboards and reporting features.' },
                { name: 'System Stats', value: 'View system statistics and status information.' }
            )
            .setFooter({ text: 'Terra Star Expeditionary Admin Dashboard' })
            .setTimestamp();
        
        // Create button rows
        const row1 = new ActionRowBuilder()
            .addComponents(
                new ButtonBuilder()
                    .setCustomId('admin_resources')
                    .setLabel('Resource Management')
                    .setStyle(ButtonStyle.Primary),
                new ButtonBuilder()
                    .setCustomId('admin_targets')
                    .setLabel('Target Management')
                    .setStyle(ButtonStyle.Primary)
            );
            
        const row2 = new ActionRowBuilder()
            .addComponents(
                new ButtonBuilder()
                    .setCustomId('admin_export')
                    .setLabel('Export Data')
                    .setStyle(ButtonStyle.Success),
                new ButtonBuilder()
                    .setCustomId('admin_display')
                    .setLabel('Display Controls')
                    .setStyle(ButtonStyle.Secondary),
                new ButtonBuilder()
                    .setCustomId('admin_stats')
                    .setLabel('System Stats')
                    .setStyle(ButtonStyle.Secondary)
            );
        
        // Send the dashboard
        await interaction.reply({
            embeds: [dashboardEmbed],
            components: [row1, row2],
            ephemeral: true
        });
    },
};