// Updates needed in src/models/target.js

const { pool } = require("../database");

class TargetModel {
  // Update getAllWithProgress to include target's custom unit
  static async getAllWithProgress(guildId = null) {
    try {
      let query = `
        SELECT t.*, p.current_amount, r.name as resource_name, r.emoji as resource_emoji, 
               COALESCE(t.unit, at.unit) as unit, 
               at.display_name as action_display_name, at.emoji as action_emoji
        FROM targets t
        LEFT JOIN progress p ON t.id = p.target_id
        LEFT JOIN action_types at ON at.name = t.action
        LEFT JOIN resources r ON t.resource = r.value AND t.guild_id = r.guild_id AND
          CASE 
            WHEN t.action = at.name THEN r.action_type_id = (SELECT id FROM action_types WHERE name = t.action) 
            ELSE 1=0
          END
      `;

      let params = [];
      query += " WHERE t.guild_id = ?";
      params.push(guildId);
      query += " ORDER BY t.action, t.resource";

      const [rows] = await pool.execute(query, params);
      return rows;
    } catch (error) {
      console.error("Error getting targets with progress:", error);
      throw error;
    }
  }

  // Update getByActionAndResource to include unit
  static async getByActionAndResource(action, resource, guildId = null) {
    try {
      let query = `
        SELECT t.*, p.current_amount, 
               COALESCE(t.unit, at.unit) as unit, 
               at.display_name as action_display_name 
        FROM targets t 
        LEFT JOIN progress p ON t.id = p.target_id
        LEFT JOIN action_types at ON at.name = t.action
        WHERE t.action = ? AND t.resource = ?
      `;

      let params = [action, resource];
      query += " AND t.guild_id = ?";
      params.push(guildId);

      const [rows] = await pool.execute(query, params);
      return rows[0] || null;
    } catch (error) {
      console.error(`Error getting target for ${action} ${resource}:`, error);
      throw error;
    }
  }

  // Update getById to include unit
  static async getById(id) {
    try {
      const [rows] = await pool.execute(
        `
        SELECT t.*, p.current_amount, 
               COALESCE(t.unit, at.unit) as unit, 
               at.display_name as action_display_name 
        FROM targets t 
        LEFT JOIN progress p ON t.id = p.target_id
        LEFT JOIN action_types at ON at.name = t.action
        WHERE t.id = ?
      `,
        [id]
      );

      return rows[0] || null;
    } catch (error) {
      console.error(`Error getting target with ID ${id}:`, error);
      throw error;
    }
  }

  // NEW: Create target with custom unit
  static async createWithUnit(
    action,
    resource,
    targetAmount,
    unit,
    createdBy,
    guildId = null
  ) {
    const connection = await pool.getConnection();

    try {
      await connection.beginTransaction();

      // Verify action exists
      const [actionExists] = await connection.execute(
        "SELECT COUNT(*) as count FROM action_types WHERE name = ?",
        [action]
      );

      if (actionExists[0].count === 0) {
        throw new Error(`Action type "${action}" does not exist`);
      }

      if (!guildId) {
        throw new Error("Guild ID is required for creating targets");
      }

      // Create the target with custom unit
      const [result] = await connection.execute(
        "INSERT INTO targets (guild_id, action, resource, target_amount, unit, created_by) VALUES (?, ?, ?, ?, ?, ?)",
        [guildId, action, resource, targetAmount, unit, createdBy]
      );

      const targetId = result.insertId;

      // Initialize progress
      await connection.execute(
        "INSERT INTO progress (target_id, current_amount) VALUES (?, 0)",
        [targetId]
      );

      await connection.commit();
      return targetId;
    } catch (error) {
      await connection.rollback();
      console.error("Error creating target with unit:", error);
      throw error;
    } finally {
      connection.release();
    }
  }

  // NEW: Update target amount and unit
  static async updateAmountAndUnit(id, newAmount, newUnit) {
    try {
      const [result] = await pool.execute(
        "UPDATE targets SET target_amount = ?, unit = ? WHERE id = ?",
        [newAmount, newUnit, id]
      );
      return result.affectedRows > 0;
    } catch (error) {
      console.error(
        `Error updating target amount and unit for ID ${id}:`,
        error
      );
      throw error;
    }
  }

  // Update existing create method to use action type default unit
  static async create(
    action,
    resource,
    targetAmount,
    createdBy,
    guildId = null
  ) {
    const connection = await pool.getConnection();

    try {
      await connection.beginTransaction();

      // Get action type to use its default unit
      const [actionType] = await connection.execute(
        "SELECT unit FROM action_types WHERE name = ?",
        [action]
      );

      if (actionType.length === 0) {
        throw new Error(`Action type "${action}" does not exist`);
      }

      const defaultUnit = actionType[0].unit;

      if (!guildId) {
        throw new Error("Guild ID is required for creating targets");
      }

      // Create the target with action type's default unit
      const [result] = await connection.execute(
        "INSERT INTO targets (guild_id, action, resource, target_amount, unit, created_by) VALUES (?, ?, ?, ?, ?, ?)",
        [guildId, action, resource, targetAmount, defaultUnit, createdBy]
      );

      const targetId = result.insertId;

      // Initialize progress
      await connection.execute(
        "INSERT INTO progress (target_id, current_amount) VALUES (?, 0)",
        [targetId]
      );

      await connection.commit();
      return targetId;
    } catch (error) {
      await connection.rollback();
      console.error("Error creating target:", error);
      throw error;
    } finally {
      connection.release();
    }
  }

  // Keep existing methods unchanged...
  static async updateAmount(id, newAmount) {
    try {
      const [result] = await pool.execute(
        "UPDATE targets SET target_amount = ? WHERE id = ?",
        [newAmount, id]
      );
      return result.affectedRows > 0;
    } catch (error) {
      console.error(`Error updating target amount for ID ${id}:`, error);
      throw error;
    }
  }

  // ... (other existing methods remain the same)
}

module.exports = TargetModel;
