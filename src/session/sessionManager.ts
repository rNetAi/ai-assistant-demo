import * as vscode from 'vscode';
import * as fs from 'fs/promises';
import * as path from 'path';

export interface ChatMessage {
    role: 'user' | 'assistant';
    content: string;
    timestamp: number;
    type: 'text' | 'action';
}

export interface ChatSession {
    id: string;
    title: string;
    workspaceRoot: string;
    messages: ChatMessage[];
    lastModified: number;
}

/**
 * Manages persistent chat sessions stored locally in the workspace.
 */
export class ChatSessionManager {
    private context: vscode.ExtensionContext;
    private activeSession: ChatSession | null = null;
    private _onSessionChanged = new vscode.EventEmitter<ChatSession | null>();
    readonly onSessionChanged = this._onSessionChanged.event;

    constructor(context: vscode.ExtensionContext) {
        this.context = context;
    }

    getActiveSession() { return this.activeSession; }

    async init() {
        const lastId = this.context.globalState.get<string>('lastActiveSessionId');
        if (lastId) {
            await this.loadSession(lastId);
        } else {
            const root = vscode.workspace.workspaceFolders?.[0]?.uri.fsPath || 'default';
            await this.createNewSession(root);
        }
    }

    async createNewSession(workspaceRoot: string) {
        const id = Date.now().toString();
        this.activeSession = {
            id,
            title: 'New Chat',
            workspaceRoot,
            messages: [],
            lastModified: Date.now()
        };
        await this.saveSession(this.activeSession);
        await this.context.globalState.update('lastActiveSessionId', id);
        this._onSessionChanged.fire(this.activeSession);
    }

    async addMessage(msg: ChatMessage) {
        if (!this.activeSession) return;
        this.activeSession.messages.push(msg);
        this.activeSession.lastModified = Date.now();
        if (this.activeSession.messages.length === 1 && msg.role === 'user') {
            this.activeSession.title = msg.content.substring(0, 30) + '...';
        }
        await this.saveSession(this.activeSession);
        this._onSessionChanged.fire(this.activeSession);
    }

    async loadSession(id: string) {
        const sessions = await this.listSessions();
        const found = sessions.find(s => s.id === id);
        if (found) {
            this.activeSession = found;
            await this.context.globalState.update('lastActiveSessionId', id);
            this._onSessionChanged.fire(this.activeSession);
        }
    }

    async listSessions(): Promise<ChatSession[]> {
        return this.context.globalState.get<ChatSession[]>('allSessions') || [];
    }

    private async saveSession(session: ChatSession) {
        let all = await this.listSessions();
        const idx = all.findIndex(s => s.id === session.id);
        if (idx >= 0) all[idx] = session;
        else all.push(session);
        // Keep only last 50 sessions
        if (all.length > 50) all = all.slice(-50);
        await this.context.globalState.update('allSessions', all);
    }
}
