import * as vscode from 'vscode';
import { AgentAction } from '../ai/schema';
import { logger } from '../utils/logger';

/**
 * Handles user permission for destructive actions.
 */
export class SecurityGuard {
    private _confirmCallback?: (action: AgentAction, description: string) => Promise<boolean>;

    setConfirmCallback(cb: (a: AgentAction, d: string) => Promise<boolean>) {
        this._confirmCallback = cb;
    }

    /**
     * Checks if an action is allowed or needs user approval.
     */
    async check(action: AgentAction): Promise<boolean> {
        const destructive = ['write_file', 'delete_file', 'delete_folder', 'move_file', 'move_folder', 'run_command'];
        
        if (!destructive.includes(action.type)) {
            return true; // Read-only is always allowed
        }

        if (!this._confirmCallback) {
            logger.warn(`SecurityGuard: No confirm callback set. Blocking destructive action: ${action.type}`);
            return false;
        }

        const description = this.describeAction(action);
        logger.info(`[SECURITY] Requesting permission for: ${description}`);
        
        const approved = await this._confirmCallback(action, description);
        
        if (approved) {
            logger.info(`[SECURITY] Approved: ${action.type}`);
        } else {
            logger.warn(`[SECURITY] Rejected: ${action.type}`);
        }

        return approved;
    }

    private describeAction(action: AgentAction): string {
        switch (action.type) {
            case 'write_file': return `Modify file: ${action.path}`;
            case 'delete_file': return `Delete file: ${action.path}`;
            case 'delete_folder': return `Delete folder: ${action.path}`;
            case 'move_file': return `Move file: ${action.from} -> ${action.to}`;
            case 'move_folder': return `Move folder: ${action.from} -> ${action.to}`;
            case 'run_command': return `Execute command: ${action.command}`;
            default: return `Perform ${action.type}`;
        }
    }
}
