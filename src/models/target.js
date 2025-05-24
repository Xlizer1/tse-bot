// Updated src/models/target.js with tags support

const { pool } = require("../database");

class TargetModel {
  // Update getAllWithProgress to include tags and support filtering
  static async getAllWithProgress(guildId = null, tags = null) {
    try {
      let query = `
        SELECT t.*, p.current_amount, r.name as resource_name, r.emoji as resource_emoji, 
               COALESCE(t.unit, at.unit) as unit, 
               at.display_name as action_display_name, at.emoji as action_emoji,
               t.tags
        FROM targets t
        LEFT JOIN progress p ON t.id = p.target_id
        LEFT JOIN action_types at ON at.name = t.action
        LEFT JOIN resources r ON t.resource = r.value AND t.guild_id = r.guild_id AND
          CASE 
            WHEN t.action = at.name THEN r.action_type_id = (SELECT id FROM action_types WHERE name = t.action) 
            ELSE 1=0
          END
        WHERE t.guild_id = ?
      `;

      let params = [guildId];

      // Add tag filtering if specified
      if (tags && tags.length > 0) {
        // MySQL JSON search for any matching tag
        const tagConditions = tags
          .map(() => "JSON_CONTAINS(t.tags, ?)")
          .join(" OR ");
        query += ` AND (${tagConditions})`;

        // Add each tag as a JSON string parameter
        tags.forEach((tag) => {
          params.push(JSON.stringify(tag));
        });
      }

      query += " ORDER BY t.action, t.resource";

      const [rows] = await pool.execute(query, params);
      return rows;
    } catch (error) {
      console.error("Error getting targets with progress:", error);
      throw error;
    }
  }

  // Update getByActionAndResource to include tags
  static async getByActionAndResource(action, resource, guildId = null) {
    try {
      let query = `
        SELECT t.*, p.current_amount, 
               COALESCE(t.unit, at.unit) as unit, 
               at.display_name as action_display_name,
               t.tags
        FROM targets t 
        LEFT JOIN progress p ON t.id = p.target_id
        LEFT JOIN action_types at ON at.name = t.action
        WHERE t.action = ? AND t.resource = ? AND t.guild_id = ?
      `;

      const [rows] = await pool.execute(query, [action, resource, guildId]);
      return rows[0] || null;
    } catch (error) {
      console.error(`Error getting target for ${action} ${resource}:`, error);
      throw error;
    }
  }

  // Update getById to include tags
  static async getById(id) {
    try {
      const [rows] = await pool.execute(
        `
        SELECT t.*, p.current_amount, 
               COALESCE(t.unit, at.unit) as unit, 
               at.display_name as action_display_name,
               t.tags
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

  // NEW: Create target with custom unit and tags
  static async createWithUnitAndTags(
    action,
    resource,
    targetAmount,
    unit,
    createdBy,
    guildId = null,
    tags = ["org-wide"]
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

      // Create the target with custom unit and tags
      const [result] = await connection.execute(
        "INSERT INTO targets (guild_id, action, resource, target_amount, unit, created_by, tags) VALUES (?, ?, ?, ?, ?, ?, ?)",
        [
          guildId,
          action,
          resource,
          targetAmount,
          unit,
          createdBy,
          JSON.stringify(tags),
        ]
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
      console.error("Error creating target with unit and tags:", error);
      throw error;
    } finally {
      connection.release();
    }
  }

  // Update existing createWithUnit to use createWithUnitAndTags
  static async createWithUnit(
    action,
    resource,
    targetAmount,
    unit,
    createdBy,
    guildId = null
  ) {
    return this.createWithUnitAndTags(
      action,
      resource,
      targetAmount,
      unit,
      createdBy,
      guildId,
      ["org-wide"] // Default tag
    );
  }

  // NEW: Update target tags
  static async updateTags(id, tags) {
    try {
      const [result] = await pool.execute(
        "UPDATE targets SET tags = ? WHERE id = ?",
        [JSON.stringify(tags), id]
      );
      return result.affectedRows > 0;
    } catch (error) {
      console.error(`Error updating target tags for ID ${id}:`, error);
      throw error;
    }
  }

  // NEW: Add tag to existing target
  static async addTag(id, tag) {
    try {
      const target = await this.getById(id);
      if (!target) throw new Error("Target not found");

      let tags = target.tags || [];
      if (typeof tags === "string") {
        tags = JSON.parse(tags);
      }

      if (!tags.includes(tag)) {
        tags.push(tag);
        await this.updateTags(id, tags);
      }

      return true;
    } catch (error) {
      console.error(`Error adding tag to target ${id}:`, error);
      throw error;
    }
  }

  // NEW: Remove tag from target
  static async removeTag(id, tag) {
    try {
      const target = await this.getById(id);
      if (!target) throw new Error("Target not found");

      let tags = target.tags || [];
      if (typeof tags === "string") {
        tags = JSON.parse(tags);
      }

      tags = tags.filter((t) => t !== tag);
      await this.updateTags(id, tags);

      return true;
    } catch (error) {
      console.error(`Error removing tag from target ${id}:`, error);
      throw error;
    }
  }

  // NEW: Get all unique tags in use
  static async getAllTags(guildId) {
    try {
      const [rows] = await pool.execute(
        `SELECT DISTINCT JSON_UNQUOTE(JSON_EXTRACT(tags, '$[*]')) as tag
         FROM targets 
         WHERE guild_id = ? AND tags IS NOT NULL`,
        [guildId]
      );

      // Extract unique tags
      const tags = new Set();
      rows.forEach((row) => {
        if (row.tag) {
          // Parse the JSON array string that MySQL returns
          try {
            const tagArray = JSON.parse(row.tag);
            if (Array.isArray(tagArray)) {
              tagArray.forEach((t) => tags.add(t));
            }
          } catch (e) {
            // If it's not an array, add it as a single tag
            tags.add(row.tag);
          }
        }
      });

      return Array.from(tags);
    } catch (error) {
      console.error("Error getting all tags:", error);
      throw error;
    }
  }

  // Update existing methods to maintain backwards compatibility
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

  // Update existing create method to include default tags
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

      // Create the target with action type's default unit and default tags
      const [result] = await connection.execute(
        "INSERT INTO targets (guild_id, action, resource, target_amount, unit, created_by, tags) VALUES (?, ?, ?, ?, ?, ?, ?)",
        [
          guildId,
          action,
          resource,
          targetAmount,
          defaultUnit,
          createdBy,
          JSON.stringify(["org-wide"]),
        ]
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

  static async delete(id) {
    try {
      const [result] = await pool.execute("DELETE FROM targets WHERE id = ?", [
        id,
      ]);
      return result.affectedRows > 0;
    } catch (error) {
      console.error(`Error deleting target with ID ${id}:`, error);
      throw error;
    }
  }

  static async resetProgress(id) {
    try {
      // Delete all contributions for this target
      await pool.execute("DELETE FROM contributions WHERE target_id = ?", [id]);

      // Reset progress to 0
      await pool.execute(
        "UPDATE progress SET current_amount = 0 WHERE target_id = ?",
        [id]
      );

      return true;
    } catch (error) {
      console.error(`Error resetting progress for target ID ${id}:`, error);
      throw error;
    }
  }
}

module.exports = TargetModel;
