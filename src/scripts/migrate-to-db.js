const fs = require("fs");
const path = require("path");
const { setupDatabase, pool } = require("../database");
require("dotenv").config();

const resourcesPath = path.join(__dirname, "..", "data", "resources.json");
const targetsPath = path.join(__dirname, "..", "data", "targets.json");
const settingsPath = path.join(__dirname, "..", "data", "settings.json");

async function migrateResources() {
  if (!fs.existsSync(resourcesPath)) {
    console.log("No resources file found, skipping resource migration");
    return;
  }

  try {
    const resources = JSON.parse(fs.readFileSync(resourcesPath, "utf8"));

    // Process mining resources
    if (resources.mining && Array.isArray(resources.mining)) {
      for (const item of resources.mining) {
        await pool.execute(
          "INSERT IGNORE INTO resources (name, value, action_type) VALUES (?, ?, ?)",
          [item.name, item.value, "mining"]
        );
      }
      console.log(`Migrated ${resources.mining.length} mining resources`);
    }

    // Process salvage resources
    if (resources.salvage && Array.isArray(resources.salvage)) {
      for (const item of resources.salvage) {
        await pool.execute(
          "INSERT IGNORE INTO resources (name, value, action_type) VALUES (?, ?, ?)",
          [item.name, item.value, "salvage"]
        );
      }
      console.log(`Migrated ${resources.salvage.length} salvage resources`);
    }

    // Process haul resources
    if (resources.haul && Array.isArray(resources.haul)) {
      for (const item of resources.haul) {
        await pool.execute(
          "INSERT IGNORE INTO resources (name, value, action_type) VALUES (?, ?, ?)",
          [item.name, item.value, "haul"]
        );
      }
      console.log(`Migrated ${resources.haul.length} haul resources`);
    }

    console.log("Resources migration complete");
  } catch (error) {
    console.error("Error migrating resources:", error);
  }
}

async function migrateTargets() {
  if (!fs.existsSync(targetsPath)) {
    console.log("No targets file found, skipping targets migration");
    return;
  }

  try {
    const targetsData = JSON.parse(fs.readFileSync(targetsPath, "utf8"));
    const targetMap = new Map(); // To map old keys to new IDs

    // Migrate targets
    if (targetsData.resources && typeof targetsData.resources === "object") {
      for (const [key, resource] of Object.entries(targetsData.resources)) {
        // Parse the key to extract action and resource (format: action_resource)
        const [action, ...resourceParts] = key.split("_");
        const resourceValue = resourceParts.join("_");

        // Insert the target
        const [result] = await pool.execute(
          "INSERT INTO targets (action, resource, target_amount, created_by, created_at) VALUES (?, ?, ?, ?, ?)",
          [
            action,
            resourceValue,
            resource.target,
            resource.createdBy || "unknown",
            resource.createdAt || new Date().toISOString(),
          ]
        );

        const targetId = result.insertId;
        targetMap.set(key, targetId);

        // Initialize progress
        const progress = targetsData.progress[key] || { current: 0 };
        await pool.execute(
          "INSERT INTO progress (target_id, current_amount) VALUES (?, ?)",
          [targetId, progress.current || 0]
        );

        // Migrate contributions if any
        if (progress.contributions && Array.isArray(progress.contributions)) {
          for (const contribution of progress.contributions) {
            await pool.execute(
              "INSERT INTO contributions (target_id, user_id, username, amount, location, timestamp) VALUES (?, ?, ?, ?, ?, ?)",
              [
                targetId,
                contribution.userId || "unknown",
                contribution.username || "Unknown User",
                contribution.amount,
                contribution.location || "Unknown Location",
                contribution.timestamp || new Date().toISOString(),
              ]
            );
          }
          console.log(
            `Migrated ${progress.contributions.length} contributions for ${action} ${resourceValue}`
          );
        }
      }

      console.log(
        `Migrated ${Object.keys(targetsData.resources).length} targets`
      );
    }

    console.log("Targets migration complete");
  } catch (error) {
    console.error("Error migrating targets:", error);
  }
}

async function migrateSettings() {
  if (!fs.existsSync(settingsPath)) {
    console.log("No settings file found, skipping settings migration");
    return;
  }

  try {
    const settings = JSON.parse(fs.readFileSync(settingsPath, "utf8"));

    // Migrate dashboards
    if (settings.dashboards && Array.isArray(settings.dashboards)) {
      for (const dashboard of settings.dashboards) {
        await pool.execute(
          "INSERT INTO dashboards (message_id, channel_id, guild_id, created_at) VALUES (?, ?, ?, ?)",
          [
            dashboard.messageId,
            dashboard.channelId,
            dashboard.guildId,
            dashboard.createdAt || new Date().toISOString(),
          ]
        );
      }
      console.log(`Migrated ${settings.dashboards.length} dashboards`);
    }

    // Migrate auto-report settings
    if (settings.autoReport) {
      await pool.execute(
        "INSERT INTO settings (setting_key, setting_value) VALUES (?, ?)",
        ["autoReport", JSON.stringify(settings.autoReport)]
      );
      console.log("Migrated auto-report settings");
    }

    console.log("Settings migration complete");
  } catch (error) {
    console.error("Error migrating settings:", error);
  }
}

async function runMigration() {
  try {
    console.log("Starting database migration...");

    // Initialize database
    await setupDatabase();

    // Run migrations
    await migrateResources();
    await migrateTargets();
    await migrateSettings();

    console.log("Migration completed successfully");

    // Close the database connection
    await pool.end();
    process.exit(0);
  } catch (error) {
    console.error("Migration failed:", error);
    process.exit(1);
  }
}

runMigration();
