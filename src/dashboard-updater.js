const fs = require('fs');
const path = require('path');
const { createProgressEmbed } = require('./commands/livedashboard');

// Path to settings and targets data
const settingsPath = path.join(__dirname, 'data', 'settings.json');
const targetsPath = path.join(__dirname, 'data', 'targets.json');

// Update all dashboards when resource data changes
async function updateDashboards(client) {
    try {
        // Check if settings file exists
        if (!fs.existsSync(settingsPath)) {
            // Create a default settings file
            fs.writeFileSync(settingsPath, JSON.stringify({ dashboards: [] }), 'utf8');
            return;
        }
        
        // Load settings with error handling
        let settings;
        try {
            const rawData = fs.readFileSync(settingsPath, 'utf8');
            // Handle empty file case
            if (!rawData || rawData.trim() === '') {
                settings = { dashboards: [] };
                fs.writeFileSync(settingsPath, JSON.stringify(settings), 'utf8');
            } else {
                settings = JSON.parse(rawData);
            }
        } catch (parseError) {
            console.error('Error parsing settings file, creating a new one:', parseError);
            settings = { dashboards: [] };
            fs.writeFileSync(settingsPath, JSON.stringify(settings), 'utf8');
            return;
        }
        
        // Ensure dashboards array exists
        if (!settings.dashboards || !Array.isArray(settings.dashboards)) {
            settings.dashboards = [];
            fs.writeFileSync(settingsPath, JSON.stringify(settings), 'utf8');
            return;
        }
        
        // Check if there are any dashboards
        if (settings.dashboards.length === 0) return;
        
        // Load targets data
        if (!fs.existsSync(targetsPath)) {
            fs.writeFileSync(targetsPath, JSON.stringify({
                resources: {},
                progress: {}
            }), 'utf8');
            return;
        }
        
        // Load targets data with error handling
        let targetsData;
        try {
            const rawTargetsData = fs.readFileSync(targetsPath, 'utf8');
            
            if (!rawTargetsData || rawTargetsData.trim() === '') {
                targetsData = {
                    resources: {},
                    progress: {}
                };
                fs.writeFileSync(targetsPath, JSON.stringify(targetsData), 'utf8');
            } else {
                targetsData = JSON.parse(rawTargetsData);
            }
        } catch (parseError) {
            console.error('Error parsing targets file, creating a new one:', parseError);
            targetsData = {
                resources: {},
                progress: {}
            };
            fs.writeFileSync(targetsPath, JSON.stringify(targetsData), 'utf8');
            return;
        }
        
        // Create updated embed
        const updatedEmbed = createProgressEmbed(targetsData);
        
        // Update each dashboard
        const validDashboards = [];
        
        for (const dashboard of settings.dashboards) {
            const { guildId, channelId, messageId } = dashboard;
            
            try {
                // Get guild
                const guild = client.guilds.cache.get(guildId);
                if (!guild) continue;
                
                // Get channel
                const channel = guild.channels.cache.get(channelId);
                if (!channel) continue;
                
                // Get message
                const message = await channel.messages.fetch(messageId).catch(() => null);
                if (!message) continue;
                
                // Update the message
                await message.edit({ embeds: [updatedEmbed] });
                
                // This dashboard is valid, keep it
                validDashboards.push(dashboard);
            } catch (error) {
                console.error(`Error updating dashboard ${messageId}:`, error);
                // Don't add to validDashboards to remove problematic ones
            }
        }
        
        // Update the settings with only valid dashboards
        if (validDashboards.length !== settings.dashboards.length) {
            settings.dashboards = validDashboards;
            fs.writeFileSync(settingsPath, JSON.stringify(settings, null, 2), 'utf8');
            console.log(`Updated dashboards list, removed ${settings.dashboards.length - validDashboards.length} invalid dashboards`);
        }
    } catch (error) {
        console.error('Error in updateDashboards:', error);
    }
}

// Handle dashboard refresh button
async function handleRefreshDashboard(interaction) {
    try {
        // Ensure targets file exists
        if (!fs.existsSync(targetsPath)) {
            fs.writeFileSync(targetsPath, JSON.stringify({
                resources: {},
                progress: {}
            }), 'utf8');
        }
        
        // Load targets data with error handling
        let targetsData;
        try {
            const rawData = fs.readFileSync(targetsPath, 'utf8');
            
            if (!rawData || rawData.trim() === '') {
                targetsData = {
                    resources: {},
                    progress: {}
                };
                fs.writeFileSync(targetsPath, JSON.stringify(targetsData), 'utf8');
            } else {
                targetsData = JSON.parse(rawData);
            }
        } catch (parseError) {
            console.error('Error parsing targets file:', parseError);
            targetsData = {
                resources: {},
                progress: {}
            };
        }
        
        // Create updated embed
        const updatedEmbed = createProgressEmbed(targetsData);
        
        // Update the message
        await interaction.message.edit({ embeds: [updatedEmbed] });
        
        // Acknowledge the interaction
        await interaction.reply({ 
            content: 'Dashboard refreshed!', 
            ephemeral: true 
        });
    } catch (error) {
        console.error('Error in handleRefreshDashboard:', error);
        await interaction.reply({ 
            content: 'An error occurred while refreshing the dashboard.', 
            ephemeral: true 
        });
    }
}

module.exports = {
    updateDashboards,
    handleRefreshDashboard
};