# TSE Bot - Terra Star Expeditionary Resource Tracker

A comprehensive Discord bot for tracking resource collection across mining, salvage, hauling, and earning operations in Star Citizen.

![Version](https://img.shields.io/badge/version-4.0-blue.svg)
![Node.js](https://img.shields.io/badge/node.js-%3E%3D16.0.0-green.svg)
![Discord.js](https://img.shields.io/badge/discord.js-v14-blue.svg)
![License](https://img.shields.io/badge/license-MIT-green.svg)

## Table of Contents

- [Features](#-features)
- [Quick Start](#-quick-start)
- [Installation](#-installation)
- [User Guide](#-user-guide)
- [Admin Guide](#-admin-guide)
- [Command Reference](#-command-reference)
- [Database Setup](#-database-setup)
- [Configuration](#-configuration)
- [Troubleshooting](#-troubleshooting)
- [Contributing](#-contributing)

## Features

- **Real-time Progress Tracking** - Live dashboards with automatic updates
- **Flexible Target Management** - Set goals for any resource with custom units
- **Comprehensive Leaderboards** - Track top contributors with detailed statistics
- **Location Analytics** - See where resources are being delivered
- **Interactive Dashboards** - User-friendly interfaces with buttons and menus
- **Automated Reporting** - Daily/scheduled progress reports
- **Excel Export** - Professional reports with charts and formatting
- **Multi-Guild Support** - Each Discord server has isolated data
- **Shared Dashboards** - Display data from other servers for alliances
- **High Performance** - Optimized database queries and caching

## Quick Start

### For Users
1. Find a dashboard with "Add Resources" button
2. Click the button and select your action type
3. Choose the resource and enter amount + location
4. View progress with `/progress` command

### For Admins
1. Run `/admin` to open the admin dashboard
2. Set up resources via "Resource Management"
3. Create targets via "Target Management"
4. Create a live dashboard with `/livedashboard`

## Installation

### Prerequisites
- Node.js 16.0.0 or higher
- MySQL 8.0 or higher
- Discord Bot Token

### 1. Clone Repository
```bash
git clone https://github.com/yourusername/tse-bot.git
cd tse-bot
```

### 2. Install Dependencies
```bash
npm install
```

### 3. Environment Configuration
Create a `.env` file:
```env
# Discord Configuration
TOKEN=your_discord_bot_token
CLIENT_ID=your_bot_client_id

# Database Configuration
DB_HOST=localhost
DB_USER=your_db_user
DB_PASSWORD=your_db_password
DB_NAME=tse_bot
DB_PORT=3306

# Optional Configuration
DEFAULT_GUILD_ID=your_primary_discord_server_id
```

### 4. Database Setup

#### For New Installation
```bash
node src/scripts/master-database-setup.js
```

#### For Existing Database Migration
```bash
# 1. Backup your database first!
mysqldump -u username -p database_name > backup.sql

# 2. Run migration
node src/scripts/master-database-setup.js

# 3. Test multi-guild functionality
node src/scripts/test-multi-guild.js
```

### 5. Deploy Commands
```bash
node src/deploy-commands.js
```

### 6. Start Bot
```bash
npm run dev
# or
node src/index.js
```

## User Guide

### Logging Resources

#### Interactive Method (Recommended)
1. Find a message with "Add Resources" button
2. Click button → Select action type → Select resource
3. Fill in the modal with amount and location

#### Slash Command Method
```bash
/log action:mining resource:copper amount:150 location:"Area 18"
```

### Viewing Progress
```bash
/progress                                    # All progress
/progress filter:mining                      # Mining only
/progress date_from:2025-01-01              # Date filtered
```

### Checking Leaderboards
```bash
/leaderboard                                 # Top 10 contributors
/leaderboard filter:salvage limit:5         # Top 5 salvagers
/leaderboard date_from:2025-03-01           # Monthly leaderboard
```

### Location Analytics
```bash
/location                                    # All delivery locations
/location resource:rmc                       # Specific resource locations
```

## Admin Guide

### Admin Dashboard
Primary admin interface:
```bash
/admin
```

### Initial Setup

#### 1. Configure Action Types (Optional)
```bash
/actiontypes list                           # View current types
/actiontypes add name:trading display_name:"Trading Operations" unit:aUEC emoji:💱
```

#### 2. Add Resources
Via admin dashboard:
1. `/admin` → "Resource Management" → "Add Resource"
2. Select action type and enter resource details

Or via command:
```bash
/resources add action:mining name:"Copper" value:"copper"
```

#### 3. Set Collection Targets
```bash
/settarget action:mining resource:copper amount:500 unit:SCU
/settarget action:earn resource:credits amount:1000000 unit:aUEC
```

### Dashboard Management

#### Create Live Dashboard
```bash
/livedashboard channel:#resource-tracking
```
- Updates automatically when users log resources
- Interactive buttons for easy user input

#### Create Shared Dashboard
```bash
/sharedashboard create server_id:1234567890 channel:#alliance-data
```
- Display data from another Discord server
- Perfect for alliance/coalition coordination

### Data Management

#### Export to Excel
```bash
/export
```
Or via admin dashboard → "Export Data"

**Export includes:**
- Resource summary with progress visualization
- Detailed contribution logs
- User leaderboard with statistics
- Multiple formatted worksheets

#### Automated Reports
```bash
/autoreport enable channel:#daily-reports time:08:00
/autoreport disable
```

### Advanced Management

#### Target Management
Via admin dashboard → "Target Management":
- Add new targets
- Remove existing targets
- Reset progress (keeps target, clears contributions)

#### System Monitoring
Via admin dashboard → "System Stats":
- View total contributions and contributors
- Monitor active dashboards
- Check system performance metrics

## Command Reference

### User Commands
| Command | Description | Example |
|---------|-------------|---------|
| `/log` | Log resource contribution | `/log action:mining resource:copper amount:100 location:"Area 18"` |
| `/progress` | View collection progress | `/progress filter:salvage` |
| `/leaderboard` | View top contributors | `/leaderboard limit:10` |
| `/location` | View delivery locations | `/location resource:rmc` |
| `/ping` | Test bot responsiveness | `/ping` |

### Admin Commands
| Command | Description | Example |
|---------|-------------|---------|
| `/admin` | Open admin dashboard | `/admin` |
| `/settarget` | Set collection target | `/settarget action:mining resource:gold amount:200` |
| `/resources` | Manage resources | `/resources list action:salvage` |
| `/actiontypes` | Manage action types | `/actiontypes list` |
| `/livedashboard` | Create live dashboard | `/livedashboard channel:#tracking` |
| `/sharedashboard` | Create shared dashboard | `/sharedashboard create server_id:123` |
| `/export` | Export data to Excel | `/export` |
| `/autoreport` | Configure auto reports | `/autoreport enable channel:#reports time:09:00` |
| `/reset` | Reset data (dangerous!) | `/reset target action:mining resource:copper` |

## Database Setup

### Database Schema
The bot uses MySQL with the following main tables:
- `action_types` - Configurable action categories
- `resources` - Available resources per guild
- `targets` - Collection goals with custom units
- `contributions` - User submissions
- `progress` - Calculated progress tracking
- `dashboards` - Live dashboard tracking
- `settings` - Per-guild configuration

### Migration Scripts
Located in `src/scripts/`:
- `master-database-setup.js` - **Primary setup script**
- `complete-database-migration.js` - Fallback migration
- `test-multi-guild.js` - Verify multi-guild functionality

## Configuration

### Environment Variables
```env
# Required
TOKEN=                    # Discord bot token
CLIENT_ID=               # Discord application ID
DB_HOST=                 # Database host
DB_USER=                 # Database username
DB_PASSWORD=             # Database password
DB_NAME=                 # Database name

# Optional
DB_PORT=3306             # Database port (default: 3306)
DEFAULT_GUILD_ID=        # Primary Discord server ID
NODE_ENV=production      # Environment mode
```

### Discord Permissions
Bot requires these permissions:
- `Send Messages`
- `Use Slash Commands`
- `Embed Links`
- `Attach Files`
- `Read Message History`

### Admin Requirements
Users need Discord "Administrator" permission to access admin commands.

## Troubleshooting

### Common Issues

#### "No target found for [action] [resource]"
**Solution:** Admin needs to create a target first:
```bash
/settarget action:mining resource:copper amount:500
```

#### "You do not have permission"
**Solutions:**
- Ensure user has Discord Administrator permission (for admin commands)
- Check bot has required Discord permissions
- Verify bot is in the correct Discord server

#### Database Connection Errors
**Solutions:**
1. Verify database credentials in `.env`
2. Ensure MySQL server is running
3. Check firewall settings
4. Test connection manually

#### Commands Not Appearing
**Solutions:**
1. Re-run command deployment: `node src/deploy-commands.js`
2. Wait up to 1 hour for Discord to sync commands
3. Check bot has proper permissions in Discord server

### Debug Commands
```bash
/ping                    # Test bot responsiveness
/admin                   # Check admin permissions
```

### Logs and Monitoring
- Bot logs errors to console
- Use admin dashboard → "System Stats" for diagnostics
- Check database logs for connection issues

## 🤝 Contributing

### Development Setup
1. Fork the repository
2. Create feature branch: `git checkout -b feature-name`
3. Make changes and test thoroughly
4. Run tests: `npm test` (if available)
5. Submit pull request

### Code Style
- Use ESLint configuration provided
- Follow existing naming conventions
- Comment complex functionality
- Update documentation for new features

### Testing
- Test all new features with multiple Discord servers
- Verify database migrations work on existing data
- Check admin and user permissions
- Test error handling scenarios

## License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## Support

- **Documentation**: Check this README and inline code comments
- **Issues**: Create GitHub issue with detailed description
- **Discord**: Join our support server [link]
- **Email**: support@example.com

## Acknowledgments

- Discord.js community for excellent documentation
- Star Citizen community for testing and feedback
- Contributors and beta testers

---

**Version 4.0** - Multi-guild support with enhanced features and performance improvements.