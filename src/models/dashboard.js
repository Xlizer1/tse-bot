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

  // Get all dashboards
  static async getAll() {
    try {
      const [rows] = await pool.execute("SELECT * FROM dashboards");
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
  // Get a setting by key
  static async get(key) {
    try {
      const [rows] = await pool.execute(
        "SELECT * FROM settings WHERE setting_key = ?",
        [key]
      );

      if (rows.length === 0) return null;

      let parsedValue;
      const settingValue = rows[0].setting_value;

      // Log the raw setting value for debugging
      // console.log(`Raw setting value for ${key}:`, settingValue);
      // console.log(`Type of setting value:`, typeof settingValue);

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

  // Set a setting value
  static async set(key, value) {
    try {
      // Ensure value is a valid JSON string
      const jsonValue =
        typeof value === "string" ? value : JSON.stringify(value);

      // Use INSERT ... ON DUPLICATE KEY UPDATE
      const [result] = await pool.execute(
        "INSERT INTO settings (setting_key, setting_value) VALUES (?, ?) ON DUPLICATE KEY UPDATE setting_value = ?",
        [key, jsonValue, jsonValue]
      );

      return result.affectedRows > 0;
    } catch (error) {
      console.error(`Error setting ${key}:`, error);
      throw error;
    }
  }

  // Get auto report settings
  static async getAutoReport() {
    const defaultSettings = {
      enabled: false,
      channelId: null,
      time: null,
      guildId: null,
      lastReportDate: null,
    };

    try {
      const settings = await this.get("autoReport");
      return settings || defaultSettings;
    } catch (error) {
      console.error("Error retrieving auto report settings:", error);
      return defaultSettings;
    }
  }

  // Set auto report settings
  static async setAutoReport(settings) {
    // Ensure all expected fields are present
    const completeSettings = {
      enabled: settings.enabled ?? false,
      channelId: settings.channelId ?? null,
      time: settings.time ?? null,
      guildId: settings.guildId ?? null,
      lastReportDate: settings.lastReportDate ?? null,
    };

    return await this.set("autoReport", completeSettings);
  }
}

module.exports = {
  DashboardModel,
  SettingModel,
};
