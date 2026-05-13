import * as vscode from 'vscode';
import { RNetAuth, RNetAuthConfig, RNetAi, TokenResponse } from '@rnet-ai/rnet-sso-node';
import { logger } from '../utils/logger';
import * as dotenv from 'dotenv';
import * as path from 'path';

// Load .env from the extension directory
dotenv.config({ path: path.join(__dirname, '..', '..', '.env') });

/**
 * Professional RNet Auth Manager.
 * Orchestrates the OAuth2 PKCE flow within the VS Code environment.
 */
export class RNetAuthManager {
    private auth: RNetAuth;
    private ai: RNetAi;

    constructor() {
        const config: RNetAuthConfig = {
            clientId: process.env.RNET_CLIENT_ID || '',
            clientSecret: process.env.RNET_CLIENT_SECRET || '',
            redirectUri: 'vscode://rnet-ai.rnet-ai-agent/auth-callback'
        };
        this.auth = new RNetAuth(config);
        this.ai = new RNetAi();
    }

    getAiClient(): RNetAi {
        return this.ai;
    }

    /**
     * Executes the login flow using VS Code's external uri handler.
     */
    async login(): Promise<TokenResponse> {
        logger.info('Starting RNet SSO login flow (PKCE + State)...');

        // 1. Generate PKCE and State
        const { verifier, challenge } = this.auth.generatePKCE();
        const state = Math.random().toString(36).substring(2, 15);
        const authUrl = this.auth.getAuthorizationUrl(challenge, state);

        // 2. Open Browser
        await vscode.env.openExternal(vscode.Uri.parse(authUrl));

        // 3. Wait for callback
        return new Promise((resolve, reject) => {
            const disposable = vscode.window.registerUriHandler({
                handleUri: async (uri: vscode.Uri) => {
                    if (uri.path === '/auth-callback') {
                        const query = new URLSearchParams(uri.query);
                        const code = query.get('code');
                        const receivedState = query.get('state');

                        if (receivedState !== state) {
                            reject(new Error('State mismatch: potential CSRF attack'));
                            disposable.dispose();
                            return;
                        }

                        if (code) {
                            try {
                                const tokens = await this.auth.exchangeCodeForToken(code, verifier);
                                logger.info('RNet SSO login successful');
                                resolve(tokens);
                            } catch (err: any) {
                                logger.error('Token exchange failed', err);
                                reject(err);
                            }
                        } else {
                            reject(new Error('No code found in callback'));
                        }
                        disposable.dispose();
                    }
                }
            });

            // Optional: Timeout
            setTimeout(() => {
                disposable.dispose();
                reject(new Error('Login timed out'));
            }, 5 * 60 * 1000);
        });
    }

    async refresh(refreshToken: string): Promise<TokenResponse> {
        return await this.auth.refreshAccessToken(refreshToken);
    }
}
