import * as vscode from 'vscode';
import { RNetAuthManager } from './auth/rnetAuth';
import { SessionManager } from './auth/session';
import { ChatSessionManager } from './session/sessionManager';
import { AiClient } from './ai/aiClient';
import { AgentController } from './agent/agentController';
import { SidebarWebviewProvider } from './ui/sidebarWebview';
import { logger } from './utils/logger';

export async function activate(context: vscode.ExtensionContext) {
    logger.info('rNet AI Assistant Activation Started');

    // 1. Initialize Core Managers
    const authManager = new RNetAuthManager();
    const sessionManager = new SessionManager(context, authManager);
    const chatSessionManager = new ChatSessionManager(context);
    await chatSessionManager.init();

    // 2. Initialize AI & Agent
    const aiClient = new AiClient(authManager, sessionManager);
    const agentController = new AgentController(aiClient, chatSessionManager);

    // 3. Register Sidebar Provider
    const sidebarProvider = new SidebarWebviewProvider(
        context.extensionUri,
        agentController,
        sessionManager,
        chatSessionManager
    );

    context.subscriptions.push(
        vscode.window.registerWebviewViewProvider(
            SidebarWebviewProvider.viewType,
            sidebarProvider
        )
    );

    // 4. Register Global Commands
    context.subscriptions.push(
        vscode.commands.registerCommand('ai.login', async () => {
            try {
                const tokens = await authManager.login();
                await sessionManager.storeTokens(tokens.access_token, tokens.refresh_token);
                vscode.window.showInformationMessage('Logged in to rNet AI Assistant ✓');
            } catch (err: any) {
                vscode.window.showErrorMessage(`Login failed: ${err.message}`);
            }
        }),

        vscode.commands.registerCommand('ai.logout', async () => {
            await sessionManager.logout();
            vscode.window.showInformationMessage('Logged out from rNet AI Assistant');
        }),

        vscode.commands.registerCommand('ai.resetSession', async () => {
            const root = vscode.workspace.workspaceFolders?.[0]?.uri.fsPath || 'default';
            await chatSessionManager.createNewSession(root);
            vscode.window.showInformationMessage('Chat session reset');
        })
    );

    logger.info('rNet AI Assistant Ready ✓');
}

export function deactivate() {}
