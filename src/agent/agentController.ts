import * as vscode from 'vscode';
import { AiClient } from '../ai/aiClient';
import { AgentResponse, EditorContext, AgentAction, DEFAULT_LOOP_CONFIG, AgentLoopConfig } from '../ai/schema';
import { ChatSessionManager } from '../session/sessionManager';
import { SecurityGuard } from './securityGuard';
import { logger } from '../utils/logger';
import { getWorkspaceTree } from '../utils/paths';
import * as os from 'os';

// Tools
import { toolReadFile, toolWriteFile, toolDelete, toolMove } from '../tools/fileTools';
import { toolRunCommand } from '../tools/commandTool';

export class AgentController {
    private aiClient: AiClient;
    private sessionManager: ChatSessionManager;
    private securityGuard: SecurityGuard;
    private loopConfig: AgentLoopConfig;
    private _cancelled = false;

    private _onProgress?: (desc: string) => void;
    private _onThinking?: (active: boolean) => void;

    private _lastCliOutput = '';
    private _lastToolResult = '';

    constructor(aiClient: AiClient, sessionManager: ChatSessionManager, config?: Partial<AgentLoopConfig>) {
        this.aiClient = aiClient;
        this.sessionManager = sessionManager;
        this.securityGuard = new SecurityGuard();
        this.loopConfig = { ...DEFAULT_LOOP_CONFIG, ...config };
    }

    setCallbacks(onProgress: (d: string) => void, onThinking: (a: boolean) => void) {
        this._onProgress = onProgress;
        this._onThinking = onThinking;
    }

    setConfirmCallback(cb: (a: AgentAction, d: string) => Promise<boolean>) {
        this.securityGuard.setConfirmCallback(cb);
    }

    cancel() { this._cancelled = true; }

    async handleRequest(userRequest: string) {
        this._cancelled = false;
        this._onThinking?.(true);
        this._lastCliOutput = '';
        this._lastToolResult = '';

        logger.info(`New agent task: ${userRequest}`);
        await this.sessionManager.addMessage({ role: 'user', content: userRequest, type: 'text', timestamp: Date.now() });

        try {
            for (let step = 1; step <= this.loopConfig.maxSteps; step++) {
                if (this._cancelled) break;

                this._onProgress?.('Analysing...');

                // 1. Gather Context
                const tree = await getWorkspaceTree(this.loopConfig.maxTokensForTree);
                const context: EditorContext = {
                    userRequest,
                    workingDirectory: vscode.workspace.workspaceFolders?.[0]?.uri.fsPath || '',
                    workspaceTree: tree,
                    osName: os.platform(),
                    shellName: os.platform() === 'win32' ? 'powershell' : 'bash',
                    currentStep: step,
                    lastCliOutput: this._lastCliOutput,
                    lastToolResult: this._lastToolResult,
                    chatHistory: this.sessionManager.getActiveSession()?.messages.map(m => ({ role: m.role, content: m.content }))
                };

                // 2. Brain Decision
                const response = await this.aiClient.call(context);
                this._onProgress?.(response.summary);

                // 3. Execution
                if (response.actions && response.actions.length > 0) {
                    for (const action of response.actions) {
                        const approved = await this.securityGuard.check(action);
                        if (!approved) {
                            this._lastToolResult = `User REJECTED: ${action.type}`;
                            continue;
                        }

                        try {
                            const result = await this.executeAction(action);
                            this._lastToolResult = result;
                        } catch (err: any) {
                            this._lastToolResult = `Error: ${err.message}`;
                        }
                    }
                }

                if (response.status === 'end') {
                    await this.sessionManager.addMessage({ role: 'assistant', content: response.summary, type: 'text', timestamp: Date.now() });
                    break;
                }
            }
        } catch (err: any) {
            logger.error('Agent loop failed', err);
            if (err.message?.includes('429')) {
                await this.sessionManager.addMessage({
                    role: 'assistant',
                    content: 'Rate limit exceeded. Please try again after 1 minute.',
                    type: 'text',
                    timestamp: Date.now()
                });
            } else {
                await this.sessionManager.addMessage({
                    role: 'assistant',
                    content: 'Sorry, I encountered an error. Please try again.',
                    type: 'text',
                    timestamp: Date.now()
                });
            }
        } finally {
            this._onThinking?.(false);
            this._onProgress?.('');
        }
    }

    private async executeAction(action: AgentAction): Promise<string> {
        switch (action.type) {
            case 'read_file': return await toolReadFile(action.path!);
            case 'read_directory': return await getWorkspaceTree(); // Reuse for simple directory listing
            case 'write_file': await toolWriteFile(action.path!, action.content!); return 'File written successfully.';
            case 'delete_file':
            case 'delete_folder': await toolDelete(action.path!); return 'Deleted successfully.';
            case 'move_file':
            case 'move_folder': await toolMove(action.from!, action.to!); return 'Moved successfully.';
            case 'run_command':
                const out = await toolRunCommand(action.command!);
                this._lastCliOutput = out;
                return 'Command executed.';
            default: return 'Unknown tool.';
        }
    }
}
