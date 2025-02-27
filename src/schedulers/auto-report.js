const fs = require('fs');
const path = require('path');
const { EmbedBuilder } = require('discord.js');

// Path to store settings and targets data
const settingsPath = path.join(__dirname, '..', 'data', 'settings.json');
const targetsPath = path.join(__dirname, '..', 'data', 'targets.json');

// Setup auto-reporting system
function setupAutoReporting(client) {
    // Check for settings every minute
    setInterval(() => checkAndSendReport(client), 60 * 1000);
    console.log('Auto-reporting scheduler initialized');
}

async function checkAndSendReport(client) {
    try {
        // Check if settings file exists
        if (!fs.existsSync(settingsPath)) return;
        
        // Load settings
        const settings = JSON.parse(fs.readFileSync(settingsPath, 'utf8'));
        
        // Check if auto-reporting is enabled
        if (!settings.autoReport || !settings.autoReport.enabled) return;
        
        const { channelId, time, guildId, lastReportDate } = settings.autoReport;
        
        // Get current date and time
        const now = new Date();
        const currentTime = `${String(now.getUTCHours()).padStart(2, '0')}:${String(now.getUTCMinutes()).padStart(2, '0')}`;
        const currentDate = now.toISOString().split('T')[0];
        
        // Check if it's time to send the report and we haven't sent one today
        if (currentTime === time && currentDate !== lastReportDate) {
            // Get the guild and channel
            const guild = client.guilds.cache.get(guildId);
            if (!guild) return;
            
            const channel = guild.channels.cache.get(channelId);
            if (!channel) return;
            
            // Generate and send the report
            await sendDailyReport(channel);
            
            // Update last report date
            settings.autoReport.lastReportDate = currentDate;
            fs.writeFileSync(settingsPath, JSON.stringify(settings, null, 2), 'utf8');
        }
    } catch (error) {
        console.error('Error in auto-reporting:', error);
    }
}

async function sendDailyReport(channel) {
    try {
        // Check if targets file exists
        if (!fs.existsSync(targetsPath)) {
            return channel.send('No resource targets have been set yet.');
        }
        
        // Load targets data
        const targetsData = JSON.parse(fs.readFileSync(targetsPath, 'utf8'));
        
        // Create embed for progress report
        const progressEmbed = new EmbedBuilder()
            .setColor(0x0099FF)
            .setTitle('Daily Resource Collection Report')
            .setDescription('Current progress towards collection targets')
            .setTimestamp();
            
        // Check if there are any targets
        if (Object.keys(targetsData.resources).length === 0) {
            progressEmbed.setDescription('No resource targets have been set yet.');
            return channel.send({ embeds: [progressEmbed] });
        }
        
        // Add progress for each resource
        Object.entries(targetsData.resources).forEach(([key, resourceData]) => {
            const progress = targetsData.progress[key] || { current: 0 };
            const percentage = Math.floor((progress.current / resourceData.target) * 100);
            
            // Create progress bar
            const barLength = 20;
            const filledChars = Math.round((percentage / 100) * barLength);
            const progressBar = '█'.repeat(filledChars) + '░'.repeat(barLength - filledChars);
            
            // Capitalize resource name
            const resourceName = resourceData.resource.charAt(0).toUpperCase() + resourceData.resource.slice(1);
            const actionName = resourceData.action.charAt(0).toUpperCase() + resourceData.action.slice(1);
            
            progressEmbed.addFields({
                name: `${actionName} ${resourceName}`,
                value: `${progressBar} ${progress.current}/${resourceData.target} SCU (${percentage}%)`
            });
        });
        
        // Get top contributors for the day
        const today = new Date().toISOString().split('T')[0];
        const userContributions = new Map();
        
        // Process all contributions from today
        Object.entries(targetsData.progress).forEach(([key, progressData]) => {
            if (!progressData.contributions) return;
            
            // Filter today's contributions
            const todayContributions = progressData.contributions.filter(contribution => {
                return contribution.timestamp.startsWith(today);
            });
            
            todayContributions.forEach(contribution => {
                const userId = contribution.userId;
                
                if (!userContributions.has(userId)) {
                    userContributions.set(userId, {
                        username: contribution.username,
                        total: 0
                    });
                }
                
                userContributions.get(userId).total += contribution.amount;
            });
        });
        
        // Add today's top contributors if any
        if (userContributions.size > 0) {
            // Sort and get top 5
            const topContributors = Array.from(userContributions.values())
                .sort((a, b) => b.total - a.total)
                .slice(0, 5);
            
            let contributorsText = '';
            topContributors.forEach((user, index) => {
                contributorsText += `${index + 1}. ${user.username}: ${user.total} SCU\n`;
            });
            
            progressEmbed.addFields({
                name: `Today's Top Contributors`,
                value: contributorsText || 'No contributions today.'
            });
        }
        
        // Send the report
        await channel.send({ embeds: [progressEmbed] });
        
    } catch (error) {
        console.error('Error sending daily report:', error);
        channel.send('An error occurred while generating the daily report.');
    }
}

module.exports = { setupAutoReporting };