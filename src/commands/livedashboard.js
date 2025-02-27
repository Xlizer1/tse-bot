const { SlashCommandBuilder, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');
const fs = require('fs');
const path = require('path');

// Path to store targets data and settings
const targetsPath = path.join(__dirname, '..', 'data', 'targets.json');
const settingsPath = path.join(__dirname, '..', 'data', 'settings.json');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('livedashboard')
        .setDescription('Creates a live-updating resource tracking dashboard (admin only)')
        .addChannelOption(option => 
            option.setName('channel')
                .setDescription('Channel to post the dashboard (defaults to current channel)')
                .setRequired(false)),
    
    async execute(interaction) {
        // Check admin permissions
        if (!interaction.member.permissions.has('Administrator')) {
            return interaction.reply({ 
                content: 'You do not have permission to use this command. Only administrators can create dashboards.', 
                ephemeral: true 
            });
        }
        
        // Get target channel or use current channel
        const targetChannel = interaction.options.getChannel('channel') || interaction.channel;
        
        // Check if targets file exists
        if (!fs.existsSync(targetsPath)) {
            fs.writeFileSync(targetsPath, JSON.stringify({
                resources: {},
                progress: {}
            }), 'utf8');
        }
        
        // Load target data
        const targetsData = JSON.parse(fs.readFileSync(targetsPath, 'utf8'));
        
        // Create progress embed
        const progressEmbed = createProgressEmbed(targetsData);
        
        // Create buttons for actions
        const actionRow = new ActionRowBuilder()
            .addComponents(
                new ButtonBuilder()
                    .setCustomId('add_resources')
                    .setLabel('Add Resources')
                    .setStyle(ButtonStyle.Primary),
                new ButtonBuilder()
                    .setCustomId('view_leaderboard')
                    .setLabel('Leaderboard')
                    .setStyle(ButtonStyle.Secondary),
                new ButtonBuilder()
                    .setCustomId('view_locations')
                    .setLabel('Locations')
                    .setStyle(ButtonStyle.Secondary),
                new ButtonBuilder()
                    .setCustomId('refresh_dashboard')
                    .setLabel('Refresh')
                    .setStyle(ButtonStyle.Success)
            );
        
        // Send the dashboard
        const message = await targetChannel.send({
            embeds: [progressEmbed],
            components: [actionRow]
        });
        
        // Store the message ID in settings for updates
        // Create settings file if it doesn't exist
        if (!fs.existsSync(settingsPath)) {
            fs.writeFileSync(settingsPath, JSON.stringify({}), 'utf8');
        }
        
        // Load and update settings
        let settings = JSON.parse(fs.readFileSync(settingsPath, 'utf8'));
        
        if (!settings.dashboards) {
            settings.dashboards = [];
        }
        
        // Add this dashboard to settings
        settings.dashboards.push({
            messageId: message.id,
            channelId: targetChannel.id,
            guildId: interaction.guild.id,
            createdAt: new Date().toISOString()
        });
        
        // Save settings
        fs.writeFileSync(settingsPath, JSON.stringify(settings, null, 2), 'utf8');
        
        // Confirm to the user
        await interaction.reply({ 
            content: `Live dashboard created in ${targetChannel}! The dashboard will automatically update whenever resources are logged.`, 
            ephemeral: true 
        });
    },
};

// Helper function to create progress embed
function createProgressEmbed(targetsData) {
    const embed = new EmbedBuilder()
        .setColor(0x0099FF)
        .setTitle('Resource Collection Progress')
        .setDescription('Current progress towards resource targets')
        .setTimestamp();
    
    // Check if there are any targets
    if (Object.keys(targetsData.resources).length === 0) {
        embed.setDescription('No resource targets have been set yet. Ask an admin to set targets using the /settarget command.');
        return embed;
    }
    
    // Add progress for each resource
    Object.entries(targetsData.resources).forEach(([key, resourceData]) => {
        const progress = targetsData.progress[key] || { current: 0, contributions: [] };
        const percentage = Math.floor((progress.current / resourceData.target) * 100);
        
        // Create progress bar
        const barLength = 15;
        const filledChars = Math.round((percentage / 100) * barLength);
        const progressBar = '█'.repeat(filledChars) + '░'.repeat(barLength - filledChars);
        
        // Get last contributor if any
        let lastContributor = 'No contributions yet';
        
        if (progress.contributions && progress.contributions.length > 0) {
            const lastContribution = progress.contributions[progress.contributions.length - 1];
            const date = new Date(lastContribution.timestamp);
            const timeString = date.toLocaleString();
            
            lastContributor = `Last: ${lastContribution.username} added ${lastContribution.amount} SCU (${timeString})`;
        }
        
        // Capitalize resource and action names
        const resourceName = resourceData.resource.charAt(0).toUpperCase() + resourceData.resource.slice(1);
        const actionName = resourceData.action.charAt(0).toUpperCase() + resourceData.action.slice(1);
        
        embed.addFields({
            name: `${actionName} ${resourceName}`,
            value: `${progressBar} ${progress.current}/${resourceData.target} SCU (${percentage}%)\n${lastContributor}`
        });
    });
    
    return embed;
}

// Export the createProgressEmbed function for use in update handlers
module.exports.createProgressEmbed = createProgressEmbed;