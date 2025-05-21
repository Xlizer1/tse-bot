const { pool } = require("../database");

class TargetModel {
  // Get all targets with progress
  static async getAllWithProgress() {
    try {
      const [rows] = await pool.execute(`
        SELECT t.*, p.current_amount, r.name as resource_name, r.emoji as resource_emoji, 
               at.unit, at.display_name as action_display_name, at.emoji as action_emoji
        FROM targets t
        LEFT JOIN progress p ON t.id = p.target_id
        LEFT JOIN action_types at ON at.name = t.action
        LEFT JOIN resources r ON t.resource = r.value AND 
          CASE 
            WHEN t.action = at.name THEN r.action_type_id = (SELECT id FROM action_types WHERE name = t.action) 
            ELSE 1=0
          END
        ORDER BY t.action, t.resource
      `);

      return rows;
    } catch (error) {
      console.error("Error getting targets with progress:", error);
      throw error;
    }
  }

  // Get a specific target by action and resource
  static async getByActionAndResource(action, resource) {
    try {
      const [rows] = await pool.execute(`
        SELECT t.*, p.current_amount, at.unit, at.display_name as action_display_name 
        FROM targets t 
        LEFT JOIN progress p ON t.id = p.target_id
        LEFT JOIN action_types at ON at.name = t.action
        WHERE t.action = ? AND t.resource = ?
      `, [action, resource]);
      
      return rows[0] || null;
    } catch (error) {
      console.error(`Error getting target for ${action} ${resource}:`, error);
      throw error;
    }
  }

  // Get target by ID
  static async getById(id) {
    try {
      const [rows] = await pool.execute(`
        SELECT t.*, p.current_amount, at.unit, at.display_name as action_display_name 
        FROM targets t 
        LEFT JOIN progress p ON t.id = p.target_id
        LEFT JOIN action_types at ON at.name = t.action
        WHERE t.id = ?
      `, [id]);
      
      return rows[0] || null;
    } catch (error) {
      console.error(`Error getting target with ID ${id}:`, error);
      throw error;
    }
  }

  // Create a new target
  static async create(action, resource, targetAmount, createdBy) {
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

      // Create the target
      const [result] = await connection.execute(
        "INSERT INTO targets (action, resource, target_amount, created_by) VALUES (?, ?, ?, ?)",
        [action, resource, targetAmount, createdBy]
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

  // Update target amount
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

  // Delete a target
  static async delete(id) {
    const connection = await pool.getConnection();

    try {
      await connection.beginTransaction();

      // Delete progress (cascade will handle contributions)
      await connection.execute("DELETE FROM progress WHERE target_id = ?", [
        id,
      ]);

      // Delete target
      const [result] = await connection.execute(
        "DELETE FROM targets WHERE id = ?",
        [id]
      );

      await connection.commit();
      return result.affectedRows > 0;
    } catch (error) {
      await connection.rollback();
      console.error(`Error deleting target with ID ${id}:`, error);
      throw error;
    } finally {
      connection.release();
    }
  }

  // Reset progress for a target
  static async resetProgress(id) {
    const connection = await pool.getConnection();

    try {
      await connection.beginTransaction();

      // Delete all contributions for this target
      await connection.execute(
        "DELETE FROM contributions WHERE target_id = ?",
        [id]
      );

      // Reset progress amount
      const [result] = await connection.execute(
        "UPDATE progress SET current_amount = 0 WHERE target_id = ?",
        [id]
      );

      await connection.commit();
      return result.affectedRows > 0;
    } catch (error) {
      await connection.rollback();
      console.error(`Error resetting progress for target ID ${id}:`, error);
      throw error;
    } finally {
      connection.release();
    }
  }

  // Format targets for a dashboard display
  static formatTargetsForDashboard(targets) {
    return targets.map((target) => {
      const current = target.current_amount || 0;
      const percentage = Math.floor((current / target.target_amount) * 100);

      return {
        id: target.id,
        action: target.action,
        actionDisplay: target.action_display_name || target.action,
        resource: target.resource,
        resourceName: target.resource_name || target.resource,
        target: target.target_amount,
        current: current,
        percentage: percentage,
        unit: target.unit || "SCU",
        emoji: target.resource_emoji || target.action_emoji || null
      };
    });
  }
}

module.exports = TargetModel;