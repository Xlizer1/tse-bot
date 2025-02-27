const fs = require('fs');
const path = require('path');
const { REST } = require('@discordjs/rest');
const { Routes } = require('discord-api-types/v9');
require('dotenv').config();

// Path to store resource definitions
const resourcesPath = path.join(__dirname, 'data', 'resources.json');

// Ensure resources file exists
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
    
    // Create data directory if it doesn't exist
    const dataDir = path.join(__dirname, 'data');
    if (!fs.existsSync(dataDir)) {
        fs.mkdirSync(dataDir, { recursive: true });
    }
    
    fs.writeFileSync(resourcesPath, JSON.stringify(defaultResources, null, 2), 'utf8');
}

// Load resources
const resources = JSON.parse(fs.readFileSync(resourcesPath, 'utf8'));

const commands = [];
const commandFiles = fs.readdirSync(path.join(__dirname, 'commands')).filter(file => file.endsWith('.js'));

for (const file of commandFiles) {
    const command = require(`./commands/${file}`);
    
    // Special handling for commands that need dynamic choices
    if (file === 'report.js' || file === 'addresources.js' || file === 'quicklog.js') {
        // Create a deep copy of the command data
        const commandData = JSON.parse(JSON.stringify(command.data.toJSON()));
        
        // Find the resource option
        const resourceOption = commandData.options.find(option => option.name === 'resource');
        
        if (resourceOption) {
            // Add choices based on the action option
            const actionOption = commandData.options.find(option => option.name === 'action');
            
            if (actionOption && actionOption.choices) {
                // For each action, add the corresponding resources in separate commands
                for (const actionChoice of actionOption.choices) {
                    const actionValue = actionChoice.value;
                    const resourceChoices = resources[actionValue === 'mine' ? 'mining' : 
                                                   actionValue === 'salvage' ? 'salvage' : 
                                                   'haul'] || [];
                    
                    // Add choices to the resource option
                    resourceOption.choices = resourceChoices;
                    
                    // Create a separate command variant for this action
                    const variantCommand = {
                        ...commandData,
                        name: `${commandData.name}_${actionValue}`,
                        options: [
                            {
                                ...resourceOption,
                                choices: resourceChoices
                            },
                            ...commandData.options.filter(opt => opt.name !== 'action' && opt.name !== 'resource')
                        ]
                    };
                    
                    commands.push(variantCommand);
                }
            }
        }
    } else if (file === 'settarget.js') {
        // For settarget, we need to handle it differently since it's admin-only
        const commandData = JSON.parse(JSON.stringify(command.data.toJSON()));
        
        // Find the resource option
        const resourceOption = commandData.options.find(option => option.name === 'resource');
        
        if (resourceOption) {
            // Add choices for each action
            const actionOption = commandData.options.find(option => option.name === 'action');
            
            if (actionOption && actionOption.choices) {
                for (const actionChoice of actionOption.choices) {
                    const actionValue = actionChoice.value;
                    const resourceChoices = resources[actionValue === 'mine' ? 'mining' : 
                                                   actionValue === 'salvage' ? 'salvage' : 
                                                   'haul'] || [];
                    
                    if (actionValue === 'mine') {
                        commandData.options.find(o => o.name === 'resource').choices = resourceChoices;
                    } else if (actionValue === 'salvage') {
                        commandData.options.find(o => o.name === 'resource').choices = resourceChoices;
                    } else if (actionValue === 'haul') {
                        commandData.options.find(o => o.name === 'resource').choices = resourceChoices;
                    }
                }
            }
        }
        
        commands.push(commandData);
    } else {
        // Regular command, just add it
        commands.push(command.data.toJSON());
    }
}

const rest = new REST({ version: '9' }).setToken(process.env.TOKEN);

(async () => {
    try {
        console.log('Started refreshing application (/) commands.');

        await rest.put(
            Routes.applicationCommands(process.env.CLIENT_ID),
            { body: commands },
        );

        console.log('Successfully reloaded application (/) commands.');
    } catch (error) {
        console.error(error);
    }
})();