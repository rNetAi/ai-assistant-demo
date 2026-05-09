import * as fs from 'fs/promises';
import * as path from 'path';
import * as vscode from 'vscode';
import { logger } from '../utils/logger';

/**
 * Standard tool for reading file contents.
 */
export async function toolReadFile(filePath: string): Promise<string> {
    const root = vscode.workspace.workspaceFolders?.[0]?.uri.fsPath;
    if (!root) throw new Error('No workspace open');

    const fullPath = path.isAbsolute(filePath) ? filePath : path.join(root, filePath);
    
    try {
        const content = await fs.readFile(fullPath, 'utf8');
        logger.debug(`[TOOL] Read file: ${filePath}`);
        return content;
    } catch (err: any) {
        logger.error(`[TOOL] Failed to read file: ${filePath}`, err);
        throw err;
    }
}

/**
 * Standard tool for writing/creating files.
 */
export async function toolWriteFile(filePath: string, content: string): Promise<void> {
    const root = vscode.workspace.workspaceFolders?.[0]?.uri.fsPath;
    if (!root) throw new Error('No workspace open');

    const fullPath = path.isAbsolute(filePath) ? filePath : path.join(root, filePath);
    
    try {
        await fs.mkdir(path.dirname(fullPath), { recursive: true });
        await fs.writeFile(fullPath, content, 'utf8');
        logger.debug(`[TOOL] Wrote file: ${filePath}`);
    } catch (err: any) {
        logger.error(`[TOOL] Failed to write file: ${filePath}`, err);
        throw err;
    }
}

/**
 * Standard tool for deleting files or folders.
 */
export async function toolDelete(targetPath: string): Promise<void> {
    const root = vscode.workspace.workspaceFolders?.[0]?.uri.fsPath;
    if (!root) throw new Error('No workspace open');

    const fullPath = path.isAbsolute(targetPath) ? targetPath : path.join(root, targetPath);
    
    try {
        await fs.rm(fullPath, { recursive: true, force: true });
        logger.debug(`[TOOL] Deleted: ${targetPath}`);
    } catch (err: any) {
        logger.error(`[TOOL] Failed to delete: ${targetPath}`, err);
        throw err;
    }
}

/**
 * Standard tool for moving files or folders.
 */
export async function toolMove(from: string, to: string): Promise<void> {
    const root = vscode.workspace.workspaceFolders?.[0]?.uri.fsPath;
    if (!root) throw new Error('No workspace open');

    const fullFrom = path.isAbsolute(from) ? from : path.join(root, from);
    const fullTo = path.isAbsolute(to) ? to : path.join(root, to);
    
    try {
        await fs.mkdir(path.dirname(fullTo), { recursive: true });
        await fs.rename(fullFrom, fullTo);
        logger.debug(`[TOOL] Moved: ${from} -> ${to}`);
    } catch (err: any) {
        logger.error(`[TOOL] Failed to move: ${from}`, err);
        throw err;
    }
}
