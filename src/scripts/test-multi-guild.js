const { pool } = require("../database");
require("dotenv").config();

/**
 * Enhanced test script to verify multi-guild functionality
 * This script tests creating resources and targets for different guilds
 */
async function testMultiGuildFunctionality() {
  console.log("Testing multi-guild functionality...");
  
  // Test guild IDs
  const guild1 = "1260629720270245908"; // TSE Guild
  const guild2 = "1096701753329721425"; // Test Guild
  
  try {
    console.log(`\n=== TESTING GUILD SEPARATION ===`);
    console.log(`Guild 1: ${guild1} (TSE)`);
    console.log(`Guild 2: ${guild2} (Test)`);
    
    // 1. Test current data distribution
    console.log("\n--- Current Data Distribution ---");
    
    const [guild1Resources] = await pool.execute(`
      SELECT COUNT(*) as count FROM resources WHERE guild_id = ?
    `, [guild1]);
    
    const [guild2Resources] = await pool.execute(`
      SELECT COUNT(*) as count FROM resources WHERE guild_id = ?
    `, [guild2]);
    
    const [guild1Targets] = await pool.execute(`
      SELECT COUNT(*) as count FROM targets WHERE guild_id = ?
    `, [guild1]);
    
    const [guild2Targets] = await pool.execute(`
      SELECT COUNT(*) as count FROM targets WHERE guild_id = ?
    `, [guild2]);
    
    console.log(`Guild 1 Resources: ${guild1Resources[0].count}`);
    console.log(`Guild 2 Resources: ${guild2Resources[0].count}`);
    console.log(`Guild 1 Targets: ${guild1Targets[0].count}`);
    console.log(`Guild 2 Targets: ${guild2Targets[0].count}`);
    
    // 2. Create test resources for Guild 2
    console.log("\n--- Creating Test Resources for Guild 2 ---");
    
    // Get action type IDs
    const [actionTypes] = await pool.execute("SELECT id, name FROM action_types");
    const actionTypeMap = new Map();
    actionTypes.forEach(type => {
      actionTypeMap.set(type.name, type.id);
    });
    
    const testResources = [
      { name: "Test Copper", value: "test_copper", action: "mining" },
      { name: "Test Salvage Material", value: "test_salvage", action: "salvage" },
      { name: "Test Cargo", value: "test_cargo", action: "haul" }
    ];
    
    for (const resource of testResources) {
      const actionTypeId = actionTypeMap.get(resource.action);
      
      await pool.execute(`
        INSERT IGNORE INTO resources 
        (guild_id, name, value, action_type, action_type_id)
        VALUES (?, ?, ?, ?, ?)
      `, [guild2, resource.name, resource.value, resource.action, actionTypeId]);
      
      console.log(`Created: ${resource.name} for Guild 2`);
    }
    
    // 3. Create test targets for Guild 2
    console.log("\n--- Creating Test Targets for Guild 2 ---");
    
    const testTargets = [
      { action: "mine", resource: "test_copper", amount: 100 },
      { action: "salvage", resource: "test_salvage", amount: 200 },
      { action: "haul", resource: "test_cargo", amount: 300 }
    ];
    
    for (const target of testTargets) {
      const [result] = await pool.execute(`
        INSERT IGNORE INTO targets 
        (guild_id, action, resource, target_amount, created_by)
        VALUES (?, ?, ?, ?, 'test_script')
      `, [guild2, target.action, target.resource, target.amount]);
      
      if (result.insertId) {
        // Initialize progress
        await pool.execute(`
          INSERT IGNORE INTO progress (target_id, current_amount) VALUES (?, 0)
        `, [result.insertId]);
        
        console.log(`Created target: ${target.action} ${target.resource} (${target.amount}) for Guild 2`);
      }
    }
    
    // 4. Test guild separation queries
    console.log("\n--- Testing Guild Separation Queries ---");
    
    // Test resources by guild
    const [g1Res] = await pool.execute(`
      SELECT r.name, r.value, at.name as action_name
      FROM resources r
      JOIN action_types at ON r.action_type_id = at.id
      WHERE r.guild_id = ?
      ORDER BY at.name, r.name
    `, [guild1]);
    
    const [g2Res] = await pool.execute(`
      SELECT r.name, r.value, at.name as action_name
      FROM resources r
      JOIN action_types at ON r.action_type_id = at.id
      WHERE r.guild_id = ?
      ORDER BY at.name, r.name
    `, [guild2]);
    
    console.log(`\nGuild 1 Resources (${g1Res.length}):`);
    g1Res.slice(0, 3).forEach(r => {
      console.log(`  - ${r.name} (${r.action_name})`);
    });
    if (g1Res.length > 3) console.log(`  ... and ${g1Res.length - 3} more`);
    
    console.log(`\nGuild 2 Resources (${g2Res.length}):`);
    g2Res.forEach(r => {
      console.log(`  - ${r.name} (${r.action_name})`);
    });
    
    // Test targets by guild
    const [g1Targ] = await pool.execute(`
      SELECT t.action, t.resource, t.target_amount, p.current_amount
      FROM targets t
      LEFT JOIN progress p ON t.id = p.target_id
      WHERE t.guild_id = ?
      ORDER BY t.action, t.resource
    `, [guild1]);
    
    const [g2Targ] = await pool.execute(`
      SELECT t.action, t.resource, t.target_amount, p.current_amount
      FROM targets t
      LEFT JOIN progress p ON t.id = p.target_id
      WHERE t.guild_id = ?
      ORDER BY t.action, t.resource
    `, [guild2]);
    
    console.log(`\nGuild 1 Targets (${g1Targ.length}):`);
    g1Targ.slice(0, 3).forEach(t => {
      console.log(`  - ${t.action} ${t.resource}: ${t.current_amount || 0}/${t.target_amount}`);
    });
    if (g1Targ.length > 3) console.log(`  ... and ${g1Targ.length - 3} more`);
    
    console.log(`\nGuild 2 Targets (${g2Targ.length}):`);
    g2Targ.forEach(t => {
      console.log(`  - ${t.action} ${t.resource}: ${t.current_amount || 0}/${t.target_amount}`);
    });
    
    // 5. Test cross-guild queries (should return nothing)
    console.log("\n--- Testing Cross-Guild Isolation ---");
    
    const [crossCheck1] = await pool.execute(`
      SELECT COUNT(*) as count
      FROM targets t
      WHERE t.guild_id = ? AND t.resource = 'test_copper'
    `, [guild1]);
    
    const [crossCheck2] = await pool.execute(`
      SELECT COUNT(*) as count  
      FROM targets t
      WHERE t.guild_id = ? AND t.resource = 'rmc'
    `, [guild2]);
    
    console.log(`Guild 1 should NOT have test_copper: ${crossCheck1[0].count === 0 ? '✓ PASS' : '✗ FAIL'}`);
    console.log(`Guild 2 should NOT have rmc: ${crossCheck2[0].count === 0 ? '✓ PASS' : '✗ FAIL'}`);
    
    // 6. Test model methods with guild filtering
    console.log("\n--- Testing Model Methods ---");
    
    // Import models
    const ResourceModel = require("../models/resource");
    const TargetModel = require("../models/target");
    
    const guild1ResourcesViaModel = await ResourceModel.getAll(guild1);
    const guild2ResourcesViaModel = await ResourceModel.getAll(guild2);
    
    const guild1TargetsViaModel = await TargetModel.getAllWithProgress(guild1);
    const guild2TargetsViaModel = await TargetModel.getAllWithProgress(guild2);
    
    console.log(`ResourceModel.getAll(guild1): ${guild1ResourcesViaModel.length} resources`);
    console.log(`ResourceModel.getAll(guild2): ${guild2ResourcesViaModel.length} resources`);
    console.log(`TargetModel.getAllWithProgress(guild1): ${guild1TargetsViaModel.length} targets`);
    console.log(`TargetModel.getAllWithProgress(guild2): ${guild2TargetsViaModel.length} targets`);
    
    // Test specific resource lookup
    const testResourceGuild1 = await ResourceModel.getByValueAndType("test_copper", "mining", guild1);
    const testResourceGuild2 = await ResourceModel.getByValueAndType("test_copper", "mining", guild2);
    
    console.log(`test_copper in Guild 1: ${testResourceGuild1 ? 'Found (BAD!)' : 'Not found (GOOD!)'}`);
    console.log(`test_copper in Guild 2: ${testResourceGuild2 ? 'Found (GOOD!)' : 'Not found (BAD!)'}`);
    
    // Test target lookup
    const testTargetGuild1 = await TargetModel.getByActionAndResource("mine", "test_copper", guild1);
    const testTargetGuild2 = await TargetModel.getByActionAndResource("mine", "test_copper", guild2);
    
    console.log(`mine test_copper target in Guild 1: ${testTargetGuild1 ? 'Found (BAD!)' : 'Not found (GOOD!)'}`);
    console.log(`mine test_copper target in Guild 2: ${testTargetGuild2 ? 'Found (GOOD!)' : 'Not found (BAD!)'}`);
    
    console.log("\n=== TEST SUMMARY ===");
    
    const allChecks = [
      crossCheck1[0].count === 0,
      crossCheck2[0].count === 0,
      !testResourceGuild1 && testResourceGuild2,
      !testTargetGuild1 && testTargetGuild2
    ];
    
    const passedChecks = allChecks.filter(check => check).length;
    
    if (passedChecks === allChecks.length) {
      console.log("🎉 ALL TESTS PASSED! Multi-guild functionality is working correctly.");
    } else {
      console.log(`⚠️  ${passedChecks}/${allChecks.length} tests passed. Some issues need to be addressed.`);
    }
    
    console.log("\n--- Commands that need guild ID updates ---");
    console.log("1. Update all commands to pass guildId parameter to model methods");
    console.log("2. Update progress.js to filter by guildId");
    console.log("3. Update leaderboard.js to filter by guildId"); 
    console.log("4. Update location.js to filter by guildId");
    console.log("5. Update resources.js to filter by guildId");
    console.log("6. Update settarget.js to use guildId");
    console.log("7. Update dashboard-updater.js to be guild-aware");
    console.log("8. Update admin-handlers.js to use guildId");
    
  } catch (error) {
    console.error("Test failed:", error);
  } finally {
    await pool.end();
  }
}

// Run the test
testMultiGuildFunctionality().then(() => {
  console.log("\nTest completed!");
}).catch(error => {
  console.error("Test script error:", error);
});