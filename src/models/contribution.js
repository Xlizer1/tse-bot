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
        "UPDATE progress SET current_amount = current_amount + ? WHERE target_id = ?",
        [amount, targetId]
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

  // Get contributions for a target
  static async getByTargetId(targetId, limit = 10) {
    try {
      // Use prepared statement with explicit type casting
      const [rows] = await pool.query(
        "SELECT * FROM contributions WHERE target_id = ? ORDER BY timestamp DESC LIMIT ?",
        [targetId, limit]
      );
      return rows;
    } catch (error) {
      console.error(
        `Error getting contributions for target ID ${targetId}:`,
        error
      );
      console.error("Full error details:", error);

      // Additional error diagnosis
      console.error("Error Code:", error.code);
      console.error("SQL State:", error.sqlState);
      console.error("SQL Message:", error.sqlMessage);
      console.error("Target ID:", targetId);
      console.error("Limit:", limit);
      console.error("Target ID Type:", typeof targetId);
      console.error("Limit Type:", typeof limit);

      throw error;
    }
  }

  // Get latest contribution for a target
  static async getLatestForTarget(targetId) {
    try {
      const [rows] = await pool.query(
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

  // Get contributions by user
  static async getByUserId(userId, limit = 100) {
    try {
      const [rows] = await pool.query(
        "SELECT c.*, t.action, t.resource FROM contributions c JOIN targets t ON c.target_id = t.id WHERE c.user_id = ? ORDER BY c.timestamp DESC LIMIT ?",
        [userId, limit]
      );
      return rows;
    } catch (error) {
      console.error(
        `Error getting contributions for user ID ${userId}:`,
        error
      );
      throw error;
    }
  }

  // Get top contributors overall
  static async getTopContributors(limit = 10) {
    try {
      const [rows] = await pool.query(
        `
        SELECT user_id, username, SUM(amount) as total_amount
        FROM contributions
        GROUP BY user_id, username
        ORDER BY total_amount DESC
        LIMIT ?
      `,
        [limit]
      );

      return rows;
    } catch (error) {
      console.error("Error getting top contributors:", error);
      throw error;
    }
  }

  // Get top contributors by action type
  static async getTopContributorsByAction(action, limit = 10) {
    try {
      const [rows] = await pool.query(
        `
        SELECT c.user_id, c.username, SUM(c.amount) as total_amount
        FROM contributions c
        JOIN targets t ON c.target_id = t.id
        WHERE t.action = ?
        GROUP BY c.user_id, c.username
        ORDER BY total_amount DESC
        LIMIT ?
      `,
        [action, limit]
      );

      return rows;
    } catch (error) {
      console.error(`Error getting top contributors for ${action}:`, error);
      throw error;
    }
  }

  // Get contributions by location
  static async getByLocation(location, limit = 100) {
    try {
      const [rows] = await pool.query(
        `
        SELECT c.*, t.action, t.resource 
        FROM contributions c 
        JOIN targets t ON c.target_id = t.id 
        WHERE c.location LIKE ? 
        ORDER BY c.timestamp DESC 
        LIMIT ?
      `,
        [`%${location}%`, limit]
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

  // Get contributions with date filtering
  static async getWithDateFilter(fromDate, toDate, limit = 100) {
    try {
      let query = `
        SELECT c.*, t.action, t.resource 
        FROM contributions c 
        JOIN targets t ON c.target_id = t.id 
        WHERE 1=1
      `;

      const params = [];

      if (fromDate) {
        query += " AND c.timestamp >= ?";
        params.push(fromDate);
      }

      if (toDate) {
        query += " AND c.timestamp <= ?";
        params.push(toDate);
      }

      query += " ORDER BY c.timestamp DESC LIMIT ?";
      params.push(limit);

      const [rows] = await pool.query(query, params);
      return rows;
    } catch (error) {
      console.error("Error getting contributions with date filter:", error);
      throw error;
    }
  }

  // Get all locations with resource types
  static async getAllLocations() {
    try {
      const [rows] = await pool.query(`
        SELECT DISTINCT c.location, t.action, t.resource, SUM(c.amount) as total_amount
        FROM contributions c
        JOIN targets t ON c.target_id = t.id
        GROUP BY c.location, t.action, t.resource
        ORDER BY c.location
      `);

      return rows;
    } catch (error) {
      console.error("Error getting all locations:", error);
      throw error;
    }
  }
}

module.exports = ContributionModel;
