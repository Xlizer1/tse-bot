// Create this as src/utils/discordUtils.js
// Utility functions for Discord limitations and constraints

/**
 * Safely create a custom ID that fits within Discord's 100-character limit
 * @param {string} baseId - The base identifier
 * @param {...string} parts - Additional parts to append
 * @returns {string} - A custom ID that fits within Discord's limits
 */
function createSafeCustomId(baseId, ...parts) {
  const maxLength = 100;
  
  // Join all parts with underscores
  let fullId = [baseId, ...parts.filter(part => part && part.length > 0)].join('_');
  
  // If it's within the limit, return as-is
  if (fullId.length <= maxLength) {
    return fullId;
  }
  
  // If too long, we need to truncate intelligently
  // Keep the base ID and truncate the variable parts
  let truncatedId = baseId;
  let remainingLength = maxLength - baseId.length;
  
  for (let i = 0; i < parts.length && remainingLength > 1; i++) {
    const part = parts[i];
    if (!part || part.length === 0) continue;
    
    const partWithSeparator = '_' + part;
    
    if (partWithSeparator.length <= remainingLength) {
      // Part fits completely
      truncatedId += partWithSeparator;
      remainingLength -= partWithSeparator.length;
    } else {
      // Part needs truncation
      const availableForPart = remainingLength - 1; // -1 for underscore
      if (availableForPart > 3) {
        // Truncate and add indicator
        truncatedId += '_' + part.substring(0, availableForPart - 2) + '..';
      }
      break; // No more room for additional parts
    }
  }
  
  return truncatedId;
}

/**
 * Create a shortened version of a long identifier
 * @param {string} longId - The long identifier to shorten
 * @param {number} maxLength - Maximum length (default 30)
 * @returns {string} - Shortened identifier with length suffix
 */
function shortenIdentifier(longId, maxLength = 30) {
  if (!longId || longId.length <= maxLength) {
    return longId || '';
  }
  
  // Create a shortened version with original length as suffix
  const shortened = longId.substring(0, maxLength - 4) + '_' + longId.length;
  return shortened;
}

/**
 * Generate a hash-based short ID for long strings
 * @param {string} input - Input string to hash
 * @param {number} length - Desired hash length (default 8)
 * @returns {string} - Short hash-based ID
 */
function generateShortId(input, length = 8) {
  if (!input) return '';
  
  // Simple hash function (not cryptographically secure, but fine for IDs)
  let hash = 0;
  for (let i = 0; i < input.length; i++) {
    const char = input.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash; // Convert to 32-bit integer
  }
  
  // Convert to base36 and take desired length
  return Math.abs(hash).toString(36).substring(0, length);
}

/**
 * Validate Discord component constraints
 * @param {Object} component - Discord component to validate
 * @returns {Object} - Validation result
 */
function validateDiscordComponent(component) {
  const errors = [];
  
  if (component.customId && component.customId.length > 100) {
    errors.push(`Custom ID too long: ${component.customId.length}/100 characters`);
  }
  
  if (component.label && component.label.length > 80) {
    errors.push(`Label too long: ${component.label.length}/80 characters`);
  }
  
  if (component.placeholder && component.placeholder.length > 100) {
    errors.push(`Placeholder too long: ${component.placeholder.length}/100 characters`);
  }
  
  return {
    isValid: errors.length === 0,
    errors
  };
}

/**
 * Safe modal builder that handles long custom IDs
 * @param {string} baseCustomId - Base custom ID
 * @param {string} title - Modal title
 * @param {...string} idParts - Additional parts for custom ID
 * @returns {ModalBuilder} - Modal with safe custom ID
 */
function createSafeModal(baseCustomId, title, ...idParts) {
  const { ModalBuilder } = require('discord.js');
  
  const safeCustomId = createSafeCustomId(baseCustomId, ...idParts);
  
  return new ModalBuilder()
    .setCustomId(safeCustomId)
    .setTitle(title.length > 45 ? title.substring(0, 42) + '...' : title);
}

/**
 * Extract original data from a truncated custom ID
 * This works with IDs created by createSafeCustomId
 * @param {string} customId - The potentially truncated custom ID
 * @param {string} baseId - The original base ID
 * @returns {string[]} - Array of extracted parts
 */
function extractCustomIdParts(customId, baseId) {
  if (!customId.startsWith(baseId)) {
    return [];
  }
  
  const remainder = customId.substring(baseId.length);
  if (remainder.startsWith('_')) {
    return remainder.substring(1).split('_');
  }
  
  return [];
}

module.exports = {
  createSafeCustomId,
  shortenIdentifier,
  generateShortId,
  validateDiscordComponent,
  createSafeModal,
  extractCustomIdParts
};