const { pool } = require("../database");

class DashboardModel {
  // Add a new dashboard
  static async add(messageId, channelId, guildId) {
    try {
      const [result] = await pool.execute(
        "INSERT INTO dashboards (message_id, channel_id, guild_id) VALUES (?, ?, ?)",
        [messageId, channelId, guildId]
      );
      return result.insertId;
    } catch (error) {
      console.error("Error adding dashboard:", error);
      throw error;
    }
  }

  // Get all dashboards, optionally filter by guild
  static async getAll(guildId = null) {
    try {
      const [rows] = await pool.execute(
        "SELECT * FROM dashboards WHERE guild_id = ?",
        [guildId]
      );
      return rows;
    } catch (error) {
      console.error("Error getting dashboards:", error);
      throw error;
    }
  }

  // Remove a dashboard
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

  // Remove all dashboards in a channel
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
      [rows] = await pool.execute(
        "SELECT * FROM settings WHERE setting_key = ? AND guild_id = ?",
        [key, guildId]
      );

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
