const { pool } = require("../database");
require("dotenv").config();

/**
 * Complete Database Migration - Adds guild_id columns and fixes constraints
 * Run this BEFORE deploying the bot with multi-guild support
 */
async function completeDatabaseMigration() {
  const connection = await pool.getConnection();
  
  try {
    console.log("🚀 Starting complete database migration...");
    await connection.beginTransaction();
    
    // Your primary guild ID - UPDATE THIS!
    const primaryGuildId = process.env.DEFAULT_GUILD_ID || '1260629720270245908';
    console.log(`Using primary guild ID: ${primaryGuildId}`);
    
    // Step 1: Add guild_id columns to all tables
    console.log("\n📋 Step 1: Adding guild_id columns...");
    
    // Check and add guild_id to resources table
    console.log("📦 Checking resources table...");
    const [resourceColumns] = await connection.execute(
      "SHOW COLUMNS FROM resources LIKE 'guild_id'"
    );
    
    if (resourceColumns.length === 0) {
      console.log("➕ Adding guild_id column to resources table...");
      await connection.execute(`
        ALTER TABLE resources 
        ADD COLUMN guild_id varchar(100) NOT NULL DEFAULT '${primaryGuildId}' AFTER id
      `);
      console.log("✅ Added guild_id to resources");
    } else {
      console.log("ℹ️ guild_id column already exists in resources");
    }
    
    // Check and add guild_id to targets table
    console.log("🎯 Checking targets table...");
    const [targetColumns] = await connection.execute(
      "SHOW COLUMNS FROM targets LIKE 'guild_id'"
    );
    
    if (targetColumns.length === 0) {
      console.log("➕ Adding guild_id column to targets table...");
      await connection.execute(`
        ALTER TABLE targets 
        ADD COLUMN guild_id varchar(100) NOT NULL DEFAULT '${primaryGuildId}' AFTER id
      `);
      console.log("✅ Added guild_id to targets");
    } else {
      console.log("ℹ️ guild_id column already exists in targets");
    }
    
    // Check and add guild_id to settings table
    console.log("⚙️ Checking settings table...");
    const [settingColumns] = await connection.execute(
      "SHOW COLUMNS FROM settings LIKE 'guild_id'"
    );
    
    if (settingColumns.length === 0) {
      console.log("➕ Adding guild_id column to settings table...");
      await connection.execute(`
        ALTER TABLE settings 
        ADD COLUMN guild_id varchar(100) NOT NULL DEFAULT '${primaryGuildId}' AFTER id
      `);
      console.log("✅ Added guild_id to settings");
    } else {
      console.log("ℹ️ guild_id column already exists in settings");
    }
    
    // Check and add source_guild_id to dashboards table
    console.log("📱 Checking dashboards table...");
    const [dashboardColumns] = await connection.execute(
      "SHOW COLUMNS FROM dashboards LIKE 'source_guild_id'"
    );
    
    if (dashboardColumns.length === 0) {
      console.log("➕ Adding source_guild_id column to dashboards table...");
      await connection.execute(`
        ALTER TABLE dashboards 
        ADD COLUMN source_guild_id varchar(100) NULL DEFAULT NULL AFTER guild_id
      `);
      console.log("✅ Added source_guild_id to dashboards");
    } else {
      console.log("ℹ️ source_guild_id column already exists in dashboards");
    }
    
    // Step 2: Ensure existing data has proper guild_id
    console.log("\n🔄 Step 2: Updating existing data with guild_id...");
    
    const [resourcesUpdated] = await connection.execute(`
      UPDATE resources 
      SET guild_id = ? 
      WHERE guild_id = '' OR guild_id IS NULL OR guild_id = 'undefined'
    `, [primaryGuildId]);
    
    const [targetsUpdated] = await connection.execute(`
      UPDATE targets 
      SET guild_id = ? 
      WHERE guild_id = '' OR guild_id IS NULL OR guild_id = 'undefined'
    `, [primaryGuildId]);
    
    const [settingsUpdated] = await connection.execute(`
      UPDATE settings 
      SET guild_id = ? 
      WHERE guild_id = '' OR guild_id IS NULL OR guild_id = 'undefined'
    `, [primaryGuildId]);
    
    console.log(`✅ Updated ${resourcesUpdated.affectedRows} resources with guild_id`);
    console.log(`✅ Updated ${targetsUpdated.affectedRows} targets with guild_id`);
    console.log(`✅ Updated ${settingsUpdated.affectedRows} settings with guild_id`);
    
    // Step 3: Fix database constraints
    console.log("\n🔧 Step 3: Fixing database constraints...");
    
    // Fix resources table constraints
    console.log("📦 Fixing resources table constraints...");
    
    // Drop old constraint if it exists
    try {
      await connection.execute("ALTER TABLE resources DROP INDEX resource_action");
      console.log("✅ Dropped old resource_action index");
    } catch (e) {
      console.log("ℹ️ resource_action index not found (this is ok)");
    }
    
    // Add new constraint
    try {
      await connection.execute(`
        ALTER TABLE resources 
        ADD UNIQUE KEY resource_guild_action (guild_id, value(50), action_type_id)
      `);
      console.log("✅ Added new resource_guild_action constraint");
    } catch (e) {
      if (e.code === 'ER_DUP_KEYNAME') {
        console.log("ℹ️ resource_guild_action constraint already exists");
      } else {
        console.warn("⚠️ Could not add resource constraint:", e.message);
      }
    }
    
    // Fix targets table constraints
    console.log("🎯 Fixing targets table constraints...");
    
    // Drop old constraint if it exists
    try {
      await connection.execute("ALTER TABLE targets DROP INDEX target_key");
      console.log("✅ Dropped old target_key index");
    } catch (e) {
      console.log("ℹ️ target_key index not found (this is ok)");
    }
    
    // Add new constraint
    try {
      await connection.execute(`
        ALTER TABLE targets 
        ADD UNIQUE KEY target_guild_key (guild_id, action, resource(50))
      `);
      console.log("✅ Added new target_guild_key constraint");
    } catch (e) {
      if (e.code === 'ER_DUP_KEYNAME') {
        console.log("ℹ️ target_guild_key constraint already exists");
      } else {
        console.warn("⚠️ Could not add target constraint:", e.message);
      }
    }
    
    // Fix settings table constraints
    console.log("⚙️ Fixing settings table constraints...");
    
    // Drop old constraint if it exists
    try {
      await connection.execute("ALTER TABLE settings DROP INDEX setting_key");
      console.log("✅ Dropped old setting_key index");
    } catch (e) {
      console.log("ℹ️ setting_key index not found (this is ok)");
    }
    
    // Add new constraint
    try {
      await connection.execute(`
        ALTER TABLE settings 
        ADD UNIQUE KEY setting_guild_key (setting_key, guild_id)
      `);
      console.log("✅ Added new setting_guild_key constraint");
    } catch (e) {
      if (e.code === 'ER_DUP_KEYNAME') {
        console.log("ℹ️ setting_guild_key constraint already exists");
      } else {
        console.warn("⚠️ Could not add setting constraint:", e.message);
      }
    }
    
    // Step 4: Add performance indexes
    console.log("\n⚡ Step 4: Adding performance indexes...");
    
    const indexes = [
      {
        name: "idx_guild_id_resources",
        table: "resources",
        columns: "(guild_id)"
      },
      {
        name: "idx_guild_id_targets", 
        table: "targets",
        columns: "(guild_id)"
      },
      {
        name: "idx_targets_guild_action",
        table: "targets", 
        columns: "(guild_id, action)"
      },
      {
        name: "idx_resources_guild_type",
        table: "resources", 
        columns: "(guild_id, action_type_id)"
      }
    ];
    
    for (const index of indexes) {
      try {
        await connection.execute(`
          CREATE INDEX ${index.name} ON ${index.table} ${index.columns}
        `);
        console.log(`✅ Added index: ${index.name}`);
      } catch (e) {
        if (e.code === 'ER_DUP_KEYNAME') {
          console.log(`ℹ️ Index ${index.name} already exists`);
        } else {
          console.warn(`⚠️ Could not create index ${index.name}:`, e.message);
        }
      }
    }
    
    await connection.commit();
    console.log("\n🎉 Database migration completed successfully!");
    
    // Step 5: Verify the migration
    console.log("\n🔍 Step 5: Verifying migration...");
    
    // Check columns exist
    const [resGuildCol] = await connection.execute(
      "SHOW COLUMNS FROM resources LIKE 'guild_id'"
    );
    const [targGuildCol] = await connection.execute(
      "SHOW COLUMNS FROM targets LIKE 'guild_id'"
    );
    const [setGuildCol] = await connection.execute(
      "SHOW COLUMNS FROM settings LIKE 'guild_id'"
    );
    
    console.log(`✅ Resources guild_id column: ${resGuildCol.length > 0 ? 'EXISTS' : 'MISSING'}`);
    console.log(`✅ Targets guild_id column: ${targGuildCol.length > 0 ? 'EXISTS' : 'MISSING'}`);
    console.log(`✅ Settings guild_id column: ${setGuildCol.length > 0 ? 'EXISTS' : 'MISSING'}`);
    
    // Check constraints exist
    const [resourceConstraints] = await connection.execute(`
      SELECT CONSTRAINT_NAME 
      FROM information_schema.KEY_COLUMN_USAGE 
      WHERE TABLE_NAME = 'resources' 
      AND TABLE_SCHEMA = DATABASE()
      AND CONSTRAINT_NAME = 'resource_guild_action'
    `);
    
    const [targetConstraints] = await connection.execute(`
      SELECT CONSTRAINT_NAME 
      FROM information_schema.KEY_COLUMN_USAGE 
      WHERE TABLE_NAME = 'targets' 
      AND TABLE_SCHEMA = DATABASE()
      AND CONSTRAINT_NAME = 'target_guild_key'
    `);
    
    console.log(`✅ Resources constraint: ${resourceConstraints.length > 0 ? 'FIXED' : 'MISSING'}`);
    console.log(`✅ Targets constraint: ${targetConstraints.length > 0 ? 'FIXED' : 'MISSING'}`);
    
    // Check data
    const [resourceCount] = await connection.execute(
      `SELECT COUNT(*) as count FROM resources WHERE guild_id = ?`, [primaryGuildId]
    );
    const [targetCount] = await connection.execute(
      `SELECT COUNT(*) as count FROM targets WHERE guild_id = ?`, [primaryGuildId]
    );
    
    console.log(`✅ Resources with guild_id: ${resourceCount[0].count}`);
    console.log(`✅ Targets with guild_id: ${targetCount[0].count}`);
    
    console.log("\n🚀 Migration verification complete!");
    
  } catch (error) {
    await connection.rollback();
    console.error("\n💥 Migration failed:", error);
    throw error;
  } finally {
    connection.release();
  }
}

// Run the migration
completeDatabaseMigration()
  .then(() => {
    console.log("\n🎉 SUCCESS! Database is now ready for multi-guild deployment!");
    console.log("📋 Next steps:");
    console.log("   1. Deploy your commands: node src/deploy-commands.js");
    console.log("   2. Start your bot: node src/index.js");
    process.exit(0);
  })
  .catch((error) => {
    console.error("\n💥 Migration failed:", error);
    console.error("\n🛠️ Please check the error above and try again.");
    console.error("💡 Make sure your database connection is working and you have proper permissions.");
    process.exit(1);
  });