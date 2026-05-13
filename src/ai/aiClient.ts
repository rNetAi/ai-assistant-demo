import { RNetAi } from '@rnet-ai/rnet-oauth-node';
import { SessionManager } from '../auth/session';
import { RNetAuthManager } from '../auth/rnetAuth';
import { EditorContext, AgentResponse, AgentLoopConfig, DEFAULT_LOOP_CONFIG } from './schema';
import { buildGeminiMessages } from './promptBuilder';
import { logger } from '../utils/logger';

const AI_MODEL = 'gemini-2.5-flash-lite';

/**
 * AiClient handles authenticated LLM requests with strict JSON enforcement.
 * This is the "Brain Relay" for Phase 2.
 */
export class AiClient {
    private ai: RNetAi;
    private session: SessionManager;
    private loopConfig: AgentLoopConfig;

    constructor(authManager: RNetAuthManager, session: SessionManager, config?: Partial<AgentLoopConfig>) {
        this.ai = authManager.getAiClient();
        this.session = session;
        this.loopConfig = { ...DEFAULT_LOOP_CONFIG, ...config };
    }

    /**
     * Executes a request to the AI model and ensures the result is valid JSON.
     */
    async call(context: EditorContext): Promise<AgentResponse> {
        let accessToken = await this.session.ensureAccessToken();
        const messages = buildGeminiMessages(context);
        const body = { contents: messages };

        // Log request
        logger.debug('AI Request', body);

        for (let attempt = 1; attempt <= this.loopConfig.maxRetries; attempt++) {
            try {
                let response: any;
                try {
                    response = await this.ai.chat(body, accessToken, AI_MODEL);
                } catch (err: any) {
                    if (err.message?.includes('401') && attempt === 1) {
                        const newToken = await this.session.tryRefreshToken();
                        if (newToken) {
                            accessToken = newToken;
                            response = await this.ai.chat(body, accessToken, AI_MODEL);
                        } else throw new Error('Session expired');
                    } else throw err;
                }

                // Log response
                logger.debug('AI Response', response);

                const text = this.extractText(response);
                return this.parseStrictJson(text);

            } catch (err: any) {
                logger.error(`AI call failed (attempt ${attempt})`, err);
                if (attempt === this.loopConfig.maxRetries) throw err;
                await new Promise(r => setTimeout(r, this.loopConfig.retryDelayMs));
            }
        }
        throw new Error('AI call failed after retries');
    }

    private parseStrictJson(text: string): AgentResponse {
        try {
            // Remove markdown code blocks if AI accidentally included them
            const cleaned = text.trim().replace(/^```(json)?\n?/, '').replace(/\n?```$/, '').trim();
            const parsed = JSON.parse(cleaned);

            if (!parsed.status || !parsed.summary) {
                throw new Error('Response missing required status/summary fields');
            }
            return parsed as AgentResponse;
        } catch (err: any) {
            logger.error('Failed to parse AI JSON', { text, error: err.message });
            throw new Error('AI returned invalid JSON');
        }
    }

    private extractText(response: any): string {
        if (response?.candidates?.[0]?.content?.parts?.[0]?.text) {
            return response.candidates[0].content.parts[0].text;
        }
        throw new Error('Empty AI response');
    }
}
