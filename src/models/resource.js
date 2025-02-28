const { pool } = require("../database");

class ResourceModel {
  // Get all resources
  static async getAll() {
    try {
      const [rows] = await pool.execute(
        "SELECT * FROM resources ORDER BY action_type, name"
      );
      return rows;
    } catch (error) {
      console.error("Error getting resources:", error);
      throw error;
    }
  }

  // Get resources by action type
  static async getByActionType(actionType) {
    try {
      const [rows] = await pool.execute(
        "SELECT * FROM resources WHERE action_type = ? ORDER BY name",
        [actionType]
      );
      return rows;
    } catch (error) {
      console.error(`Error getting ${actionType} resources:`, error);
      throw error;
    }
  }

  // Get resource by value and action type
  static async getByValueAndType(value, actionType) {
    try {
      const [rows] = await pool.execute(
        "SELECT * FROM resources WHERE value = ? AND action_type = ?",
        [value, actionType]
      );
      return rows[0] || null;
    } catch (error) {
      console.error(`Error getting resource ${value}:`, error);
      throw error;
    }
  }

  // Add a new resource
  static async add(name, value, actionType) {
    try {
      const [result] = await pool.execute(
        "INSERT INTO resources (name, value, action_type) VALUES (?, ?, ?)",
        [name, value, actionType]
      );
      return result.insertId;
    } catch (error) {
      console.error("Error adding resource:", error);
      throw error;
    }
  }

  // Remove a resource
  static async remove(value, actionType) {
    try {
      const [result] = await pool.execute(
        "DELETE FROM resources WHERE value = ? AND action_type = ?",
        [value, actionType]
      );
      return result.affectedRows > 0;
    } catch (error) {
      console.error("Error removing resource:", error);
      throw error;
    }
  }

  // Format resources for Discord choices
  static formatResourceChoices(resources) {
    return resources.map((resource) => ({
      name: resource.name,
      value: resource.value,
    }));
  }

  // Get resources grouped by action type
  static async getGroupedResources() {
    try {
      const [rows] = await pool.execute(
        "SELECT * FROM resources ORDER BY action_type, name"
      );

      const grouped = {
        mining: [],
        salvage: [],
        haul: [],
      };

      rows.forEach((resource) => {
        if (grouped[resource.action_type]) {
          grouped[resource.action_type].push({
            name: resource.name,
            value: resource.value,
          });
        }
      });

      return grouped;
    } catch (error) {
      console.error("Error getting grouped resources:", error);
      throw error;
    }
  }
}

module.exports = ResourceModel;
