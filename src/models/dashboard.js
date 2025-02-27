const { pool } = require('../database');

class DashboardModel {
  // Add a new dashboard
  static async add(messageId, channelId, guildId) {
    try {
      const [result] = await pool.execute(
        'INSERT INTO dashboards (message_id, channel_id, guild_id) VALUES (?, ?, ?)',
        [messageId, channelId, guildId]
      );
      return result.insertId;
    } catch (error) {
      console.error('Error adding dashboard:', error);
      throw error;
    }
  }

  // Get all dashboards
  static async getAll() {
    try {
      const [rows] = await pool.execute('SELECT * FROM dashboards');
      return rows;
    } catch (error) {
      console.error('Error getting dashboards:', error);
      throw error;
    }
  }

  // Remove a dashboard
  static async remove(messageId) {
    try {
      const [result] = await pool.execute('DELETE FROM dashboards WHERE message_id = ?', [messageId]);
      return result.affectedRows > 0;
    } catch (error) {
      console.error(`Error removing dashboard with message ID ${messageId}:`, error);
      throw error;
    }
  }

  // Remove all dashboards in a channel
  static async removeByChannel(channelId) {
    try {
      const [result] = await pool.execute('DELETE FROM dashboards WHERE channel_id = ?', [channelId]);
      return result.affectedRows;
    } catch (error) {
      console.error(`Error removing dashboards in channel ${channelId}:`, error);
      throw error;
    }
  }
}

// src/models/setting.js
class SettingModel {
  // Get a setting by key
  static async get(key) {
    try {
      const [rows] = await pool.execute('SELECT * FROM settings WHERE setting_key = ?', [key]);
      if (rows.length === 0) return null;
      
      return JSON.parse(rows[0].setting_value);
    } catch (error) {
      console.error(`Error getting setting ${key}:`, error);
      throw error;
    }
  }

  // Set a setting value
  static async set(key, value) {
    try {
      const jsonValue = JSON.stringify(value);
      
      // Use INSERT ... ON DUPLICATE KEY UPDATE
      const [result] = await pool.execute(
        'INSERT INTO settings (setting_key, setting_value) VALUES (?, ?) ON DUPLICATE KEY UPDATE setting_value = ?',
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
    return await this.get('autoReport') || { enabled: false };
  }

  // Set auto report settings
  static async setAutoReport(settings) {
    return await this.set('autoReport', settings);
  }
}

module.exports = {
  DashboardModel,
  SettingModel
};