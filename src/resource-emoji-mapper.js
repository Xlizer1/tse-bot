const ResourceEmojiMapper = {
  // Base emoji mapping
  baseEmojiMap: {
    // Mining resources
    copper: "🟤",
    iron: "⚙️",
    gold: "✨",
    diamond: "💎",
    titanium: "🔧",
    aluminum: "🛠️",
    quantainium: "☢️",

    // Salvage resources
    rmc: "♻️",
    "construction materials": "🏗️",
    "scrap metal": "🔩",
    "ship parts": "🚀",

    // Haul resources
    "medical supplies": "🩺",
    "agricultural supplies": "🌾",
    hydrogen: "🧪",
    chlorine: "🧪",

    // Action type default emojis
    mining: "⛏️",
    salvage: "🏭",
    haul: "🚚",
  },

  // Dynamic emoji generation based on characteristics
  generateEmoji(resourceName, actionType) {
    const lowercaseName = resourceName.toLowerCase();

    // First, check exact matches in base map
    if (this.baseEmojiMap[lowercaseName]) {
      return this.baseEmojiMap[lowercaseName];
    }

    // Custom emoji generation logic
    const emojiGenerators = [
      // Chemical/scientific sounding names
      {
        test: (name) => /chem|compound|element|solution/i.test(name),
        emoji: "🧪",
      },
      // Biological or organic resources
      {
        test: (name) => /bio|organic|plant|food/i.test(name),
        emoji: "🌱",
      },
      // Metal-like resources
      {
        test: (name) => /metal|alloy|ore/i.test(name),
        emoji: "⚒️",
      },
      // Technology or high-tech resources
      {
        test: (name) => /tech|advanced|rare|quantum/i.test(name),
        emoji: "🛸",
      },
      // Medical or health-related
      {
        test: (name) => /health|medical|pharma/i.test(name),
        emoji: "🩺",
      },
      // Construction or industrial
      {
        test: (name) => /construct|industrial|material/i.test(name),
        emoji: "🏗️",
      },
    ];

    // Try dynamic emoji generation
    for (const generator of emojiGenerators) {
      if (generator.test(lowercaseName)) {
        return generator.emoji;
      }
    }

    // Fallback to action type emoji
    const actionEmoji = this.baseEmojiMap[actionType] || "📦";

    // Fallback to first letter based emoji
    if (resourceName.length > 0) {
      const firstLetter = resourceName[0].toLowerCase();
      const letterEmojis = {
        a: "🅰️",
        b: "🅱️",
        c: "©️",
        d: "🆔",
        e: "📧",
        f: "🎏",
        g: "🎲",
        h: "♓",
        i: "ℹ️",
        j: "🃏",
        k: "🎋",
        l: "🏒",
        m: "Ⓜ️",
        n: "🆖",
        o: "⭕",
        p: "🅿️",
        q: "❓",
        r: "®️",
        s: "💲",
        t: "✖️",
        u: "⛎",
        v: "✅",
        w: "🆋",
        x: "❌",
        y: "🇾",
        z: "⚡",
      };

      return letterEmojis[firstLetter] || actionEmoji;
    }

    // Ultimate fallback
    return actionEmoji;
  },

  // Get emoji for a resource
  getEmoji(resourceName, actionType) {
    // Normalize inputs
    const normalizedName = resourceName ? resourceName.trim() : "";
    const normalizedActionType = actionType
      ? actionType.trim().toLowerCase()
      : "misc";

    // Generate or retrieve emoji
    return this.generateEmoji(normalizedName, normalizedActionType);
  },

  // Method to allow manual emoji override
  addCustomEmoji(resourceName, emoji) {
    this.baseEmojiMap[resourceName.toLowerCase()] = emoji;
  },
};

const ResourceEmojiGenerator = {
  generateEmoji(resourceName, actionType) {
    const lowercaseName = resourceName.toLowerCase();

    // Predefined emoji mappings
    const emojiMappings = {
      // Mining
      copper: "🟤",
      iron: "⚙️",
      gold: "✨",
      diamond: "💎",
      titanium: "🔧",
      aluminum: "🛠️",
      quantainium: "☢️",

      // Salvage
      rmc: "♻️",
      "construction materials": "🏗️",
      "scrap metal": "🔩",
      "ship parts": "🚀",

      // Haul
      "medical supplies": "🩺",
      "agricultural supplies": "🌾",
      hydrogen: "🧪",
      chlorine: "🧪",
    };

    // Check exact match first
    if (emojiMappings[lowercaseName]) {
      return emojiMappings[lowercaseName];
    }

    // Dynamic emoji generation based on keywords
    const keywordEmojiMap = [
      { keywords: ["chem", "compound", "element", "solution"], emoji: "🧪" },
      { keywords: ["bio", "organic", "plant", "food"], emoji: "🌱" },
      { keywords: ["metal", "alloy", "ore"], emoji: "⚒️" },
      { keywords: ["tech", "advanced", "rare", "quantum"], emoji: "🛸" },
      { keywords: ["health", "medical", "pharma"], emoji: "🩺" },
      { keywords: ["construct", "industrial", "material"], emoji: "🏗️" },
    ];

    // Check keyword-based emojis
    for (const mapping of keywordEmojiMap) {
      if (mapping.keywords.some((keyword) => lowercaseName.includes(keyword))) {
        return mapping.emoji;
      }
    }

    // Action type fallback
    const actionEmojis = {
      mining: "⛏️",
      salvage: "🏭",
      haul: "🚚",
    };

    // Fallback to action type or generic emoji
    return actionEmojis[actionType] || "📦";
  },
};

class ResourceModel {
  // Add a new resource with automatic emoji generation
  static async add(name, value, actionType) {
    try {
      // Generate an emoji if not provided
      const emoji = ResourceEmojiGenerator.generateEmoji(name, actionType);

      const [result] = await pool.execute(
        "INSERT INTO resources (name, value, action_type, emoji) VALUES (?, ?, ?, ?)",
        [name, value, actionType, emoji]
      );
      return result.insertId;
    } catch (error) {
      console.error("Error adding resource:", error);
      throw error;
    }
  }

  // Override existing methods to include emoji
  static async getAll() {
    try {
      const [rows] = await pool.execute(
        "SELECT * FROM resources ORDER BY action_type, name"
      );
      return rows;
    } catch (error) {
      console.error("Error getting resources:", error);
      throw error;
    }
  }

  // Get resources grouped by action type with emojis
  static async getGroupedResources() {
    try {
      const [rows] = await pool.execute(
        "SELECT * FROM resources ORDER BY action_type, name"
      );

      const grouped = {
        mining: [],
        salvage: [],
        haul: [],
      };

      rows.forEach((resource) => {
        if (grouped[resource.action_type]) {
          grouped[resource.action_type].push({
            name: resource.name,
            value: resource.value,
            emoji:
              resource.emoji ||
              ResourceEmojiGenerator.generateEmoji(
                resource.name,
                resource.action_type
              ),
          });
        }
      });

      return grouped;
    } catch (error) {
      console.error("Error getting grouped resources:", error);
      throw error;
    }
  }

  // Method to update emoji for a specific resource
  static async updateEmoji(value, actionType, emoji) {
    try {
      const [result] = await pool.execute(
        "UPDATE resources SET emoji = ? WHERE value = ? AND action_type = ?",
        [emoji, value, actionType]
      );
      return result.affectedRows > 0;
    } catch (error) {
      console.error("Error updating resource emoji:", error);
      throw error;
    }
  }
}

module.exports = {
  ResourceEmojiMapper,
  ResourceModel,
};
