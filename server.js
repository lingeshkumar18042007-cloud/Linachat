const http = require('http');
const fs = require('fs');
const path = require('path');

const PORT = process.env.PORT || 3000;
const OLLAMA_HOST = process.env.OLLAMA_HOST || 'http://127.0.0.1:11434';
const MODEL_NAME = process.env.MODEL_NAME || 'linachat';

// Helper to get current IST time string
function getISTContext() {
  const now = new Date();
  const istDate = new Intl.DateTimeFormat('en-IN', {
    timeZone: 'Asia/Kolkata',
    dateStyle: 'full',
    timeStyle: 'medium',
    hour12: true
  }).format(now);
  return `Current India Standard Time (IST, UTC+5:30): ${istDate}`;
}

const MIME_TYPES = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'application/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.svg': 'image/svg+xml',
  '.ico': 'image/x-icon'
};

const server = http.createServer(async (req, res) => {
  // Enable CORS
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    res.writeHead(204);
    res.end();
    return;
  }

  const parsedUrl = new URL(req.url, `http://${req.headers.host}`);
  const pathname = parsedUrl.pathname;

  // Status check endpoint
  if (req.method === 'GET' && pathname === '/api/status') {
    try {
      const ollamaRes = await fetch(`${OLLAMA_HOST}/api/tags`, { signal: AbortSignal.timeout(3000) });
      if (ollamaRes.ok) {
        const data = await ollamaRes.json();
        const hasModel = data.models && data.models.some(m => m.name.startsWith(MODEL_NAME));
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({
          status: 'online',
          model: MODEL_NAME,
          modelReady: hasModel,
          istTime: getISTContext(),
          availableModels: data.models ? data.models.map(m => m.name) : []
        }));
        return;
      }
    } catch (err) {
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({
        status: 'offline',
        error: 'Ollama is not running or unreachable at ' + OLLAMA_HOST,
        model: MODEL_NAME,
        modelReady: false,
        istTime: getISTContext()
      }));
      return;
    }
  }

  // Chat endpoint (Streaming)
  if (req.method === 'POST' && pathname === '/api/chat') {
    let body = '';
    req.on('data', chunk => { body += chunk; });
    req.on('end', async () => {
      try {
        const { messages = [] } = JSON.parse(body || '{}');

        // Inject current IST system message to keep chatbot aware of real-world Indian time
        const istContext = getISTContext();
        const enrichedMessages = [
          {
            role: 'system',
            content: `[SYSTEM CONTEXT: ${istContext}. Use this exact time if the user asks for current time/date.]`
          },
          ...messages
        ];

        // Call Ollama chat API
        const ollamaRes = await fetch(`${OLLAMA_HOST}/api/chat`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            model: MODEL_NAME,
            messages: enrichedMessages,
            stream: true
          })
        });

        if (!ollamaRes.ok) {
          const errText = await ollamaRes.text();
          res.writeHead(ollamaRes.status, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ error: errText || 'Failed to communicate with Ollama' }));
          return;
        }

        // Stream response as Server-Sent Events / chunks
        res.writeHead(200, {
          'Content-Type': 'text/event-stream',
          'Cache-Control': 'no-cache',
          'Connection': 'keep-alive'
        });

        const reader = ollamaRes.body.getReader();
        const decoder = new TextDecoder();

        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          const chunk = decoder.decode(value, { stream: true });
          const lines = chunk.split('\n');
          for (const line of lines) {
            if (!line.trim()) continue;
            try {
              const parsed = JSON.parse(line);
              if (parsed.message && parsed.message.content) {
                res.write(`data: ${JSON.stringify({ text: parsed.message.content })}\n\n`);
              }
              if (parsed.done) {
                res.write(`data: [DONE]\n\n`);
              }
            } catch {
              // Ignore line parse error for partial chunks
            }
          }
        }
        res.end();
      } catch (err) {
        console.error('Chat error:', err);
        if (!res.headersSent) {
          res.writeHead(500, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ error: err.message || 'Server error' }));
        } else {
          res.write(`data: ${JSON.stringify({ error: err.message })}\n\n`);
          res.end();
        }
      }
    });
    return;
  }

  // Serve static files from 'public' directory
  let filePath = path.join(__dirname, 'public', pathname === '/' ? 'index.html' : pathname);
  const ext = path.extname(filePath).toLowerCase();
  const contentType = MIME_TYPES[ext] || 'application/octet-stream';

  fs.readFile(filePath, (err, content) => {
    if (err) {
      if (err.code === 'ENOENT') {
        res.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' });
        res.end('404 Not Found');
      } else {
        res.writeHead(500, { 'Content-Type': 'text/plain; charset=utf-8' });
        res.end(`Server Error: ${err.code}`);
      }
    } else {
      res.writeHead(200, { 'Content-Type': contentType });
      res.end(content);
    }
  });
});

server.listen(PORT, () => {
  console.log(`✨ Linachat server running on http://localhost:${PORT}`);
  console.log(`🤖 Powered by Ollama model: ${MODEL_NAME}`);
  console.log(`⏰ Timezone: ${getISTContext()}`);
});
