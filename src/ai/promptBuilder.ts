import { EditorContext } from './schema';

const SYSTEM_PROMPT = `You are a professional VS Code coding agent.

You must always return valid JSON only. No markdown. No extra text.

Required Response Structure:
{
  "status": "continue" | "end",
  "summary": "Short progress update or final result summary",
  "actions": [
    {
      "type": "read_file" | "write_file" | "delete_file" | "delete_folder" | "move_file" | "move_folder" | "run_command" | "read_directory",
      "path": "path/to/file",
      "content": "file content if writing",
      "command": "command to run",
      "from": "source path",
      "to": "destination path"
    }
  ],
  "needsApproval": boolean
}

Rules:
- status: "continue" while working, "end" when finished.
- summary: Mandatory. Explain what you are doing or what you finished.
- inspect workspace structure before asking questions.
- do not ask unnecessary questions.
- continue internally through multi-step tasks.
- stop ONLY when the task is complete.
- write, delete, move, and run_command require user permission (needsApproval: true).
- read_file and read_directory are free (needsApproval: false).`;

export function buildGeminiMessages(context: EditorContext) {
    const userPrompt = `
User request: ${context.userRequest}
Working directory: ${context.workingDirectory}
Workspace tree:
${context.workspaceTree}
Last CLI output: ${context.lastCliOutput || 'none'}
Last tool result: ${context.lastToolResult || 'none'}
OS: ${context.osName}
Shell: ${context.shellName}
Current step: ${context.currentStep}

Output JSON only.`;

    const messages = [
        { role: 'user', parts: [{ text: SYSTEM_PROMPT }] },
        { role: 'model', parts: [{ text: 'Understood. I will respond ONLY with valid JSON according to your schema.' }] }
    ];

    if (context.chatHistory) {
        context.chatHistory.forEach(h => {
            messages.push({ role: h.role === 'user' ? 'user' : 'model', parts: [{ text: h.content }] });
        });
    }

    messages.push({ role: 'user', parts: [{ text: userPrompt }] });
    return messages;
}
