(function () {
    const vscode = acquireVsCodeApi();

    const el = (id) => document.getElementById(id);

    const loginScreen = el('login-screen');
    const chatScreen = el('chat-screen');
    const btnLogin = el('btn-login');
    const btnLogout = el('btn-logout');
    const btnSend = el('btn-send');
    const btnStop = el('btn-stop');
    const chatInput = el('chat-input');
    const chatMessages = el('chat-messages');
    const statusLine = el('status-line');
    const statusText = el('status-text');
    const permissionModal = el('permission-modal');
    const historyView = el('history-view');

    let isRunning = false;

    // ---- Event Listeners ----
    if (btnLogin) btnLogin.onclick = () => vscode.postMessage({ type: 'login' });
    if (btnLogout) btnLogout.onclick = () => vscode.postMessage({ type: 'logout' });
    if (btnSend) btnSend.onclick = sendMessage;
    if (btnStop) btnStop.onclick = () => {
        vscode.postMessage({ type: 'stop' });
        isRunning = false;
        updateUI();
    };

    if (el('btn-new-chat')) el('btn-new-chat').onclick = () => vscode.postMessage({ type: 'newChat' });
    if (el('btn-history')) el('btn-history').onclick = () => {
        historyView.classList.remove('hidden');
        vscode.postMessage({ type: 'loadHistory' });
    };
    if (el('btn-close-history')) el('btn-close-history').onclick = () => historyView.classList.add('hidden');

    if (el('btn-approve')) el('btn-approve').onclick = () => {
        permissionModal.classList.add('hidden');
        vscode.postMessage({ type: 'permissionResponse', approved: true });
    };
    if (el('btn-reject')) el('btn-reject').onclick = () => {
        permissionModal.classList.add('hidden');
        vscode.postMessage({ type: 'permissionResponse', approved: false });
    };

    if (chatInput) {
        chatInput.oninput = () => {
            chatInput.style.height = 'auto';
            chatInput.style.height = chatInput.scrollHeight + 'px';
        };
        chatInput.onkeydown = (e) => {
            if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                sendMessage();
            }
        };
    }

    // ---- Core UI Logic ----
    function sendMessage() {
        if (!chatInput || isRunning) return;
        const text = chatInput.value.trim();
        if (!text) return;

        addMessage('user', text);
        vscode.postMessage({ type: 'chat', text });
        chatInput.value = '';
        chatInput.style.height = 'auto';
    }

    function addMessage(role, text) {
        if (!chatMessages) return;
        const msg = document.createElement('div');
        msg.className = `message ${role}`;
        msg.textContent = text;
        chatMessages.appendChild(msg);
        chatMessages.scrollTop = chatMessages.scrollHeight;
    }

    function updateStatus(text) {
        if (!statusLine || !statusText) return;
        if (!text) {
            statusLine.classList.add('hidden');
            return;
        }
        statusText.textContent = text;
        statusLine.classList.remove('hidden');
        chatMessages.scrollTop = chatMessages.scrollHeight;
    }

    function updateUI() {
        btnSend.classList.toggle('hidden', isRunning);
        btnStop.classList.toggle('hidden', !isRunning);
        chatInput.placeholder = isRunning ? 'Agent is thinking...' : 'Message AI Agent...';
    }

    // ---- Message Handler ----
    window.addEventListener('message', event => {
        const msg = event.data;
        switch (msg.type) {
            case 'sessionChanged':
                if (msg.data.loggedIn) {
                    loginScreen.classList.add('hidden');
                    chatScreen.classList.remove('hidden');
                } else {
                    loginScreen.classList.remove('hidden');
                    chatScreen.classList.add('hidden');
                }
                break;
            case 'activeSessionChanged':
                chatMessages.innerHTML = '';
                msg.data.messages?.forEach(m => addMessage(m.role === 'user' ? 'user' : 'assistant', m.content));
                break;
            case 'progress':
                updateStatus(msg.data);
                break;
            case 'thinking':
                isRunning = msg.data;
                updateUI();
                if (!isRunning) updateStatus('');
                break;
            case 'requestPermission':
                el('permission-desc').textContent = msg.data.description;
                permissionModal.classList.remove('hidden');
                break;
            case 'historyList':
                const list = el('history-list');
                list.innerHTML = '';
                msg.data.forEach(s => {
                    const item = document.createElement('div');
                    item.className = 'history-item';
                    item.textContent = s.title || 'Untitled Session';
                    item.onclick = () => {
                        vscode.postMessage({ type: 'loadSession', id: s.id });
                        historyView.classList.add('hidden');
                    };
                    list.appendChild(item);
                });
                break;
        }
    });

    vscode.postMessage({ type: 'ready' });
})();
