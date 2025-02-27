const mysql = require("mysql2/promise");
require("dotenv").config();

// Create connection pool
const pool = mysql.createPool({
  host: process.env.DB_HOST,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,
  port: process.env.DB_PORT || 3306,
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0,
  charset: 'utf8mb4'
});

// Test database connection
async function testConnection() {
  try {
    const connection = await pool.getConnection();
    console.log("Database connection successful");
    connection.release();
    return true;
  } catch (error) {
    console.error("Database connection failed:", error);
    return false;
  }
}

// Initialize database tables if they don't exist
async function initDatabase() {
  try {
    // Set character encoding to help with key length issues
    await pool.execute(`SET NAMES utf8mb4`);
    
    console.log("Creating resources table...");
    await pool.execute(`
        CREATE TABLE IF NOT EXISTS resources (
          id INT AUTO_INCREMENT PRIMARY KEY,
          name VARCHAR(255) NOT NULL,
          value VARCHAR(100) NOT NULL,
          action_type ENUM('mining', 'salvage', 'haul') NOT NULL,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          UNIQUE KEY resource_action (value(50), action_type)
        )
      `);

    console.log("Creating targets table...");
    await pool.execute(`
        CREATE TABLE IF NOT EXISTS targets (
          id INT AUTO_INCREMENT PRIMARY KEY,
          action VARCHAR(20) NOT NULL,
          resource VARCHAR(100) NOT NULL,
          target_amount INT NOT NULL,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          created_by VARCHAR(100) NOT NULL,
          UNIQUE KEY target_key (action, resource(50))
        )
      `);

    console.log("Creating contributions table...");
    await pool.execute(`
        CREATE TABLE IF NOT EXISTS contributions (
          id INT AUTO_INCREMENT PRIMARY KEY,
          target_id INT NOT NULL,
          user_id VARCHAR(100) NOT NULL,
          username VARCHAR(100) NOT NULL,
          amount INT NOT NULL,
          location VARCHAR(255) NOT NULL,
          timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          INDEX idx_target_id (target_id),
          INDEX idx_user_id (user_id),
          INDEX idx_timestamp (timestamp),
          FOREIGN KEY (target_id) REFERENCES targets(id) ON DELETE CASCADE
        )
      `);

    console.log("Creating progress table...");
    await pool.execute(`
        CREATE TABLE IF NOT EXISTS progress (
          target_id INT PRIMARY KEY,
          current_amount INT NOT NULL DEFAULT 0,
          last_updated TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
          FOREIGN KEY (target_id) REFERENCES targets(id) ON DELETE CASCADE
        )
      `);

    console.log("Creating settings table...");
    await pool.execute(`
        CREATE TABLE IF NOT EXISTS settings (
          id INT AUTO_INCREMENT PRIMARY KEY,
          setting_key VARCHAR(100) NOT NULL UNIQUE,
          setting_value JSON NOT NULL,
          last_updated TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
        )
      `);

    console.log("Creating dashboards table...");
    await pool.execute(`
        CREATE TABLE IF NOT EXISTS dashboards (
          id INT AUTO_INCREMENT PRIMARY KEY,
          message_id VARCHAR(100) NOT NULL,
          channel_id VARCHAR(100) NOT NULL,
          guild_id VARCHAR(100) NOT NULL,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          INDEX idx_message_id (message_id),
          INDEX idx_channel_id (channel_id)
        )
      `);

    console.log("Database tables initialized successfully");
    return true;
  } catch (error) {
    console.error("Error initializing database tables:", error);
    throw error; // rethrow to make sure the startup process knows there was an error
  }
}

// Default resources
async function seedDefaultResources() {
  try {
    // Check if resources table exists before counting
    const [tableExists] = await pool.execute(
      `SELECT COUNT(*) as count FROM information_schema.tables 
       WHERE table_schema = ? AND table_name = 'resources'`, 
      [process.env.DB_NAME]
    );
    
    if (tableExists[0].count === 0) {
      console.log("Resources table doesn't exist yet, skipping seeding");
      return;
    }
    
    const [rows] = await pool.execute(
      "SELECT COUNT(*) as count FROM resources"
    );

    if (rows[0].count === 0) {
      // Mining resources
      const miningResources = [
        ["Copper", "copper", "mining"],
        ["Iron", "iron", "mining"],
        ["Gold", "gold", "mining"],
        ["Diamond", "diamond", "mining"],
        ["Quantainium", "quantainium", "mining"],
        ["Titanium", "titanium", "mining"],
        ["Aluminum", "aluminum", "mining"],
      ];

      // Salvage resources
      const salvageResources = [
        ["Recycled Material Composite", "rmc", "salvage"],
        ["Construction Materials", "cm", "salvage"],
        ["Scrap Metal", "scrap_metal", "salvage"],
        ["Ship Parts", "ship_parts", "salvage"],
      ];

      // Haul resources
      const haulResources = [
        ["Iron", "iron", "haul"],
        ["Copper", "copper", "haul"],
        ["Medical Supplies", "medical_supplies", "haul"],
        ["Agricultural Supplies", "agricultural_supplies", "haul"],
        ["Titanium", "titanium", "haul"],
        ["Hydrogen", "hydrogen", "haul"],
        ["Chlorine", "chlorine", "haul"],
      ];

      const allResources = [
        ...miningResources,
        ...salvageResources,
        ...haulResources,
      ];

      console.log(`Seeding ${allResources.length} default resources...`);
      
      for (const [name, value, action_type] of allResources) {
        try {
          await pool.execute(
            "INSERT IGNORE INTO resources (name, value, action_type) VALUES (?, ?, ?)",
            [name, value, action_type]
          );
        } catch (err) {
          console.error(`Error inserting resource ${name}:`, err);
        }
      }

      console.log("Default resources seeded successfully");
    } else {
      console.log(`Found ${rows[0].count} existing resources, skipping seeding`);
    }
  } catch (error) {
    console.error("Error seeding default resources:", error);
  }
}

// Initialize all database components
async function setupDatabase() {
  try {
    const connected = await testConnection();
    if (connected) {
      await initDatabase();
      await seedDefaultResources();
      return true;
    }
    return false;
  } catch (error) {
    console.error("Database setup failed:", error);
    return false;
  }
}

module.exports = {
  pool,
  setupDatabase,
  testConnection,
};