# Demo: Basic Coding Agent Extension + RNet OAuth

**AI Assistant** is a VS Code basic coding agent that demonstrates secure, frictionless AI token sharing through the **RNet OAuth** ecosystem.

AI usage is paid from the user's rNet credit balance, so the extension does not need users to paste model API keys.

## Benefits of RNet OAuth
- **Zero Friction:** Users log in once and share AI tokens across Web, CLI, and IDEs. No manual API key pasting.
- **Shared Credits:** The same rNet wallet balance can be used across connected apps.
- **Zero Token Cost:** Developers can build products without paying model API costs.

## Application Features
- **Basic agent chat:** Accepts natural-language coding requests from the extension sidebar.
- **Editor/workspace context:** Reads relevant workspace state before asking the AI model for the next action.
- **Approval-first actions:** Asks for confirmation before writing files or running workspace commands.
- **Persistent sessions:** Saves chat history locally and refreshes rNet tokens when needed.

## Set Up

### Prerequisites

- Node.js and npm
- VS Code `1.85.0` or newer
- An rNet developer account
- An rNet application registered for this extension

### Register the rNet Application

1. Log in at the [RNet Dashboard](https://www.rnetai.org/dashboard).
2. Create a new developer application.
3. Set the redirect URI exactly to:

   ```text
   vscode://rnet-ai.rnet-ai-agent/auth-callback
   ```

   The redirect URI must match exactly, including the `vscode://` scheme, publisher, extension name, and `/auth-callback` path.

4. Copy the generated **Client ID** and **Client Secret**. The secret is shown only once.

### Configure and Build

1. Create a `.env` file in this project root:

   ```env
   RNET_CLIENT_ID=your_client_id
   RNET_CLIENT_SECRET=your_client_secret
   ```
   
2. Install dependencies:

   ```bash
   npm install
   ```

3. Build the extension:

   ```bash
   npm run build
   ```

4. Package the VS Code extension:

   ```bash
   npm run package
   ```

   This creates a `.vsix` package in the project root.

### Install and Test

1. In VS Code, run **Extensions: Install from VSIX...** and choose the generated `.vsix`.
2. Reload VS Code if prompted.
3. Click the **AI Assistant** icon in the Activity Bar.
4. Click **Login with RNet**.
5. Approve the rNet consent screen.
6. Open a workspace file and send a coding request in the sidebar.
7. Review and approve any proposed file or command action.

## Screenshots

### 1. Sidebar Chat Interface

![VS Code AI Chat](media/screenshot/vscode-ai-chat-demo.png)

### 2. Autonomous Action Confirmation

![Confirm Action](media/screenshot/vscode-confirm-action.png)

### 3. Action Success

![Action Success](media/screenshot/vscode-action-success.png)

## Purpose

The primary goal of this example is to show developers how easy it is to integrate RNet OAuth into their own products, allowing their **users** to bring their own AI credits/tokens to any application.

## License
MIT License. See [LICENSE](LICENSE).
