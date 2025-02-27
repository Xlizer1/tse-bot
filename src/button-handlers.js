const { 
    ModalBuilder, 
    TextInputBuilder, 
    ActionRowBuilder, 
    TextInputStyle, 
    EmbedBuilder, 
    StringSelectMenuBuilder
} = require('discord.js');
const fs = require('fs');
const path = require('path');
const { handleRefreshDashboard, updateDashboards } = require('./dashboard-updater');

// Path to store targets data
const targetsPath = path.join(__dirname, 'data', 'targets.json');

// Handler for button interactions
async function handleButtonInteraction(interaction) {
    // Get the button ID that was clicked
    const buttonId = interaction.customId;
    
    // Handle admin buttons
    if (buttonId.startsWith('admin_')) {
        // Import admin handlers dynamically to avoid circular dependency
        const adminHandlers = require('./admin-handlers');
        await adminHandlers.handleAdminButtonInteraction(interaction);
        return;
    }
    
    switch (buttonId) {
        case 'add_resources':
            await handleAddResourcesButton(interaction);
            break;
        case 'view_progress':
            await handleViewProgressButton(interaction);
            break;
        case 'view_leaderboard':
            await handleViewLeaderboardButton(interaction);
            break;
        case 'view_locations':
            await handleViewLocationsButton(interaction);
            break;
        case 'refresh_dashboard':
            await handleRefreshDashboard(interaction);
            break;
    }
}

// Handle the Log Resource button
async function handleAddResourcesButton(interaction) {
    try {
        // Check if targets file exists
        if (!fs.existsSync(targetsPath)) {
            return interaction.reply({
                content: 'No targets have been set yet. Ask an admin to set targets first.',
                ephemeral: true
            });
        }
        
        // Load data to get available resources
        let targetsData = JSON.parse(fs.readFileSync(targetsPath, 'utf8'));
        
        if (Object.keys(targetsData.resources).length === 0) {
            return interaction.reply({
                content: 'No targets have been set yet. Ask an admin to set targets first.',
                ephemeral: true
            });
        }
        
        // Create a select menu for resource selection
        const selectMenu = new ActionRowBuilder()
            .addComponents(
                new StringSelectMenuBuilder()
                    .setCustomId('resource_select')
                    .setPlaceholder('Select a resource to log')
            );
            
        // Add options for each target
        Object.entries(targetsData.resources).forEach(([key, resource]) => {
            const capitalized = word => word.charAt(0).toUpperCase() + word.slice(1);
            
            selectMenu.components[0].addOptions({
                label: `${capitalized(resource.action)} ${capitalized(resource.resource)}`,
                description: `Target: ${resource.target} SCU`,
                value: key
            });
        });
        
        // Send the selection menu
        await interaction.reply({
            content: 'Please select which resource you want to log:',
            components: [selectMenu],
            ephemeral: true
        });
    } catch (error) {
        console.error('Error in log resource button handler:', error);
        await interaction.reply({
            content: 'An error occurred while processing your request.',
            ephemeral: true
        });
    }
}

// Handle the View Progress button
async function handleViewProgressButton(interaction) {
    try {
        // Execute the progress command
        const progressCommand = interaction.client.commands.get('progress');
        
        if (!progressCommand) {
            return interaction.reply({
                content: 'Error: Progress command not found.',
                ephemeral: true
            });
        }
        
        // Create a mock interaction with no options
        const mockOptions = {
            getString: () => null,
            getInteger: () => null
        };
        
        interaction.options = mockOptions;
        
        // Execute the command
        await progressCommand.execute(interaction);
    } catch (error) {
        console.error('Error in view progress button handler:', error);
        await interaction.reply({
            content: 'An error occurred while processing your request.',
            ephemeral: true
        });
    }
}

// Handle the View Leaderboard button
async function handleViewLeaderboardButton(interaction) {
    try {
        // Execute the leaderboard command
        const leaderboardCommand = interaction.client.commands.get('leaderboard');
        
        if (!leaderboardCommand) {
            return interaction.reply({
                content: 'Error: Leaderboard command not found.',
                ephemeral: true
            });
        }
        
        // Create a mock interaction with no options
        const mockOptions = {
            getString: () => null,
            getInteger: () => null
        };
        
        interaction.options = mockOptions;
        
        // Execute the command
        await leaderboardCommand.execute(interaction);
    } catch (error) {
        console.error('Error in view leaderboard button handler:', error);
        await interaction.reply({
            content: 'An error occurred while processing your request.',
            ephemeral: true
        });
    }
}

