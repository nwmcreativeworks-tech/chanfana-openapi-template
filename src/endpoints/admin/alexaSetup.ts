import { Context } from "hono";

/**
 * Admin endpoint to initiate Alexa Smart Home OAuth flow
 * This gets access to the building owner's Amazon account to discover thermostats
 */
export class AlexaSetupStart {
	async handle(c: Context) {
		const clientId = c.env.ALEXA_CLIENT_ID;
		const redirectUri = `${new URL(c.req.url).origin}/admin/alexa/callback`;

		// Generate state for CSRF protection
		const state = crypto.randomUUID();

		// Store state temporarily
		await c.env.DB.prepare(
			"INSERT INTO alexa_credentials (access_token, refresh_token, expires_at) VALUES (?, ?, datetime('now', '+10 minutes'))"
		)
			.bind(`STATE_${state}`, "", "")
			.run();

		// Build Amazon OAuth URL
		const authUrl = new URL("https://www.amazon.com/ap/oa");
		authUrl.searchParams.set("client_id", clientId);
		authUrl.searchParams.set("scope", "alexa::all");
		authUrl.searchParams.set("response_type", "code");
		authUrl.searchParams.set("redirect_uri", redirectUri);
		authUrl.searchParams.set("state", state);

		const html = `<!DOCTYPE html>
<html>
<head>
	<title>Connect Amazon Account</title>
	<meta name="viewport" content="width=device-width, initial-scale=1">
	<style>
		* { margin: 0; padding: 0; box-sizing: border-box; }
		body {
			font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
			background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
			min-height: 100vh;
			display: flex;
			align-items: center;
			justify-content: center;
			padding: 20px;
		}
		.container {
			background: white;
			border-radius: 16px;
			padding: 40px;
			max-width: 500px;
			width: 100%;
			box-shadow: 0 20px 60px rgba(0,0,0,0.3);
			text-align: center;
		}
		h1 {
			color: #667eea;
			margin-bottom: 20px;
			font-size: 28px;
		}
		p {
			color: #666;
			margin-bottom: 30px;
			line-height: 1.6;
		}
		.btn {
			display: inline-block;
			padding: 16px 32px;
			background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
			color: white;
			text-decoration: none;
			border-radius: 8px;
			font-size: 18px;
			font-weight: 600;
			transition: transform 0.2s;
		}
		.btn:hover {
			transform: translateY(-2px);
		}
		.steps {
			text-align: left;
			background: #f8f9fa;
			padding: 20px;
			border-radius: 8px;
			margin-bottom: 30px;
		}
		.steps h3 {
			color: #333;
			margin-bottom: 15px;
		}
		.steps ol {
			margin-left: 20px;
			color: #666;
		}
		.steps li {
			margin-bottom: 10px;
			line-height: 1.5;
		}
	</style>
</head>
<body>
	<div class="container">
		<h1>🌡️ Connect Your Amazon Account</h1>

		<div class="steps">
			<h3>What This Does:</h3>
			<ol>
				<li>Connects to your Amazon account (the one with your thermostats)</li>
				<li>Discovers all Alexa-connected thermostats (Ecobee, Honeywell, Nest, etc.)</li>
				<li>Allows you to assign thermostats to specific apartment units</li>
				<li>Enables chatbot control of real physical thermostats</li>
			</ol>
		</div>

		<p>Click below to sign in with Amazon and grant access to your smart home devices.</p>

		<a href="${authUrl.toString()}" class="btn">Connect Amazon Account</a>
	</div>
</body>
</html>`;

		return c.html(html);
	}
}

/**
 * OAuth callback - exchanges code for access token
 */
export class AlexaSetupCallback {
	async handle(c: Context) {
		const code = c.req.query("code");
		const state = c.req.query("state");
		const error = c.req.query("error");

		if (error) {
			return c.html(`
				<h1>Error</h1>
				<p>Authorization failed: ${error}</p>
				<p>${c.req.query("error_description")}</p>
			`);
		}

		if (!code || !state) {
			return c.text("Missing code or state", 400);
		}

		// Verify state
		const stateRecord = await c.env.DB.prepare(
			"SELECT * FROM alexa_credentials WHERE access_token = ?"
		)
			.bind(`STATE_${state}`)
			.first();

		if (!stateRecord) {
			return c.text("Invalid state", 400);
		}

		// Exchange code for access token
		const clientId = c.env.ALEXA_CLIENT_ID;
		const clientSecret = c.env.ALEXA_CLIENT_SECRET;
		const redirectUri = `${new URL(c.req.url).origin}/admin/alexa/callback`;

		const tokenResponse = await fetch("https://api.amazon.com/auth/o2/token", {
			method: "POST",
			headers: {
				"Content-Type": "application/x-www-form-urlencoded",
			},
			body: new URLSearchParams({
				grant_type: "authorization_code",
				code: code,
				client_id: clientId,
				client_secret: clientSecret,
				redirect_uri: redirectUri,
			}),
		});

		const tokenData = await tokenResponse.json();

		if (tokenData.error) {
			return c.html(`
				<h1>Error</h1>
				<p>Token exchange failed: ${tokenData.error}</p>
				<p>${tokenData.error_description}</p>
			`);
		}

		// Store tokens in database
		const expiresAt = new Date(
			Date.now() + tokenData.expires_in * 1000
		).toISOString();

		// Delete old state record
		await c.env.DB.prepare(
			"DELETE FROM alexa_credentials WHERE access_token = ?"
		)
			.bind(`STATE_${state}`)
			.run();

		// Insert new credentials
		await c.env.DB.prepare(
			`INSERT INTO alexa_credentials (access_token, refresh_token, token_type, expires_at, scope)
			VALUES (?, ?, ?, ?, ?)`
		)
			.bind(
				tokenData.access_token,
				tokenData.refresh_token,
				tokenData.token_type || "Bearer",
				expiresAt,
				tokenData.scope
			)
			.run();

		const html = `<!DOCTYPE html>
<html>
<head>
	<title>Success!</title>
	<meta name="viewport" content="width=device-width, initial-scale=1">
	<style>
		* { margin: 0; padding: 0; box-sizing: border-box; }
		body {
			font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
			background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
			min-height: 100vh;
			display: flex;
			align-items: center;
			justify-content: center;
			padding: 20px;
		}
		.container {
			background: white;
			border-radius: 16px;
			padding: 40px;
			max-width: 500px;
			width: 100%;
			box-shadow: 0 20px 60px rgba(0,0,0,0.3);
			text-align: center;
		}
		h1 {
			color: #48bb78;
			margin-bottom: 20px;
			font-size: 28px;
		}
		p {
			color: #666;
			margin-bottom: 20px;
			line-height: 1.6;
		}
		.btn {
			display: inline-block;
			padding: 14px 28px;
			background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
			color: white;
			text-decoration: none;
			border-radius: 8px;
			font-size: 16px;
			font-weight: 600;
			transition: transform 0.2s;
		}
		.btn:hover {
			transform: translateY(-2px);
		}
		.success-icon {
			font-size: 64px;
			margin-bottom: 20px;
		}
	</style>
</head>
<body>
	<div class="container">
		<div class="success-icon">✅</div>
		<h1>Connected Successfully!</h1>
		<p>Your Amazon account is now linked. You can now discover your thermostats!</p>
		<p><strong>Next Step:</strong> Go to the admin dashboard to discover and assign thermostats to units.</p>
		<a href="/admin/dashboard" class="btn">Go to Admin Dashboard</a>
	</div>
</body>
</html>`;

		return c.html(html);
	}
}
