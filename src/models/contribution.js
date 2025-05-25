const { pool } = require("../database");

class ContributionModel {
  // Add a new contribution
  static async add(targetId, userId, username, amount, location) {
    const connection = await pool.getConnection();

    try {
      await connection.beginTransaction();

      // Add the contribution
      const [result] = await connection.execute(
        "INSERT INTO contributions (target_id, user_id, username, amount, location) VALUES (?, ?, ?, ?, ?)",
        [targetId, userId, username, amount, location]
      );

      // Update the progress
      await connection.execute(
        "INSERT INTO progress (target_id, current_amount) VALUES (?, ?) ON DUPLICATE KEY UPDATE current_amount = current_amount + ?",
        [targetId, amount, amount]
      );

      await connection.commit();
      return result.insertId;
    } catch (error) {
      await connection.rollback();
      console.error("Error adding contribution:", error);
      throw error;
    } finally {
      connection.release();
    }
  }

  // Get contributions for a target with proper error handling
  static async getByTargetId(targetId, limit = 10) {
    try {
      // Validate inputs
      if (!targetId || targetId <= 0) {
        throw new Error("Invalid target ID provided");
      }

      const numericLimit = Math.max(1, Math.min(parseInt(limit) || 10, 1000));

      const [rows] = await pool.execute(
        "SELECT * FROM contributions WHERE target_id = ? ORDER BY timestamp DESC LIMIT ?",
        [parseInt(targetId), numericLimit]
      );
      return rows;
    } catch (error) {
      console.error(
        `Error getting contributions for target ID ${targetId}:`,
        error
      );
      throw error;
    }
  }

  // Get latest contribution for a target
  static async getLatestForTarget(targetId) {
    try {
      const [rows] = await pool.execute(
        "SELECT * FROM contributions WHERE target_id = ? ORDER BY timestamp DESC LIMIT 1",
        [targetId]
      );
      return rows[0] || null;
    } catch (error) {
      console.error(
        `Error getting latest contribution for target ID ${targetId}:`,
        error
      );
      throw error;
    }
  }

  // Get contributions by user for a specific guild
  static async getByUserId(userId, guildId, limit = 100) {
    try {
      if (!guildId) {
        throw new Error("Guild ID is required for user contributions");
      }

      const [rows] = await pool.execute(
        `SELECT c.*, t.action, t.resource 
         FROM contributions c 
         JOIN targets t ON c.target_id = t.id 
         WHERE c.user_id = ? AND t.guild_id = ? 
         ORDER BY c.timestamp DESC 
         LIMIT ?`,
        [userId, guildId, parseInt(limit) || 100]
      );
      return rows;
    } catch (error) {
      console.error(
        `Error getting contributions for user ID ${userId} in guild ${guildId}:`,
        error
      );
      throw error;
    }
  }

  // Get top contributors for a specific guild (FIXED - was leaking data between guilds)
  static async getTopContributors(limit = 10, guildId = null) {
    try {
      if (!guildId) {
        throw new Error("Guild ID is required for top contributors");
      }

      const [rows] = await pool.execute(
        `SELECT c.user_id, c.username, SUM(c.amount) as total_amount
         FROM contributions c
         JOIN targets t ON c.target_id = t.id
         WHERE t.guild_id = ?
         GROUP BY c.user_id, c.username
         ORDER BY total_amount DESC
         LIMIT ?`,
        [guildId, parseInt(limit) || 10]
      );
      return rows;
    } catch (error) {
      console.error("Error getting top contributors:", error);
      throw error;
    }
  }

  // Get top contributors by action type for a specific guild
  static async getTopContributorsByAction(action, limit = 10, guildId = null) {
    try {
      if (!guildId) {
        throw new Error("Guild ID is required for action-based contributors");
      }

      const [rows] = await pool.execute(
        `SELECT c.user_id, c.username, SUM(c.amount) as total_amount
         FROM contributions c
         JOIN targets t ON c.target_id = t.id
         WHERE t.action = ? AND t.guild_id = ?
         GROUP BY c.user_id, c.username
         ORDER BY total_amount DESC
         LIMIT ?`,
        [action, guildId, parseInt(limit) || 10]
      );
      return rows;
    } catch (error) {
      console.error(`Error getting top contributors for ${action}:`, error);
      throw error;
    }
  }

