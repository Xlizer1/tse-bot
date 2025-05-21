const fs = require("fs");
const path = require("path");
const {
  Client,
  GatewayIntentBits,
  Collection,
  MessageFlags,
} = require("discord.js");
const {
  handleButtonInteraction,
  handleSelectMenuInteraction,
  handleModalSubmitInteraction,
} = require("./button-handlers");
const { setupAutoReporting } = require("./schedulers/auto-report");
const { updateDashboards } = require("./dashboard-updater");
const { setupDatabase, pool } = require("./database");
require("dotenv").config();

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent,
  ],
});

client.db = pool;
client.commands = new Collection();
const commandFiles = fs
  .readdirSync(path.join(__dirname, "commands"))
  .filter((file) => file.endsWith(".js"));

for (const file of commandFiles) {
  const command = require(`./commands/${file}`);
  client.commands.set(command.data.name, command);
}

// Initialize database before starting the bot
async function init() {
  console.log("Initializing database...");
  try {
    await setupDatabase();
    console.log("Database initialization complete");

    // Add direct database access
    client.db = pool.promise();
    
    // Start the bot after database is initialized
    startBot();
  } catch (error) {
    console.error("Database initialization failed:", error);
    process.exit(1);
  }
}

function startBot() {
  client.once("ready", async () => {
    console.log("Bot is ready!");

    // Setup auto-reporting
    setupAutoReporting(client);

    // Initial dashboard update on startup
    await updateDashboards(client);
    console.log("Dashboards updated on startup");
  });

  client.on("interactionCreate", async (interaction) => {
    try {
      // Store guild ID for this interaction
      const guildId = interactionContext.getGuildId(interaction);

      // Handle different interaction types
      if (interaction.isCommand()) {
        await handleCommandInteraction(interaction, guildId);
      } else if (interaction.isButton()) {
        await handleButtonInteraction(interaction, guildId);
      } else if (interaction.isStringSelectMenu()) {
        await handleSelectMenuInteraction(interaction, guildId);
      } else if (interaction.isModalSubmit()) {
        await handleModalSubmitInteraction(interaction, guildId);
      } else if (interaction.isAutocomplete()) {
        await handleAutocompleteInteraction(interaction, guildId);
      }
    } catch (error) {
      console.error("Error handling interaction:", error);

      // Respond to the user if we haven't already
      if (interaction.replied || interaction.deferred) {
        await interaction.followUp({
          content: "There was an error while processing this interaction!",
          flags: MessageFlags.Ephemeral,
        });
      } else {
        await interaction.reply({
          content: "There was an error while processing this interaction!",
          flags: MessageFlags.Ephemeral,
        });
      }
    }
  });

  // Handle command interactions
  async function handleCommandInteraction(interaction, guildId) {
    const command = client.commands.get(interaction.commandName);

    if (!command) {
      console.error(`Command not found: ${interaction.commandName}`);
      await interaction.reply({
        content: "This command does not exist.",
        flags: MessageFlags.Ephemeral,
      });
      return;
    }

    try {
      await command.execute(interaction, guildId);
    } catch (error) {
      console.error(
        `Error executing command ${interaction.commandName}:`,
        error
      );

      // Respond to the user if we haven't already
      if (interaction.replied || interaction.deferred) {
        await interaction.followUp({
          content: "There was an error while executing this command!",
          flags: MessageFlags.Ephemeral,
        });
      } else {
        await interaction.reply({
          content: "There was an error while executing this command!",
          flags: MessageFlags.Ephemeral,
        });
      }
    }
  }

  async function handleAutocompleteInteraction(interaction, guildId) {
    const command = client.commands.get(interaction.commandName);

    if (!command || !command.autocomplete) return;

    try {
      await command.autocomplete(interaction, guildId);
    } catch (error) {
      console.error(
        `Error handling autocomplete for ${interaction.commandName}:`,
        error
      );
    }
  }

  client.login(process.env.TOKEN);
}

// Start initialization
init();
