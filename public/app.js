// Linachat Web App Client Logic
document.addEventListener('DOMContentLoaded', () => {
  const chatForm = document.getElementById('chat-form');
  const userInput = document.getElementById('user-input');
  const sendBtn = document.getElementById('send-btn');
  const messagesList = document.getElementById('messages-list');
  const welcomeScreen = document.getElementById('welcome-screen');
  const clearChatBtn = document.getElementById('clear-chat-btn');
  const statusPill = document.getElementById('status-pill');
  const statusText = document.getElementById('status-text');
  const liveIstTime = document.getElementById('live-ist-time');
  const suggestionCards = document.querySelectorAll('.suggestion-card');

  let conversationHistory = [];
  let isGenerating = false;

  // Live IST Clock
  function updateISTClock() {
    const now = new Date();
    const istTimeStr = new Intl.DateTimeFormat('en-IN', {
      timeZone: 'Asia/Kolkata',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      hour12: true
    }).format(now);
    liveIstTime.textContent = `${istTimeStr} IST`;
  }
  setInterval(updateISTClock, 1000);
  updateISTClock();

  // Check Ollama and Model Status
  async function checkServerStatus() {
    try {
      const res = await fetch('/api/status');
      const data = await res.json();
      if (data.status === 'online') {
        if (data.modelReady) {
          statusPill.className = 'status-pill online';
          statusText.textContent = `Linachat Ready (${data.model})`;
        } else {
          statusPill.className = 'status-pill checking';
          statusText.textContent = `Model ${data.model} not ready`;
        }
      } else {
        statusPill.className = 'status-pill offline';
        statusText.textContent = 'Ollama Offline';
      }
    } catch {
      statusPill.className = 'status-pill offline';
      statusText.textContent = 'Server Offline';
    }
  }
  checkServerStatus();
  setInterval(checkServerStatus, 15000);

  // Auto-resize textarea
  userInput.addEventListener('input', () => {
    userInput.style.height = 'auto';
    userInput.style.height = Math.min(userInput.scrollHeight, 150) + 'px';
  });

  userInput.addEventListener('keydown', (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      if (!isGenerating && userInput.value.trim()) {
        chatForm.dispatchEvent(new Event('submit'));
      }
    }
  });

  // Suggestion card click handlers
  suggestionCards.forEach(card => {
    card.addEventListener('click', () => {
      const prompt = card.getAttribute('data-prompt');
      if (prompt && !isGenerating) {
        userInput.value = prompt;
        userInput.style.height = 'auto';
        chatForm.dispatchEvent(new Event('submit'));
      }
    });
  });

  // Clear chat
  clearChatBtn.addEventListener('click', () => {
    if (confirm('Clear the current conversation?')) {
      conversationHistory = [];
      messagesList.innerHTML = '';
      messagesList.style.display = 'none';
      welcomeScreen.style.display = 'flex';
      userInput.focus();
    }
  });

  // Escape HTML helper
  function escapeHTML(str) {
    return str.replace(/[&<>'"]/g, tag => ({
      '&': '&amp;',
      '<': '&lt;',
      '>': '&gt;',
      "'": '&#39;',
      '"': '&quot;'
    }[tag] || tag));
  }

  // Simple Markdown Parser for responses
  function renderMarkdown(text) {
    if (!text) return '';
    let html = escapeHTML(text);

    // Code blocks: ```lang\ncode\n```
    html = html.replace(/```([a-zA-Z0-9_]*)\n([\s\S]*?)```/g, (match, lang, code) => {
      return `<pre><code class="language-${lang}">${code.trim()}</code></pre>`;
    });

    // Inline code: `code`
    html = html.replace(/`([^`]+)`/g, '<code>$1</code>');

    // Bold: **text**
    html = html.replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>');

    // Italic: *text*
    html = html.replace(/\*([^*]+)\*/g, '<em>$1</em>');

    // Bullet points: lines starting with * or -
    html = html.replace(/(?:^|\n)[*-]\s+(.+)/g, '<li>$1</li>');
    html = html.replace(/(<li>[\s\S]*?<\/li>)/g, '<ul>$1</ul>');
    html = html.replace(/<\/ul>\s*<ul>/g, ''); // merge adjacent lists

    // Numbered lists: lines starting with 1.
    html = html.replace(/(?:^|\n)\d+\.\s+(.+)/g, '<li>$1</li>');

    // Paragraphs / newlines
    html = html.split('\n\n').map(p => {
      if (p.startsWith('<pre>') || p.startsWith('<ul>') || p.startsWith('<ol>')) return p;
      return `<p>${p.replace(/\n/g, '<br>')}</p>`;
    }).join('');

    return html;
  }

  // Append a message bubble to the list
  function appendMessage(role, content = '', isStreaming = false) {
    if (welcomeScreen.style.display !== 'none') {
      welcomeScreen.style.display = 'none';
      messagesList.style.display = 'flex';
    }

    const row = document.createElement('div');
    row.className = `message-row ${role}`;

    const istNow = new Intl.DateTimeFormat('en-IN', {
      timeZone: 'Asia/Kolkata',
      hour: '2-digit',
      minute: '2-digit',
      hour12: true
    }).format(new Date());

    if (role === 'assistant') {
      row.innerHTML = `
        <div class="msg-avatar assistant-avatar">✨</div>
        <div class="bubble ${isStreaming ? 'typing-cursor' : ''}">
          <div class="bubble-content">${renderMarkdown(content)}</div>
          <div class="bubble-footer">
            <span class="msg-time">${istNow}</span>
            <button class="copy-btn" title="Copy to clipboard">Copy</button>
          </div>
        </div>
      `;
      // Attach copy handler
      const copyBtn = row.querySelector('.copy-btn');
      copyBtn.addEventListener('click', () => {
        const textToCopy = row.querySelector('.bubble-content').innerText;
        navigator.clipboard.writeText(textToCopy).then(() => {
          copyBtn.textContent = 'Copied! ✓';
          setTimeout(() => { copyBtn.textContent = 'Copy'; }, 1500);
        });
      });
    } else {
      row.innerHTML = `
        <div class="bubble">
          <div class="bubble-content">${escapeHTML(content).replace(/\n/g, '<br>')}</div>
          <div class="bubble-footer">
            <span class="msg-time">${istNow}</span>
          </div>
        </div>
      `;
    }

    messagesList.appendChild(row);
    scrollToBottom();
    return row;
  }

  function scrollToBottom() {
    const chatContainer = document.getElementById('chat-container');
    chatContainer.scrollTop = chatContainer.scrollHeight;
  }

  // Form submit handler
  chatForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const prompt = userInput.value.trim();
    if (!prompt || isGenerating) return;

    // Reset input
    userInput.value = '';
    userInput.style.height = 'auto';

    // Append user message
    appendMessage('user', prompt);
    conversationHistory.push({ role: 'user', content: prompt });

    // Set generating state
    isGenerating = true;
    sendBtn.disabled = true;

    // Create assistant streaming placeholder
    const assistantRow = appendMessage('assistant', '', true);
    const bubble = assistantRow.querySelector('.bubble');
    const contentEl = assistantRow.querySelector('.bubble-content');

    let fullResponse = '';

    try {
      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ messages: conversationHistory })
      });

      if (!response.ok) {
        const errData = await response.json();
        throw new Error(errData.error || 'Server error occurred');
      }

      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let buffer = '';

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n\n');
        buffer = lines.pop(); // keep partial

        for (const line of lines) {
          const trimmed = line.trim();
          if (!trimmed.startsWith('data: ')) continue;
          const dataStr = trimmed.replace(/^data:\s*/, '');
          if (dataStr === '[DONE]') continue;

          try {
            const parsed = JSON.parse(dataStr);
            if (parsed.text) {
              fullResponse += parsed.text;
              contentEl.innerHTML = renderMarkdown(fullResponse);
              scrollToBottom();
            } else if (parsed.error) {
              throw new Error(parsed.error);
            }
          } catch (jsonErr) {
            // ignore partial json
          }
        }
      }

      // Finish streaming
      bubble.classList.remove('typing-cursor');
      conversationHistory.push({ role: 'assistant', content: fullResponse });

    } catch (err) {
      bubble.classList.remove('typing-cursor');
      contentEl.innerHTML = `<span style="color: #f87171;">⚠️ Error: ${escapeHTML(err.message)}</span>`;
    } finally {
      isGenerating = false;
      sendBtn.disabled = false;
      userInput.focus();
    }
  });

  userInput.focus();
});
