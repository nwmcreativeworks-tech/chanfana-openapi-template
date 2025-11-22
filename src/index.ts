import { ApiException, fromHono } from "chanfana";
import { Hono } from "hono";
import { tasksRouter } from "./endpoints/tasks/router";
import chatRouter from "./endpoints/chat/router";
import maintenanceRouter from "./endpoints/maintenance/router";
import thermostatRouter from "./endpoints/thermostat/router";
import authRouter from "./endpoints/auth/router";
import adminRouter from "./endpoints/admin/router";
import { AlexaSkillHandler } from "./endpoints/alexa/alexaSkill";
import { AlexaOAuth } from "./endpoints/alexa/oauth";
import { ContentfulStatusCode } from "hono/utils/http-status";
import { DummyEndpoint } from "./endpoints/dummyEndpoint";
import { cors } from "hono/cors";

// Start a Hono app
const app = new Hono<{ Bindings: Env }>();

// Enable CORS for web interface
app.use("/*", cors());

app.onError((err, c) => {
  if (err instanceof ApiException) {
    // If it's a Chanfana ApiException, let Chanfana handle the response
    return c.json(
      { success: false, errors: err.buildResponse() },
      err.status as ContentfulStatusCode,
    );
  }

  console.error("Global error handler caught:", err); // Log the error if it's not known

  // For other errors, return a generic 500 response
  return c.json(
    {
      success: false,
      errors: [{ code: 7000, message: "Internal Server Error" }],
    },
    500,
  );
});

// Setup OpenAPI registry
const openapi = fromHono(app, {
  docs_url: "/",
  schema: {
    info: {
      title: "Tenant Support Chatbot API",
      version: "1.0.0",
      description: "AI-powered tenant support system with thermostat control, maintenance requests, and vMix troubleshooting. Built with Cloudflare Workers AI - completely FREE!",
    },
  },
});

// Register Chatbot routers
openapi.route("/chat", chatRouter);
openapi.route("/maintenance", maintenanceRouter);
openapi.route("/thermostat", thermostatRouter);

// Register Authentication and Admin routers
openapi.route("/auth", authRouter);
openapi.route("/admin", adminRouter);

// Register Tasks Sub router (example from template)
openapi.route("/tasks", tasksRouter);

// Register other endpoints
openapi.post("/dummy/:slug", DummyEndpoint);

// Alexa Skill endpoint
app.post("/alexa", async (c) => {
	const handler = new AlexaSkillHandler();
	return handler.handle(c);
});

// Alexa OAuth endpoints
const alexaOAuth = new AlexaOAuth();

app.get("/alexa/authorize", async (c) => {
	return alexaOAuth.authorize(c);
});

app.post("/alexa/authorize", async (c) => {
	return alexaOAuth.authorizePost(c);
});

app.post("/alexa/token", async (c) => {
	return alexaOAuth.token(c);
});

