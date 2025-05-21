const { pool } = require("../database");
require("dotenv").config();

/**
 * Test script to verify multi-guild functionality
 * This script tests creating resources and targets for different guilds
 */
async function testMultiGuildFunctionality() {
  console.log("Testing multi-guild functionality...");
  
  // Test guild IDs (example values)
  const guild1 = "1260629720270245908"; // Test original guild -- TSE
  const guild2 = "1096701753329721425"; // Your second guild -- Bot Factory
  
  try {
    // Direct database connection for testing
    const db = pool.promise();
    
    // 1. Test creating resources for different guilds
    console.log("\n--- Testing resource creation ---");
    
    console.log("Creating test resource for Guild 1...");
    await db.execute(`
      INSERT IGNORE INTO resources 
      (guild_id, name, value, action_type, action_type_id)
      VALUES (?, 'Test Mineral', 'test_mineral', 'mining', 
        (SELECT id FROM action_types WHERE name = 'mining'))
    `, [guild1]);
    
    console.log("Creating test resource for Guild 2...");
    await db.execute(`
      INSERT IGNORE INTO resources 
      (guild_id, name, value, action_type, action_type_id)
      VALUES (?, 'Test Mineral', 'test_mineral', 'mining', 
        (SELECT id FROM action_types WHERE name = 'mining'))
    `, [guild2]);
    
    // 2. Test querying resources by guild
    console.log("\n--- Testing resource querying by guild ---");
    
    const [guild1Resources] = await db.execute(`
      SELECT * FROM resources WHERE guild_id = ? AND value = 'test_mineral'
    `, [guild1]);
    
    const [guild2Resources] = await db.execute(`
      SELECT * FROM resources WHERE guild_id = ? AND value = 'test_mineral'
    `, [guild2]);
    
    console.log(`Found ${guild1Resources.length} matching resources in Guild 1`);
    console.log(`Found ${guild2Resources.length} matching resources in Guild 2`);
    
    // 3. Test creating targets for different guilds
    console.log("\n--- Testing target creation ---");
    
    console.log("Creating test target for Guild 1...");
    const [guild1Target] = await db.execute(`
      INSERT IGNORE INTO targets 
      (guild_id, action, resource, target_amount, created_by)
      VALUES (?, 'mine', 'test_mineral', 100, 'test_script')
    `, [guild1]);
    
    console.log("Creating test target for Guild 2...");
    const [guild2Target] = await db.execute(`
      INSERT IGNORE INTO targets 
      (guild_id, action, resource, target_amount, created_by)
      VALUES (?, 'mine', 'test_mineral', 200, 'test_script')
    `, [guild2]);
    
    let guild1TargetId = null;
    let guild2TargetId = null;
    
    if (guild1Target.insertId) {
      guild1TargetId = guild1Target.insertId;
      console.log(`Created target ID ${guild1TargetId} for Guild 1`);
      
      // Initialize progress
      await db.execute(`
        INSERT IGNORE INTO progress (target_id, current_amount) VALUES (?, 0)
      `, [guild1TargetId]);
    }
    
    if (guild2Target.insertId) {
      guild2TargetId = guild2Target.insertId;
      console.log(`Created target ID ${guild2TargetId} for Guild 2`);
      
      // Initialize progress
      await db.execute(`
        INSERT IGNORE INTO progress (target_id, current_amount) VALUES (?, 0)
      `, [guild2TargetId]);
    }
    
    // 4. Test querying targets by guild
    console.log("\n--- Testing target querying by guild ---");
    
    const [guild1Targets] = await db.execute(`
      SELECT t.*, p.current_amount 
      FROM targets t 
      LEFT JOIN progress p ON t.id = p.target_id
      WHERE t.guild_id = ? AND t.resource = 'test_mineral'
    `, [guild1]);
    
    const [guild2Targets] = await db.execute(`
      SELECT t.*, p.current_amount 
      FROM targets t 
      LEFT JOIN progress p ON t.id = p.target_id
      WHERE t.guild_id = ? AND t.resource = 'test_mineral'
    `, [guild2]);
    
    console.log(`Found ${guild1Targets.length} test targets in Guild 1`);
    if (guild1Targets.length > 0) {
      console.log(`- Target amount: ${guild1Targets[0].target_amount}`);
    }
    
    console.log(`Found ${guild2Targets.length} test targets in Guild 2`);
    if (guild2Targets.length > 0) {
      console.log(`- Target amount: ${guild2Targets[0].target_amount}`);
    }
    
    console.log("\nTest completed successfully!");
  } catch (error) {
    console.error("Test failed:", error);
  } finally {
    pool.end();
  }
}

testMultiGuildFunctionality();