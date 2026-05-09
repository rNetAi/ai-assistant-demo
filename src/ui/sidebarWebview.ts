import * as vscode from 'vscode';
import { AgentController } from '../agent/agentController';
import { SessionManager } from '../auth/session';
import { ChatSessionManager } from '../session/sessionManager';

export class SidebarWebviewProvider implements vscode.WebviewViewProvider {
    public static readonly viewType = 'ai-agent-sidebar';
    private _view?: vscode.WebviewView;
    private _pendingPermissionResolve: ((v: boolean) => void) | null = null;

    constructor(
        private extensionUri: vscode.Uri,
        private agentController: AgentController,
        private session: SessionManager,
        private chatSessionManager: ChatSessionManager
    ) {
        this.agentController.setCallbacks(
            (desc) => this.postMessage({ type: 'progress', data: desc }),
            (active) => this.postMessage({ type: 'thinking', data: active })
        );

        this.agentController.setConfirmCallback((action, description) => {
            return new Promise<boolean>((resolve) => {
                this.postMessage({ type: 'requestPermission', data: { action: action.type, description } });
                this._pendingPermissionResolve = resolve;
            });
        });

        this.session.onSessionChanged(() => this.syncState());
        this.chatSessionManager.onSessionChanged((s) => this.postMessage({ type: 'activeSessionChanged', data: s }));
    }

    public resolveWebviewView(webviewView: vscode.WebviewView): void {
        this._view = webviewView;
        webviewView.webview.options = {
            enableScripts: true,
            localResourceRoots: [vscode.Uri.joinPath(this.extensionUri, 'webview')]
        };
        webviewView.webview.html = this.getHtmlContent(webviewView.webview);
        webviewView.webview.onDidReceiveMessage(msg => this.handleMessage(msg));
        this.syncState();
    }

    private async handleMessage(message: any) {
        switch (message.type) {
            case 'ready': await this.syncState(); break;
            case 'login': await vscode.commands.executeCommand('ai.login'); break;
            case 'logout': await vscode.commands.executeCommand('ai.logout'); break;
            case 'chat': if (message.text) await this.agentController.handleRequest(message.text); break;
            case 'stop': this.agentController.cancel(); break;
            case 'newChat':
                const ws = vscode.workspace.workspaceFolders?.[0]?.uri.fsPath || 'No Workspace';
                await this.chatSessionManager.createNewSession(ws);
                break;
            case 'loadHistory':
                const history = await this.chatSessionManager.listSessions();
                this.postMessage({ type: 'historyList', data: history });
                break;
            case 'loadSession': await this.chatSessionManager.loadSession(message.id); break;
            case 'permissionResponse':
                if (this._pendingPermissionResolve) {
                    this._pendingPermissionResolve(message.approved);
                    this._pendingPermissionResolve = null;
                }
                break;
        }
    }

    public async syncState() {
        const loggedIn = await this.session.isLoggedIn();
        this.postMessage({ type: 'sessionChanged', data: { loggedIn } });
        if (loggedIn) {
            let active = this.chatSessionManager.getActiveSession();
            if (!active) { await this.chatSessionManager.init(); active = this.chatSessionManager.getActiveSession(); }
            if (active) this.postMessage({ type: 'activeSessionChanged', data: active });
        }
    }

    private postMessage(msg: any) { this._view?.webview.postMessage(msg); }

    private getHtmlContent(webview: vscode.Webview): string {
        const styleUri = webview.asWebviewUri(vscode.Uri.joinPath(this.extensionUri, 'webview', 'style.css'));
        const scriptUri = webview.asWebviewUri(vscode.Uri.joinPath(this.extensionUri, 'webview', 'main.js'));
        const nonce = getNonce();
        
        // Simple monochrome SVGs matching user reference
        const iconNew = `<svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor"><path d="M8 4v8M4 8h8" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/></svg>`;
        const iconHistory = `<svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor"><path d="M8 4V8L10 10M14 8A6 6 0 1 1 2 8A6 6 0 0 1 14 8Z" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" fill="none"/></svg>`;
        const iconLogout = `<svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor"><path d="M10 3H13C13.5523 3 14 3.44772 14 4V12C14 12.5523 13.5523 13 13 13H10M7 11L10 8L7 5M10 8H2" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" fill="none"/></svg>`;

        return `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <meta http-equiv="Content-Security-Policy" content="default-src 'none'; style-src ${webview.cspSource} 'unsafe-inline'; script-src 'nonce-${nonce}';">
    <link rel="stylesheet" href="${styleUri}">
</head>
<body>
    <div id="app">
        <div id="login-screen" class="screen login-screen">
            <h1>AI Assistant</h1>
            <p>Professional coding agent for your workspace.</p>
            <button id="btn-login" class="btn btn-primary">Login with rNet</button>
        </div>

        <div id="chat-screen" class="screen hidden">
            <div class="chat-header">
                <span class="title">Chat</span>
                <div class="actions">
                    <button id="btn-new-chat" title="New Chat">${iconNew}</button>
                    <button id="btn-history" title="History">${iconHistory}</button>
                    <button id="btn-logout" title="Logout">${iconLogout}</button>
                </div>
            </div>

            <div id="history-view" class="history-view hidden">
                <div class="chat-header">
                    <span class="title">History</span>
                    <button id="btn-close-history" title="Close">×</button>
                </div>
                <div id="history-list"></div>
            </div>

            <div id="permission-modal" class="permission-modal hidden">
                <div class="permission-card">
                    <h3>Confirm Action</h3>
                    <p id="permission-desc"></p>
                    <div class="permission-actions">
                        <button id="btn-reject" class="btn btn-ghost">Reject</button>
                        <button id="btn-approve" class="btn btn-primary">Approve</button>
                    </div>
                </div>
            </div>

            <div id="chat-messages"></div>
            
            <div class="status-container">
                <div id="status-line" class="status-line hidden">
                    <div class="spinner"></div>
                    <span id="status-text"></span>
                </div>
            </div>

            <div class="chat-input-area">
                <div class="input-wrapper">
                    <textarea id="chat-input" placeholder="Message AI Agent..." rows="1"></textarea>
                    <div class="input-footer">
                        <button id="btn-send" class="btn btn-primary">Send</button>
                        <button id="btn-stop" class="btn btn-stop hidden">Stop</button>
                    </div>
                </div>
            </div>
        </div>
    </div>
    <script nonce="${nonce}" src="${scriptUri}"></script>
</body>
</html>`;
    }
}
function getNonce() {
    let t = ''; const c = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
    for (let i = 0; i < 32; i++) t += c.charAt(Math.floor(Math.random() * c.length));
    return t;
}
