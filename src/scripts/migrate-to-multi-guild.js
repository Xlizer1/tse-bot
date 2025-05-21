const { pool } = require("../database");
require("dotenv").config();

/**
 * Migrate database schema to support multiple guilds
 * This script adds guild_id columns to existing tables and updates indexes
 */
async function migrateToMultiGuild() {
  const connection = await pool.getConnection();

  try {
    console.log("Starting multi-guild migration...");
    await connection.beginTransaction();

    // Default guild ID from any existing dashboard or use a placeholder
    const [existingGuild] = await connection.execute(
      "SELECT guild_id FROM dashboards LIMIT 1"
    );

    const defaultGuildId =
      existingGuild && existingGuild.length > 0
        ? existingGuild[0].guild_id
        : "1260629720270245908"; // Default guild ID

    console.log(`Using default guild ID: ${defaultGuildId}`);

    // Modify resources table
    console.log("Updating resources table...");
    await connection.execute(`
      ALTER TABLE resources 
      ADD COLUMN guild_id varchar(100) NOT NULL DEFAULT '${defaultGuildId}' AFTER id
    `);

    // Create index on guild_id
    await connection.execute(`
      ALTER TABLE resources 
      ADD INDEX idx_guild_id (guild_id)
    `);

    // Update unique constraint
    await connection.execute(`
      ALTER TABLE resources 
      DROP INDEX resource_action
    `);

    await connection.execute(`
      ALTER TABLE resources 
      ADD UNIQUE KEY resource_guild_action (guild_id, value(50), action_type)
    `);

    // Modify targets table
    console.log("Updating targets table...");
    await connection.execute(`
      ALTER TABLE targets 
      ADD COLUMN guild_id varchar(100) NOT NULL DEFAULT '${defaultGuildId}' AFTER id
    `);

    // Create index on guild_id
    await connection.execute(`
      ALTER TABLE targets 
      ADD INDEX idx_guild_id (guild_id)
    `);

    // Update unique constraint
    await connection.execute(`
      ALTER TABLE targets 
      DROP INDEX target_key
    `);

    await connection.execute(`
      ALTER TABLE targets 
      ADD UNIQUE KEY target_guild_key (guild_id, action, resource(50))
    `);

    // Modify settings table
    console.log("Updating settings table...");
    await connection.execute(`
      ALTER TABLE settings 
      ADD COLUMN guild_id varchar(100) NOT NULL DEFAULT '${defaultGuildId}' AFTER id
    `);

    // Update unique constraint
    await connection.execute(`
      ALTER TABLE settings 
      DROP INDEX setting_key
    `);

    await connection.execute(`
      ALTER TABLE settings 
      ADD UNIQUE KEY setting_guild_key (setting_key, guild_id)
    `);

    // Add source_guild_id column to dashboards for shared dashboards
    console.log("Updating dashboards table...");
    await connection.execute(`
      ALTER TABLE dashboards 
      ADD COLUMN source_guild_id varchar(100) NULL DEFAULT NULL AFTER guild_id
    `);

    await connection.commit();
    console.log("Multi-guild migration complete!");
  } catch (error) {
    await connection.rollback();
    console.error("Migration failed:", error);
  } finally {
    connection.release();
  }
}

migrateToMultiGuild()
  .then(() => {
    console.log("Migration completed successfully");
    process.exit(0);
  })
  .catch((error) => {
    console.error("Migration script error:", error);
    process.exit(1);
  });
