const {
  SlashCommandBuilder,
  EmbedBuilder,
  MessageFlags,
} = require("discord.js");
const TargetModel = require("../models/target");
const ContributionModel = require("../models/contribution");
const ResourceModel = require("../models/resource");

function getLocationEmoji(location) {
  const locationLower = location.toLowerCase();

  // Specific location type detection
  const locationMappings = {
    "space station": "🚀",
    "mining base": "⛏️",
    "salvage yard": "🏭",
    "trade hub": "🤝",
    depot: "📦",
    outpost: "🏕️",
    settlement: "🏘️",
    frontier: "🌄",
    asteroid: "🪨",
    planet: "🌍",
    moon: "🌕",
  };

  // Check for exact matches first
  for (const [key, emoji] of Object.entries(locationMappings)) {
    if (locationLower.includes(key)) return emoji;
  }

  // Generic fallbacks
  if (locationLower.includes("planet")) return "🌍";
  if (locationLower.includes("station")) return "🚀";
  if (locationLower.includes("base")) return "⛏️";
  if (locationLower.includes("yard")) return "🏭";
  if (locationLower.includes("hub")) return "🤝";

  // Random selection for unknown locations
  const genericEmojis = ["📍", "📌", "🌐", "🗺️", "📦"];
  return genericEmojis[Math.floor(Math.random() * genericEmojis.length)];
}

function getResourceColor(resourceType) {
  const colorMappings = {
    copper: 0xb87333, // Copper brown
    iron: 0x8b4513, // Saddle brown
    gold: 0xffd700, // Gold
    diamond: 0x00ffff, // Cyan
    quantainium: 0x4b0082, // Indigo
    titanium: 0xc0c0c0, // Silver
    aluminum: 0xa0a0a0, // Light gray
    rmc: 0x808080, // Gray
    cm: 0x4682b4, // Steel blue
    "medical supplies": 0x00ff00, // Bright green
    "agricultural supplies": 0x228b22, // Forest green
  };

  return colorMappings[resourceType.toLowerCase()] || 0x0099ff; // Default blue
}

module.exports = {
  data: new SlashCommandBuilder()
    .setName("location")
    .setDescription("Show where resources have been delivered/found")
    .addStringOption((option) =>
      option
        .setName("resource")
        .setDescription("Resource to check (leave empty for all)")
        .setRequired(false)
    ),

  async execute(interaction) {
    try {
      await interaction.deferReply(); // Use defer since this might take time

      // Get specific resource filter if provided
      const resourceFilter = interaction.options
        .getString("resource")
        ?.toLowerCase();

      // Create embed for the response
      const embed = new EmbedBuilder()
        .setColor(0x0099ff)
        .setTitle("🌍 Resource Delivery Locations")
        .setDescription(
          resourceFilter
            ? `Tracking delivery locations for ${resourceFilter}`
            : "Comprehensive view of resource delivery locations"
        )
        .setTimestamp();

      // Get all targets
      let targets = await TargetModel.getAllWithProgress();

      // Filter targets if resource filter provided
      if (resourceFilter) {
        targets = targets.filter(
          (target) => target.resource === resourceFilter
        );

        if (targets.length === 0) {
          embed.setDescription(`No data found for resource: ${resourceFilter}`);
          return interaction.editReply({ embeds: [embed] });
        }
      }

      // Collect and organize location data
      const locationMap = new Map();
      let resourcesFound = false;
      let totalContributions = 0;

      // Process contributions for each target
      for (const target of targets) {
        const contributions = await ContributionModel.getByTargetId(
          target.id,
          1000
        );

        if (contributions && contributions.length > 0) {
          resourcesFound = true;

          // Group by location
          for (const contribution of contributions) {
            const locationKey = contribution.location.toLowerCase();

            if (!locationMap.has(locationKey)) {
              locationMap.set(locationKey, {
                name: contribution.location,
                resources: new Map(),
                totalAmount: 0,
                contributionCount: 0,
              });
            }

            const locationData = locationMap.get(locationKey);
            const resourceKey = `${target.action}_${target.resource}`;

            if (!locationData.resources.has(resourceKey)) {
              locationData.resources.set(resourceKey, {
                action: target.action,
                resource: target.resource,
                total: 0,
                contributionCount: 0,
              });
            }

            const resourceData = locationData.resources.get(resourceKey);
            resourceData.total += contribution.amount;
            resourceData.contributionCount++;

            locationData.totalAmount += contribution.amount;
            locationData.contributionCount++;
            totalContributions += contribution.amount;
          }
        }
      }

      // No resources found
      if (!resourcesFound) {
        if (resourceFilter) {
          embed.setDescription(`No data found for resource: ${resourceFilter}`);
        } else {
          embed.setDescription("No resources have been logged yet.");
        }
        return interaction.editReply({ embeds: [embed] });
      }

      // Sort locations by total contribution
      const sortedLocations = Array.from(locationMap.values())
        .sort((a, b) => b.totalAmount - a.totalAmount)
        .slice(0, 10); // Top 10 locations

      // Get resource info for display names
      const resources = await ResourceModel.getAll();
      const resourceMap = new Map();
      resources.forEach((resource) => {
        resourceMap.set(
          `${resource.value}_${resource.action_type}`,
          resource.name
        );
      });

      // Add location fields to the embed
      sortedLocations.forEach((location, index) => {
        let fieldValue = [];
        const locationPercentage = Math.floor(
          (location.totalAmount / totalContributions) * 100
        );
        const locationEmoji = getLocationEmoji(location.name);

        // Resource breakdown
        location.resources.forEach((resourceData) => {
          // Get proper resource name either from map or fallback
          const resourceMapKey = `${resourceData.resource}_${
            resourceData.action === "mine"
              ? "mining"
              : resourceData.action === "salvage"
              ? "salvage"
              : "haul"
          }`;
          const resourceName =
            resourceMap.get(resourceMapKey) ||
            resourceData.resource.charAt(0).toUpperCase() +
              resourceData.resource.slice(1);
          const actionName =
            resourceData.action.charAt(0).toUpperCase() +
            resourceData.action.slice(1);

          const resourceColor = getResourceColor(resourceName);

          fieldValue.push(
            `**${actionName} ${resourceName}**: ${resourceData.total} SCU ` +
              `(${resourceData.contributionCount} contributions)`
          );
        });

        embed.addFields({
          name: `${locationEmoji} #${index + 1}: ${location.name}`,
          value: [
            `**Total Contributions**: ${location.totalAmount} SCU`,
            `**Contribution Percentage**: ${locationPercentage}%`,
            `**Unique Resource Types**: ${location.resources.size}`,
            `\n${fieldValue.join("\n")}`,
          ].join("\n"),
        });
      });

      // Add overall statistics field
      embed.addFields({
        name: "📊 Location Collection Overview",
        value: [
          `**Total Contributions**: ${totalContributions} SCU`,
          `**Unique Locations**: ${locationMap.size}`,
          `**Top Location**: ${sortedLocations[0]?.name || "N/A"}`,
        ].join("\n"),
      });

      await interaction.editReply({ embeds: [embed] });
    } catch (error) {
      console.error("Error in location command:", error);

      // If already deferred, editReply, otherwise reply
      if (interaction.deferred) {
        await interaction.editReply({
          content: "An error occurred while fetching location data.",
          flags: MessageFlags.Ephemeral,
        });
      } else {
        await interaction.reply({
          content: "An error occurred while fetching location data.",
          flags: MessageFlags.Ephemeral,
        });
      }
    }
  },
};
