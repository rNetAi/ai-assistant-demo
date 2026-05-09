import * as vscode from 'vscode';
import * as fs from 'fs';
import * as path from 'path';

/**
 * Standardized logging to .devdebug in JSON format.
 */
function logToFile(level: string, message: string, data?: any) {
    try {
        const workspaceFolder = vscode.workspace.workspaceFolders?.[0];
        if (!workspaceFolder) return;

        const logPath = path.join(workspaceFolder.uri.fsPath, '.devdebug');
        const entry = {
            timestamp: new Date().toISOString(),
            level,
            message,
            data: data || {}
        };

        fs.appendFileSync(logPath, JSON.stringify(entry) + '\n', 'utf8');
    } catch (err) {
        // Silent fail for logs
    }
}

export const logger = {
    info(message: string, data?: any): void {
        logToFile('info', message, data);
    },

    warn(message: string, data?: any): void {
        logToFile('warn', message, data);
    },

    error(message: string, err?: any): void {
        const data = err instanceof Error ? { name: err.name, message: err.message, stack: err.stack } : err;
        logToFile('error', message, data);
    },

    debug(message: string, data?: any): void {
        logToFile('debug', message, data);
    }
};
