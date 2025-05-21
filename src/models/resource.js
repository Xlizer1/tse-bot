const { pool } = require("../database");
const ActionTypeModel = require("./actionType");

class ResourceModel {
  // Get all resources with action type info for a specific guild
  static async getAll(guildId = null) {
    try {
      if (guildId) {
        // If guild ID is provided, filter by it
        const [rows] = await pool.execute(`
          SELECT r.*, at.name as action_type_name, at.display_name as action_display_name, at.unit, at.emoji as action_emoji
          FROM resources r
          JOIN action_types at ON r.action_type_id = at.id
          WHERE r.guild_id = ?
          ORDER BY at.display_name, r.name
        `, [guildId]);
        return rows;
      } else {
        // Otherwise get all resources (for backward compatibility)
        const [rows] = await pool.execute(`
          SELECT r.*, at.name as action_type_name, at.display_name as action_display_name, at.unit, at.emoji as action_emoji
          FROM resources r
          JOIN action_types at ON r.action_type_id = at.id
          ORDER BY at.display_name, r.name
        `);
        return rows;
      }
    } catch (error) {
      console.error("Error getting resources:", error);
      throw error;
    }
  }

  // Get resources by action type for a specific guild
  static async getByActionType(actionType, guildId = null) {
    try {
      // First, get the action type ID
      const actionTypeData = await ActionTypeModel.getByName(actionType);
      
      if (!actionTypeData) {
        throw new Error(`Action type "${actionType}" not found`);
      }
      
      if (guildId) {
        // If guild ID is provided, filter by it
        const [rows] = await pool.execute(
          `SELECT r.*, at.name as action_type_name, at.display_name as action_display_name, at.unit, at.emoji as action_emoji
           FROM resources r
           JOIN action_types at ON r.action_type_id = at.id
           WHERE at.name = ? AND r.guild_id = ? 
           ORDER BY r.name`,
          [actionType, guildId]
        );
        return rows;
      } else {
        // Otherwise get all resources of this type (for backward compatibility)
        const [rows] = await pool.execute(
          `SELECT r.*, at.name as action_type_name, at.display_name as action_display_name, at.unit, at.emoji as action_emoji
           FROM resources r
           JOIN action_types at ON r.action_type_id = at.id
           WHERE at.name = ?
           ORDER BY r.name`,
          [actionType]
        );
        return rows;
      }
    } catch (error) {
      console.error(`Error getting ${actionType} resources:`, error);
      throw error;
    }
  }

  // Get resource by value and action type for a specific guild
  static async getByValueAndType(value, actionType, guildId = null) {
    try {
      // First, get the action type ID
      const actionTypeData = await ActionTypeModel.getByName(actionType);
      
      if (!actionTypeData) {
        throw new Error(`Action type "${actionType}" not found`);
      }
      
      if (guildId) {
        // If guild ID is provided, filter by it
        const [rows] = await pool.execute(
          `SELECT r.*, at.name as action_type_name, at.display_name as action_display_name, at.unit, at.emoji as action_emoji
           FROM resources r
           JOIN action_types at ON r.action_type_id = at.id
           WHERE r.value = ? AND at.name = ? AND r.guild_id = ?`,
          [value, actionType, guildId]
        );
        return rows[0] || null;
      } else {
        // Otherwise get resource by type and value (for backward compatibility)
        const [rows] = await pool.execute(
          `SELECT r.*, at.name as action_type_name, at.display_name as action_display_name, at.unit, at.emoji as action_emoji
           FROM resources r
           JOIN action_types at ON r.action_type_id = at.id
           WHERE r.value = ? AND at.name = ?`,
          [value, actionType]
        );
        return rows[0] || null;
      }
    } catch (error) {
      console.error(`Error getting resource ${value}:`, error);
      throw error;
    }
  }

  // Add a new resource
  static async add(name, value, actionType, guildId = null, emoji = null) {
    try {
      // First, get the action type ID
      const actionTypeData = await ActionTypeModel.getByName(actionType);
      
      if (!actionTypeData) {
        throw new Error(`Action type "${actionType}" not found`);
      }
      
      if (guildId) {
        // If guild ID is provided, include it
        const [result] = await pool.execute(
          "INSERT INTO resources (guild_id, name, value, action_type_id, emoji) VALUES (?, ?, ?, ?, ?)",
          [guildId, name, value, actionTypeData.id, emoji]
        );
        return result.insertId;
      } else {
        // Otherwise use the default guild ID (for backward compatibility)
        const [result] = await pool.execute(
          "INSERT INTO resources (name, value, action_type_id, emoji) VALUES (?, ?, ?, ?)",
          [name, value, actionTypeData.id, emoji]
        );
        return result.insertId;
      }
    } catch (error) {
      console.error("Error adding resource:", error);
      throw error;
    }
  }

  // Remove a resource
  static async remove(value, actionType, guildId = null) {
    try {
      // First, get the action type ID
      const actionTypeData = await ActionTypeModel.getByName(actionType);
      
      if (!actionTypeData) {
        throw new Error(`Action type "${actionType}" not found`);
      }
      
      if (guildId) {
        // If guild ID is provided, filter by it
        const [result] = await pool.execute(
          "DELETE FROM resources WHERE value = ? AND action_type_id = ? AND guild_id = ?",
          [value, actionTypeData.id, guildId]
        );
        return result.affectedRows > 0;
      } else {
        // Otherwise remove resource by type and value (for backward compatibility)
        const [result] = await pool.execute(
          "DELETE FROM resources WHERE value = ? AND action_type_id = ?",
          [value, actionTypeData.id]
        );
        return result.affectedRows > 0;
      }
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
  static async getGroupedResources(guildId = null) {
    try {
      // Get all action types
      const actionTypes = await ActionTypeModel.getAll();
      
      // Create result structure
      const grouped = {};
      actionTypes.forEach(type => {
        grouped[type.name] = [];
      });
      
      // Get all resources with action types
      let rows;
      if (guildId) {
        // If guild ID is provided, filter by it
        [rows] = await pool.execute(`
          SELECT r.*, at.name as action_type_name, at.display_name as action_display_name, at.unit, at.emoji as action_emoji
          FROM resources r
          JOIN action_types at ON r.action_type_id = at.id
          WHERE r.guild_id = ?
          ORDER BY r.name
        `, [guildId]);
      } else {
        // Otherwise get all resources (for backward compatibility)
        [rows] = await pool.execute(`
          SELECT r.*, at.name as action_type_name, at.display_name as action_display_name, at.unit, at.emoji as action_emoji
          FROM resources r
          JOIN action_types at ON r.action_type_id = at.id
          ORDER BY r.name
        `);
      }
      
      // Group resources by action type
      rows.forEach(resource => {
        if (grouped[resource.action_type_name]) {
          grouped[resource.action_type_name].push({
            id: resource.id,
            name: resource.name,
            value: resource.value,
            emoji: resource.emoji || resource.action_emoji,
            unit: resource.unit
          });
        }
      });
      
      return grouped;
    } catch (error) {
      console.error("Error getting grouped resources:", error);
      throw error;
    }
  }

  // Backwards compatibility method for older code
  static async getByValueAndActionType(value, actionType, guildId = null) {
    return this.getByValueAndType(value, actionType, guildId);
  }
}

module.exports = ResourceModel;