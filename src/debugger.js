// A simple debugging helper module
const fs = require('fs');
const path = require('path');

// Path to store debug logs
const debugLogPath = path.join(__dirname, 'data', 'debug_log.txt');

// Ensure data directory exists
function ensureLogDirectoryExists() {
    const dataDir = path.join(__dirname, 'data');
    if (!fs.existsSync(dataDir)) {
        fs.mkdirSync(dataDir, { recursive: true });
    }
}

// Log debug information to file
function logDebug(context, ...args) {
    try {
        ensureLogDirectoryExists();
        
        // Format the data for logging
        const timestamp = new Date().toISOString();
        const logData = [
            `\n[${timestamp}] [${context}]`,
            ...args.map(arg => {
                if (typeof arg === 'object') {
                    try {
                        return JSON.stringify(arg, null, 2);
                    } catch (e) {
                        return `[Unstringifiable Object: ${e.message}]`;
                    }
                }
                return String(arg);
            })
        ].join('\n');
        
        // Append to log file
        fs.appendFileSync(debugLogPath, logData);
        
        // Also log to console
        console.log(`[${context}]`, ...args);
        
        return true;
    } catch (error) {
        console.error('Error writing to debug log:', error);
        return false;
    }
}

// Get the current debug log content
function getDebugLog(maxLines = 100) {
    try {
        if (!fs.existsSync(debugLogPath)) {
            return 'No debug log exists yet.';
        }
        
        const logContent = fs.readFileSync(debugLogPath, 'utf8');
        const lines = logContent.split('\n');
        
        // Get the last N lines
        return lines.slice(-maxLines).join('\n');
    } catch (error) {
        console.error('Error reading debug log:', error);
        return `Error reading debug log: ${error.message}`;
    }
}

// Clear the debug log
function clearDebugLog() {
    try {
        ensureLogDirectoryExists();
        fs.writeFileSync(debugLogPath, '');
        return true;
    } catch (error) {
        console.error('Error clearing debug log:', error);
        return false;
    }
}

module.exports = {
    logDebug,
    getDebugLog,
    clearDebugLog
};