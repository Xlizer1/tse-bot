const { pool } = require("../database");
require("dotenv").config();

/**
 * Critical Database Fixes Migration
 * Run this BEFORE deploying the bot
 */
async function fixDatabaseConstraints() {
  const connection = await pool.getConnection();

  try {
    console.log("🔧 Starting critical database fixes...");
    await connection.beginTransaction();

    // Your primary guild ID - UPDATE THIS!
    const primaryGuildId =
      process.env.DEFAULT_GUILD_ID || "1260629720270245908";
    console.log(`Using primary guild ID: ${primaryGuildId}`);

    // Fix resources table constraints
    console.log("📦 Fixing resources table constraints...");

    try {
      await connection.execute(
        "ALTER TABLE resources DROP INDEX resource_action"
      );
      console.log("✅ Dropped old resource_action index");
    } catch (e) {
      console.log("ℹ️ resource_action index not found (this is ok)");
    }

    try {
      await connection.execute(`
        ALTER TABLE resources 
        ADD UNIQUE KEY resource_guild_action (guild_id, value(50), action_type_id)
      `);
      console.log("✅ Added new resource_guild_action constraint");
    } catch (e) {
      if (e.code === "ER_DUP_KEYNAME") {
        console.log("ℹ️ resource_guild_action constraint already exists");
      } else {
        throw e;
      }
    }

    // Fix targets table constraints
    console.log("🎯 Fixing targets table constraints...");

    try {
      await connection.execute("ALTER TABLE targets DROP INDEX target_key");
      console.log("✅ Dropped old target_key index");
    } catch (e) {
      console.log("ℹ️ target_key index not found (this is ok)");
    }

    try {
      await connection.execute(`
        ALTER TABLE targets 
        ADD UNIQUE KEY target_guild_key (guild_id, action, resource(50))
      `);
      console.log("✅ Added new target_guild_key constraint");
    } catch (e) {
      if (e.code === "ER_DUP_KEYNAME") {
        console.log("ℹ️ target_guild_key constraint already exists");
      } else {
        throw e;
      }
    }

    // Ensure all existing data has proper guild_id
    console.log("🔄 Updating existing data with guild_id...");

    const [resourcesUpdated] = await connection.execute(
      `
      UPDATE resources 
      SET guild_id = ? 
      WHERE guild_id = '' OR guild_id IS NULL
    `,
      [primaryGuildId]
    );

    const [targetsUpdated] = await connection.execute(
      `
      UPDATE targets 
      SET guild_id = ? 
      WHERE guild_id = '' OR guild_id IS NULL
    `,
      [primaryGuildId]
    );

    const [settingsUpdated] = await connection.execute(
      `
      UPDATE settings 
      SET guild_id = ? 
      WHERE guild_id = '' OR guild_id IS NULL
    `,
      [primaryGuildId]
    );

    console.log(`✅ Updated ${resourcesUpdated.affectedRows} resources`);
    console.log(`✅ Updated ${targetsUpdated.affectedRows} targets`);
    console.log(`✅ Updated ${settingsUpdated.affectedRows} settings`);

    // Add performance indexes
    console.log("⚡ Adding performance indexes...");

    const indexes = [
      {
        name: "idx_contributions_guild",
        table: "contributions",
        columns: "(target_id)",
      },
      {
        name: "idx_targets_guild_action",
        table: "targets",
        columns: "(guild_id, action)",
      },
      {
        name: "idx_resources_guild_type",
        table: "resources",
        columns: "(guild_id, action_type_id)",
      },
    ];

    for (const index of indexes) {
      try {
        await connection.execute(`
          CREATE INDEX ${index.name} ON ${index.table} ${index.columns}
        `);
        console.log(`✅ Added index: ${index.name}`);
      } catch (e) {
        if (e.code === "ER_DUP_KEYNAME") {
          console.log(`ℹ️ Index ${index.name} already exists`);
        } else {
          console.warn(`⚠️ Could not create index ${index.name}:`, e.message);
        }
      }
    }

    await connection.commit();
    console.log("🎉 Database fixes completed successfully!");

    // Verify the fixes
    console.log("\n🔍 Verifying fixes...");

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

    console.log(
      `✅ Resources constraint: ${
        resourceConstraints.length > 0 ? "FIXED" : "MISSING"
      }`
    );
    console.log(
      `✅ Targets constraint: ${
        targetConstraints.length > 0 ? "FIXED" : "MISSING"
      }`
    );
  } catch (error) {
    await connection.rollback();
    console.error("💥 Migration failed:", error);
    throw error;
  } finally {
    connection.release();
  }
}

// Run the migration
fixDatabaseConstraints()
  .then(() => {
    console.log(
      "\n🚀 Migration completed successfully! Bot is ready to deploy."
    );
    process.exit(0);
  })
  .catch((error) => {
    console.error("\n💥 Migration failed:", error);
    console.error("\n🛠️ Please check your database connection and try again.");
    process.exit(1);
  });
