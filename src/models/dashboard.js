// Updated src/models/dashboard.js with configuration support

const { pool } = require("../database");

class DashboardModel {
  // Add a new dashboard with configuration
  static async addWithConfig(messageId, channelId, guildId, config = null) {
    try {
      const defaultConfig = {
        targetTags: ["org-wide"],
        title: "Resource Collection Progress",
        showAllIfNoFilter: true,
      };

      const finalConfig = config || defaultConfig;

      const [result] = await pool.execute(
        "INSERT INTO dashboards (message_id, channel_id, guild_id, config) VALUES (?, ?, ?, ?)",
        [messageId, channelId, guildId, JSON.stringify(finalConfig)]
      );
      return result.insertId;
    } catch (error) {
      console.error("Error adding dashboard with config:", error);
      throw error;
    }
  }

  // Update existing add method to use default config
  static async add(messageId, channelId, guildId) {
    return this.addWithConfig(messageId, channelId, guildId, null);
  }

  // Get dashboard by message ID with config
  static async getByMessageId(messageId) {
    try {
      const [rows] = await pool.execute(
        "SELECT * FROM dashboards WHERE message_id = ?",
        [messageId]
      );

      if (rows.length > 0 && rows[0].config) {
        // Parse config if it's a string
        if (typeof rows[0].config === "string") {
          rows[0].config = JSON.parse(rows[0].config);
        }
      }

      return rows[0] || null;
    } catch (error) {
      console.error("Error getting dashboard by message ID:", error);
      throw error;
    }
  }

  // Get all dashboards with parsed configs
  static async getAll(guildId = null) {
    try {
      let query = "SELECT * FROM dashboards";
      let params = [];

      if (guildId) {
        query += " WHERE guild_id = ?";
        params.push(guildId);
      }

      const [rows] = await pool.execute(query, params);

      // Parse configs
      rows.forEach((row) => {
        if (row.config && typeof row.config === "string") {
          try {
            row.config = JSON.parse(row.config);
          } catch (e) {
            row.config = null;
          }
        }
      });

      return rows;
    } catch (error) {
      console.error("Error getting dashboards:", error);
      throw error;
    }
  }

  // Update dashboard configuration
  static async updateConfig(messageId, config) {
    try {
      const [result] = await pool.execute(
        "UPDATE dashboards SET config = ? WHERE message_id = ?",
        [JSON.stringify(config), messageId]
      );
      return result.affectedRows > 0;
    } catch (error) {
      console.error("Error updating dashboard config:", error);
      throw error;
    }
  }

  // Get all unique dashboard tags in use
  static async getAllDashboardTags(guildId) {
    try {
      const [rows] = await pool.execute(
        `SELECT config FROM dashboards WHERE guild_id = ? AND config IS NOT NULL`,
        [guildId]
      );

      const tags = new Set();
      rows.forEach((row) => {
        try {
          const config =
            typeof row.config === "string"
              ? JSON.parse(row.config)
              : row.config;
          if (config && config.targetTags && Array.isArray(config.targetTags)) {
            config.targetTags.forEach((tag) => tags.add(tag));
          }
        } catch (e) {
          // Skip invalid configs
        }
      });

      return Array.from(tags);
    } catch (error) {
      console.error("Error getting dashboard tags:", error);
      throw error;
    }
  }

  // Keep existing methods...
  static async remove(messageId) {
    try {
      const [result] = await pool.execute(
        "DELETE FROM dashboards WHERE message_id = ?",
        [messageId]
      );
      return result.affectedRows > 0;
    } catch (error) {
      console.error(
        `Error removing dashboard with message ID ${messageId}:`,
        error
      );
      throw error;
    }
  }

  static async removeByChannel(channelId) {
    try {
      const [result] = await pool.execute(
        "DELETE FROM dashboards WHERE channel_id = ?",
        [channelId]
      );
      return result.affectedRows;
    } catch (error) {
      console.error(
        `Error removing dashboards in channel ${channelId}:`,
        error
      );
      throw error;
    }
  }
}

class SettingModel {
  // Get a setting by key for a specific guild
  static async get(key, guildId = null) {
    try {
      let rows;
      if (guildId) {
        [rows] = await pool.execute(
          "SELECT * FROM settings WHERE setting_key = ? AND guild_id = ?",
          [key, guildId]
        );
      } else {
        [rows] = await pool.execute(
          "SELECT * FROM settings WHERE setting_key = ?",
          [key]
        );
      }

      if (rows.length === 0) return null;

      let parsedValue;
      const settingValue = rows[0].setting_value;

      // Handle different possible formats
      if (typeof settingValue === "object") {
        // If it's already an object, return it directly
        return settingValue;
      }

      try {
        // Try parsing as JSON
        if (typeof settingValue === "string") {
          parsedValue = JSON.parse(settingValue);
        } else {
          // If it's not a string, try converting to string first
          parsedValue = JSON.parse(String(settingValue));
        }
      } catch (jsonError) {
        console.warn(
          `Warning: Unable to parse JSON for setting ${key}:`,
          jsonError
        );

        try {
          // Fallback parsing attempt
          parsedValue = eval(`(${settingValue})`);
        } catch (evalError) {
          console.error(
            `Could not parse setting ${key} using fallback methods:`,
            evalError
          );
          return null;
        }
      }

      return parsedValue;
    } catch (error) {
      console.error(`Error getting setting ${key}:`, error);
      throw error;
    }
  }

  // Set a setting value for a specific guild
  static async set(key, value, guildId = null) {
    try {
      // Ensure value is a valid JSON string
      const jsonValue =
        typeof value === "string" ? value : JSON.stringify(value);

      const [result] = await pool.execute(
        "INSERT INTO settings (setting_key, setting_value, guild_id) VALUES (?, ?, ?) ON DUPLICATE KEY UPDATE setting_value = ?",
        [key, jsonValue, guildId, jsonValue]
      );
      return result.affectedRows > 0;
    } catch (error) {
      console.error(`Error setting ${key}:`, error);
      throw error;
    }
  }

  // Get auto report settings for a specific guild
  static async getAutoReport(guildId = null) {
    const defaultSettings = {
      enabled: false,
      channelId: null,
      time: null,
      guildId: guildId,
      lastReportDate: null,
    };

    try {
      const settings = await this.get("autoReport", guildId);
      return settings || defaultSettings;
    } catch (error) {
      console.error("Error retrieving auto report settings:", error);
      return defaultSettings;
    }
  }

  // Set auto report settings for a specific guild
  static async setAutoReport(settings) {
    // Ensure all expected fields are present
    const completeSettings = {
      enabled: settings.enabled ?? false,
      channelId: settings.channelId ?? null,
      time: settings.time ?? null,
      guildId: settings.guildId ?? null,
      lastReportDate: settings.lastReportDate ?? null,
    };

    return await this.set("autoReport", completeSettings, settings.guildId);
  }
}

module.exports = {
  DashboardModel,
  SettingModel,
};
