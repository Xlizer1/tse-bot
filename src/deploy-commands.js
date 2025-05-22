const fs = require("fs");
const path = require("path");
const { REST } = require("@discordjs/rest");
const { Routes } = require("discord-api-types/v9");
const { setupDatabase } = require("./database");
require("dotenv").config();

// Validate environment variables
const requiredVars = ['TOKEN', 'CLIENT_ID'];
const missingVars = requiredVars.filter(varName => !process.env[varName]);

if (missingVars.length > 0) {
  console.error("❌ Missing required environment variables:");
  missingVars.forEach(varName => console.error(`   - ${varName}`));
  process.exit(1);
}

// Initialize database and deploy commands
async function deployCommands() {
  try {
    console.log("🔧 Setting up database connection...");
    
    // Initialize database
    const dbInitialized = await setupDatabase();
    if (!dbInitialized) {
      console.error("💥 Failed to initialize database. Please check your database connection.");
      process.exit(1);
    }

    console.log("✅ Database initialized successfully.");

    const commands = [];
    const commandFiles = fs
      .readdirSync(path.join(__dirname, "commands"))
      .filter((file) => file.endsWith(".js"));

    console.log(`📁 Found ${commandFiles.length} command files`);

    for (const file of commandFiles) {
      try {
        const command = require(`./commands/${file}`);
        
        if (!command.data) {
          console.warn(`⚠️ Command file ${file} is missing 'data' property, skipping`);
          continue;
        }

        // Convert command data to JSON
        const commandData = command.data.toJSON();
        
        // Validate command name
        if (!commandData.name || commandData.name.length > 32) {
          console.warn(`⚠️ Command ${file} has invalid name, skipping`);
          continue;
        }

        commands.push(commandData);
        console.log(`✅ Loaded command: ${commandData.name}`);
        
      } catch (error) {
        console.error(`❌ Error loading command ${file}:`, error.message);
      }
    }

    // Validate we have commands to deploy
    if (commands.length === 0) {
      console.error("💥 No valid commands found to deploy!");
      process.exit(1);
    }

    console.log(`🚀 Deploying ${commands.length} commands...`);

    const rest = new REST({ version: "9" }).setToken(process.env.TOKEN);

    // Deploy commands globally
    await rest.put(Routes.applicationCommands(process.env.CLIENT_ID), {
      body: commands,
    });

    console.log("🎉 Successfully deployed application commands!");
    
    // Log deployed commands
    console.log("\n📋 Deployed commands:");
    commands.forEach((cmd, index) => {
      console.log(`${index + 1}. /${cmd.name} - ${cmd.description}`);
    });
    
    console.log(`\n✨ Total: ${commands.length} commands deployed`);
    process.exit(0);
    
  } catch (error) {
    console.error("💥 Error deploying commands:", error);
    
    if (error.code === 50035) {
      console.error("🔍 This is likely a validation error. Check your command definitions.");
    } else if (error.code === 401) {
      console.error("🔑 Invalid bot token. Please check your TOKEN environment variable.");
    } else if (error.code === 403) {
      console.error("🚫 Missing permissions. Make sure your bot has the required permissions.");
    }
    
    process.exit(1);
  }
}

// Graceful error handling
process.on('unhandledRejection', (reason, promise) => {
  console.error('💥 Unhandled Rejection at:', promise, 'reason:', reason);
  process.exit(1);
});

process.on('uncaughtException', (error) => {
  console.error('💥 Uncaught Exception:', error);
  process.exit(1);
});

// Start the deployment process
console.log("🎯 Starting command deployment...");
deployCommands();