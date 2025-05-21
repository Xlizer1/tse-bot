const fs = require("fs");
const path = require("path");
const { REST } = require("@discordjs/rest");
const { Routes } = require("discord-api-types/v9");
const ResourceModel = require("./models/resource");
const { setupDatabase } = require("./database");
require("dotenv").config();

// Initialize database and deploy commands
async function deployCommands() {
  try {
    console.log("Setting up database connection...");
    // Initialize database
    const dbInitialized = await setupDatabase();

    if (!dbInitialized) {
      console.error(
        "Failed to initialize database. Please check your database connection."
      );
      process.exit(1);
    }

    console.log("Database initialized successfully.");

    const commands = [];
    const commandFiles = fs
      .readdirSync(path.join(__dirname, "commands"))
      .filter((file) => file.endsWith(".js"));

    for (const file of commandFiles) {
      const command = require(`./commands/${file}`);

      // Special handling for commands that need dynamic choices
      if (
        file === "report.js" ||
        file === "addresources.js" ||
        file === "quicklog.js"
      ) {
        // Create a deep copy of the command data
        const commandData = JSON.parse(JSON.stringify(command.data.toJSON()));

        // Find the resource option
        const resourceOption = commandData.options.find(
          (option) => option.name === "resource"
        );

        if (resourceOption) {
          // Find the action option
          const actionOption = commandData.options.find(
            (option) => option.name === "action"
          );

          if (actionOption && actionOption.choices) {
            // For each action, add the corresponding resources in separate commands
            for (const actionChoice of actionOption.choices) {
              const actionValue = actionChoice.value;
              const actionType =
                actionValue === "mine"
                  ? "mining"
                  : actionValue === "salvage"
                  ? "salvage"
                  : "haul";

              // Get resources for this action type from database
              const resources = await ResourceModel.getByActionType(actionType);
              const resourceChoices = resources.map((r) => ({
                name: r.name,
                value: r.value,
              }));

              // Add choices to the resource option
              resourceOption.choices = resourceChoices;

              // Create a variant command name - ensure it's lowercase and valid
              // Discord command names must be between 1-32 characters, lowercase, and contain only alphanumeric or underscore
              // Fix: Ensure the variant name is within Discord's limits and properly formatted
              const variantName = `${commandData.name}-${actionValue}`.toLowerCase();
              
              if (variantName.length > 32) {
                console.warn(`Warning: Command name "${variantName}" exceeds 32 characters and will be truncated.`);
              }
              
              // Create a separate command variant for this action
              const variantCommand = {
                ...commandData,
                name: variantName.substring(0, 32), // Ensure name is not too long
                options: [
                  {
                    ...resourceOption,
                    choices: resourceChoices,
                  },
                  ...commandData.options.filter(
                    (opt) => opt.name !== "action" && opt.name !== "resource"
                  ),
                ],
              };

              commands.push(variantCommand);
            }
          }
        }
      } else if (file === "settarget.js") {
        // For settarget, we need to handle it differently since it's admin-only
        const commandData = JSON.parse(JSON.stringify(command.data.toJSON()));

        // Find the resource option
        const resourceOption = commandData.options.find(
          (option) => option.name === "resource"
        );

        if (resourceOption) {
          // Add choices for each action
          const actionOption = commandData.options.find(
            (option) => option.name === "action"
          );

          if (actionOption && actionOption.choices) {
            for (const actionChoice of actionOption.choices) {
              const actionValue = actionChoice.value;
              const actionType =
                actionValue === "mine"
                  ? "mining"
                  : actionValue === "salvage"
                  ? "salvage"
                  : "haul";

              // Get resources for this action type from database
              const resources = await ResourceModel.getByActionType(actionType);
              const resourceChoices = resources.map((r) => ({
                name: r.name,
                value: r.value,
              }));

              if (actionValue === "mine") {
                commandData.options.find((o) => o.name === "resource").choices =
                  resourceChoices;
              } else if (actionValue === "salvage") {
                commandData.options.find((o) => o.name === "resource").choices =
                  resourceChoices;
              } else if (actionValue === "haul") {
                commandData.options.find((o) => o.name === "resource").choices =
                  resourceChoices;
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

    // Debug output to check command names
    console.log("Command names being deployed:");
    commands.forEach((cmd, index) => {
      console.log(`${index}. ${cmd.name}`);
    });

    const rest = new REST({ version: "9" }).setToken(process.env.TOKEN);

    console.log("Started refreshing application (/) commands.");

    await rest.put(Routes.applicationCommands(process.env.CLIENT_ID), {
      body: commands,
    });

    console.log("Successfully reloaded application (/) commands.");
    process.exit(0); // Exit cleanly after deployment
  } catch (error) {
    console.error("Error deploying commands:", error);
    process.exit(1);
  }
}

// Start the deployment process
deployCommands();
