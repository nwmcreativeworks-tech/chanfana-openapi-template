import { OpenAPIRoute, OpenAPIRouteSchema } from "chanfana";
import { Context } from "hono";
import { z } from "zod";
import * as bcrypt from "bcryptjs";

// Utility: Generate random code
function generateCode(length: number = 40): string {
	const chars = "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
	const array = new Uint8Array(length);
	crypto.getRandomValues(array);
	return Array.from(array).map(x => chars[x % chars.length]).join('');
}

// GET /oauth/authorize - Display login page
export class OAuthAuthorizeGet extends OpenAPIRoute {
	schema: OpenAPIRouteSchema = {
		tags: ["OAuth"],
		summary: "OAuth authorization page",
		request: {
			query: z.object({
				client_id: z.string().optional(),
				redirect_uri: z.string().optional(),
				state: z.string().optional(),
				scope: z.string().optional(),
				response_type: z.string().optional(),
			}),
		},
		responses: {
			"200": {
				description: "Returns OAuth login page",
			},
		},
	};

	async handle(c: Context) {
		const { client_id, redirect_uri, state, scope } = c.req.query();

		if (!client_id || !redirect_uri) {
			return c.html(`
				<!DOCTYPE html>
				<html><head><title>Error</title></head>
				<body><h1>Invalid OAuth Request</h1><p>Missing client_id or redirect_uri</p></body>
				</html>
			`, 400);
		}

		const html = `<!DOCTYPE html>
<html lang="en">
<head>
	<meta charset="UTF-8">
	<title>Link Your Account to Alexa</title>
	<meta name="viewport" content="width=device-width, initial-scale=1">
	<style>
		* { margin: 0; padding: 0; box-sizing: border-box; }
		body {
			font-family: -apple-system, system-ui, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
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
			max-width: 420px;
			width: 100%;
			box-shadow: 0 20px 60px rgba(0, 0, 0, 0.3);
		}
		.logo {
			text-align: center;
			margin-bottom: 24px;
		}
		.logo-icon {
			font-size: 48px;
			margin-bottom: 12px;
		}
		h1 {
			font-size: 24px;
			color: #0B1F2A;
			text-align: center;
			margin-bottom: 8px;
		}
		.subtitle {
			text-align: center;
			color: #586069;
			font-size: 14px;
			margin-bottom: 32px;
		}
		.form-group {
			margin-bottom: 20px;
		}
		.form-group label {
			display: block;
			font-weight: 600;
			color: #0B1F2A;
			margin-bottom: 8px;
			font-size: 14px;
		}
		.form-group input {
			width: 100%;
			padding: 12px 16px;
			border: 2px solid #E1E4E8;
			border-radius: 8px;
			font-size: 15px;
			transition: all 0.2s;
		}
		.form-group input:focus {
			outline: none;
			border-color: #667eea;
			box-shadow: 0 0 0 3px rgba(102, 126, 234, 0.1);
		}
		.btn {
			width: 100%;
			padding: 14px;
			background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
			color: white;
			border: none;
			border-radius: 8px;
			font-size: 16px;
			font-weight: 600;
			cursor: pointer;
			transition: all 0.2s;
		}
		.btn:hover {
			transform: translateY(-2px);
			box-shadow: 0 6px 20px rgba(102, 126, 234, 0.4);
		}
		.btn:disabled {
			opacity: 0.6;
			cursor: not-allowed;
		}
		.error {
			background: #FFEBE6;
			border-left: 4px solid #DE350B;
			padding: 12px;
			margin-bottom: 20px;
			border-radius: 4px;
			color: #DE350B;
			font-size: 14px;
			display: none;
		}
		.error.show {
			display: block;
		}
		.info {
			background: #E3FCEF;
			border-left: 4px solid #36B37E;
			padding: 12px;
			margin-bottom: 20px;
			border-radius: 4px;
			color: #006644;
			font-size: 13px;
		}
	</style>
</head>
<body>
	<div class="container">
		<div class="logo">
			<div class="logo-icon">🔗</div>
			<h1>Link Your Account</h1>
			<p class="subtitle">Connect to Alexa Smart Home</p>
		</div>

		<div class="info">
			Sign in with your tenant account to allow Alexa to control your assigned thermostats.
		</div>

		<div class="error" id="errorMessage"></div>

		<form id="loginForm">
			<input type="hidden" name="client_id" value="${client_id}">
			<input type="hidden" name="redirect_uri" value="${redirect_uri}">
			<input type="hidden" name="state" value="${state || ''}">
			<input type="hidden" name="scope" value="${scope || 'control'}">

			<div class="form-group">
				<label for="email">Email Address</label>
				<input type="email" id="email" name="email" required autocomplete="email">
			</div>

			<div class="form-group">
				<label for="password">Password</label>
				<input type="password" id="password" name="password" required autocomplete="current-password">
			</div>

			<button type="submit" class="btn" id="submitBtn">Authorize & Link</button>
		</form>
	</div>

	<script>
		const form = document.getElementById('loginForm');
		const errorMessage = document.getElementById('errorMessage');
		const submitBtn = document.getElementById('submitBtn');

		form.addEventListener('submit', async (e) => {
			e.preventDefault();

			const formData = new FormData(form);
			submitBtn.disabled = true;
			submitBtn.textContent = 'Authorizing...';
			errorMessage.classList.remove('show');

			try {
				const response = await fetch('/oauth/authorize', {
					method: 'POST',
					headers: { 'Content-Type': 'application/json' },
					body: JSON.stringify(Object.fromEntries(formData))
				});

				const data = await response.json();

				if (response.ok && data.redirect_url) {
					// Redirect to Alexa with authorization code
					window.location.href = data.redirect_url;
				} else {
					errorMessage.textContent = data.error || 'Authorization failed. Please check your credentials.';
					errorMessage.classList.add('show');
					submitBtn.disabled = false;
					submitBtn.textContent = 'Authorize & Link';
				}
			} catch (error) {
				errorMessage.textContent = 'Connection error. Please try again.';
				errorMessage.classList.add('show');
				submitBtn.disabled = false;
				submitBtn.textContent = 'Authorize & Link';
			}
		});
	</script>
</body>
</html>`;

		return c.html(html);
	}
}

