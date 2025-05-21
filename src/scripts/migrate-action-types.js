const { pool } = require("../database");
require("dotenv").config();

async function migrateActionTypes() {
  const connection = await pool.getConnection();
  
  try {
    console.log("Starting action types migration...");
    await connection.beginTransaction();
    
    // Create action_types table if it doesn't exist
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
      ) ENGINE=MyISAM DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
    `);
    
    // Insert default action types
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
    
    // Check if action_type_id column already exists
    const [columns] = await connection.execute("SHOW COLUMNS FROM resources LIKE 'action_type_id'");
    
    if (columns.length === 0) {
      // Add action_type_id column
      await connection.execute("ALTER TABLE resources ADD COLUMN action_type_id int");
      
      // Fetch all action types to get their IDs
      const [actionTypes] = await connection.execute("SELECT id, name FROM action_types");
      const actionTypeMap = new Map();
      actionTypes.forEach(type => {
        actionTypeMap.set(type.name, type.id);
      });
      
      // Update action_type_id based on action_type enum value
      for (const [typeName, typeId] of actionTypeMap.entries()) {
        await connection.execute(
          "UPDATE resources SET action_type_id = ? WHERE action_type = ?",
          [typeId, typeName]
        );
      }
      
      // Make action_type_id NOT NULL and add index
      await connection.execute(`
        ALTER TABLE resources 
        MODIFY COLUMN action_type_id int NOT NULL,
        ADD INDEX idx_action_type_id (action_type_id)
      `);
    }
    
    // Update the targets table to use action_types
    // Verify if all current action values match action_types names
    const [actionValues] = await connection.execute(`
      SELECT DISTINCT action FROM targets
    `);
    
    for (const actionRow of actionValues) {
      const action = actionRow.action;
      const [actionExists] = await connection.execute(
        "SELECT COUNT(*) as count FROM action_types WHERE name = ?", 
        [action]
      );
      
      if (actionExists[0].count === 0) {
        // Create missing action type with default values
        await connection.execute(`
          INSERT INTO action_types (name, display_name, unit, emoji)
          VALUES (?, ?, 'SCU', NULL)
        `, [action, action.charAt(0).toUpperCase() + action.slice(1)]);
        
        console.log(`Created missing action type: ${action}`);
      }
    }
    
    await connection.commit();
    console.log("Action types migration complete!");
    
  } catch (error) {
    await connection.rollback();
    console.error("Migration failed:", error);
  } finally {
    connection.release();
  }
}

migrateActionTypes()
  .then(() => {
    console.log("Migration completed successfully");
    process.exit(0);
  })
  .catch((error) => {
    console.error("Migration script error:", error);
    process.exit(1);
  });