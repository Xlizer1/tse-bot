// Create this as src/utils/embedUtils.js
// Utility functions for handling Discord embed length constraints

/**
 * Safely add fields to an embed, splitting long content across multiple fields
 * @param {EmbedBuilder} embed - The embed to add fields to
 * @param {string} baseName - Base name for the field(s)
 * @param {string[]} contentArray - Array of content strings to add
 * @param {Object} options - Configuration options
 */
function addLongContentField(embed, baseName, contentArray, options = {}) {
  const {
    maxFieldLength = 1000, // Leave buffer under Discord's 1024 limit
    separator = "\n",
    inline = false,
    emptyMessage = "No items available"
  } = options;

  if (!contentArray || contentArray.length === 0) {
    embed.addFields({
      name: baseName,
      value: emptyMessage,
      inline
    });
    return;
  }

  let currentFieldValue = "";
  let fieldCounter = 1;

  for (let i = 0; i < contentArray.length; i++) {
    const contentItem = contentArray[i];
    const testValue = currentFieldValue + (currentFieldValue ? separator : "") + contentItem;

    // Check if adding this item would exceed the limit
    if (testValue.length > maxFieldLength && currentFieldValue) {
      // Add current field and start a new one
      const fieldName = fieldCounter === 1 ? baseName : `${baseName} (${fieldCounter})`;
      
      embed.addFields({
        name: fieldName,
        value: currentFieldValue,
        inline
      });

      // Start new field
      currentFieldValue = contentItem;
      fieldCounter++;
    } else {
      // Add to current field
      currentFieldValue = testValue;
    }
  }

  // Add the final field if there's content
  if (currentFieldValue) {
    const fieldName = fieldCounter === 1 ? baseName : `${baseName} (${fieldCounter})`;
    
    embed.addFields({
      name: fieldName,
      value: currentFieldValue,
      inline
    });
  }
}

/**
 * Truncate a string to fit within Discord's field value limit
 * @param {string} content - The content to truncate
 * @param {number} maxLength - Maximum length (default 1020 to leave buffer)
 * @returns {string} - Truncated content with ellipsis if needed
 */
function truncateFieldValue(content, maxLength = 1020) {
  if (!content || content.length <= maxLength) {
    return content || "No content";
  }
  
  return content.substring(0, maxLength - 3) + "...";
}

/**
 * Validate embed before sending to prevent Discord API errors
 * @param {EmbedBuilder} embed - The embed to validate
 * @returns {Object} - Validation result with isValid boolean and errors array
 */
function validateEmbed(embed) {
  const errors = [];
  const embedData = embed.toJSON();

  // Check overall embed limits
  if (embedData.title && embedData.title.length > 256) {
    errors.push("Title exceeds 256 character limit");
  }

  if (embedData.description && embedData.description.length > 4096) {
    errors.push("Description exceeds 4096 character limit");
  }

  // Check field limits
  if (embedData.fields) {
    if (embedData.fields.length > 25) {
      errors.push("Too many fields (max 25)");
    }

    embedData.fields.forEach((field, index) => {
      if (field.name && field.name.length > 256) {
        errors.push(`Field ${index + 1} name exceeds 256 character limit`);
      }
      if (field.value && field.value.length > 1024) {
        errors.push(`Field ${index + 1} value exceeds 1024 character limit`);
      }
    });
  }

  if (embedData.footer && embedData.footer.text && embedData.footer.text.length > 2048) {
    errors.push("Footer text exceeds 2048 character limit");
  }

  if (embedData.author && embedData.author.name && embedData.author.name.length > 256) {
    errors.push("Author name exceeds 256 character limit");
  }

  // Check total embed size (approximate)
  const totalLength = JSON.stringify(embedData).length;
  if (totalLength > 6000) {
    errors.push("Embed total size is very large and may cause issues");
  }

  return {
    isValid: errors.length === 0,
    errors,
    embedData
  };
}

/**
 * Safe wrapper for updating interactions with embeds
 * @param {Interaction} interaction - Discord interaction
 * @param {Object} replyData - Data to send in reply
 */
async function safeEmbedReply(interaction, replyData) {
  try {
    // Validate embeds if present
    if (replyData.embeds) {
      for (const embed of replyData.embeds) {
        const validation = validateEmbed(embed);
        if (!validation.isValid) {
          console.warn("Embed validation failed:", validation.errors);
          // You could implement auto-fixing here or fallback to simpler content
        }
      }
    }

    if (interaction.replied || interaction.deferred) {
      await interaction.editReply(replyData);
    } else {
      await interaction.reply(replyData);
    }
  } catch (error) {
    console.error("Error in safeEmbedReply:", error);
    
    // Fallback to simple text message
    const fallbackContent = "An error occurred while displaying the information. Please try again.";
    
    try {
      if (interaction.replied || interaction.deferred) {
        await interaction.editReply({ 
          content: fallbackContent, 
          embeds: [], 
          components: replyData.components || [] 
        });
      } else {
        await interaction.reply({ 
          content: fallbackContent, 
          embeds: [], 
          components: replyData.components || [] 
        });
      }
    } catch (fallbackError) {
      console.error("Even fallback reply failed:", fallbackError);
    }
  }
}

module.exports = {
  addLongContentField,
  truncateFieldValue,
  validateEmbed,
  safeEmbedReply
};