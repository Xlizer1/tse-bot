const fs = require('fs');
const path = require('path');
const { Client, GatewayIntentBits, Collection } = require('discord.js');
const { handleButtonInteraction, handleSelectMenuInteraction, handleModalSubmitInteraction } = require('./button-handlers');
const { setupAutoReporting } = require('./schedulers/auto-report');
const { updateDashboards } = require('./dashboard-updater');
const { setupDatabase } = require('./database');
require('dotenv').config();

const client = new Client({
    intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMessages,
        GatewayIntentBits.MessageContent,
    ]
});

client.commands = new Collection();
const commandFiles = fs.readdirSync(path.join(__dirname, 'commands')).filter(file => file.endsWith('.js'));

for (const file of commandFiles) {
    const command = require(`./commands/${file}`);
    client.commands.set(command.data.name, command);
}

// Initialize database before starting the bot
async function init() {
    console.log('Initializing database...');
    try {
        await setupDatabase();
        console.log('Database initialization complete');
        
        // Start the bot after database is initialized
        startBot();
    } catch (error) {
        console.error('Database initialization failed:', error);
        process.exit(1);
    }
}

function startBot() {
    client.once('ready', async () => {
        console.log('Bot is ready!');
        
        // Setup auto-reporting
        setupAutoReporting(client);
        
        // Initial dashboard update on startup
        await updateDashboards(client);
        console.log('Dashboards updated on startup');
    });

    client.on('interactionCreate', async interaction => {
        try {
            // Handle different interaction types
            if (interaction.isCommand()) {
                await handleCommandInteraction(interaction);
            } else if (interaction.isButton()) {
                await handleButtonInteraction(interaction);
            } else if (interaction.isStringSelectMenu()) {
                await handleSelectMenuInteraction(interaction);
            } else if (interaction.isModalSubmit()) {
                await handleModalSubmitInteraction(interaction);
            }
        } catch (error) {
            console.error('Error handling interaction:', error);
            
            // Respond to the user if we haven't already
            if (interaction.replied || interaction.deferred) {
                await interaction.followUp({ content: 'There was an error while processing this interaction!', ephemeral: true });
            } else {
                await interaction.reply({ content: 'There was an error while processing this interaction!', ephemeral: true });
            }
        }
    });

    // Handle command interactions
    async function handleCommandInteraction(interaction) {
        const command = client.commands.get(interaction.commandName);

        if (!command) {
            console.error(`Command not found: ${interaction.commandName}`);
            await interaction.reply({ content: 'This command does not exist.', ephemeral: true });
            return;
        }

        try {
            await command.execute(interaction);
        } catch (error) {
            console.error(`Error executing command ${interaction.commandName}:`, error);
            
            // Respond to the user if we haven't already
            if (interaction.replied || interaction.deferred) {
                await interaction.followUp({ content: 'There was an error while executing this command!', ephemeral: true });
            } else {
                await interaction.reply({ content: 'There was an error while executing this command!', ephemeral: true });
            }
        }
    }

    client.login(process.env.TOKEN);
}

// Start initialization
init();