  // Get contributions by location for a specific guild
  static async getByLocation(location, limit = 100, guildId = null) {
    try {
      if (!guildId) {
        throw new Error(
          "Guild ID is required for location-based contributions"
        );
      }

      const [rows] = await pool.execute(
        `SELECT c.*, t.action, t.resource 
         FROM contributions c 
         JOIN targets t ON c.target_id = t.id 
         WHERE c.location LIKE ? AND t.guild_id = ?
         ORDER BY c.timestamp DESC 
         LIMIT ?`,
        [`%${location}%`, guildId, parseInt(limit) || 100]
      );
      return rows;
    } catch (error) {
      console.error(
        `Error getting contributions for location ${location}:`,
        error
      );
      throw error;
    }
  }

  // Get contributions with date filtering for a specific guild
  static async getWithDateFilter(
    fromDate,
    toDate,
    limit = 100,
    guildId = null
  ) {
    try {
      if (!guildId) {
        throw new Error("Guild ID is required for date-filtered contributions");
      }

      let query = `
        SELECT c.*, t.action, t.resource 
        FROM contributions c 
        JOIN targets t ON c.target_id = t.id 
        WHERE t.guild_id = ?
      `;

      const params = [guildId];

      if (fromDate) {
        query += " AND c.timestamp >= ?";
        params.push(fromDate);
      }

      if (toDate) {
        query += " AND c.timestamp <= ?";
        params.push(toDate);
      }

      query += " ORDER BY c.timestamp DESC LIMIT ?";
      params.push(parseInt(limit) || 100);

      const [rows] = await pool.execute(query, params);
      return rows;
    } catch (error) {
      console.error("Error getting contributions with date filter:", error);
      throw error;
    }
  }

  // Get all locations with resource types for a specific guild
  static async getAllLocations(guildId = null) {
    try {
      if (!guildId) {
        throw new Error("Guild ID is required for locations");
      }

      const [rows] = await pool.execute(
        `SELECT DISTINCT c.location, t.action, t.resource, SUM(c.amount) as total_amount
         FROM contributions c
         JOIN targets t ON c.target_id = t.id
         WHERE t.guild_id = ?
         GROUP BY c.location, t.action, t.resource
         ORDER BY c.location`,
        [guildId]
      );
      return rows;
    } catch (error) {
      console.error("Error getting all locations:", error);
      throw error;
    }
  }

  // Get contributions for targets in a specific guild
  static async getForGuild(guildId, limit = 100) {
    try {
      if (!guildId) {
        throw new Error("Guild ID is required");
      }

      const [rows] = await pool.execute(
        `SELECT c.*, t.action, t.resource, t.guild_id
         FROM contributions c
         JOIN targets t ON c.target_id = t.id
         WHERE t.guild_id = ?
         ORDER BY c.timestamp DESC
         LIMIT ?`,
        [guildId, parseInt(limit) || 100]
      );

      return rows;
    } catch (error) {
      console.error(`Error getting contributions for guild ${guildId}:`, error);
      throw error;
    }
  }

  // Get contribution statistics for a guild
  static async getGuildStats(guildId) {
    try {
      if (!guildId) {
        throw new Error("Guild ID is required for guild stats");
      }

      const [stats] = await pool.execute(
        `SELECT 
           COUNT(*) as total_contributions,
           COALESCE(SUM(c.amount), 0) as total_amount,
           COUNT(DISTINCT c.user_id) as unique_contributors,
           COALESCE(AVG(c.amount), 0) as average_contribution
         FROM contributions c
         JOIN targets t ON c.target_id = t.id
         WHERE t.guild_id = ?`,
        [guildId]
      );

      return (
        stats[0] || {
          total_contributions: 0,
          total_amount: 0,
          unique_contributors: 0,
          average_contribution: 0,
        }
      );
    } catch (error) {
      console.error(`Error getting guild stats for ${guildId}:`, error);
      throw error;
    }
  }

