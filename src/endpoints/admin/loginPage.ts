import { OpenAPIRoute, OpenAPIRouteSchema } from "chanfana";
import { Context } from "hono";
import { z } from "zod";

export class AdminLoginPage extends OpenAPIRoute {
	schema: OpenAPIRouteSchema = {
		tags: ["Admin"],
		summary: "Admin login page",
		responses: {
			"200": {
				description: "Returns admin login HTML page",
			},
		},
	};

	async handle(c: Context) {
		const html = `
<!DOCTYPE html>
<html lang="en">
<head>
	<meta charset="UTF-8">
	<meta name="viewport" content="width=device-width, initial-scale=1.0">
	<title>Admin Login - Hospital Church</title>
	<style>
		* {
			margin: 0;
			padding: 0;
			box-sizing: border-box;
		}

		body {
			font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif;
			background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
			min-height: 100vh;
			display: flex;
			align-items: center;
			justify-content: center;
			padding: 20px;
		}

		.login-container {
			background: white;
			border-radius: 12px;
			box-shadow: 0 20px 60px rgba(0, 0, 0, 0.3);
			width: 100%;
			max-width: 400px;
			padding: 40px;
		}

		.logo {
			text-align: center;
			margin-bottom: 30px;
		}

		.logo h1 {
			color: #667eea;
			font-size: 28px;
			margin-bottom: 5px;
		}

		.logo p {
			color: #6c757d;
			font-size: 14px;
		}

		.form-group {
			margin-bottom: 20px;
		}

		label {
			display: block;
			margin-bottom: 8px;
			color: #333;
			font-weight: 500;
			font-size: 14px;
		}

		input {
			width: 100%;
			padding: 12px 16px;
			border: 2px solid #e1e4e8;
			border-radius: 8px;
			font-size: 15px;
			transition: all 0.3s ease;
		}

		input:focus {
			outline: none;
			border-color: #667eea;
			box-shadow: 0 0 0 3px rgba(102, 126, 234, 0.1);
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
			transition: transform 0.2s ease, box-shadow 0.2s ease;
		}

		button:hover {
			transform: translateY(-2px);
			box-shadow: 0 8px 20px rgba(102, 126, 234, 0.4);
		}

		button:active {
			transform: translateY(0);
		}

		.error-message {
			background: #fee;
			color: #c33;
			padding: 12px;
			border-radius: 8px;
			margin-bottom: 20px;
			font-size: 14px;
			display: none;
		}

		.error-message.show {
			display: block;
		}

		.footer {
			text-align: center;
			margin-top: 25px;
			color: #6c757d;
			font-size: 13px;
		}
	</style>
</head>
<body>
	<div class="login-container">
		<div class="logo">
			<h1>🏥 Admin Portal</h1>
			<p>Hospital Church Management System</p>
		</div>

		<div id="error" class="error-message"></div>

		<form id="loginForm">
			<div class="form-group">
				<label for="email">Email Address</label>
				<input type="email" id="email" name="email" required placeholder="admin@building.com" autocomplete="email">
			</div>

			<div class="form-group">
				<label for="password">Password</label>
				<input type="password" id="password" name="password" required placeholder="Enter your password" autocomplete="current-password">
			</div>

			<button type="submit">Sign In</button>
		</form>

		<div class="footer">
			Hospital Church Tenant Support System
		</div>
	</div>

	<script>
		document.getElementById('loginForm').addEventListener('submit', async (e) => {
			e.preventDefault();

			const email = document.getElementById('email').value;
			const password = document.getElementById('password').value;
			const errorDiv = document.getElementById('error');

			try {
				const response = await fetch('/auth/login', {
					method: 'POST',
					headers: {
						'Content-Type': 'application/json',
					},
					body: JSON.stringify({ email, password })
				});

				const data = await response.json();

				if (data.success) {
					// Store session token
					localStorage.setItem('session_token', data.session_token);
					localStorage.setItem('user_role', data.user.role);
					localStorage.setItem('user_name', data.user.full_name);

					// Redirect to admin dashboard
					window.location.href = '/admin/dashboard';
				} else {
					errorDiv.textContent = data.error || 'Invalid email or password';
					errorDiv.classList.add('show');
				}
			} catch (error) {
				errorDiv.textContent = 'Login failed. Please try again.';
				errorDiv.classList.add('show');
			}
		});

		// Hide error on input
		document.querySelectorAll('input').forEach(input => {
			input.addEventListener('input', () => {
				document.getElementById('error').classList.remove('show');
			});
		});
	</script>
</body>
</html>
		`;

		return c.html(html);
	}
}
