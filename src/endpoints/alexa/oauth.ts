import { Context } from "hono";

/**
 * OAuth endpoints for Alexa account linking
 * Allows tenants to link their unit number to their Alexa account
 */

export class AlexaOAuth {
	// Authorization page - tenant enters unit number
	async authorize(c: Context) {
		const clientId = c.req.query("client_id");
		const redirectUri = c.req.query("redirect_uri");
		const state = c.req.query("state");
		const responseType = c.req.query("response_type");

		if (!clientId || !redirectUri || !state) {
			return c.text("Missing required parameters", 400);
		}

		// Return HTML form for unit number entry
		const html = `<!DOCTYPE html>
<html>
<head>
	<title>Link Your Apartment</title>
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
			max-width: 400px;
			width: 100%;
			box-shadow: 0 20px 60px rgba(0,0,0,0.3);
		}
		h1 {
			color: #667eea;
			margin-bottom: 10px;
			font-size: 24px;
		}
		p {
			color: #666;
			margin-bottom: 30px;
			line-height: 1.5;
		}
		label {
			display: block;
			color: #333;
			font-weight: 600;
			margin-bottom: 8px;
		}
		input {
			width: 100%;
			padding: 12px;
			border: 2px solid #e1e8ed;
			border-radius: 8px;
			font-size: 16px;
			margin-bottom: 20px;
			transition: border-color 0.3s;
		}
		input:focus {
			outline: none;
			border-color: #667eea;
		}
		button {
			width: 100%;
			padding: 14px;
			background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
			color: white;
			border: none;
			border-radius: 8px;
			font-size: 16px;
			font-weight: 600;
			cursor: pointer;
			transition: transform 0.2s;
		}
		button:hover {
			transform: translateY(-2px);
		}
		button:active {
			transform: translateY(0);
		}
		.error {
			background: #fee;
			border: 1px solid #fcc;
			color: #c33;
			padding: 12px;
			border-radius: 8px;
			margin-bottom: 20px;
			display: none;
		}
	</style>
</head>
<body>
	<div class="container">
		<h1>🏢 Link Your Apartment</h1>
		<p>Enter your unit number and name to control your thermostat with Alexa.</p>

		<div class="error" id="error"></div>

		<form id="linkForm">
			<input type="hidden" name="client_id" value="${clientId}">
			<input type="hidden" name="redirect_uri" value="${redirectUri}">
			<input type="hidden" name="state" value="${state}">
			<input type="hidden" name="response_type" value="${responseType}">

			<label for="unit_number">Unit Number</label>
			<input type="text" id="unit_number" name="unit_number" placeholder="e.g., 101" required>

			<label for="tenant_name">Your Name</label>
			<input type="text" id="tenant_name" name="tenant_name" placeholder="e.g., John Smith" required>

			<button type="submit">Link Account</button>
		</form>
	</div>

	<script>
		document.getElementById('linkForm').addEventListener('submit', async (e) => {
			e.preventDefault();
			const formData = new FormData(e.target);
			const data = Object.fromEntries(formData);

			try {
				const response = await fetch('/alexa/authorize', {
					method: 'POST',
					headers: { 'Content-Type': 'application/json' },
					body: JSON.stringify(data)
				});

				const result = await response.json();

				if (result.redirect_uri) {
					window.location.href = result.redirect_uri;
				} else {
					document.getElementById('error').textContent = result.error || 'Unknown error';
					document.getElementById('error').style.display = 'block';
				}
			} catch (err) {
				document.getElementById('error').textContent = 'Failed to link account. Please try again.';
				document.getElementById('error').style.display = 'block';
			}
		});
	</script>
</body>
</html>`;

		return c.html(html);
	}

	// Process authorization and redirect back to Alexa
	async authorizePost(c: Context) {
		const body = await c.req.json();
		const { client_id, redirect_uri, state, unit_number, tenant_name } = body;

		if (!unit_number || !tenant_name) {
			return c.json({ error: "Unit number and name are required" }, 400);
		}

		// Generate authorization code
		const authCode = `AUTH_${crypto.randomUUID()}`;

		// Store auth code temporarily (expires in 10 minutes)
		const expiresAt = new Date(Date.now() + 10 * 60 * 1000).toISOString();

		await c.env.DB.prepare(
			`INSERT INTO alexa_tokens (access_token, unit_number, tenant_name, expires_at)
			VALUES (?, ?, ?, ?)`
		)
			.bind(authCode, unit_number, tenant_name, expiresAt)
			.run();

		// Redirect back to Alexa with auth code
		const redirectUrl = `${redirect_uri}?code=${authCode}&state=${state}`;

		return c.json({ redirect_uri: redirectUrl });
	}

	// Token exchange endpoint (Alexa calls this)
	async token(c: Context) {
		const body = await c.req.parseBody();
		const grantType = body.grant_type;
		const code = body.code;

		if (grantType !== "authorization_code") {
			return c.json({ error: "unsupported_grant_type" }, 400);
		}

		if (!code) {
			return c.json({ error: "invalid_request" }, 400);
		}

		// Look up the auth code
		const authData = await c.env.DB.prepare(
			"SELECT * FROM alexa_tokens WHERE access_token = ?"
		)
			.bind(code)
			.first();

		if (!authData) {
			return c.json({ error: "invalid_grant" }, 400);
		}

		// Generate real access token
		const accessToken = `ACCESS_${crypto.randomUUID()}`;
		const refreshToken = `REFRESH_${crypto.randomUUID()}`;

		// Update with real tokens
		await c.env.DB.prepare(
			`UPDATE alexa_tokens
			SET access_token = ?, refresh_token = ?, expires_at = NULL, updated_at = CURRENT_TIMESTAMP
			WHERE access_token = ?`
		)
			.bind(accessToken, refreshToken, code)
			.run();

		return c.json({
			access_token: accessToken,
			refresh_token: refreshToken,
			token_type: "Bearer",
			expires_in: 31536000, // 1 year
		});
	}
}
