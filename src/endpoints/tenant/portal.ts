import { OpenAPIRoute, OpenAPIRouteSchema } from "chanfana";
import { Context } from "hono";

export class TenantPortal extends OpenAPIRoute {
	schema: OpenAPIRouteSchema = {
		tags: ["Tenant"],
		summary: "Tenant portal page",
		responses: {
			"200": {
				description: "Returns tenant portal HTML page",
			},
		},
	};

	async handle(c: Context) {
		const html = `<!DOCTYPE html>
<html lang="en">
<head>
	<meta charset="UTF-8">
	<title>Tenant Portal - Hospital Church</title>
	<meta name="viewport" content="width=device-width, initial-scale=1">
	<script>
		// Authentication check
		(async function checkAuth() {
			const sessionToken = localStorage.getItem('session_token');
			const userRole = localStorage.getItem('user_role');
			const userName = localStorage.getItem('user_name');
			const userId = localStorage.getItem('user_id');

			if (!sessionToken || userRole !== 'tenant') {
				window.location.href = '/login';
				return;
			}

			// Update header with user name
			if (userName) {
				const headerText = document.querySelector('.header-text p');
				if (headerText) {
					headerText.textContent = \`Welcome, \${userName}\`;
				}
			}

			// Load unread message count
			if (userId) {
				loadUnreadCount(userId);
			}
		})();

		async function loadUnreadCount(userId) {
			try {
				const response = await fetch(\`/tenant/api/messages?userId=\${userId}\`);
				const data = await response.json();
				if (data.success && data.unread_count > 0) {
					document.getElementById('unreadBadge').textContent = data.unread_count;
					document.getElementById('unreadBadge').style.display = 'inline-block';
				}
			} catch (error) {
				console.error('Failed to load unread count:', error);
			}
		}
	</script>
	<style>
		* { margin: 0; padding: 0; box-sizing: border-box; }
		body {
			font-family: -apple-system, system-ui, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
			background: #F4F5F7;
			background-image: radial-gradient(circle at 20% 20%, rgba(0, 82, 204, 0.04) 0%, transparent 50%),
			                  radial-gradient(circle at 80% 80%, rgba(0, 184, 217, 0.04) 0%, transparent 50%);
			min-height: 100vh;
		}
		.header {
			background: linear-gradient(135deg, #00B8D9 0%, #0052CC 100%);
			color: white;
			padding: 32px 24px;
			box-shadow: 0 8px 32px rgba(11, 31, 42, 0.08);
		}
		.header-content {
			max-width: 1200px;
			margin: 0 auto;
			display: flex;
			align-items: center;
			justify-content: space-between;
		}
		.logo-section {
			display: flex;
			align-items: center;
			gap: 16px;
		}
		.logo-icon {
			width: 56px;
			height: 56px;
			background: rgba(255, 255, 255, 0.15);
			border-radius: 14px;
			display: flex;
			align-items: center;
			justify-content: center;
			font-size: 28px;
			backdrop-filter: blur(10px);
		}
		.header-text h1 {
			font-size: 28px;
			font-weight: 700;
			margin-bottom: 4px;
			letter-spacing: -0.5px;
		}
		.header-text p {
			opacity: 0.9;
			font-size: 14px;
		}
		.header-actions {
			display: flex;
			gap: 16px;
		}
		.header-btn {
			position: relative;
			padding: 12px 24px;
			background: rgba(255, 255, 255, 0.15);
			border: 2px solid rgba(255, 255, 255, 0.3);
			border-radius: 12px;
			color: white;
			text-decoration: none;
			font-weight: 600;
			font-size: 14px;
			transition: all 0.2s;
			backdrop-filter: blur(10px);
		}
		.header-btn:hover {
			background: rgba(255, 255, 255, 0.25);
			transform: translateY(-2px);
		}
		.unread-badge {
			display: none;
			position: absolute;
			top: -8px;
			right: -8px;
			background: #DE350B;
			color: white;
			border-radius: 12px;
			padding: 4px 8px;
			font-size: 11px;
			font-weight: 700;
			min-width: 20px;
			text-align: center;
		}
		.container {
			max-width: 1200px;
			margin: 0 auto;
			padding: 40px 20px;
		}
		.cards-grid {
			display: grid;
			grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
			gap: 24px;
			margin-bottom: 40px;
		}
		.card {
			background: white;
			border-radius: 16px;
			padding: 32px;
			box-shadow: 0 8px 32px rgba(11, 31, 42, 0.08), 0 2px 8px rgba(11, 31, 42, 0.04);
			transition: all 0.2s;
			cursor: pointer;
			text-align: center;
		}
		.card:hover {
			box-shadow: 0 12px 40px rgba(11, 31, 42, 0.12), 0 4px 12px rgba(11, 31, 42, 0.06);
			transform: translateY(-4px);
		}
		.card-icon {
			font-size: 48px;
			margin-bottom: 16px;
		}
		.card h2 {
			font-size: 20px;
			color: #0B1F2A;
			margin-bottom: 8px;
		}
		.card p {
			color: #586069;
			font-size: 14px;
		}
		.btn {
			padding: 12px 24px;
			border: none;
			border-radius: 8px;
			cursor: pointer;
			font-size: 14px;
			font-weight: 600;
			margin-top: 16px;
			transition: all 0.2s;
		}
		.btn-primary {
			background: linear-gradient(135deg, #0052CC 0%, #0065FF 100%);
			color: white;
			box-shadow: 0 4px 12px rgba(0, 82, 204, 0.2);
		}
		.btn-primary:hover {
			transform: translateY(-2px);
			box-shadow: 0 6px 20px rgba(0, 82, 204, 0.3);
		}
	</style>
</head>
<body>
	<div class="header">
		<div class="header-content">
			<div class="logo-section">
				<div class="logo-icon">⛪</div>
				<div class="header-text">
					<h1>Tenant Portal</h1>
					<p>Hospital Church of Jacksonville</p>
				</div>
			</div>
			<div class="header-actions">
				<a href="/portal/messages" class="header-btn">
					📧 Messages
					<span id="unreadBadge" class="unread-badge">0</span>
				</a>
				<a href="/chatbot" class="header-btn">💬 Chat Support</a>
			</div>
		</div>
	</div>

	<div class="container">
		<div class="cards-grid">
			<div class="card" onclick="window.location.href='/portal/messages'">
				<div class="card-icon">📧</div>
				<h2>Messages</h2>
				<p>View notices, announcements, and important updates from management</p>
			</div>

			<div class="card" onclick="window.location.href='/portal/photos'">
				<div class="card-icon">📸</div>
				<h2>Service Photos</h2>
				<p>Upload before/after photos for maintenance requests or general documentation</p>
			</div>

			<div class="card" onclick="window.location.href='/chatbot'">
				<div class="card-icon">💬</div>
				<h2>Chat Support</h2>
				<p>Get instant answers to your questions about the building, maintenance, and more</p>
			</div>
		</div>

		<div style="text-align: center; padding: 40px; color: #586069;">
			<p>&copy; 2025 Hospital Church of Jacksonville</p>
			<p style="margin-top: 8px;">Powered by <strong style="color: #0052CC;">NWM Creative Works</strong></p>
		</div>
	</div>
</body>
</html>`;

		return c.html(html);
	}
}