// Handle the View Locations button
async function handleViewLocationsButton(interaction) {
    try {
        // Execute the location command
        const locationCommand = interaction.client.commands.get('location');
        
        if (!locationCommand) {
            return interaction.reply({
                content: 'Error: Location command not found.',
                ephemeral: true
            });
        }
        
        // Create a mock interaction with no options
        const mockOptions = {
            getString: () => null
        };
        
        interaction.options = mockOptions;
        
        // Execute the command
        await locationCommand.execute(interaction);
    } catch (error) {
        console.error('Error in view locations button handler:', error);
        await interaction.reply({
            content: 'An error occurred while processing your request.',
            ephemeral: true
        });
    }
}

// Handle select menu interaction for resource selection
async function handleSelectMenuInteraction(interaction) {
    // Handle admin select menus
    if (interaction.customId.startsWith('admin_')) {
        // Import admin handlers dynamically to avoid circular dependency
        const adminHandlers = require('./admin-handlers');
        await adminHandlers.handleAdminSelectMenuInteraction(interaction);
        return;
    }
    
    if (interaction.customId === 'resource_select') {
        const selectedValue = interaction.values[0];
        
        // Parse the key to get action and resource
        const [action, ...resourceParts] = selectedValue.split('_');
        const resource = resourceParts.join('_');
        
        // Create a modal for inputting details
        const modal = new ModalBuilder()
            .setCustomId(`add_modal_${selectedValue}`)
            .setTitle(`Log ${action.charAt(0).toUpperCase() + action.slice(1)} ${resource.charAt(0).toUpperCase() + resource.slice(1)}`);
        
        // Add input fields
        const amountInput = new TextInputBuilder()
            .setCustomId('amount')
            .setLabel('Amount (SCU)')
            .setStyle(TextInputStyle.Short)
            .setPlaceholder('Enter the amount in SCU')
            .setRequired(true);
        
        const locationInput = new TextInputBuilder()
            .setCustomId('location')
            .setLabel('Location')
            .setStyle(TextInputStyle.Short)
            .setPlaceholder('Enter where you delivered or found the resource')
            .setRequired(true);
        
        const row1 = new ActionRowBuilder().addComponents(amountInput);
        const row2 = new ActionRowBuilder().addComponents(locationInput);
        
        modal.addComponents(row1, row2);
        
        // Show the modal
        await interaction.showModal(modal);
    }
}

// Handle modal submit interaction for logging resources
async function handleModalSubmitInteraction(interaction) {
    // Handle admin modals
    if (interaction.customId.startsWith('admin_')) {
        // Import admin handlers dynamically to avoid circular dependency
        const adminHandlers = require('./admin-handlers');
        await adminHandlers.handleAdminModalSubmit(interaction);
        return;
    }
    
    if (interaction.customId.startsWith('add_modal_')) {
        // Extract the resource key from the modal ID
        const resourceKey = interaction.customId.replace('add_modal_', '');
        const [action, ...resourceParts] = resourceKey.split('_');
        const resource = resourceParts.join('_');
        
        // Get the values from the modal
        const amount = parseInt(interaction.fields.getTextInputValue('amount'));
        const location = interaction.fields.getTextInputValue('location');
        
        // Check if amount is valid
        if (isNaN(amount) || amount <= 0) {
            return interaction.reply({
                content: 'Invalid amount. Please enter a positive number.',
                ephemeral: true
            });
        }
        
        try {
            // Load current targets and progress
            if (!fs.existsSync(targetsPath)) {
                return interaction.reply({
                    content: 'No targets have been set yet. Ask an admin to set targets first.',
                    ephemeral: true
                });
            }
            
            let targetsData = JSON.parse(fs.readFileSync(targetsPath, 'utf8'));
            
            // Check if the target exists
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
            await interaction.reply({
                content: `Logged: You ${action}d ${amount} SCU of ${resource} at ${location}\n` +
                       `Progress: ${current}/${target} SCU (${Math.floor((current/target) * 100)}%)`,
                ephemeral: true
            });
            
            // Update all dashboard messages
            await updateDashboards(interaction.client);
        } catch (error) {
            console.error('Error in modal submit handler:', error);
            await interaction.reply({
                content: 'An error occurred while processing your request.',
                ephemeral: true
            });
        }
    }
}

module.exports = {
    handleButtonInteraction,
    handleSelectMenuInteraction,
    handleModalSubmitInteraction
};