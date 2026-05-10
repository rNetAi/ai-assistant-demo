import * as vscode from 'vscode';

/**
 * Valid actions the agent can perform.
 */
export type ActionType = 
    | 'read_file' 
    | 'write_file' 
    | 'delete_file' 
    | 'delete_folder'
    | 'move_file'
    | 'move_folder'
    | 'run_command'
    | 'read_directory';

/**
 * Structured tool action from the model.
 */
export interface AgentAction {
    type: ActionType;
    path?: string;
    content?: string;
    command?: string;
    from?: string;
    to?: string;
}

/**
 * Strict response contract from the model.
 */
export interface AgentResponse {
    status: 'continue' | 'end';
    summary: string;
    actions: AgentAction[];
    needsApproval: boolean;
}

/**
 * Context provided to the model on every request.
 */
export interface EditorContext {
    userRequest: string;
    workingDirectory: string;
    workspaceTree: string;
    focusedTree?: string;
    selectedFileContent?: string;
    lastCliOutput?: string;
    lastToolResult?: string;
    osName: string;
    shellName: string;
    currentStep: number;
    chatHistory?: { role: string; content: string }[];
}

export interface AgentLoopConfig {
    maxSteps: number;
    delayBetweenStepsMs: number;
    maxRetries: number;
    retryDelayMs: number;
    maxFilesPerStep: number;
    maxTokensForTree: number;
}

export const DEFAULT_LOOP_CONFIG: AgentLoopConfig = {
    maxSteps: 20,
    delayBetweenStepsMs: 2000,
    maxRetries: 3,
    retryDelayMs: 3000,
    maxFilesPerStep: 15,
    maxTokensForTree: 4000
};
