const mysql = require("mysql2/promise");
require("dotenv").config();

// Validate required environment variables
const requiredEnvVars = ['DB_HOST', 'DB_USER', 'DB_NAME'];
const missingEnvVars = requiredEnvVars.filter(envVar => !process.env[envVar]);

if (missingEnvVars.length > 0) {
  console.error("❌ Missing required environment variables:");
  missingEnvVars.forEach(envVar => console.error(`   - ${envVar}`));
  console.error("Please check your .env file and ensure all variables are set.");
  process.exit(1);
}

// Create connection pool
const pool = mysql.createPool({
  host: process.env.DB_HOST,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,
  port: parseInt(process.env.DB_PORT) || 3306,
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0,
  charset: "utf8mb4"
});

/**
 * Master Database Setup Script
 * Creates missing tables, adds missing columns, fixes constraints, seeds data
 * Safe to run multiple times - checks existing state before making changes
 */
async function masterDatabaseSetup() {
  const connection = await pool.getConnection();
  
  try {
    console.log("🚀 Starting Master Database Setup...");
    console.log("📊 This script will create missing tables and update existing ones");
    
    // Your primary guild ID
    const primaryGuildId = process.env.DEFAULT_GUILD_ID || '1260629720270245908';
    console.log(`🎯 Using primary guild ID: ${primaryGuildId}\n`);
    
    await connection.beginTransaction();
    
    // Set character encoding
    await connection.execute(`SET NAMES utf8mb4`);
    
    // ===========================================
    // STEP 1: CREATE/UPDATE ACTION_TYPES TABLE
    // ===========================================
    console.log("📋 Step 1: Setting up action_types table...");
    
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
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
    `);
    
    // Insert/update default action types
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
    console.log("✅ Action types table ready");
    
    // ===========================================
    // STEP 2: CREATE/UPDATE RESOURCES TABLE
    // ===========================================
    console.log("\n📦 Step 2: Setting up resources table...");
    
    // Check if table exists
    const [resourceTableExists] = await connection.execute(`
      SELECT COUNT(*) as count 
      FROM information_schema.tables 
      WHERE table_schema = DATABASE() AND table_name = 'resources'
    `);
    
    if (resourceTableExists[0].count === 0) {
      // Create new table with guild_id from the start
      console.log("➕ Creating resources table with multi-guild support...");
      await connection.execute(`
        CREATE TABLE resources (
          id int AUTO_INCREMENT PRIMARY KEY,
          guild_id varchar(100) NOT NULL DEFAULT '${primaryGuildId}',
          name varchar(255) NOT NULL,
          value varchar(100) NOT NULL,
          action_type enum('mining', 'salvage', 'haul') NOT NULL,
          action_type_id int NOT NULL,
          emoji varchar(20) DEFAULT NULL,
          created_at timestamp DEFAULT CURRENT_TIMESTAMP,
          INDEX idx_guild_id (guild_id),
          INDEX idx_action_type_id (action_type_id),
          INDEX idx_resources_guild_type (guild_id, action_type_id),
          UNIQUE KEY resource_guild_action (guild_id, value(50), action_type_id),
          FOREIGN KEY (action_type_id) REFERENCES action_types(id)
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
      `);
    } else {
      console.log("🔄 Updating existing resources table...");
      
      // Check if guild_id column exists
      const [guildIdExists] = await connection.execute(
        "SHOW COLUMNS FROM resources LIKE 'guild_id'"
      );
      
      if (guildIdExists.length === 0) {
        console.log("➕ Adding guild_id column to resources...");
        await connection.execute(`
          ALTER TABLE resources 
          ADD COLUMN guild_id varchar(100) NOT NULL DEFAULT '${primaryGuildId}' AFTER id
        `);
      }
      
      // Check if action_type_id column exists
      const [actionTypeIdExists] = await connection.execute(
        "SHOW COLUMNS FROM resources LIKE 'action_type_id'"
      );
      
      if (actionTypeIdExists.length === 0) {
        console.log("➕ Adding action_type_id column to resources...");
        await connection.execute(`
          ALTER TABLE resources 
          ADD COLUMN action_type_id int NULL AFTER action_type
        `);
        
        // Map existing enum values to action_type_id
        const [actionTypes] = await connection.execute("SELECT id, name FROM action_types");
        const actionTypeMap = new Map();
        actionTypes.forEach(type => {
          actionTypeMap.set(type.name, type.id);
        });
        
        for (const [typeName, typeId] of actionTypeMap.entries()) {
          await connection.execute(
            "UPDATE resources SET action_type_id = ? WHERE action_type = ?",
            [typeId, typeName]
          );
        }
        
        // Make action_type_id NOT NULL
        await connection.execute(`
          ALTER TABLE resources 
          MODIFY COLUMN action_type_id int NOT NULL
        `);
      }
      
      // Update constraints
      try {
        await connection.execute("ALTER TABLE resources DROP INDEX resource_action");
      } catch (e) {
        // Index might not exist
      }
      
      try {
        await connection.execute(`
          ALTER TABLE resources 
          ADD UNIQUE KEY resource_guild_action (guild_id, value(50), action_type_id)
        `);
      } catch (e) {
        if (e.code !== 'ER_DUP_KEYNAME') {
          console.warn("⚠️ Could not add resource constraint:", e.message);
        }
      }
      
      // Add missing indexes
      const indexes = [
        "CREATE INDEX idx_guild_id ON resources (guild_id)",
        "CREATE INDEX idx_action_type_id ON resources (action_type_id)", 
        "CREATE INDEX idx_resources_guild_type ON resources (guild_id, action_type_id)"
      ];
      
      for (const indexSql of indexes) {
        try {
          await connection.execute(indexSql);
        } catch (e) {
          // Index might already exist
        }
      }
    }
    console.log("✅ Resources table ready");
    
    // ===========================================
    // STEP 3: CREATE/UPDATE TARGETS TABLE
    // ===========================================
    console.log("\n🎯 Step 3: Setting up targets table...");
    
    const [targetTableExists] = await connection.execute(`
      SELECT COUNT(*) as count 
      FROM information_schema.tables 
      WHERE table_schema = DATABASE() AND table_name = 'targets'
    `);
    
    if (targetTableExists[0].count === 0) {
      console.log("➕ Creating targets table with multi-guild support...");
      await connection.execute(`
        CREATE TABLE targets (
          id int AUTO_INCREMENT PRIMARY KEY,
          guild_id varchar(100) NOT NULL DEFAULT '${primaryGuildId}',
          action varchar(20) NOT NULL,
          resource varchar(100) NOT NULL,
          target_amount int NOT NULL,
          created_at timestamp DEFAULT CURRENT_TIMESTAMP,
          created_by varchar(100) NOT NULL,
          INDEX idx_guild_id (guild_id),
          INDEX idx_targets_guild_action (guild_id, action),
          UNIQUE KEY target_guild_key (guild_id, action, resource(50))
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
      `);
    } else {
      console.log("🔄 Updating existing targets table...");
      
      const [guildIdExists] = await connection.execute(
        "SHOW COLUMNS FROM targets LIKE 'guild_id'"
      );
      
      if (guildIdExists.length === 0) {
        console.log("➕ Adding guild_id column to targets...");
        await connection.execute(`
          ALTER TABLE targets 
          ADD COLUMN guild_id varchar(100) NOT NULL DEFAULT '${primaryGuildId}' AFTER id
        `);
      }
      
      // Update constraints
      try {
        await connection.execute("ALTER TABLE targets DROP INDEX target_key");
      } catch (e) {
        // Index might not exist
      }
      
      try {
        await connection.execute(`
          ALTER TABLE targets 
          ADD UNIQUE KEY target_guild_key (guild_id, action, resource(50))
        `);
      } catch (e) {
        if (e.code !== 'ER_DUP_KEYNAME') {
          console.warn("⚠️ Could not add target constraint:", e.message);
        }
      }
      
      // Add missing indexes
      const indexes = [
        "CREATE INDEX idx_guild_id ON targets (guild_id)",
        "CREATE INDEX idx_targets_guild_action ON targets (guild_id, action)"
      ];
      
      for (const indexSql of indexes) {
        try {
          await connection.execute(indexSql);
        } catch (e) {
          // Index might already exist
        }
      }
    }
    console.log("✅ Targets table ready");
    
    // ===========================================
    // STEP 4: CREATE/UPDATE CONTRIBUTIONS TABLE
    // ===========================================
    console.log("\n📊 Step 4: Setting up contributions table...");
    
    await connection.execute(`
      CREATE TABLE IF NOT EXISTS contributions (
        id int AUTO_INCREMENT PRIMARY KEY,
        target_id int NOT NULL,
        user_id varchar(100) NOT NULL,
        username varchar(100) NOT NULL,
        amount int NOT NULL,
        location varchar(255) NOT NULL,
        timestamp timestamp DEFAULT CURRENT_TIMESTAMP,
        INDEX idx_target_id (target_id),
        INDEX idx_user_id (user_id),
        INDEX idx_timestamp (timestamp),
        FOREIGN KEY (target_id) REFERENCES targets(id) ON DELETE CASCADE
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
    `);
    console.log("✅ Contributions table ready");
    
    // ===========================================
    // STEP 5: CREATE/UPDATE PROGRESS TABLE
    // ===========================================
    console.log("\n📈 Step 5: Setting up progress table...");
    
    await connection.execute(`
      CREATE TABLE IF NOT EXISTS progress (
        target_id int PRIMARY KEY,
        current_amount int NOT NULL DEFAULT 0,
        last_updated timestamp DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        FOREIGN KEY (target_id) REFERENCES targets(id) ON DELETE CASCADE
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
    `);
    console.log("✅ Progress table ready");
    
    // ===========================================
    // STEP 6: CREATE/UPDATE SETTINGS TABLE
    // ===========================================
    console.log("\n⚙️ Step 6: Setting up settings table...");
    
    const [settingsTableExists] = await connection.execute(`
      SELECT COUNT(*) as count 
      FROM information_schema.tables 
      WHERE table_schema = DATABASE() AND table_name = 'settings'
    `);
    
    if (settingsTableExists[0].count === 0) {
      console.log("➕ Creating settings table with multi-guild support...");
      await connection.execute(`
        CREATE TABLE settings (
          id int AUTO_INCREMENT PRIMARY KEY,
          guild_id varchar(100) NOT NULL DEFAULT '${primaryGuildId}',
          setting_key varchar(100) NOT NULL,
          setting_value JSON NOT NULL,
          last_updated timestamp DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
          UNIQUE KEY setting_guild_key (setting_key, guild_id)
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
      `);
    } else {
      console.log("🔄 Updating existing settings table...");
      
      const [guildIdExists] = await connection.execute(
        "SHOW COLUMNS FROM settings LIKE 'guild_id'"
      );
      
      if (guildIdExists.length === 0) {
        console.log("➕ Adding guild_id column to settings...");
        await connection.execute(`
          ALTER TABLE settings 
          ADD COLUMN guild_id varchar(100) NOT NULL DEFAULT '${primaryGuildId}' AFTER id
        `);
      }
      
      // Update constraints
      try {
        await connection.execute("ALTER TABLE settings DROP INDEX setting_key");
      } catch (e) {
        // Index might not exist
      }
      
      try {
        await connection.execute(`
          ALTER TABLE settings 
          ADD UNIQUE KEY setting_guild_key (setting_key, guild_id)
        `);
      } catch (e) {
        if (e.code !== 'ER_DUP_KEYNAME') {
          console.warn("⚠️ Could not add settings constraint:", e.message);
        }
      }
    }
    console.log("✅ Settings table ready");
    
    // ===========================================
    // STEP 7: CREATE/UPDATE DASHBOARDS TABLE
    // ===========================================
    console.log("\n📱 Step 7: Setting up dashboards table...");
    
    const [dashboardTableExists] = await connection.execute(`
      SELECT COUNT(*) as count 
      FROM information_schema.tables 
      WHERE table_schema = DATABASE() AND table_name = 'dashboards'
    `);
    
    if (dashboardTableExists[0].count === 0) {
      console.log("➕ Creating dashboards table...");
      await connection.execute(`
        CREATE TABLE dashboards (
          id int AUTO_INCREMENT PRIMARY KEY,
          message_id varchar(100) NOT NULL,
          channel_id varchar(100) NOT NULL,
          guild_id varchar(100) NOT NULL,
          source_guild_id varchar(100) DEFAULT NULL,
          created_at timestamp DEFAULT CURRENT_TIMESTAMP,
          INDEX idx_message_id (message_id),
          INDEX idx_channel_id (channel_id),
          INDEX idx_guild_id (guild_id)
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
      `);
    } else {
      console.log("🔄 Updating existing dashboards table...");
      
      const [sourceGuildIdExists] = await connection.execute(
        "SHOW COLUMNS FROM dashboards LIKE 'source_guild_id'"
      );
      
      if (sourceGuildIdExists.length === 0) {
        console.log("➕ Adding source_guild_id column to dashboards...");
        await connection.execute(`
          ALTER TABLE dashboards 
          ADD COLUMN source_guild_id varchar(100) NULL DEFAULT NULL AFTER guild_id
        `);
      }
      
      // Add missing indexes
      const indexes = [
        "CREATE INDEX idx_message_id ON dashboards (message_id)",
        "CREATE INDEX idx_channel_id ON dashboards (channel_id)",
        "CREATE INDEX idx_guild_id ON dashboards (guild_id)"
      ];
      
      for (const indexSql of indexes) {
        try {
          await connection.execute(indexSql);
        } catch (e) {
          // Index might already exist
        }
      }
    }
    console.log("✅ Dashboards table ready");
    
    // ===========================================
    // STEP 8: UPDATE EXISTING DATA
    // ===========================================
    console.log("\n🔄 Step 8: Updating existing data with guild_id...");
    
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
    
    // ===========================================
    // STEP 9: SEED DEFAULT DATA
    // ===========================================
    console.log("\n🌱 Step 9: Seeding default resources...");
    
    // Check if we already have resources
    const [existingResources] = await connection.execute(
      "SELECT COUNT(*) as count FROM resources WHERE guild_id = ?", [primaryGuildId]
    );
    
    if (existingResources[0].count === 0) {
      console.log("➕ Adding default resources...");
      
      // Get action type IDs
      const [actionTypes] = await connection.execute("SELECT id, name FROM action_types");
      const actionTypeMap = new Map();
      actionTypes.forEach(type => {
        actionTypeMap.set(type.name, type.id);
      });

      // Default resources with action type mapping
      const defaultResources = [
        // Mining resources
        { name: "Copper", value: "copper", action: "mining" },
        { name: "Iron", value: "iron", action: "mining" },
        { name: "Gold", value: "gold", action: "mining" },
        { name: "Diamond", value: "diamond", action: "mining" },
        { name: "Quantainium", value: "quantainium", action: "mining" },
        { name: "Titanium", value: "titanium", action: "mining" },
        { name: "Aluminum", value: "aluminum", action: "mining" },
        
        // Salvage resources
        { name: "Recycled Material Composite", value: "rmc", action: "salvage" },
        { name: "Construction Materials", value: "cm", action: "salvage" },
        { name: "Scrap Metal", value: "scrap_metal", action: "salvage" },
        { name: "Ship Parts", value: "ship_parts", action: "salvage" },
        
        // Haul resources
        { name: "Medical Supplies", value: "medical_supplies", action: "haul" },
        { name: "Agricultural Supplies", value: "agricultural_supplies", action: "haul" },
        { name: "Hydrogen", value: "hydrogen", action: "haul" },
        { name: "Chlorine", value: "chlorine", action: "haul" }
      ];

      for (const resource of defaultResources) {
        const actionTypeId = actionTypeMap.get(resource.action);
        if (actionTypeId) {
          try {
            await connection.execute(
              "INSERT IGNORE INTO resources (guild_id, name, value, action_type, action_type_id) VALUES (?, ?, ?, ?, ?)",
              [primaryGuildId, resource.name, resource.value, resource.action, actionTypeId]
            );
          } catch (err) {
            console.warn(`⚠️ Could not insert resource ${resource.name}:`, err.message);
          }
        }
      }
      
      console.log(`✅ Seeded ${defaultResources.length} default resources`);
    } else {
      console.log(`ℹ️ Found ${existingResources[0].count} existing resources, skipping seeding`);
    }
    
    await connection.commit();
    console.log("\n🎉 Master Database Setup completed successfully!");
    
    // ===========================================
    // STEP 10: VERIFICATION
    // ===========================================
    console.log("\n🔍 Step 10: Verifying setup...");
    
    // Check all tables exist
    const [tables] = await connection.execute("SHOW TABLES");
    const tableNames = tables.map(row => Object.values(row)[0]);
    const requiredTables = ['action_types', 'resources', 'targets', 'contributions', 'progress', 'settings', 'dashboards'];
    
    console.log("📋 Table Status:");
    requiredTables.forEach(tableName => {
      const exists = tableNames.includes(tableName);
      console.log(`   ${exists ? '✅' : '❌'} ${tableName}`);
    });
    
    // Check data
    const [actionTypeCount] = await connection.execute("SELECT COUNT(*) as count FROM action_types");
    const [resourceCount] = await connection.execute("SELECT COUNT(*) as count FROM resources WHERE guild_id = ?", [primaryGuildId]);
    const [targetCount] = await connection.execute("SELECT COUNT(*) as count FROM targets WHERE guild_id = ?", [primaryGuildId]);
    
    console.log("\n📊 Data Status:");
    console.log(`   ✅ Action Types: ${actionTypeCount[0].count}`);
    console.log(`   ✅ Resources: ${resourceCount[0].count}`);
    console.log(`   ✅ Targets: ${targetCount[0].count}`);
    
    console.log(`\n🎯 Guild ID: ${primaryGuildId}`);
    console.log("🚀 Database is ready for multi-guild Discord bot deployment!");
    
  } catch (error) {
    await connection.rollback();
    console.error("\n💥 Setup failed:", error);
    throw error;
  } finally {
    connection.release();
  }
}

// Test database connection first
async function testConnection() {
  try {
    const connection = await pool.getConnection();
    console.log("✅ Database connection successful");
    connection.release();
    return true;
  } catch (error) {
    console.error("❌ Database connection failed:", error.message);
    return false;
  }
}

// Run the master setup
async function runSetup() {
  console.log("🎯 TSE Bot - Master Database Setup");
  console.log("===================================");
  
  const connected = await testConnection();
  if (!connected) {
    console.error("💥 Cannot proceed without database connection.");
    process.exit(1);
  }
  
  try {
    await masterDatabaseSetup();
    
    console.log("\n🎉 SUCCESS! Your database is now fully ready!");
    console.log("\n📋 Next Steps:");
    console.log("   1. Deploy commands: node src/deploy-commands.js");
    console.log("   2. Start your bot: node src/index.js");
    console.log("\n🔥 Your Discord bot now supports multiple servers with isolated data!");
    
  } catch (error) {
    console.error("\n💥 Setup failed:", error.message);
    console.error("\n🛠️ Please check the error above and try again.");
  } finally {
    await pool.end();
  }
}

// Handle graceful shutdown
process.on('SIGINT', async () => {
  console.log('\n🛑 Shutting down gracefully...');
  await pool.end();
  process.exit(0);
});

// Run the setup
runSetup();