// Serve chat interface
app.get("/chatbot", (c) => {
	const html = `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Tenant Support Chatbot</title>
    <style>
        * {
            margin: 0;
            padding: 0;
            box-sizing: border-box;
        }

        body {
            font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif;
            background: linear-gradient(135deg, #0ea5e9 0%, #06b6d4 50%, #8b5cf6 100%);
            height: 100vh;
            display: flex;
            justify-content: center;
            align-items: center;
            padding: 20px;
        }

        .chat-container {
            width: 100%;
            max-width: 800px;
            height: 90vh;
            max-height: 800px;
            background: white;
            border-radius: 20px;
            box-shadow: 0 20px 60px rgba(0, 0, 0, 0.3);
            display: flex;
            flex-direction: column;
            overflow: hidden;
        }

        .chat-header {
            background: linear-gradient(135deg, #0ea5e9 0%, #06b6d4 100%);
            color: white;
            padding: 25px 20px;
            text-align: center;
            box-shadow: 0 4px 12px rgba(6, 182, 212, 0.3);
        }

        .chat-header h1 {
            font-size: 24px;
            margin-bottom: 5px;
        }

        .chat-header p {
            font-size: 14px;
            opacity: 0.9;
        }

        .tenant-info {
            background: #f8f9fa;
            padding: 15px 20px;
            border-bottom: 1px solid #e0e0e0;
            display: flex;
            gap: 15px;
            flex-wrap: wrap;
        }

        .tenant-info input {
            flex: 1;
            min-width: 150px;
            padding: 10px;
            border: 1px solid #ddd;
            border-radius: 8px;
            font-size: 14px;
        }

        .chat-messages {
            flex: 1;
            overflow-y: auto;
            padding: 20px;
            background: #f8f9fa;
        }

        .message {
            margin-bottom: 20px;
            display: flex;
            gap: 10px;
            animation: fadeIn 0.3s ease-in;
        }

        @keyframes fadeIn {
            from {
                opacity: 0;
                transform: translateY(10px);
            }
            to {
                opacity: 1;
                transform: translateY(0);
            }
        }

        .message.user {
            flex-direction: row-reverse;
        }

        .message-avatar {
            width: 40px;
            height: 40px;
            border-radius: 50%;
            display: flex;
            align-items: center;
            justify-content: center;
            font-size: 20px;
            flex-shrink: 0;
        }

        .message.user .message-avatar {
            background: linear-gradient(135deg, #0ea5e9 0%, #06b6d4 100%);
            box-shadow: 0 4px 8px rgba(6, 182, 212, 0.3);
        }

        .message.assistant .message-avatar {
            background: linear-gradient(135deg, #10b981 0%, #059669 100%);
            box-shadow: 0 4px 8px rgba(16, 185, 129, 0.3);
        }

        .message-content {
            max-width: 70%;
            padding: 12px 16px;
            border-radius: 12px;
            line-height: 1.5;
            font-size: 15px;
        }

        .message.user .message-content {
            background: linear-gradient(135deg, #0ea5e9 0%, #06b6d4 100%);
            color: white;
            box-shadow: 0 2px 8px rgba(6, 182, 212, 0.2);
        }

        .message.assistant .message-content {
            background: white;
            color: #333;
            box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
        }

        .suggestions {
            display: flex;
            gap: 10px;
            flex-wrap: wrap;
            margin-top: 10px;
            padding-left: 50px;
        }

        .suggestion-btn {
            padding: 8px 16px;
            background: white;
            border: 2px solid #0ea5e9;
            color: #0ea5e9;
            border-radius: 20px;
            cursor: pointer;
            font-size: 13px;
            transition: all 0.3s;
            font-weight: 500;
        }

        .suggestion-btn:hover {
            background: linear-gradient(135deg, #0ea5e9 0%, #06b6d4 100%);
            color: white;
            transform: translateY(-2px);
            box-shadow: 0 4px 12px rgba(6, 182, 212, 0.3);
        }

        .action-taken {
            margin-top: 10px;
            padding: 10px;
            background: #d4edda;
            border-left: 4px solid #28a745;
            border-radius: 4px;
            font-size: 13px;
            color: #155724;
        }

        .chat-input-container {
            padding: 20px;
            background: white;
            border-top: 1px solid #e0e0e0;
        }

        .chat-input-form {
            display: flex;
            gap: 10px;
        }

        .chat-input {
            flex: 1;
            padding: 12px 16px;
            border: 2px solid #e0e0e0;
            border-radius: 25px;
            font-size: 15px;
            outline: none;
            transition: border-color 0.2s;
        }

        .chat-input:focus {
            border-color: #0ea5e9;
            box-shadow: 0 0 0 3px rgba(14, 165, 233, 0.1);
        }

        .send-btn {
            padding: 12px 30px;
            background: linear-gradient(135deg, #0ea5e9 0%, #06b6d4 100%);
            color: white;
            border: none;
            border-radius: 25px;
            cursor: pointer;
            font-size: 15px;
            font-weight: 600;
            transition: all 0.3s;
            box-shadow: 0 4px 12px rgba(6, 182, 212, 0.3);
        }

        .send-btn:hover:not(:disabled) {
            transform: translateY(-2px);
            box-shadow: 0 6px 16px rgba(6, 182, 212, 0.4);
        }

        .send-btn:disabled {
            opacity: 0.5;
            cursor: not-allowed;
        }

        .typing-indicator {
            display: none;
            padding: 12px 16px;
            background: white;
            border-radius: 12px;
            box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
            width: fit-content;
        }

        .typing-indicator.active {
            display: block;
        }

        .typing-indicator span {
            display: inline-block;
            width: 8px;
            height: 8px;
            background: #999;
            border-radius: 50%;
            margin: 0 2px;
            animation: typing 1.4s infinite;
        }

        .typing-indicator span:nth-child(2) {
            animation-delay: 0.2s;
        }

        .typing-indicator span:nth-child(3) {
            animation-delay: 0.4s;
        }

        @keyframes typing {
            0%, 60%, 100% {
                transform: translateY(0);
            }
            30% {
                transform: translateY(-10px);
            }
        }

        .welcome-message {
            text-align: center;
            padding: 40px 20px;
            color: #666;
        }

        .welcome-message h2 {
            background: linear-gradient(135deg, #0ea5e9 0%, #06b6d4 100%);
            -webkit-background-clip: text;
            -webkit-text-fill-color: transparent;
            background-clip: text;
            margin-bottom: 15px;
            font-weight: 700;
        }

        .welcome-message ul {
            list-style: none;
            margin-top: 20px;
        }

        .welcome-message li {
            margin: 10px 0;
            padding: 10px;
            background: white;
            border-radius: 8px;
            box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
        }
    </style>
</head>
<body>
    <div class="chat-container">
        <div class="chat-header">
            <h1>🏢 Tenant Support Chatbot</h1>
            <p>AI-powered support for thermostat, maintenance, and vMix help</p>
        </div>

        <div class="tenant-info">
            <input type="text" id="tenantName" placeholder="Your Name (optional)">
            <input type="text" id="unitNumber" placeholder="Unit Number (optional)">
        </div>

        <div class="chat-messages" id="chatMessages">
            <div class="welcome-message">
                <h2>👋 Welcome!</h2>
                <p>I'm your AI tenant support assistant. I can help you with:</p>
                <ul>
                    <li>🌡️ <strong>Thermostat Control</strong> - Adjust your temperature</li>
                    <li>🔧 <strong>Maintenance Requests</strong> - Report and track issues</li>
                    <li>🎥 <strong>vMix Troubleshooting</strong> - Step-by-step tech support</li>
                    <li>🏢 <strong>Building Info</strong> - Policies and amenities</li>
                </ul>
                <p style="margin-top: 20px;">What can I help you with today?</p>
            </div>
        </div>

        <div class="chat-input-container">
            <form class="chat-input-form" id="chatForm">
                <input type="text" class="chat-input" id="messageInput" placeholder="Type your message..." autocomplete="off">
                <button type="submit" class="send-btn" id="sendBtn">Send</button>
            </form>
        </div>
    </div>

    <script>
        let sessionId = null;
        const chatMessages = document.getElementById('chatMessages');
        const messageInput = document.getElementById('messageInput');
        const chatForm = document.getElementById('chatForm');
        const sendBtn = document.getElementById('sendBtn');
        const tenantName = document.getElementById('tenantName');
        const unitNumber = document.getElementById('unitNumber');

        // Load session from localStorage
        if (localStorage.getItem('sessionId')) {
            sessionId = localStorage.getItem('sessionId');
            loadChatHistory();
        }

        // Save tenant info to localStorage
        tenantName.addEventListener('blur', () => {
            localStorage.setItem('tenantName', tenantName.value);
        });

        unitNumber.addEventListener('blur', () => {
            localStorage.setItem('unitNumber', unitNumber.value);
        });

        // Load tenant info
        if (localStorage.getItem('tenantName')) {
            tenantName.value = localStorage.getItem('tenantName');
        }
        if (localStorage.getItem('unitNumber')) {
            unitNumber.value = localStorage.getItem('unitNumber');
        }

        chatForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            const message = messageInput.value.trim();
            if (!message) return;

            // Clear welcome message if present
            const welcomeMsg = chatMessages.querySelector('.welcome-message');
            if (welcomeMsg) {
                welcomeMsg.remove();
            }

            // Add user message
            addMessage('user', message);
            messageInput.value = '';
            sendBtn.disabled = true;

            // Show typing indicator
            const typingIndicator = document.createElement('div');
            typingIndicator.className = 'message assistant';
            typingIndicator.innerHTML = \`
                <div class="message-avatar">🤖</div>
                <div class="typing-indicator active">
                    <span></span><span></span><span></span>
                </div>
            \`;
            chatMessages.appendChild(typingIndicator);
            chatMessages.scrollTop = chatMessages.scrollHeight;

            try {
                const response = await fetch('/chat', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                    },
                    body: JSON.stringify({
                        message,
                        session_id: sessionId,
                        tenant_name: tenantName.value || undefined,
                        unit_number: unitNumber.value || undefined,
                    }),
                });

                const data = await response.json();

                // Save session ID
                if (data.session_id) {
                    sessionId = data.session_id;
                    localStorage.setItem('sessionId', sessionId);
                }

                // Remove typing indicator
                typingIndicator.remove();

                // Add assistant message
                addMessage('assistant', data.message, data.suggestions, data.action_taken);

            } catch (error) {
                console.error('Error:', error);
                typingIndicator.remove();
                addMessage('assistant', 'Sorry, I encountered an error. Please try again.');
            }

            sendBtn.disabled = false;
            messageInput.focus();
        });

        function addMessage(role, content, suggestions = null, actionTaken = null) {
            const messageDiv = document.createElement('div');
            messageDiv.className = \`message \${role}\`;

            const avatar = role === 'user' ? '👤' : '🤖';
            let html = \`
                <div class="message-avatar">\${avatar}</div>
                <div class="message-content">\${content.replace(/\\n/g, '<br>')}</div>
            \`;

            messageDiv.innerHTML = html;
            chatMessages.appendChild(messageDiv);

            // Add action taken badge
            if (actionTaken && actionTaken.type) {
                const actionDiv = document.createElement('div');
                actionDiv.className = 'action-taken';
                actionDiv.style.marginLeft = '50px';
                actionDiv.innerHTML = \`<strong>Action:</strong> \${actionTaken.type.replace(/_/g, ' ')}\`;
                chatMessages.appendChild(actionDiv);
            }

            // Add suggestions
            if (suggestions && suggestions.length > 0) {
                const suggestionsDiv = document.createElement('div');
                suggestionsDiv.className = 'suggestions';
                suggestions.forEach(suggestion => {
                    const btn = document.createElement('button');
                    btn.className = 'suggestion-btn';
                    btn.textContent = suggestion;
                    btn.onclick = () => {
                        messageInput.value = suggestion;
                        messageInput.focus();
                    };
                    suggestionsDiv.appendChild(btn);
                });
                chatMessages.appendChild(suggestionsDiv);
            }

            chatMessages.scrollTop = chatMessages.scrollHeight;
        }

        async function loadChatHistory() {
            if (!sessionId) return;

            try {
                const response = await fetch(\`/chat/history?session_id=\${sessionId}\`);
                const data = await response.json();

                if (data.messages && data.messages.length > 0) {
                    // Clear welcome message
                    chatMessages.innerHTML = '';

                    // Load messages
                    data.messages.forEach(msg => {
                        addMessage(msg.role, msg.content);
                    });

                    // Update tenant info if available
                    if (data.tenant_info) {
                        if (data.tenant_info.tenant_name) {
                            tenantName.value = data.tenant_info.tenant_name;
                        }
                        if (data.tenant_info.unit_number) {
                            unitNumber.value = data.tenant_info.unit_number;
                        }
                    }
                }
            } catch (error) {
                console.error('Error loading history:', error);
            }
        }

        // Allow Enter to send, Shift+Enter for newline
        messageInput.addEventListener('keydown', (e) => {
            if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                chatForm.dispatchEvent(new Event('submit'));
            }
        });
    </script>
</body>
</html>`;

	return c.html(html);
});

// Export the Hono app
export default app;
