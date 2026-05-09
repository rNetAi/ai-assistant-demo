import * as vscode from 'vscode';
import { RNetAuthManager } from './rnetAuth';
import { logger } from '../utils/logger';

const ACCESS_TOKEN_KEY = 'rnet-ai-agent.accessToken';
const REFRESH_TOKEN_KEY = 'rnet-ai-agent.refreshToken';

/**
 * Manages secure token storage and session lifecycle.
 */
export class SessionManager {
    private secrets: vscode.SecretStorage;
    private authManager: RNetAuthManager;
    private _cachedAccessToken: string | null = null;

    private _onSessionChanged = new vscode.EventEmitter<boolean>();
    readonly onSessionChanged = this._onSessionChanged.event;

    constructor(context: vscode.ExtensionContext, authManager: RNetAuthManager) {
        this.secrets = context.secrets;
        this.authManager = authManager;
    }

    async isLoggedIn(): Promise<boolean> {
        const token = await this.secrets.get(ACCESS_TOKEN_KEY);
        return !!token;
    }

    async ensureAccessToken(): Promise<string> {
        if (this._cachedAccessToken) return this._cachedAccessToken;
        const token = await this.secrets.get(ACCESS_TOKEN_KEY);
        if (token) {
            this._cachedAccessToken = token;
            return token;
        }
        throw new Error('No active session. Please login.');
    }

    async storeTokens(accessToken: string, refreshToken?: string) {
        await this.secrets.store(ACCESS_TOKEN_KEY, accessToken);
        this._cachedAccessToken = accessToken;
        if (refreshToken) {
            await this.secrets.store(REFRESH_TOKEN_KEY, refreshToken);
        }
        this._onSessionChanged.fire(true);
    }

    async logout() {
        await this.secrets.delete(ACCESS_TOKEN_KEY);
        await this.secrets.delete(REFRESH_TOKEN_KEY);
        this._cachedAccessToken = null;
        this._onSessionChanged.fire(false);
    }

    async tryRefreshToken(): Promise<string | null> {
        const refresh = await this.secrets.get(REFRESH_TOKEN_KEY);
        if (!refresh) return null;
        try {
            const tokens = await this.authManager.refresh(refresh);
            await this.storeTokens(tokens.access_token, tokens.refresh_token);
            return tokens.access_token;
        } catch {
            await this.logout();
            return null;
        }
    }
}