  // Get recent activity for a guild (for dashboards)
  static async getRecentActivity(guildId, limit = 5) {
    try {
      if (!guildId) {
        throw new Error("Guild ID is required for recent activity");
      }

      const [rows] = await pool.execute(
        `SELECT c.*, t.action, t.resource, t.guild_id,
                r.name as resource_name,
                at.display_name as action_display_name,
                at.unit
         FROM contributions c
         JOIN targets t ON c.target_id = t.id
         LEFT JOIN resources r ON t.resource = r.value AND t.guild_id = r.guild_id AND r.action_type = t.action
         LEFT JOIN action_types at ON at.name = t.action
         WHERE t.guild_id = ?
         ORDER BY c.timestamp DESC
         LIMIT ?`,
        [guildId, parseInt(limit) || 5]
      );

      return rows;
    } catch (error) {
      console.error(
        `Error getting recent activity for guild ${guildId}:`,
        error
      );
      throw error;
    }
  }

  // Delete contributions for a target (used when targets are deleted)
  static async deleteByTargetId(targetId) {
    try {
      const [result] = await pool.execute(
        "DELETE FROM contributions WHERE target_id = ?",
        [targetId]
      );
      return result.affectedRows;
    } catch (error) {
      console.error(
        `Error deleting contributions for target ${targetId}:`,
        error
      );
      throw error;
    }
  }

  // Get contribution summary by action type for a guild
  static async getActionTypeSummary(guildId) {
    try {
      if (!guildId) {
        throw new Error("Guild ID is required for action type summary");
      }

      const [rows] = await pool.execute(
        `SELECT t.action, 
                at.display_name as action_display_name,
                at.emoji as action_emoji,
                at.unit,
                COUNT(c.id) as contribution_count,
                COALESCE(SUM(c.amount), 0) as total_amount,
                COUNT(DISTINCT c.user_id) as unique_contributors
         FROM targets t
         LEFT JOIN contributions c ON t.id = c.target_id
         LEFT JOIN action_types at ON at.name = t.action
         WHERE t.guild_id = ?
         GROUP BY t.action, at.display_name, at.emoji, at.unit
         ORDER BY total_amount DESC`,
        [guildId]
      );

      return rows;
    } catch (error) {
      console.error(
        `Error getting action type summary for guild ${guildId}:`,
        error
      );
      throw error;
    }
  }

  // Get top contributors for specific targets (for filtered dashboards)
  static async getTopContributorsForTargets(targetIds, limit = 10) {
    try {
      // Validate and filter target IDs
      if (!targetIds || !Array.isArray(targetIds) || targetIds.length === 0) {
        console.log("No target IDs provided for top contributors");
        return [];
      }

      // Filter out invalid target IDs and ensure they're integers
      const validTargetIds = targetIds
        .filter((id) => id !== null && id !== undefined && !isNaN(id))
        .map((id) => parseInt(id))
        .filter((id) => id > 0); // Ensure positive integers

      if (validTargetIds.length === 0) {
        console.log("No valid target IDs found for top contributors");
        return [];
      }

      console.log(
        `Getting top contributors for ${validTargetIds.length} targets:`,
        validTargetIds
      );

      // Create placeholders for SQL IN clause
      const placeholders = validTargetIds.map(() => "?").join(",");

      // Ensure limit is a valid integer
      const validLimit = Math.max(1, Math.min(parseInt(limit) || 10, 100));

      // Prepare parameters array
      const parameters = [...validTargetIds, validLimit];

      console.log(
        `SQL parameters count: ${parameters.length}, Placeholders: ${
          validTargetIds.length + 1
        }`
      );

      const [rows] = await pool.execute(
        `SELECT c.user_id, c.username, SUM(c.amount) as total_amount
         FROM contributions c
         WHERE c.target_id IN (${placeholders})
         GROUP BY c.user_id, c.username
         ORDER BY total_amount DESC
         LIMIT ?`,
        parameters
      );

      console.log(`Found ${rows.length} top contributors`);
      return rows;
    } catch (error) {
      console.error("Error getting top contributors for targets:", error);
      console.error("Target IDs provided:", targetIds);
      console.error("Limit provided:", limit);

      // Return empty array instead of throwing to prevent dashboard crashes
      return [];
    }
  }
}

module.exports = ContributionModel;