// POST /oauth/authorize - Process login and issue authorization code
export class OAuthAuthorizePost extends OpenAPIRoute {
	schema: OpenAPIRouteSchema = {
		tags: ["OAuth"],
		summary: "OAuth authorization handler",
		request: {
			body: {
				content: {
					"application/json": {
						schema: z.object({
							email: z.string().email(),
							password: z.string(),
							client_id: z.string(),
							redirect_uri: z.string(),
							state: z.string().optional(),
							scope: z.string().optional(),
						}),
					},
				},
			},
		},
		responses: {
			"200": {
				description: "Returns redirect URL with authorization code",
			},
		},
	};

	async handle(c: Context) {
		try {
			const { email, password, client_id, redirect_uri, state, scope } = await c.req.json();

			// 1. Find user by email
			const user = await c.env.DB.prepare(
				`SELECT id, email, password_hash, role, is_active FROM users WHERE email = ? AND is_active = 1`
			).bind(email).first();

			if (!user) {
				return c.json({ error: "Invalid credentials" }, 401);
			}

			// 2. Verify password using bcrypt
			const passwordMatch = await bcrypt.compare(password, user.password_hash as string);

			if (!passwordMatch) {
				return c.json({ error: "Invalid credentials" }, 401);
			}

			// 3. Check if user has thermostat permissions
			// Admins and Sub-admins automatically have access to ALL thermostats
			const isAdminOrSubAdmin = user.role === 'admin' || user.role === 'sub_admin';

			if (!isAdminOrSubAdmin) {
				// For regular tenants, verify they have at least one thermostat assigned
				const permissions = await c.env.DB.prepare(
					`SELECT COUNT(*) as count FROM user_thermostat_permissions WHERE user_id = ?`
				).bind(user.id).first();

				if (!permissions || permissions.count === 0) {
					return c.json({
						error: "No thermostat access. Please contact your administrator to grant access."
					}, 403);
				}
			}

			// 4. Generate authorization code (expires in 5 minutes)
			const code = generateCode(40);
			const expiresAt = new Date(Date.now() + 5 * 60 * 1000).toISOString();

			await c.env.DB.prepare(`
				INSERT INTO oauth_codes (code, user_id, client_id, redirect_uri, scope, expires_at)
				VALUES (?, ?, ?, ?, ?, ?)
			`).bind(code, user.id, client_id, redirect_uri, scope || 'control', expiresAt).run();

			// 5. Build redirect URL
			const redirectUrl = new URL(redirect_uri);
			redirectUrl.searchParams.set('code', code);
			if (state) {
				redirectUrl.searchParams.set('state', state);
			}

			// Log authorization
			await c.env.DB.prepare(`
				INSERT INTO admin_request_logs (request_type, message_details, status, source, user_name)
				VALUES (?, ?, ?, ?, ?)
			`).bind(
				'OAuth Authorization',
				`User ${email} authorized Alexa access`,
				'Approved',
				'OAuth',
				email
			).run();

			return c.json({
				success: true,
				redirect_url: redirectUrl.toString()
			});

		} catch (error) {
			console.error('OAuth authorize error:', error);
			return c.json({ error: "Authorization failed" }, 500);
		}
	}
}
