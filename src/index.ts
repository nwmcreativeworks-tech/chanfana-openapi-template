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
import { AlexaSmartHomeSkillHandler } from "./endpoints/alexa/smartHomeSkill";
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

// Alexa Smart Home Skill endpoint
app.post("/alexa/smarthome", async (c) => {
	const handler = new AlexaSmartHomeSkillHandler();
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

// Login page
app.get("/login", (c) => {
	const html = `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Tenant Login - Hospital Church Portal</title>
    <style>
        * {
            margin: 0;
            padding: 0;
            box-sizing: border-box;
        }

        body {
            font-family: -apple-system, system-ui, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
            background: #F4F5F7;
            background-image: radial-gradient(circle at 20% 20%, rgba(0, 82, 204, 0.04) 0%, transparent 50%),
                              radial-gradient(circle at 80% 80%, rgba(0, 184, 217, 0.04) 0%, transparent 50%);
            min-height: 100vh;
            display: flex;
            align-items: center;
            justify-content: center;
            padding: 24px;
        }

        .login-container {
            background: white;
            border-radius: 24px;
            box-shadow: 0 8px 32px rgba(11, 31, 42, 0.08), 0 2px 8px rgba(11, 31, 42, 0.04);
            overflow: hidden;
            max-width: 480px;
            width: 100%;
        }

        .login-header {
            background: linear-gradient(135deg, #0052CC 0%, #0065FF 100%);
            padding: 48px 40px;
            text-align: center;
            color: white;
        }

        .logo-icon {
            width: 64px;
            height: 64px;
            background: rgba(255, 255, 255, 0.15);
            border-radius: 16px;
            display: flex;
            align-items: center;
            justify-content: center;
            font-size: 32px;
            margin: 0 auto 20px;
            backdrop-filter: blur(10px);
        }

        .login-header h1 {
            font-size: 28px;
            font-weight: 700;
            margin-bottom: 8px;
        }

        .login-header p {
            font-size: 15px;
            opacity: 0.9;
        }

        .login-body {
            padding: 40px;
        }

        .welcome-text {
            text-align: center;
            margin-bottom: 32px;
        }

        .welcome-text h2 {
            font-size: 20px;
            color: #0B1F2A;
            margin-bottom: 8px;
        }

        .welcome-text p {
            font-size: 14px;
            color: #586069;
        }

        .form-group {
            margin-bottom: 24px;
        }

        .form-group label {
            display: block;
            font-size: 14px;
            font-weight: 600;
            color: #0B1F2A;
            margin-bottom: 8px;
        }

        .form-group input {
            width: 100%;
            padding: 14px 16px;
            border: 2px solid #E1E4E8;
            border-radius: 12px;
            font-size: 15px;
            transition: all 0.2s;
            font-family: inherit;
        }

        .form-group input:focus {
            outline: none;
            border-color: #0052CC;
            box-shadow: 0 0 0 3px rgba(0, 82, 204, 0.1);
        }

        .login-btn {
            width: 100%;
            padding: 16px;
            background: linear-gradient(135deg, #0052CC 0%, #0065FF 100%);
            color: white;
            border: none;
            border-radius: 12px;
            font-size: 16px;
            font-weight: 600;
            cursor: pointer;
            transition: all 0.2s;
            box-shadow: 0 4px 12px rgba(0, 82, 204, 0.2);
        }

        .login-btn:hover:not(:disabled) {
            transform: translateY(-2px);
            box-shadow: 0 6px 20px rgba(0, 82, 204, 0.3);
        }

        .login-btn:disabled {
            opacity: 0.6;
            cursor: not-allowed;
            transform: none;
        }

        .error-message {
            background: #FEE;
            border: 2px solid #FCC;
            color: #C33;
            padding: 14px;
            border-radius: 12px;
            margin-bottom: 24px;
            font-size: 14px;
            display: none;
        }

        .error-message.show {
            display: block;
        }

        .login-footer {
            padding: 24px 40px;
            background: #FAFBFC;
            border-top: 1px solid #E1E4E8;
            text-align: center;
        }

        .login-footer p {
            font-size: 13px;
            color: #586069;
        }

        .login-footer a {
            color: #0052CC;
            text-decoration: none;
            font-weight: 600;
        }

        @media (max-width: 640px) {
            .login-body {
                padding: 32px 24px;
            }

            .login-header {
                padding: 40px 24px;
            }

            .login-footer {
                padding: 20px 24px;
            }
        }
    </style>
</head>
<body>
    <div class="login-container">
        <div class="login-header">
            <div class="logo-icon">⛪</div>
            <h1>Hospital Church</h1>
            <p>Tenant Portal</p>
        </div>

        <div class="login-body">
            <div class="welcome-text">
                <h2>Welcome Back!</h2>
                <p>Sign in to access your portal</p>
            </div>

            <div class="error-message" id="errorMessage"></div>

            <form id="loginForm">
                <div class="form-group">
                    <label for="email">Email Address</label>
                    <input
                        type="email"
                        id="email"
                        name="email"
                        placeholder="Enter your email"
                        required
                        autocomplete="email"
                    >
                </div>

                <div class="form-group">
                    <label for="password">Password</label>
                    <input
                        type="password"
                        id="password"
                        name="password"
                        placeholder="Enter your password"
                        required
                        autocomplete="current-password"
                    >
                </div>

                <button type="submit" class="login-btn" id="loginBtn">
                    Sign In
                </button>
            </form>
        </div>

        <div class="login-footer">
            <p>&copy; 2025 Hospital Church of Jacksonville | Powered by <strong>NWM Creative Works</strong></p>
        </div>
    </div>

    <script>
        const loginForm = document.getElementById('loginForm');
        const loginBtn = document.getElementById('loginBtn');
        const errorMessage = document.getElementById('errorMessage');

        loginForm.addEventListener('submit', async (e) => {
            e.preventDefault();

            const email = document.getElementById('email').value;
            const password = document.getElementById('password').value;

            loginBtn.disabled = true;
            loginBtn.textContent = 'Signing in...';
            errorMessage.classList.remove('show');

            try {
                const response = await fetch('/auth/tenant/login', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                    },
                    body: JSON.stringify({ email, password }),
                });

                const data = await response.json();

                if (response.ok && data.success) {
                    // Store session token
                    localStorage.setItem('sessionToken', data.session_token);
                    localStorage.setItem('user', JSON.stringify(data.user));

                    // Redirect to chatbot
                    window.location.href = '/chatbot';
                } else {
                    errorMessage.textContent = data.error || 'Login failed. Please try again.';
                    errorMessage.classList.add('show');
                    loginBtn.disabled = false;
                    loginBtn.textContent = 'Sign In';
                }
            } catch (error) {
                console.error('Login error:', error);
                errorMessage.textContent = 'Connection error. Please try again.';
                errorMessage.classList.add('show');
                loginBtn.disabled = false;
                loginBtn.textContent = 'Sign In';
            }
        });
    </script>
</body>
</html>`;
	return c.html(html);
});

// Serve chat interface (protected by authentication)
app.get("/chatbot", async (c) => {
	// Check if request has session token in header or query param
	const sessionToken = c.req.header('Authorization')?.replace('Bearer ', '') ||
	                     c.req.query('session_token');

	// For web browsers, check if user is authenticated
	// We'll add a script that verifies the session exists in localStorage
	// If not, redirect to login
	const html = `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Hospital Church Tenant Portal – Powered by NWM Creative Works</title>
    <style>
        * {
            margin: 0;
            padding: 0;
            box-sizing: border-box;
        }

        body {
            font-family: -apple-system, system-ui, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif;
            background: #F4F5F7;
            background-image: radial-gradient(circle at 20% 20%, rgba(0, 82, 204, 0.04) 0%, transparent 50%),
                              radial-gradient(circle at 80% 80%, rgba(0, 184, 217, 0.04) 0%, transparent 50%);
            min-height: 100vh;
            padding: 24px 16px;
            color: #0B1F2A;
        }

        /* Main Portal Container */
        .portal-container {
            max-width: 960px;
            margin: 0 auto;
            background: white;
            border-radius: 24px;
            box-shadow: 0 8px 32px rgba(11, 31, 42, 0.08), 0 2px 8px rgba(11, 31, 42, 0.04);
            overflow: hidden;
        }

        /* Header */
        .portal-header {
            background: linear-gradient(135deg, #0052CC 0%, #0065FF 100%);
            padding: 32px 32px 24px;
            color: white;
            position: relative;
        }

        .header-logo {
            display: flex;
            align-items: center;
            gap: 12px;
            margin-bottom: 16px;
        }

        .logo-icon {
            width: 48px;
            height: 48px;
            background: rgba(255, 255, 255, 0.15);
            border-radius: 12px;
            display: flex;
            align-items: center;
            justify-content: center;
            font-size: 24px;
            backdrop-filter: blur(10px);
        }

        .portal-header h1 {
            font-size: 28px;
            font-weight: 700;
            letter-spacing: -0.5px;
            line-height: 1.2;
        }

        .portal-header p {
            font-size: 15px;
            opacity: 0.9;
            margin-top: 8px;
            line-height: 1.5;
        }

        /* User Info Inputs */
        .user-info-section {
            padding: 24px 32px;
            background: #FAFBFC;
            border-bottom: 1px solid #E1E4E8;
        }

        .user-info-grid {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(240px, 1fr));
            gap: 16px;
        }

        .input-group {
            display: flex;
            flex-direction: column;
            gap: 6px;
        }

        .input-group label {
            font-size: 13px;
            font-weight: 600;
            color: #586069;
            text-transform: uppercase;
            letter-spacing: 0.3px;
        }

        .input-group input {
            padding: 12px 16px;
            border: 2px solid #E1E4E8;
            border-radius: 8px;
            font-size: 15px;
            color: #0B1F2A;
            transition: all 0.2s;
            background: white;
        }

        .input-group input:focus {
            outline: none;
            border-color: #0052CC;
            box-shadow: 0 0 0 3px rgba(0, 82, 204, 0.1);
        }

        /* Main Content */
        .portal-main {
            padding: 32px;
        }

        .welcome-section {
            text-align: center;
            margin-bottom: 32px;
        }

        .welcome-section h2 {
            font-size: 24px;
            font-weight: 700;
            color: #0B1F2A;
            margin-bottom: 8px;
        }

        .welcome-section p {
            font-size: 15px;
            color: #586069;
            line-height: 1.6;
        }

        /* Quick Action Cards */
        .quick-actions {
            display: grid;
            grid-template-columns: 1fr;
            gap: 16px;
            margin-bottom: 32px;
        }

        .action-card {
            background: #FAFBFC;
            border: 2px solid #E1E4E8;
            border-radius: 12px;
            padding: 20px 24px;
            cursor: pointer;
            transition: all 0.2s;
            display: flex;
            align-items: flex-start;
            gap: 16px;
        }

        .action-card:hover {
            border-color: #0052CC;
            background: white;
            transform: translateY(-2px);
            box-shadow: 0 8px 24px rgba(0, 82, 204, 0.12);
        }

        .action-card:focus {
            outline: 3px solid rgba(0, 82, 204, 0.3);
            outline-offset: 2px;
        }

        .action-icon {
            width: 48px;
            height: 48px;
            min-width: 48px;
            background: linear-gradient(135deg, #0052CC 0%, #00B8D9 100%);
            border-radius: 12px;
            display: flex;
            align-items: center;
            justify-content: center;
            font-size: 24px;
        }

        .action-card:nth-child(2) .action-icon {
            background: linear-gradient(135deg, #FFAB00 0%, #FF8B00 100%);
        }

        .action-card:nth-child(3) .action-icon {
            background: linear-gradient(135deg, #00B8D9 0%, #00A3BF 100%);
        }

        .action-card:nth-child(4) .action-icon {
            background: linear-gradient(135deg, #6554C0 0%, #5243AA 100%);
        }

        .action-content h3 {
            font-size: 17px;
            font-weight: 700;
            color: #0B1F2A;
            margin-bottom: 4px;
        }

        .action-content p {
            font-size: 14px;
            color: #586069;
            line-height: 1.5;
        }

        /* Chat Area */
        .chat-section {
            background: #F4F5F7;
            border-radius: 12px;
            padding: 24px;
            min-height: 320px;
            max-height: 480px;
            overflow-y: auto;
            margin-bottom: 16px;
        }

        .chat-messages {
            display: flex;
            flex-direction: column;
            gap: 16px;
        }

        .message {
            display: flex;
            gap: 12px;
            max-width: 85%;
            animation: fadeIn 0.3s ease-out;
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
            align-self: flex-end;
            flex-direction: row-reverse;
        }

        .message-avatar {
            width: 36px;
            height: 36px;
            min-width: 36px;
            border-radius: 50%;
            display: flex;
            align-items: center;
            justify-content: center;
            font-size: 16px;
            background: linear-gradient(135deg, #0052CC 0%, #0065FF 100%);
            color: white;
        }

        .message.assistant .message-avatar {
            background: linear-gradient(135deg, #00B8D9 0%, #00A3BF 100%);
        }

        .message-content {
            background: white;
            padding: 12px 16px;
            border-radius: 12px;
            font-size: 15px;
            line-height: 1.5;
            color: #0B1F2A;
            box-shadow: 0 2px 8px rgba(11, 31, 42, 0.06);
        }

        .message.user .message-content {
            background: #0052CC;
            color: white;
        }

        /* Chat Input */
        .chat-input-area {
            background: #F4F5F7;
            padding: 16px;
            border-radius: 12px;
        }

        .chat-input-form {
            display: flex;
            gap: 12px;
            align-items: flex-end;
        }

        .chat-input {
            flex: 1;
            padding: 14px 18px;
            border: 2px solid #E1E4E8;
            border-radius: 24px;
            font-size: 15px;
            font-family: inherit;
            resize: none;
            min-height: 48px;
            max-height: 120px;
            background: white;
            transition: all 0.2s;
        }

        .chat-input:focus {
            outline: none;
            border-color: #0052CC;
            box-shadow: 0 0 0 3px rgba(0, 82, 204, 0.1);
        }

        .send-btn {
            padding: 14px 32px;
            background: linear-gradient(135deg, #0052CC 0%, #0065FF 100%);
            color: white;
            border: none;
            border-radius: 24px;
            font-size: 15px;
            font-weight: 600;
            cursor: pointer;
            transition: all 0.2s;
            box-shadow: 0 4px 12px rgba(0, 82, 204, 0.2);
        }

        .send-btn:hover:not(:disabled) {
            transform: translateY(-2px);
            box-shadow: 0 6px 20px rgba(0, 82, 204, 0.3);
        }

        .send-btn:active {
            transform: translateY(0);
        }

        .send-btn:disabled {
            opacity: 0.5;
            cursor: not-allowed;
        }

        /* Footer */
        .portal-footer {
            padding: 20px 32px;
            background: #FAFBFC;
            border-top: 1px solid #E1E4E8;
            text-align: center;
        }

        .portal-footer p {
            font-size: 13px;
            color: #586069;
        }

        .portal-footer a {
            color: #0052CC;
            text-decoration: none;
            font-weight: 600;
        }

        .portal-footer a:hover {
            text-decoration: underline;
        }

        /* Responsive */
        @media (max-width: 640px) {
            body {
                padding: 16px 12px;
            }

            .portal-container {
                border-radius: 16px;
            }

            .portal-header {
                padding: 24px 20px 20px;
            }

            .portal-header h1 {
                font-size: 22px;
            }

            .user-info-section {
                padding: 20px;
            }

            .portal-main {
                padding: 24px 20px;
            }

            .action-card {
                padding: 16px 18px;
            }

            .chat-input-form {
                flex-direction: column;
            }

            .send-btn {
                width: 100%;
            }
        }

        /* Typing Indicator */
        .typing-indicator {
            display: none;
            padding: 12px 16px;
            background: white;
            border-radius: 12px;
            width: fit-content;
            box-shadow: 0 2px 8px rgba(11, 31, 42, 0.06);
        }

        .typing-indicator.active {
            display: flex;
            gap: 4px;
        }

        .typing-indicator span {
            width: 8px;
            height: 8px;
            background: #586069;
            border-radius: 50%;
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
                opacity: 0.7;
            }
            30% {
                transform: translateY(-8px);
                opacity: 1;
            }
        }
    </style>
</head>
<body>
    <div class="portal-container">
        <!-- Header -->
        <header class="portal-header">
            <div class="header-logo">
                <div class="logo-icon">⛪</div>
                <div>
                    <h1>Hospital Church Tenant Portal</h1>
                    <p style="font-size: 13px; opacity: 0.8; margin-top: 4px;">Powered by NWM Creative Works</p>
                </div>
            </div>
            <p>AI-powered support for adjusting thermostats in select rooms, submitting maintenance requests, and getting help from the HC Media Ministry troubleshoot assistant.</p>
        </header>

        <!-- User Info Section -->
        <section class="user-info-section">
            <div class="user-info-grid">
                <div class="input-group">
                    <label for="tenantName">Your Name</label>
                    <input type="text" id="tenantName" placeholder="Enter your name (optional)">
                </div>
                <div class="input-group">
                    <label for="unitNumber">Auditorium Name</label>
                    <select id="unitNumber" style="width: 100%; padding: 12px 16px; border: 2px solid #E1E4E8; border-radius: 8px; font-size: 15px; font-family: inherit;">
                        <option value="">Select Auditorium</option>
                        <option value="Inspiration Studio">Inspiration Studio</option>
                        <option value="Harmony Hall">Harmony Hall</option>
                        <option value="Grace Auditorium">Grace Auditorium</option>
                    </select>
                </div>
            </div>
        </section>

        <!-- Main Content -->
        <main class="portal-main">
            <!-- Welcome Section -->
            <section class="welcome-section">
                <h2>How can we help your auditorium today?</h2>
                <p>Select a service below or start a conversation in the chat.</p>
            </section>

            <!-- Quick Action Cards -->
            <div class="quick-actions">
                <div class="action-card" tabindex="0" role="button" onclick="startAction('thermostat')">
                    <div class="action-icon">🌡️</div>
                    <div class="action-content">
                        <h3>Thermostat Control</h3>
                        <p>Adjust your temperature in supported rooms</p>
                    </div>
                </div>

                <div class="action-card" tabindex="0" role="button" onclick="startAction('maintenance')">
                    <div class="action-icon">🔧</div>
                    <div class="action-content">
                        <h3>Maintenance Requests</h3>
                        <p>Report and track issues in your auditorium</p>
                    </div>
                </div>

                <div class="action-card" tabindex="0" role="button" onclick="startAction('media')">
                    <div class="action-icon">🎥</div>
                    <div class="action-content">
                        <h3>HC Media Troubleshooting</h3>
                        <p>Get step-by-step help for media/vMix issues</p>
                    </div>
                </div>

                <div class="action-card" tabindex="0" role="button" onclick="startAction('info')">
                    <div class="action-icon">ℹ️</div>
                    <div class="action-content">
                        <h3>Building Info</h3>
                        <p>View key policies, amenities, and contacts</p>
                    </div>
                </div>
            </div>

            <!-- Chat Section -->
            <section class="chat-section" id="chatMessages">
                <div class="chat-messages" id="messageContainer">
                    <!-- Messages will appear here -->
                </div>
                <div class="typing-indicator" id="typingIndicator">
                    <span></span><span></span><span></span>
                </div>
            </section>

            <!-- Chat Input -->
            <div class="chat-input-area">
                <form class="chat-input-form" id="chatForm">
                    <input
                        type="text"
                        class="chat-input"
                        id="messageInput"
                        placeholder="Type your message..."
                        autocomplete="off"
                        required
                    >
                    <button type="submit" class="send-btn" id="sendBtn">Send</button>
                </form>
            </div>
        </main>

        <!-- Footer -->
        <footer class="portal-footer">
            <p>&copy; 2025 Hospital Church of Jacksonville | <a href="#" onclick="showPrivacy()">Privacy Policy</a> | Powered by <strong>NWM Creative Works</strong></p>
        </footer>
    </div>

    <script>
        // Authentication check - redirect to login if not authenticated
        (async function checkAuth() {
            const sessionToken = localStorage.getItem('sessionToken');
            if (!sessionToken) {
                window.location.href = '/login';
                return;
            }

            // Verify session is still valid
            try {
                const response = await fetch('/auth/tenant/verify', {
                    headers: {
                        'Authorization': \`Bearer \${sessionToken}\`
                    }
                });

                if (!response.ok) {
                    // Session expired or invalid
                    localStorage.removeItem('sessionToken');
                    localStorage.removeItem('user');
                    window.location.href = '/login';
                    return;
                }
            } catch (error) {
                console.error('Auth verification error:', error);
                window.location.href = '/login';
                return;
            }
        })();

        let sessionId = null;
        const chatMessages = document.getElementById('messageContainer');
        const messageInput = document.getElementById('messageInput');
        const chatForm = document.getElementById('chatForm');
        const sendBtn = document.getElementById('sendBtn');
        const tenantName = document.getElementById('tenantName');
        const unitNumber = document.getElementById('unitNumber');
        const typingIndicator = document.getElementById('typingIndicator');

        // Load user info from session
        const user = JSON.parse(localStorage.getItem('user') || '{}');
        if (user.full_name) {
            tenantName.value = user.full_name;
        }
        if (user.unit_number) {
            unitNumber.value = user.unit_number;
        }

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

        // Quick action handlers
        window.startAction = function(action) {
            // Validate name is filled
            if (!tenantName.value.trim()) {
                alert('Please enter your name before using the chatbot.');
                tenantName.focus();
                return;
            }

            const messages = {
                thermostat: "I need help with the thermostat",
                maintenance: "I need to submit a maintenance request",
                media: "I need help with vMix or media equipment",
                info: "I need information about the building"
            };

            const message = messages[action];
            if (message) {
                messageInput.value = message;
                // Automatically submit the form
                chatForm.dispatchEvent(new Event('submit'));
            }
        };

        window.showPrivacy = function() {
            alert('Privacy Policy: Your conversations are private and used only to provide support. Data is stored securely and never shared with third parties.');
        };

        // Handle form submission
        chatForm.addEventListener('submit', async (e) => {
            e.preventDefault();

            // Validate name is filled
            if (!tenantName.value.trim()) {
                alert('Please enter your name before using the chatbot.');
                tenantName.focus();
                return;
            }

            const message = messageInput.value.trim();
            if (!message) return;

            // Add user message
            addMessage('user', message);
            messageInput.value = '';
            sendBtn.disabled = true;

            // Show typing indicator
            typingIndicator.classList.add('active');
            chatMessages.parentElement.scrollTop = chatMessages.parentElement.scrollHeight;

            try {
                console.log('Sending message:', message);

                // Build request body, only include session_id if it exists
                const requestBody = {
                    message,
                    tenant_name: tenantName.value || undefined,
                    unit_number: unitNumber.value || undefined,
                };
                if (sessionId) {
                    requestBody.session_id = sessionId;
                }

                const response = await fetch('/chat', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                    },
                    body: JSON.stringify(requestBody),
                });

                console.log('Response status:', response.status);

                if (!response.ok) {
                    const errorText = await response.text();
                    console.error('Server error:', errorText);
                    throw new Error(\`Server returned \${response.status}: \${errorText}\`);
                }

                const data = await response.json();
                console.log('Response data:', data);

                // Save session ID
                if (data.session_id) {
                    sessionId = data.session_id;
                    localStorage.setItem('sessionId', sessionId);
                }

                // Remove typing indicator
                typingIndicator.classList.remove('active');

                // Add assistant message
                if (data.message) {
                    addMessage('assistant', data.message, data.suggestions, data.action_taken);
                } else {
                    addMessage('assistant', 'I received your message but had trouble generating a response. Please try again.');
                }

            } catch (error) {
                console.error('Chat error:', error);
                typingIndicator.classList.remove('active');
                addMessage('assistant', 'Sorry, I encountered an error: ' + error.message + '. Please check the console and try again.');
            }

            sendBtn.disabled = false;
            messageInput.focus();
        });

        function addMessage(role, content, suggestions = null, actionTaken = null) {
            const messageDiv = document.createElement('div');
            messageDiv.className = \`message \${role}\`;

            const avatar = role === 'user' ? '👤' : '🤖';
            // Escape newlines in content
            const formattedContent = String(content).replace(/\\n/g, '<br>');
            messageDiv.innerHTML = \`
                <div class="message-avatar">\${avatar}</div>
                <div class="message-content">\${formattedContent}</div>
            \`;

            chatMessages.appendChild(messageDiv);
            chatMessages.parentElement.scrollTop = chatMessages.parentElement.scrollHeight;
        }

        async function loadChatHistory() {
            if (!sessionId) return;

            try {
                const response = await fetch(\`/chat/history?session_id=\${sessionId}\`);
                const data = await response.json();

                if (data.messages && data.messages.length > 0) {
                    chatMessages.innerHTML = '';
                    data.messages.forEach(msg => {
                        addMessage(msg.role, msg.content);
                    });

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

        // Allow Enter to send
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
