import * as vscode from 'vscode';
import { logger } from '../utils/logger';

/**
 * Standard tool for running shell commands.
 * Captures stdout and stderr for the agent.
 */
export async function toolRunCommand(command: string): Promise<string> {
    logger.debug(`[TOOL] Requesting command: ${command}`);

    return new Promise((resolve, reject) => {
        // We use a terminal or a task to be visible, but for direct capture 
        // in a professional agent, we often use child_process.
        // However, to keep it "VS Code native", we'll use a hidden execution or a terminal relay.
        
        const cp = require('child_process');
        const root = vscode.workspace.workspaceFolders?.[0]?.uri.fsPath;

        cp.exec(command, { cwd: root }, (error: any, stdout: string, stderr: string) => {
            const output = stdout + stderr;
            if (error) {
                logger.error(`[TOOL] Command failed: ${command}`, { error, stderr });
                resolve(`Error: ${error.message}\nOutput: ${output}`);
            } else {
                logger.debug(`[TOOL] Command success: ${command}`);
                resolve(output || 'Command executed successfully (no output).');
            }
        });
    });
}
