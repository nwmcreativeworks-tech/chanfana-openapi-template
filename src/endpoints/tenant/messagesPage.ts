import { OpenAPIRoute, OpenAPIRouteSchema } from "chanfana";
import { Context } from "hono";

export class TenantMessagesPage extends OpenAPIRoute {
	schema: OpenAPIRouteSchema = {
		tags: ["Tenant"],
		summary: "Tenant messages inbox page",
		responses: {
			"200": {
				description: "Returns tenant messages HTML page",
			},
		},
	};

	async handle(c: Context) {
		const html = `<!DOCTYPE html>
<html lang="en">
<head>
	<meta charset="UTF-8">
	<title>Messages - Tenant Portal</title>
	<meta name="viewport" content="width=device-width, initial-scale=1">
	<script>
		let userId = null;

		// Authentication check
		(async function checkAuth() {
			const sessionToken = localStorage.getItem('session_token');
			const userRole = localStorage.getItem('user_role');
			const userName = localStorage.getItem('user_name');
			userId = localStorage.getItem('user_id');

			if (!sessionToken || userRole !== 'tenant') {
				window.location.href = '/login';
				return;
			}

			// Load messages
			if (userId) {
				loadMessages(userId);
			}
		})();

		async function loadMessages(userId) {
			const response = await fetch(\`/tenant/api/messages?userId=\${userId}\`);
			const data = await response.json();

			const messagesContainer = document.getElementById('messagesContainer');
			messagesContainer.innerHTML = '';

			if (!data.success || data.messages.length === 0) {
				messagesContainer.innerHTML = '<div class="empty-state">📬 No messages yet</div>';
				return;
			}

			data.messages.forEach(msg => {
				const messageCard = document.createElement('div');
				messageCard.className = \`message-card \${msg.is_read ? 'read' : 'unread'}\`;
				messageCard.onclick = () => viewMessage(msg.id, msg);

				const typeColors = {
					notice: '#0052CC',
					violation: '#DE350B',
					announcement: '#00B8D9'
				};

				messageCard.innerHTML = \`
					<div class="message-header">
						<div class="message-type" style="background: \${typeColors[msg.message_type] || '#0052CC'}">
							\${msg.message_type}
						</div>
						<div class="message-date">\${new Date(msg.created_at).toLocaleDateString()}</div>
					</div>
					<div class="message-subject">\${msg.subject || '(No Subject)'}</div>
					<div class="message-preview">\${msg.body.substring(0, 100)}\${msg.body.length > 100 ? '...' : ''}</div>
					<div class="message-from">From: \${msg.sender_name || 'Management'}</div>
					\${!msg.is_read ? '<div class="unread-indicator">●</div>' : ''}
				\`;

				messagesContainer.appendChild(messageCard);
			});

			// Update unread count
			document.getElementById('unreadCount').textContent = data.unread_count;
		}

		async function viewMessage(messageId, message) {
			// Mark as read
			await fetch(\`/tenant/api/messages/\${messageId}/read\`, { method: 'POST' });

			// Show message modal
			document.getElementById('modalSubject').textContent = message.subject || '(No Subject)';
			document.getElementById('modalDate').textContent = new Date(message.created_at).toLocaleString();
			document.getElementById('modalFrom').textContent = message.sender_name || 'Management';
			document.getElementById('modalType').textContent = message.message_type;
			document.getElementById('modalBody').textContent = message.body;

			document.getElementById('messageModal').classList.add('active');

			// Reload messages to update read status
			if (userId) {
				setTimeout(() => loadMessages(userId), 500);
			}
		}

		function closeModal() {
			document.getElementById('messageModal').classList.remove('active');
		}
	</script>
	<style>
		* { margin: 0; padding: 0; box-sizing: border-box; }
		body {
			font-family: -apple-system, system-ui, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
			background: #F4F5F7;
			min-height: 100vh;
		}
		.header {
			background: linear-gradient(135deg, #00B8D9 0%, #0052CC 100%);
			color: white;
			padding: 24px;
			box-shadow: 0 4px 16px rgba(0, 0, 0, 0.1);
		}
		.header-content {
			max-width: 800px;
			margin: 0 auto;
			display: flex;
			align-items: center;
			justify-content: space-between;
		}
		.header h1 {
			font-size: 24px;
		}
		.back-btn {
			padding: 8px 16px;
			background: rgba(255, 255, 255, 0.2);
			border: none;
			border-radius: 8px;
			color: white;
			text-decoration: none;
			font-weight: 600;
			transition: all 0.2s;
		}
		.back-btn:hover {
			background: rgba(255, 255, 255, 0.3);
		}
		.container {
			max-width: 800px;
			margin: 0 auto;
			padding: 32px 20px;
		}
		.stats-bar {
			background: white;
			border-radius: 12px;
			padding: 20px;
			margin-bottom: 24px;
			box-shadow: 0 2px 8px rgba(0, 0, 0, 0.04);
			display: flex;
			align-items: center;
			gap: 16px;
		}
		.stats-bar h2 {
			font-size: 18px;
			color: #0B1F2A;
		}
		.unread-count {
			background: #DE350B;
			color: white;
			padding: 4px 12px;
			border-radius: 12px;
			font-size: 14px;
			font-weight: 700;
		}
		.empty-state {
			text-align: center;
			padding: 60px 20px;
			color: #586069;
			font-size: 16px;
		}
		.message-card {
			background: white;
			border-radius: 12px;
			padding: 20px;
			margin-bottom: 16px;
			box-shadow: 0 2px 8px rgba(0, 0, 0, 0.04);
			cursor: pointer;
			transition: all 0.2s;
			position: relative;
		}
		.message-card:hover {
			box-shadow: 0 4px 16px rgba(0, 0, 0, 0.08);
			transform: translateY(-2px);
		}
		.message-card.unread {
			border-left: 4px solid #0052CC;
			background: #F8F9FA;
		}
		.message-header {
			display: flex;
			justify-content: space-between;
			align-items: center;
			margin-bottom: 12px;
		}
		.message-type {
			display: inline-block;
			padding: 4px 12px;
			border-radius: 12px;
			font-size: 12px;
			font-weight: 700;
			color: white;
			text-transform: uppercase;
		}
		.message-date {
			color: #586069;
			font-size: 13px;
		}
		.message-subject {
			font-size: 16px;
			font-weight: 700;
			color: #0B1F2A;
			margin-bottom: 8px;
		}
		.message-preview {
			color: #586069;
			font-size: 14px;
			margin-bottom: 8px;
		}
		.message-from {
			color: #0052CC;
			font-size: 13px;
			font-weight: 600;
		}
		.unread-indicator {
			position: absolute;
			top: 20px;
			right: 20px;
			color: #0052CC;
			font-size: 24px;
		}
		.modal {
			display: none;
			position: fixed;
			top: 0;
			left: 0;
			width: 100%;
			height: 100%;
			background: rgba(0, 0, 0, 0.5);
			align-items: center;
			justify-content: center;
			z-index: 1000;
		}
		.modal.active {
			display: flex;
		}
		.modal-content {
			background: white;
			border-radius: 16px;
			padding: 32px;
			max-width: 600px;
			width: 90%;
			max-height: 80vh;
			overflow-y: auto;
			box-shadow: 0 20px 60px rgba(0, 0, 0, 0.3);
		}
		.modal-header {
			border-bottom: 2px solid #E1E4E8;
			padding-bottom: 16px;
			margin-bottom: 20px;
		}
		.modal-header h2 {
			font-size: 20px;
			color: #0B1F2A;
			margin-bottom: 8px;
		}
		.modal-meta {
			display: flex;
			gap: 16px;
			font-size: 13px;
			color: #586069;
		}
		.modal-body {
			line-height: 1.6;
			color: #0B1F2A;
			font-size: 15px;
			white-space: pre-wrap;
		}
		.btn {
			padding: 12px 24px;
			border: none;
			border-radius: 8px;
			cursor: pointer;
			font-size: 14px;
			font-weight: 600;
			margin-top: 20px;
			background: #0052CC;
			color: white;
			transition: all 0.2s;
		}
		.btn:hover {
			background: #0065FF;
		}
	</style>
</head>
<body>
	<div class="header">
		<div class="header-content">
			<h1>📧 Messages</h1>
			<a href="/portal" class="back-btn">← Back to Portal</a>
		</div>
	</div>

	<div class="container">
		<div class="stats-bar">
			<h2>Your Messages</h2>
			<span class="unread-count" id="unreadCount">0</span>
		</div>

		<div id="messagesContainer"></div>
	</div>

	<div class="modal" id="messageModal">
		<div class="modal-content">
			<div class="modal-header">
				<h2 id="modalSubject"></h2>
				<div class="modal-meta">
					<span><strong>From:</strong> <span id="modalFrom"></span></span>
					<span><strong>Type:</strong> <span id="modalType"></span></span>
					<span><strong>Date:</strong> <span id="modalDate"></span></span>
				</div>
			</div>
			<div class="modal-body" id="modalBody"></div>
			<button class="btn" onclick="closeModal()">Close</button>
		</div>
	</div>
</body>
</html>`;

		return c.html(html);
	}
}
