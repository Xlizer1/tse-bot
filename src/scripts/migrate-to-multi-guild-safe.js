const { pool } = require("../database");
require("dotenv").config();

/**
 * Safely migrate database schema to support multiple guilds
 * This script adds guild_id columns to existing tables and updates indexes
 * with checks to prevent errors if columns already exist
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
    
    const defaultGuildId = existingGuild && existingGuild.length > 0 
      ? existingGuild[0].guild_id 
      : '1260629720270245908'; // Default guild ID
    
    console.log(`Using default guild ID: ${defaultGuildId}`);
    
    // Modify resources table
    console.log("Checking resources table...");
    const [resourceColumns] = await connection.execute(
      "SHOW COLUMNS FROM resources LIKE 'guild_id'"
    );
    
    if (resourceColumns.length === 0) {
      console.log("Adding guild_id to resources table...");
      await connection.execute(`
        ALTER TABLE resources 
        ADD COLUMN guild_id varchar(100) NOT NULL DEFAULT '${defaultGuildId}' AFTER id
      `);
      
      // Check if index exists before creating
      const [resourceIndexes] = await connection.execute(
        "SHOW INDEX FROM resources WHERE Key_name = 'idx_guild_id'"
      );
      
      if (resourceIndexes.length === 0) {
        console.log("Adding index on guild_id in resources table...");
        await connection.execute(`
          ALTER TABLE resources 
          ADD INDEX idx_guild_id (guild_id)
        `);
      }
      
      // Check unique constraint
      const [resourceKeys] = await connection.execute(
        "SHOW INDEX FROM resources WHERE Key_name = 'resource_guild_action'"
      );
      
      if (resourceKeys.length === 0) {
        console.log("Updating unique constraints on resources table...");
        try {
          await connection.execute(`
            ALTER TABLE resources 
            DROP INDEX resource_action
          `);
        } catch (e) {
          console.log("resource_action index not found, continuing...");
        }
        
        await connection.execute(`
          ALTER TABLE resources 
          ADD UNIQUE KEY resource_guild_action (guild_id, value(50), action_type)
        `);
      }
    } else {
      console.log("guild_id column already exists in resources table");
    }
    
    // Modify targets table
    console.log("Checking targets table...");
    const [targetColumns] = await connection.execute(
      "SHOW COLUMNS FROM targets LIKE 'guild_id'"
    );
    
    if (targetColumns.length === 0) {
      console.log("Adding guild_id to targets table...");
      await connection.execute(`
        ALTER TABLE targets 
        ADD COLUMN guild_id varchar(100) NOT NULL DEFAULT '${defaultGuildId}' AFTER id
      `);
      
      // Check if index exists before creating
      const [targetIndexes] = await connection.execute(
        "SHOW INDEX FROM targets WHERE Key_name = 'idx_guild_id'"
      );
      
      if (targetIndexes.length === 0) {
        console.log("Adding index on guild_id in targets table...");
        await connection.execute(`
          ALTER TABLE targets 
          ADD INDEX idx_guild_id (guild_id)
        `);
      }
      
      // Check unique constraint
      const [targetKeys] = await connection.execute(
        "SHOW INDEX FROM targets WHERE Key_name = 'target_guild_key'"
      );
      
      if (targetKeys.length === 0) {
        console.log("Updating unique constraints on targets table...");
        try {
          await connection.execute(`
            ALTER TABLE targets 
            DROP INDEX target_key
          `);
        } catch (e) {
          console.log("target_key index not found, continuing...");
        }
        
        await connection.execute(`
          ALTER TABLE targets 
          ADD UNIQUE KEY target_guild_key (guild_id, action, resource(50))
        `);
      }
    } else {
      console.log("guild_id column already exists in targets table");
    }
    
    // Modify settings table
    console.log("Checking settings table...");
    const [settingColumns] = await connection.execute(
      "SHOW COLUMNS FROM settings LIKE 'guild_id'"
    );
    
    if (settingColumns.length === 0) {
      console.log("Adding guild_id to settings table...");
      await connection.execute(`
        ALTER TABLE settings 
        ADD COLUMN guild_id varchar(100) NOT NULL DEFAULT '${defaultGuildId}' AFTER id
      `);
      
      // Check unique constraint
      const [settingKeys] = await connection.execute(
        "SHOW INDEX FROM settings WHERE Key_name = 'setting_guild_key'"
      );
      
      if (settingKeys.length === 0) {
        console.log("Updating unique constraints on settings table...");
        try {
          await connection.execute(`
            ALTER TABLE settings 
            DROP INDEX setting_key
          `);
        } catch (e) {
          console.log("setting_key index not found, continuing...");
        }
        
        await connection.execute(`
          ALTER TABLE settings 
          ADD UNIQUE KEY setting_guild_key (setting_key, guild_id)
        `);
      }
    } else {
      console.log("guild_id column already exists in settings table");
    }
    
    // Add source_guild_id column to dashboards for shared dashboards
    console.log("Checking dashboards table...");
    const [dashboardColumns] = await connection.execute(
      "SHOW COLUMNS FROM dashboards LIKE 'source_guild_id'"
    );
    
    if (dashboardColumns.length === 0) {
      console.log("Adding source_guild_id to dashboards table...");
      await connection.execute(`
        ALTER TABLE dashboards 
        ADD COLUMN source_guild_id varchar(100) NULL DEFAULT NULL AFTER guild_id
      `);
    } else {
      console.log("source_guild_id column already exists in dashboards table");
    }
    
    // Check for any potential missing action_types table
    console.log("Checking action_types table...");
    let actionTypesTableExists = false;
    
    try {
      const [tableCheck] = await connection.execute(
        "SHOW TABLES LIKE 'action_types'"
      );
      actionTypesTableExists = tableCheck.length > 0;
    } catch (e) {
      console.log("Error checking for action_types table:", e.message);
    }
    
    if (!actionTypesTableExists) {
      console.log("Creating action_types table...");
      await connection.execute(`
        CREATE TABLE IF NOT EXISTS action_types (
          id int NOT NULL AUTO_INCREMENT,
          name varchar(50) NOT NULL,
          display_name varchar(100) NOT NULL,
          unit varchar(50) NOT NULL DEFAULT 'SCU',
          emoji varchar(20) DEFAULT NULL,
          created_at timestamp NULL DEFAULT CURRENT_TIMESTAMP,
          PRIMARY KEY (id),
          UNIQUE KEY unique_action_name (name)
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
      `);
      
      // Insert default action types
      console.log("Adding default action types...");
      await connection.execute(`
        INSERT INTO action_types (name, display_name, unit, emoji)
        VALUES 
          ('mining', 'Mining', 'SCU', '⛏️'),
          ('salvage', 'Salvage', 'SCU', '🏭'),
          ('haul', 'Hauling', 'SCU', '🚚'),
          ('earn', 'Earning', 'aUEC', '💰')
        ON DUPLICATE KEY UPDATE 
          display_name = VALUES(display_name),
          unit = VALUES(unit),
          emoji = VALUES(emoji);
      `);
    }
    
    // Modify resources schema to use action_type_id if needed
    console.log("Checking resource columns for action_type_id...");
    const [resourceActionColumn] = await connection.execute(
      "SHOW COLUMNS FROM resources LIKE 'action_type_id'"
    );
    
    if (resourceActionColumn.length === 0) {
      console.log("Adding action_type_id to resources...");
      await connection.execute(`
        ALTER TABLE resources 
        ADD COLUMN action_type_id int NULL AFTER action_type
      `);
      
      // Map existing action_type values to new action_type_id
      console.log("Mapping action_type to action_type_id...");
      const [actionTypes] = await connection.execute("SELECT id, name FROM action_types");
      const actionTypeMap = new Map();
      
      actionTypes.forEach(type => {
        actionTypeMap.set(type.name, type.id);
      });
      
      // Update all resources
      for (const [typeName, typeId] of actionTypeMap.entries()) {
        await connection.execute(
          "UPDATE resources SET action_type_id = ? WHERE action_type = ?",
          [typeId, typeName]
        );
        console.log(`Updated resources with action_type ${typeName} to action_type_id ${typeId}`);
      }
    } else {
      console.log("action_type_id column already exists in resources");
    }
    
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