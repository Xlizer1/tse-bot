const { pool } = require("../database");

class ActionTypeModel {
  // Get all action types
  static async getAll() {
    try {
      const [rows] = await pool.execute(
        "SELECT * FROM action_types ORDER BY display_name"
      );
      return rows;
    } catch (error) {
      console.error("Error getting action types:", error);
      throw error;
    }
  }

  // Get action type by ID
  static async getById(id) {
    try {
      const [rows] = await pool.execute(
        "SELECT * FROM action_types WHERE id = ?",
        [id]
      );
      return rows[0] || null;
    } catch (error) {
      console.error(`Error getting action type with ID ${id}:`, error);
      throw error;
    }
  }

  // Get action type by name
  static async getByName(name) {
    try {
      const [rows] = await pool.execute(
        "SELECT * FROM action_types WHERE name = ?",
        [name]
      );
      return rows[0] || null;
    } catch (error) {
      console.error(`Error getting action type with name ${name}:`, error);
      throw error;
    }
  }

  // Add a new action type
  static async add(name, displayName, unit, emoji = null) {
    try {
      const [result] = await pool.execute(
        "INSERT INTO action_types (name, display_name, unit, emoji) VALUES (?, ?, ?, ?)",
        [name, displayName, unit, emoji]
      );
      return result.insertId;
    } catch (error) {
      console.error("Error adding action type:", error);
      throw error;
    }
  }

  // Update an action type
  static async update(id, data) {
    try {
      const { name, display_name, unit, emoji } = data;
      const [result] = await pool.execute(
        "UPDATE action_types SET name = ?, display_name = ?, unit = ?, emoji = ? WHERE id = ?",
        [name, display_name, unit, emoji, id]
      );
      return result.affectedRows > 0;
    } catch (error) {
      console.error(`Error updating action type with ID ${id}:`, error);
      throw error;
    }
  }

  // Delete an action type (if not in use)
  static async delete(id) {
    const connection = await pool.getConnection();
    
    try {
      await connection.beginTransaction();
      
      // Check if action type is in use by resources
      const [resourcesUsingAction] = await connection.execute(
        "SELECT COUNT(*) as count FROM resources WHERE action_type_id = ?",
        [id]
      );
      
      if (resourcesUsingAction[0].count > 0) {
        throw new Error("Cannot delete action type that is in use by resources");
      }
      
      // Check if action type is in use by targets
      const [targetsUsingAction] = await connection.execute(
        "SELECT at.name, COUNT(*) as count FROM targets t JOIN action_types at ON t.action = at.name WHERE at.id = ? GROUP BY at.name",
        [id]
      );
      
      if (targetsUsingAction.length > 0 && targetsUsingAction[0].count > 0) {
        throw new Error("Cannot delete action type that is in use by targets");
      }
      
      // Delete the action type
      const [result] = await connection.execute(
        "DELETE FROM action_types WHERE id = ?",
        [id]
      );
      
      await connection.commit();
      return result.affectedRows > 0;
    } catch (error) {
      await connection.rollback();
      console.error(`Error deleting action type with ID ${id}:`, error);
      throw error;
    } finally {
      connection.release();
    }
  }
}

module.exports = ActionTypeModel;