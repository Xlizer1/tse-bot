const { setupDatabase } = require("./src/database");

async function initDb() {
  try {
    console.log("Starting database initialization...");
    await setupDatabase();
    console.log("Database initialization complete!");
    process.exit(0);
  } catch (error) {
    console.error("Database initialization failed:", error);
    process.exit(1);
  }
}

initDb();
