import * as fs from 'fs/promises';
import * as path from 'path';
import * as vscode from 'vscode';

/**
 * Generates a clean, text-based file tree for the agent.
 */
export async function getWorkspaceTree(maxTokens: number = 4000): Promise<string> {
    const root = vscode.workspace.workspaceFolders?.[0]?.uri.fsPath;
    if (!root) return 'No workspace open.';

    const ignore = ['node_modules', '.git', 'dist', 'out', '.vsix', 'package-lock.json', '.devdebug'];
    
    let tree = '';
    
    async function walk(dir: string, indent: string = '') {
        const files = await fs.readdir(dir, { withFileTypes: true });
        for (const file of files) {
            if (ignore.includes(file.name)) continue;
            
            tree += `${indent}${file.isDirectory() ? '📁' : '📄'} ${file.name}\n`;
            
            if (file.isDirectory() && tree.length < maxTokens) {
                await walk(path.join(dir, file.name), indent + '  ');
            }
            if (tree.length >= maxTokens) break;
        }
    }

    try {
        await walk(root);
        return tree || 'Empty directory.';
    } catch (err) {
        return 'Error reading tree.';
    }
}
