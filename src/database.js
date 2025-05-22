const mysql = require("mysql2/promise");
require("dotenv").config();

// Validate required environment variables
const requiredEnvVars = ['DB_HOST', 'DB_USER', 'DB_NAME', 'TOKEN', 'CLIENT_ID'];
const missingEnvVars = requiredEnvVars.filter(envVar => !process.env[envVar]);

if (missingEnvVars.length > 0) {
  console.error("❌ Missing required environment variables:");
  missingEnvVars.forEach(envVar => console.error(`   - ${envVar}`));
  console.error("Please check your .env file and ensure all variables are set.");
  process.exit(1);
}

// Create connection pool with better error handling
console.log({
  host: process.env.DB_HOST,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,
  port: parseInt(process.env.DB_PORT) || 3306,
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0,
  charset: "utf8mb4",
  acquireTimeout: 60000,
  timeout: 60000,
  reconnect: true
})
const pool = mysql.createPool({
  host: process.env.DB_HOST,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,
  port: parseInt(process.env.DB_PORT) || 3306,
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0,
  charset: "utf8mb4",
  acquireTimeout: 60000,
  timeout: 60000,
  reconnect: true
});

// Test database connection with retry logic
async function testConnection(retries = 3) {
  for (let i = 0; i < retries; i++) {
    try {
      const connection = await pool.getConnection();
      console.log("✅ Database connection successful");
      connection.release();
      return true;
    } catch (error) {
      console.error(`❌ Database connection attempt ${i + 1} failed:`, error.message);
      if (i === retries - 1) {
        console.error("💥 All database connection attempts failed. Please check your database configuration.");
        return false;
      }
      // Wait before retrying (exponential backoff)
      await new Promise(resolve => setTimeout(resolve, Math.pow(2, i) * 1000));
    }
  }
  return false;
}

// Initialize database tables with proper constraints
async function initDatabase() {
  try {
    console.log("🔧 Initializing database tables...");
    
    // Set character encoding
    await pool.execute(`SET NAMES utf8mb4`);

    // Create action_types table first (referenced by resources)
    console.log("📋 Creating action_types table...");
    await pool.execute(`
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

    // Insert default action types
    await pool.execute(`
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

    console.log("📦 Creating resources table...");
    await pool.execute(`
      CREATE TABLE IF NOT EXISTS resources (
        id int AUTO_INCREMENT PRIMARY KEY,
        guild_id varchar(100) NOT NULL,
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

    console.log("🎯 Creating targets table...");
    await pool.execute(`
      CREATE TABLE IF NOT EXISTS targets (
        id int AUTO_INCREMENT PRIMARY KEY,
        guild_id varchar(100) NOT NULL,
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

    console.log("📊 Creating contributions table...");
    await pool.execute(`
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
        INDEX idx_contributions_guild (target_id),
        FOREIGN KEY (target_id) REFERENCES targets(id) ON DELETE CASCADE
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
    `);

    console.log("📈 Creating progress table...");
    await pool.execute(`
      CREATE TABLE IF NOT EXISTS progress (
        target_id int PRIMARY KEY,
        current_amount int NOT NULL DEFAULT 0,
        last_updated timestamp DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        FOREIGN KEY (target_id) REFERENCES targets(id) ON DELETE CASCADE
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
    `);

    console.log("⚙️ Creating settings table...");
    await pool.execute(`
      CREATE TABLE IF NOT EXISTS settings (
        id int AUTO_INCREMENT PRIMARY KEY,
        guild_id varchar(100) NOT NULL,
        setting_key varchar(100) NOT NULL,
        setting_value JSON NOT NULL,
        last_updated timestamp DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        UNIQUE KEY setting_guild_key (setting_key, guild_id)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
    `);

    console.log("📱 Creating dashboards table...");
    await pool.execute(`
      CREATE TABLE IF NOT EXISTS dashboards (
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

    console.log("✅ Database tables initialized successfully");
    return true;
  } catch (error) {
    console.error("💥 Error initializing database tables:", error);
    throw error;
  }
}

// Seed default resources with proper guild handling
async function seedDefaultResources() {
  try {
    // Check if we have any resources
    const [rows] = await pool.execute("SELECT COUNT(*) as count FROM resources");
    
    if (rows[0].count > 0) {
      console.log(`ℹ️ Found ${rows[0].count} existing resources, skipping seeding`);
      return;
    }

    console.log("🌱 Seeding default resources...");
    
    // Get action type IDs
    const [actionTypes] = await pool.execute("SELECT id, name FROM action_types");
    const actionTypeMap = new Map();
    actionTypes.forEach(type => {
      actionTypeMap.set(type.name, type.id);
    });

    // Default guild ID - you should update this to match your primary guild
    const defaultGuildId = process.env.DEFAULT_GUILD_ID || '1260629720270245908';

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
          await pool.execute(
            "INSERT IGNORE INTO resources (guild_id, name, value, action_type, action_type_id) VALUES (?, ?, ?, ?, ?)",
            [defaultGuildId, resource.name, resource.value, resource.action, actionTypeId]
          );
        } catch (err) {
          console.warn(`⚠️ Could not insert resource ${resource.name}:`, err.message);
        }
      }
    }

    console.log(`✅ Seeded ${defaultResources.length} default resources`);
  } catch (error) {
    console.error("💥 Error seeding default resources:", error);
  }
}

// Main setup function
async function setupDatabase() {
  try {
    console.log("🚀 Starting database setup...");
    
    const connected = await testConnection();
    if (!connected) {
      return false;
    }
    
    await initDatabase();
    await seedDefaultResources();
    
    console.log("🎉 Database setup completed successfully!");
    return true;
  } catch (error) {
    console.error("💥 Database setup failed:", error);
    return false;
  }
}

// Graceful shutdown
process.on('SIGINT', async () => {
  console.log('🛑 Shutting down gracefully...');
  await pool.end();
  process.exit(0);
});

module.exports = {
  pool,
  setupDatabase,
  testConnection,
};
`
-- Critical Database Fixes Migration
-- Run this BEFORE deploying the bot

-- Fix resources table constraints
ALTER TABLE resources DROP INDEX IF EXISTS resource_action;
ALTER TABLE resources ADD UNIQUE KEY resource_guild_action (guild_id, value(50), action_type_id);

-- Fix targets table constraints  
ALTER TABLE targets DROP INDEX IF EXISTS target_key;
ALTER TABLE targets ADD UNIQUE KEY target_guild_key (guild_id, action, resource(50));

-- Ensure all existing data has proper guild_id (update with your actual guild ID)
UPDATE resources SET guild_id = '1260629720270245908' WHERE guild_id = '' OR guild_id IS NULL;
UPDATE targets SET guild_id = '1260629720270245908' WHERE guild_id = '' OR guild_id IS NULL;
UPDATE settings SET guild_id = '1260629720270245908' WHERE guild_id = '' OR guild_id IS NULL;

-- Add indexes for better performance
CREATE INDEX IF NOT EXISTS idx_contributions_guild ON contributions(target_id);
CREATE INDEX IF NOT EXISTS idx_targets_guild_action ON targets(guild_id, action);
CREATE INDEX IF NOT EXISTS idx_resources_guild_type ON resources(guild_id, action_type_id);
`