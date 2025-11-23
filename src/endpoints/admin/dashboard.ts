import { OpenAPIRoute, OpenAPIRouteSchema } from "chanfana";
import { Context } from "hono";
import { z } from "zod";

export class AdminDashboard extends OpenAPIRoute {
	schema: OpenAPIRouteSchema = {
		tags: ["Admin"],
		summary: "Admin dashboard page",
		responses: {
			"200": {
				description: "Returns admin dashboard HTML page",
			},
		},
	};

	async handle(c: Context) {
		const html = `<!DOCTYPE html>
<html lang="en">
<head>
	<meta charset="UTF-8">
	<title>Admin Dashboard - Hospital Church Portal</title>
	<meta name="viewport" content="width=device-width, initial-scale=1">
	<script>
		// Get auth headers for all requests
		function getAuthHeaders() {
			const sessionToken = localStorage.getItem('session_token');
			return sessionToken ? { 'Authorization': \`Bearer \${sessionToken}\` } : {};
		}

		// Fetch with auth headers
		async function fetchWithAuth(url, options = {}) {
			const headers = { ...getAuthHeaders(), ...(options.headers || {}) };
			return fetch(url, { ...options, headers });
		}

		// Authentication check - must be logged in as admin
		(async function checkAuth() {
			const sessionToken = localStorage.getItem('session_token');
			const userRole = localStorage.getItem('user_role');
			const userName = localStorage.getItem('user_name');

			if (!sessionToken || userRole !== 'admin') {
				window.location.href = '/admin/login';
				return;
			}

			// Update header with user name if available
			if (userName) {
				const headerText = document.querySelector('.header-text p');
				if (headerText) {
					headerText.textContent = \`Welcome, \${userName} • Tenant Portal Management System\`;
				}
			}
		})();
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
			background: linear-gradient(135deg, #0052CC 0%, #0065FF 100%);
			color: white;
			padding: 32px 24px;
			box-shadow: 0 8px 32px rgba(11, 31, 42, 0.08);
		}
		.header-content {
			max-width: 1400px;
			margin: 0 auto;
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
		.container {
			max-width: 1400px;
			margin: 0 auto;
			padding: 20px;
		}
		.grid {
			display: grid;
			grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
			gap: 20px;
			margin-bottom: 30px;
		}
		.card {
			background: white;
			border-radius: 16px;
			padding: 28px;
			box-shadow: 0 8px 32px rgba(11, 31, 42, 0.08), 0 2px 8px rgba(11, 31, 42, 0.04);
			transition: all 0.2s;
		}
		.card:hover {
			box-shadow: 0 12px 40px rgba(11, 31, 42, 0.12), 0 4px 12px rgba(11, 31, 42, 0.06);
		}
		.card h2 {
			font-size: 18px;
			color: #0B1F2A;
			font-weight: 700;
			margin-bottom: 20px;
			display: flex;
			align-items: center;
			gap: 10px;
		}
		.stat {
			font-size: 40px;
			font-weight: 700;
			color: #0052CC;
			margin-bottom: 8px;
			letter-spacing: -1px;
		}
		.stat-label {
			color: #586069;
			font-size: 14px;
			font-weight: 500;
		}
		table {
			width: 100%;
			border-collapse: collapse;
		}
		th {
			background: #FAFBFC;
			padding: 14px 16px;
			text-align: left;
			font-weight: 600;
			font-size: 13px;
			color: #0B1F2A;
			border-bottom: 2px solid #E1E4E8;
			text-transform: uppercase;
			letter-spacing: 0.3px;
		}
		td {
			padding: 14px 16px;
			border-bottom: 1px solid #E1E4E8;
			font-size: 14px;
			color: #0B1F2A;
		}
		tr:hover {
			background: #FAFBFC;
		}
		.badge {
			display: inline-block;
			padding: 6px 14px;
			border-radius: 16px;
			font-size: 12px;
			font-weight: 600;
			letter-spacing: 0.2px;
		}
		.badge-admin { background: #0052CC; color: white; }
		.badge-tenant { background: #00B8D9; color: white; }
		.badge-maintenance { background: #FFAB00; color: #0B1F2A; }
		.badge-active { background: #36B37E; color: white; }
		.badge-inactive { background: #DFE1E6; color: #586069; }
		.btn {
			padding: 10px 18px;
			border: none;
			border-radius: 8px;
			cursor: pointer;
			font-size: 14px;
			font-weight: 600;
			margin-right: 8px;
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
		.btn-danger {
			background: #DE350B;
			color: white;
			box-shadow: 0 4px 12px rgba(222, 53, 11, 0.2);
		}
		.btn-danger:hover {
			transform: translateY(-2px);
			box-shadow: 0 6px 20px rgba(222, 53, 11, 0.3);
		}
		.tabs {
			display: flex;
			gap: 12px;
			margin-bottom: 24px;
			border-bottom: 2px solid #E1E4E8;
		}
		.tab {
			padding: 14px 28px;
			cursor: pointer;
			border-bottom: 3px solid transparent;
			font-weight: 600;
			font-size: 14px;
			color: #586069;
			transition: all 0.2s;
			border-radius: 8px 8px 0 0;
		}
		.tab:hover {
			background: rgba(0, 82, 204, 0.04);
			color: #0052CC;
		}
		.tab.active {
			color: #0052CC;
			border-bottom-color: #0052CC;
			background: rgba(0, 82, 204, 0.04);
		}
		.tab-content {
			display: none;
		}
		.tab-content.active {
			display: block;
		}
		.modal {
			display: none;
			position: fixed;
			top: 0;
			left: 0;
			width: 100%;
			height: 100%;
			background: rgba(11, 31, 42, 0.5);
			backdrop-filter: blur(4px);
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
			padding: 36px;
			max-width: 520px;
			width: 90%;
			box-shadow: 0 20px 60px rgba(11, 31, 42, 0.2);
		}
		.modal-content h2 {
			color: #0B1F2A;
			font-size: 22px;
			font-weight: 700;
			margin-bottom: 24px;
		}
		.form-group {
			margin-bottom: 20px;
		}
		.form-group label {
			display: block;
			margin-bottom: 8px;
			font-weight: 600;
			font-size: 13px;
			color: #0B1F2A;
			text-transform: uppercase;
			letter-spacing: 0.3px;
		}
		.form-group input,
		.form-group select {
			width: 100%;
			padding: 12px 16px;
			border: 2px solid #E1E4E8;
			border-radius: 8px;
			font-size: 15px;
			font-family: inherit;
			transition: all 0.2s;
		}
		.form-group input:focus,
		.form-group select:focus {
			outline: none;
			border-color: #0052CC;
			box-shadow: 0 0 0 3px rgba(0, 82, 204, 0.1);
		}
		.footer {
			margin-top: 40px;
			padding: 24px;
			text-align: center;
			color: #586069;
			font-size: 13px;
			border-top: 1px solid #E1E4E8;
		}
		.footer strong {
			color: #0052CC;
		}
		/* Photo Gallery */
		.photo-gallery {
			display: grid;
			grid-template-columns: repeat(auto-fill, minmax(200px, 1fr));
			gap: 16px;
			margin-top: 20px;
		}
		.photo-gallery-item {
			position: relative;
			aspect-ratio: 4/3;
			border-radius: 12px;
			overflow: hidden;
			border: 2px solid #E1E4E8;
			cursor: pointer;
			transition: all 0.2s;
		}
		.photo-gallery-item:hover {
			border-color: #0052CC;
			transform: scale(1.05);
			box-shadow: 0 8px 24px rgba(0, 82, 204, 0.2);
		}
		.photo-gallery-item img {
			width: 100%;
			height: 100%;
			object-fit: cover;
		}
		.photo-btn-small {
			padding: 6px 12px;
			background: #0052CC;
			color: white;
			border: none;
			border-radius: 6px;
			font-size: 12px;
			font-weight: 600;
			cursor: pointer;
			transition: all 0.2s;
		}
		.photo-btn-small:hover {
			background: #0065FF;
		}
		.photo-gallery {
			display: flex;
			gap: 12px;
			flex-wrap: wrap;
			padding: 20px;
			max-height: 500px;
			overflow-y: auto;
		}
		.admin-photo {
			width: 130px;
			height: 130px;
			object-fit: cover;
			margin: 8px;
			border-radius: 6px;
			cursor: pointer;
			transition: transform 0.2s, box-shadow 0.2s;
			box-shadow: 0 2px 8px rgba(0,0,0,0.1);
		}
		.admin-photo:hover {
			transform: scale(1.1);
			box-shadow: 0 4px 16px rgba(0,0,0,0.2);
		}
	</style>
</head>
<body>
	<div class="header">
		<div class="header-content">
			<div class="logo-icon">⛪</div>
			<div class="header-text">
				<h1>Hospital Church Admin Dashboard</h1>
				<p>Tenant Portal Management System • Powered by NWM Creative Works</p>
			</div>
		</div>
	</div>

	<div class="container">
		<div class="grid">
			<div class="card">
				<h2>👥 Total Users</h2>
				<div class="stat" id="totalUsers">0</div>
				<div class="stat-label">Active accounts</div>
			</div>
			<div class="card">
				<h2>🔧 Open Requests</h2>
				<div class="stat" id="openRequests">0</div>
				<div class="stat-label">Maintenance requests</div>
			</div>
			<div class="card">
				<h2>📊 Activity Today</h2>
				<div class="stat" id="activityToday">0</div>
				<div class="stat-label">Actions logged</div>
			</div>
		</div>

		<div class="tabs">
			<div class="tab active" onclick="switchTab('users')">Users</div>
			<div class="tab" onclick="switchTab('rooms')">Rooms</div>
			<div class="tab" onclick="switchTab('thermostats')">Thermostats</div>
			<div class="tab" onclick="switchTab('permissions')">Tenant Permissions</div>
			<div class="tab" onclick="switchTab('chatActivity')">Chatbot Activity</div>
			<div class="tab" onclick="switchTab('activity')">Activity Log</div>
			<div class="tab" onclick="switchTab('maintenance')">Maintenance</div>
			<div class="tab" onclick="switchTab('knowledge')">Knowledge Base</div>
		</div>

		<div id="users-tab" class="tab-content active">
			<div class="card">
				<h2>👥 User Management <button class="btn btn-primary" onclick="showAddUserModal()">+ Add User</button></h2>
				<table id="usersTable">
					<thead>
						<tr>
							<th>Name</th>
							<th>Email</th>
							<th>Auditorium</th>
							<th>Role</th>
							<th>Status</th>
							<th>Last Login</th>
							<th>Actions</th>
						</tr>
					</thead>
					<tbody></tbody>
				</table>
			</div>
		</div>

		<div id="chatActivity-tab" class="tab-content">
			<div class="card">
				<h2>💬 Chatbot Activity</h2>
				<p style="color: #586069; margin-bottom: 16px;">See what questions tenants are asking and identify common issues</p>
				<table id="chatActivityTable">
					<thead>
						<tr>
							<th>Time</th>
							<th>User</th>
							<th>Auditorium</th>
							<th>Question</th>
							<th>Response</th>
							<th>Intent</th>
						</tr>
					</thead>
					<tbody></tbody>
				</table>
			</div>
		</div>

		<div id="activity-tab" class="tab-content">
			<div class="card">
				<h2>📊 Activity Log</h2>
				<table id="activityTable">
					<thead>
						<tr>
							<th>Time</th>
							<th>User</th>
							<th>Action</th>
							<th>Auditorium</th>
						</tr>
					</thead>
					<tbody></tbody>
				</table>
			</div>
		</div>

		<div id="maintenance-tab" class="tab-content">
			<div class="card">
				<h2>🔧 Maintenance Requests</h2>
				<table id="maintenanceTable">
					<thead>
						<tr>
							<th>ID</th>
							<th>Auditorium</th>
							<th>Tenant</th>
							<th>Category</th>
							<th>Description</th>
							<th>Photos</th>
							<th>Status</th>
							<th>Created</th>
							<th>Assigned To</th>
						</tr>
					</thead>
					<tbody></tbody>
				</table>
			</div>
		</div>

		<div id="knowledge-tab" class="tab-content">
			<div class="card">
				<h2>📚 Knowledge Base Management <button class="btn btn-primary" onclick="showAddKnowledgeModal()">+ Add Entry</button></h2>
				<table id="knowledgeTable">
					<thead>
						<tr>
							<th>Category</th>
							<th>Question</th>
							<th>Answer</th>
							<th>Keywords</th>
							<th>Created</th>
							<th>Actions</th>
						</tr>
					</thead>
					<tbody></tbody>
				</table>
			</div>
		</div>

		<div id="rooms-tab" class="tab-content">
			<div class="card">
				<h2>🏠 Room Management <button class="btn btn-primary" onclick="showAddRoomModal()">+ Add Room</button></h2>
				<table id="roomsTable">
					<thead>
						<tr>
							<th>Room Name</th>
							<th>Description</th>
							<th>Created</th>
							<th>Actions</th>
						</tr>
					</thead>
					<tbody></tbody>
				</table>
			</div>
		</div>

		<div id="thermostats-tab" class="tab-content">
			<div class="card">
				<h2>🌡️ Thermostat Management <button class="btn btn-primary" onclick="syncAlexaDevices()">🔄 Sync from Alexa</button></h2>
				<table id="thermostatsTable">
					<thead>
						<tr>
							<th>Device Name</th>
							<th>Alexa Device ID</th>
							<th>Assigned Room</th>
							<th>Status</th>
							<th>Last Sync</th>
							<th>Actions</th>
						</tr>
					</thead>
					<tbody></tbody>
				</table>
			</div>
		</div>

		<div id="permissions-tab" class="tab-content">
			<div class="card">
				<h2>🔐 Tenant Room Permissions <button class="btn btn-primary" onclick="showAddPermissionModal()">+ Grant Permission</button></h2>
				<table id="permissionsTable">
					<thead>
						<tr>
							<th>Tenant Name</th>
							<th>Email</th>
							<th>Room</th>
							<th>Can Control Temp</th>
							<th>Created</th>
							<th>Actions</th>
						</tr>
					</thead>
					<tbody></tbody>
				</table>
			</div>
		</div>

		<div class="footer">
			<p>&copy; 2025 Hospital Church of Jacksonville | Powered by <strong>NWM Creative Works</strong></p>
		</div>
	</div>

	<div class="modal" id="addUserModal">
		<div class="modal-content">
			<h2 id="userModalTitle">Add New User</h2>
			<form id="addUserForm">
				<input type="hidden" name="id" id="userId">
				<div class="form-group">
					<label>Full Name</label>
					<input type="text" name="full_name" id="userFullName" required>
				</div>
				<div class="form-group">
					<label>Email</label>
					<input type="email" name="email" id="userEmail" required>
				</div>
				<div class="form-group">
					<label>Password</label>
					<input type="password" name="password" id="userPassword">
					<small style="color: #586069;">Leave blank to keep existing password when editing</small>
				</div>
				<div class="form-group">
					<label>Auditorium Name</label>
					<select name="unit_number" id="userUnitNumber">
						<option value="">Select Auditorium</option>
						<option value="Inspiration Studio">Inspiration Studio</option>
						<option value="Harmony Hall">Harmony Hall</option>
						<option value="Grace Auditorium">Grace Auditorium</option>
					</select>
				</div>
				<div class="form-group">
					<label>Role</label>
					<select name="role" id="userRole">
						<option value="tenant">Tenant</option>
						<option value="maintenance">Maintenance</option>
						<option value="admin">Admin</option>
					</select>
				</div>
				<button type="submit" class="btn btn-primary">Add User</button>
				<button type="button" class="btn" onclick="closeModal()">Cancel</button>
			</form>
		</div>
	</div>

	<div class="modal" id="addKnowledgeModal">
		<div class="modal-content">
			<h2 id="knowledgeModalTitle">Add Knowledge Entry</h2>
			<form id="addKnowledgeForm">
				<input type="hidden" name="id" id="knowledgeId">
				<div class="form-group">
					<label>Category</label>
					<select name="category" required>
						<option value="">Select Category</option>
						<option value="vmix">vMix / Media Equipment</option>
						<option value="thermostat">Thermostat / HVAC</option>
						<option value="building_info">Building Information</option>
						<option value="governance">Building Governance</option>
						<option value="equipment">General Equipment</option>
						<option value="maintenance">Maintenance Procedures</option>
						<option value="troubleshooting">Troubleshooting</option>
						<option value="other">Other</option>
					</select>
				</div>
				<div class="form-group">
					<label>Question / Topic</label>
					<input type="text" name="question" required placeholder="e.g., How do I fix vMix audio issues?">
				</div>
				<div class="form-group">
					<label>Answer / Solution</label>
					<textarea name="answer" required rows="6" style="width: 100%; padding: 12px 16px; border: 2px solid #E1E4E8; border-radius: 8px; font-size: 15px; font-family: inherit;" placeholder="Provide detailed step-by-step solution..."></textarea>
				</div>
				<div class="form-group">
					<label>Keywords (comma-separated)</label>
					<input type="text" name="keywords" placeholder="e.g., audio, sound, microphone, recording">
				</div>
				<button type="submit" class="btn btn-primary">Save Entry</button>
				<button type="button" class="btn" onclick="closeKnowledgeModal()">Cancel</button>
			</form>
		</div>
	</div>

	<div class="modal" id="photoViewerModal">
		<div class="modal-content" style="max-width: 800px;">
			<h2>📸 Maintenance Request Photos</h2>
			<div id="photoGallery" class="photo-gallery"></div>
			<button type="button" class="btn btn-primary" onclick="closePhotoViewer()" style="margin-top: 20px;">Close</button>
		</div>
	</div>

	<div class="modal" id="addRoomModal">
		<div class="modal-content">
			<h2>Add New Room</h2>
			<form id="addRoomForm">
				<div class="form-group">
					<label>Room Name</label>
					<input type="text" name="room_name" required placeholder="e.g., Sanctuary">
				</div>
				<div class="form-group">
					<label>Description</label>
					<input type="text" name="description" placeholder="e.g., Main worship area">
				</div>
				<button type="submit" class="btn btn-primary">Add Room</button>
				<button type="button" class="btn" onclick="closeRoomModal()">Cancel</button>
			</form>
		</div>
	</div>

	<div class="modal" id="addPermissionModal">
		<div class="modal-content">
			<h2>Grant Room Permission</h2>
			<form id="addPermissionForm">
				<div class="form-group">
					<label>Tenant Name</label>
					<input type="text" name="tenant_name" required placeholder="e.g., John Doe">
				</div>
				<div class="form-group">
					<label>Tenant Email</label>
					<input type="email" name="tenant_email" required placeholder="e.g., john@example.com">
				</div>
				<div class="form-group">
					<label>Room</label>
					<select name="room_id" id="permissionRoomSelect" required>
						<option value="">Select Room</option>
					</select>
				</div>
				<div class="form-group">
					<label>
						<input type="checkbox" name="can_control_temp" checked> Allow Temperature Control
					</label>
				</div>
				<button type="submit" class="btn btn-primary">Grant Permission</button>
				<button type="button" class="btn" onclick="closePermissionModal()">Cancel</button>
			</form>
		</div>
	</div>

	<script>
		// Load dashboard data
		async function loadDashboard() {
			await Promise.all([
				loadUsers(),
				loadRooms(),
				loadThermostats(),
				loadPermissions(),
				loadChatActivity(),
				loadActivity(),
				loadMaintenance(),
				loadKnowledge(),
				loadStats()
			]);
		}

		async function loadUsers() {
			const response = await fetch('/admin/users');
			const data = await response.json();

			document.getElementById('totalUsers').textContent = data.users.length;

			const tbody = document.querySelector('#usersTable tbody');
			tbody.innerHTML = data.users.map(user => \`
				<tr>
					<td>\${user.full_name}</td>
					<td>\${user.email}</td>
					<td>\${user.unit_number || '-'}</td>
					<td><span class="badge badge-\${user.role}">\${user.role}</span></td>
					<td><span class="badge badge-\${user.is_active ? 'active' : 'inactive'}">\${user.is_active ? 'Active' : 'Inactive'}</span></td>
					<td>\${user.last_login ? new Date(user.last_login).toLocaleDateString() : 'Never'}</td>
					<td>
						<button class="btn btn-primary" onclick="editUser(\${user.id})">Edit</button>
						<button class="btn btn-danger" onclick="deleteUser(\${user.id})">Delete</button>
					</td>
				</tr>
			\`).join('');
		}

		async function loadChatActivity() {
			// Fetch recent chat messages
			const response = await fetch('/admin/chat-activity');
			const data = await response.json();

			const tbody = document.querySelector('#chatActivityTable tbody');
			tbody.innerHTML = data.messages.map(msg => \`
				<tr>
					<td>\${new Date(msg.created_at).toLocaleString()}</td>
					<td>\${msg.tenant_name || 'Anonymous'}</td>
					<td>\${msg.unit_number || '-'}</td>
					<td style="max-width: 300px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;">\${msg.user_message || '-'}</td>
					<td style="max-width: 300px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;">\${msg.assistant_message ? msg.assistant_message.substring(0, 100) + '...' : '-'}</td>
					<td><span class="badge badge-active">\${msg.intent || 'general'}</span></td>
				</tr>
			\`).join('');
		}

		async function loadActivity() {
			const response = await fetch('/admin/activity');
			const data = await response.json();

			const tbody = document.querySelector('#activityTable tbody');
			tbody.innerHTML = data.activities.map(activity => \`
				<tr>
					<td>\${new Date(activity.created_at).toLocaleString()}</td>
					<td>\${activity.user_name || 'System'}</td>
					<td>\${activity.action_description}</td>
					<td>\${activity.unit_number || '-'}</td>
				</tr>
			\`).join('');
		}

		async function loadMaintenance() {
			const response = await fetch('/maintenance');
			const usersResponse = await fetch('/admin/users');
			const data = await response.json();
			const usersData = await usersResponse.json();

			document.getElementById('openRequests').textContent = data.requests.filter(r => r.status === 'open').length;

			const tbody = document.querySelector('#maintenanceTable tbody');
			tbody.innerHTML = data.requests.map(req => \`
				<tr>
					<td>#\${req.id}</td>
					<td>\${req.unit_number}</td>
					<td>\${req.tenant_name}</td>
					<td>\${req.category}</td>
					<td>\${req.description.substring(0, 50)}...</td>
					<td>
						\${req.photos ? \`<button class="photo-btn-small" onclick='viewRequestPhotos(\${JSON.stringify(req.photos).replace(/'/g, "&apos;")})'>📷 View (\${typeof req.photos === 'string' ? JSON.parse(req.photos || "[]").length : (Array.isArray(req.photos) ? req.photos.length : 0)})</button>\` : '-'}
					</td>
					<td>\${req.status}</td>
					<td>\${new Date(req.created_at).toLocaleDateString()}</td>
					<td>
						<select onchange="assignRequest(\${req.id}, this.value)" style="padding: 6px; border-radius: 6px; border: 1px solid #E1E4E8;">
							<option value="">Assign to...</option>
							\${usersData.users.filter(u => u.role === 'maintenance' || u.role === 'admin').map(u => \`
								<option value="\${u.id}" \${req.assigned_to === u.id ? 'selected' : ''}>\${u.full_name}</option>
							\`).join('')}
						</select>
					</td>
				</tr>
			\`).join('');
		}

		async function assignRequest(requestId, userId) {
			if (!userId) return;

			const response = await fetch(\`/admin/maintenance/\${requestId}/assign\`, {
				method: 'PUT',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ assigned_to: userId })
			});

			if (response.ok) {
				loadMaintenance();
				alert('Request assigned successfully');
			} else {
				alert('Failed to assign request');
			}
		}

		async function loadStats() {
			const response = await fetch('/admin/activity');
			const data = await response.json();
			const today = new Date().toDateString();
			const todayActivity = data.activities.filter(a => new Date(a.created_at).toDateString() === today);
			document.getElementById('activityToday').textContent = todayActivity.length;
		}

		function switchTab(tab) {
			document.querySelectorAll('.tab').forEach(t => t.classList.remove('active'));
			document.querySelectorAll('.tab-content').forEach(c => c.classList.remove('active'));

			event.target.classList.add('active');
			document.getElementById(tab + '-tab').classList.add('active');
		}

		function showAddUserModal() {
			document.getElementById('userModalTitle').textContent = 'Add New User';
			document.getElementById('addUserForm').reset();
			document.getElementById('userId').value = '';
			document.getElementById('userPassword').required = true;
			document.getElementById('addUserModal').classList.add('active');
		}

		async function editUser(userId) {
			// Fetch user data
			const response = await fetch('/admin/users');
			const data = await response.json();
			const user = data.users.find(u => u.id === userId);

			if (user) {
				document.getElementById('userModalTitle').textContent = 'Edit User';
				document.getElementById('userId').value = user.id;
				document.getElementById('userFullName').value = user.full_name;
				document.getElementById('userEmail').value = user.email;
				document.getElementById('userUnitNumber').value = user.unit_number || '';
				document.getElementById('userRole').value = user.role;
				document.getElementById('userPassword').value = '';
				document.getElementById('userPassword').required = false;
				document.getElementById('addUserModal').classList.add('active');
			}
		}

		function closeModal() {
			document.getElementById('addUserModal').classList.remove('active');
		}

		document.getElementById('addUserForm').addEventListener('submit', async (e) => {
			e.preventDefault();
			const formData = new FormData(e.target);
			const data = Object.fromEntries(formData);
			const userId = data.id;
			delete data.id;

			// Remove password if empty (for edit)
			if (!data.password) {
				delete data.password;
			}

			const method = userId ? 'PUT' : 'POST';
			const url = userId ? \`/admin/users/\${userId}\` : '/admin/users';

			const response = await fetch(url, {
				method: method,
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify(data)
			});

			if (response.ok) {
				closeModal();
				loadUsers();
				e.target.reset();
			} else {
				alert(\`Failed to \${userId ? 'update' : 'add'} user\`);
			}
		});

		async function deleteUser(userId) {
			if (!confirm('Are you sure you want to delete this user?')) return;

			const response = await fetch(\`/admin/users/\${userId}\`, { method: 'DELETE' });
			if (response.ok) {
				loadUsers();
			} else {
				alert('Failed to delete user');
			}
		}

		// Knowledge Base Management
		async function loadKnowledge() {
			const response = await fetch('/admin/knowledge');
			const data = await response.json();

			const tbody = document.querySelector('#knowledgeTable tbody');
			tbody.innerHTML = data.entries.map(entry => \`
				<tr>
					<td><span class="badge badge-active">\${entry.category}</span></td>
					<td>\${entry.question}</td>
					<td>\${entry.answer.substring(0, 100)}\${entry.answer.length > 100 ? '...' : ''}</td>
					<td>\${entry.keywords || 'N/A'}</td>
					<td>\${new Date(entry.created_at).toLocaleDateString()}</td>
					<td>
						<button class="btn btn-primary" onclick="editKnowledge(\${entry.id})">Edit</button>
						<button class="btn btn-danger" onclick="deleteKnowledge(\${entry.id})">Delete</button>
					</td>
				</tr>
			\`).join('');
		}

		function showAddKnowledgeModal() {
			document.getElementById('knowledgeModalTitle').textContent = 'Add Knowledge Entry';
			document.getElementById('addKnowledgeForm').reset();
			document.getElementById('knowledgeId').value = '';
			document.getElementById('addKnowledgeModal').classList.add('active');
		}

		function closeKnowledgeModal() {
			document.getElementById('addKnowledgeModal').classList.remove('active');
		}

		async function editKnowledge(id) {
			const response = await fetch('/admin/knowledge');
			const data = await response.json();
			const entry = data.entries.find(e => e.id === id);

			if (entry) {
				document.getElementById('knowledgeModalTitle').textContent = 'Edit Knowledge Entry';
				document.getElementById('knowledgeId').value = entry.id;
				document.querySelector('[name="category"]').value = entry.category;
				document.querySelector('[name="question"]').value = entry.question;
				document.querySelector('[name="answer"]').value = entry.answer;
				document.querySelector('[name="keywords"]').value = entry.keywords || '';
				document.getElementById('addKnowledgeModal').classList.add('active');
			}
		}

		async function deleteKnowledge(id) {
			if (!confirm('Are you sure you want to delete this knowledge entry?')) return;

			const response = await fetch(\`/admin/knowledge/\${id}\`, { method: 'DELETE' });
			if (response.ok) {
				loadKnowledge();
			} else {
				alert('Failed to delete knowledge entry');
			}
		}

		document.getElementById('addKnowledgeForm').addEventListener('submit', async (e) => {
			e.preventDefault();
			const formData = new FormData(e.target);
			const data = Object.fromEntries(formData);
			const id = data.id;
			delete data.id;

			const method = id ? 'PUT' : 'POST';
			const url = id ? \`/admin/knowledge/\${id}\` : '/admin/knowledge';

			const response = await fetch(url, {
				method: method,
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify(data)
			});

			if (response.ok) {
				closeKnowledgeModal();
				loadKnowledge();
				e.target.reset();
			} else {
				alert('Failed to save knowledge entry');
			}
		});

		// Photo viewer functions
		function viewRequestPhotos(photos) {
			const photoArray = typeof photos === 'string' ? JSON.parse(photos) : photos;
			const container = document.getElementById('photoGallery');
			container.innerHTML = '';

			photoArray.forEach(photoData => {
				const url = typeof photoData === 'string' ? photoData : photoData.data;
				const img = document.createElement('img');
				img.src = url;
				img.className = 'admin-photo';
				img.onclick = () => window.open(url, '_blank');
				img.title = 'Click to open full size';
				container.appendChild(img);
			});

			document.getElementById('photoViewerModal').classList.add('active');
		}

		function closePhotoViewer() {
			document.getElementById('photoViewerModal').classList.remove('active');
		}

		// ============================================
		// ROOMS MANAGEMENT
		// ============================================

		async function loadRooms() {
			const response = await fetch('/admin/rooms');
			const data = await response.json();

			const tbody = document.querySelector('#roomsTable tbody');
			tbody.innerHTML = '';

			data.rooms.forEach(room => {
				const row = document.createElement('tr');
				row.innerHTML = \`
					<td><strong>\${room.room_name}</strong></td>
					<td>\${room.description || '-'}</td>
					<td>\${new Date(room.created_at).toLocaleDateString()}</td>
					<td>
						<button class="btn-small" onclick="deleteRoom(\${room.id})">Delete</button>
					</td>
				\`;
				tbody.appendChild(row);
			});
		}

		function showAddRoomModal() {
			document.getElementById('addRoomModal').classList.add('active');
		}

		function closeRoomModal() {
			document.getElementById('addRoomModal').classList.remove('active');
			document.getElementById('addRoomForm').reset();
		}

		async function deleteRoom(id) {
			if (!confirm('Are you sure you want to delete this room? This will also remove thermostat assignments and tenant permissions.')) return;

			const response = await fetch(\`/admin/rooms/\${id}\`, { method: 'DELETE' });
			if (response.ok) {
				loadRooms();
				loadThermostats();
				loadPermissions();
			} else {
				alert('Failed to delete room');
			}
		}

		document.getElementById('addRoomForm').addEventListener('submit', async (e) => {
			e.preventDefault();
			const formData = new FormData(e.target);
			const data = Object.fromEntries(formData);

			const response = await fetch('/admin/rooms', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify(data)
			});

			if (response.ok) {
				closeRoomModal();
				loadRooms();
				e.target.reset();
			} else {
				const error = await response.json();
				alert(error.error || 'Failed to add room');
			}
		});

		// ============================================
		// THERMOSTATS MANAGEMENT
		// ============================================

		async function loadThermostats() {
			const response = await fetch('/admin/thermostats');
			const data = await response.json();

			const tbody = document.querySelector('#thermostatsTable tbody');
			tbody.innerHTML = '';

			if (data.thermostats.length === 0) {
				tbody.innerHTML = '<tr><td colspan="6" style="text-align: center; padding: 20px;">No thermostats found. Click "Sync from Alexa" to import devices.</td></tr>';
				return;
			}

			data.thermostats.forEach(thermo => {
				const row = document.createElement('tr');
				const statusIcon = thermo.is_active ? '✅' : '❌';
				const lastSync = thermo.last_sync ? new Date(thermo.last_sync).toLocaleString() : 'Never';

				row.innerHTML = \`
					<td><strong>\${thermo.device_name}</strong></td>
					<td><code>\${thermo.alexa_device_id.substring(0, 20)}...</code></td>
					<td>
						<select onchange="assignThermostatToRoom(\${thermo.id}, this.value)" style="width: 100%; padding: 4px;">
							<option value="">Unassigned</option>
						</select>
					</td>
					<td>\${statusIcon} \${thermo.is_active ? 'Active' : 'Inactive'}</td>
					<td>\${lastSync}</td>
					<td>
						<button class="btn-small" onclick="unassignThermostat(\${thermo.id})">Unassign</button>
					</td>
				\`;

				// Populate room dropdown
				fetch('/admin/rooms').then(r => r.json()).then(roomData => {
					const select = row.querySelector('select');
					roomData.rooms.forEach(room => {
						const option = document.createElement('option');
						option.value = room.id;
						option.textContent = room.room_name;
						if (thermo.assigned_room_id === room.id) {
							option.selected = true;
						}
						select.appendChild(option);
					});
				});

				tbody.appendChild(row);
			});
		}

		async function syncAlexaDevices() {
			if (!confirm('This will fetch all thermostat devices from your Alexa account. Continue?')) return;

			const btn = event.target;
			btn.disabled = true;
			btn.textContent = '⏳ Syncing...';

			try {
				const response = await fetch('/alexa/sync-devices');
				const data = await response.json();

				if (data.success) {
					alert(\`Successfully synced \${data.devices_synced} thermostat(s)\`);
					loadThermostats();
				} else {
					alert(\`Sync failed: \${data.error}\`);
				}
			} catch (error) {
				alert('Sync failed: ' + error.message);
			} finally {
				btn.disabled = false;
				btn.textContent = '🔄 Sync from Alexa';
			}
		}

		async function assignThermostatToRoom(thermostatId, roomId) {
			if (!roomId) return;

			const response = await fetch(\`/admin/thermostats/\${thermostatId}\`, {
				method: 'PATCH',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ room_id: parseInt(roomId) })
			});

			if (response.ok) {
				alert('Thermostat assigned successfully');
				loadThermostats();
			} else {
				alert('Failed to assign thermostat');
			}
		}

		async function unassignThermostat(thermostatId) {
			const response = await fetch(\`/admin/thermostats/\${thermostatId}/unassign\`, {
				method: 'PATCH'
			});

			if (response.ok) {
				alert('Thermostat unassigned');
				loadThermostats();
			} else {
				alert('Failed to unassign thermostat');
			}
		}

		// ============================================
		// TENANT PERMISSIONS MANAGEMENT
		// ============================================

		async function loadPermissions() {
			const response = await fetch('/admin/permissions');
			const data = await response.json();

			const tbody = document.querySelector('#permissionsTable tbody');
			tbody.innerHTML = '';

			if (data.permissions.length === 0) {
				tbody.innerHTML = '<tr><td colspan="6" style="text-align: center; padding: 20px;">No permissions granted yet.</td></tr>';
				return;
			}

			data.permissions.forEach(perm => {
				const row = document.createElement('tr');
				const canControl = perm.can_control_temp ? '✅ Yes' : '❌ No';

				row.innerHTML = \`
					<td><strong>\${perm.tenant_name}</strong></td>
					<td>\${perm.tenant_email}</td>
					<td>\${perm.room_name}</td>
					<td>\${canControl}</td>
					<td>\${new Date(perm.created_at).toLocaleDateString()}</td>
					<td>
						<button class="btn-small" onclick="deletePermission(\${perm.id})">Revoke</button>
					</td>
				\`;
				tbody.appendChild(row);
			});
		}

		async function showAddPermissionModal() {
			// Load rooms into dropdown
			const response = await fetch('/admin/rooms');
			const data = await response.json();

			const select = document.getElementById('permissionRoomSelect');
			select.innerHTML = '<option value="">Select Room</option>';

			data.rooms.forEach(room => {
				const option = document.createElement('option');
				option.value = room.id;
				option.textContent = room.room_name;
				select.appendChild(option);
			});

			document.getElementById('addPermissionModal').classList.add('active');
		}

		function closePermissionModal() {
			document.getElementById('addPermissionModal').classList.remove('active');
			document.getElementById('addPermissionForm').reset();
		}

		async function deletePermission(id) {
			if (!confirm('Are you sure you want to revoke this permission?')) return;

			const response = await fetch(\`/admin/permissions/\${id}\`, { method: 'DELETE' });
			if (response.ok) {
				loadPermissions();
			} else {
				alert('Failed to delete permission');
			}
		}

		document.getElementById('addPermissionForm').addEventListener('submit', async (e) => {
			e.preventDefault();
			const formData = new FormData(e.target);
			const data = {
				tenant_name: formData.get('tenant_name'),
				tenant_email: formData.get('tenant_email'),
				room_id: parseInt(formData.get('room_id')),
				can_control_temp: formData.get('can_control_temp') === 'on'
			};

			const response = await fetch('/admin/permissions', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify(data)
			});

			if (response.ok) {
				closePermissionModal();
				loadPermissions();
				e.target.reset();
			} else {
				const error = await response.json();
				alert(error.error || 'Failed to grant permission');
			}
		});

		// Load data on page load
		loadDashboard();

		// Auto-refresh every 30 seconds
		setInterval(loadDashboard, 30000);
	</script>
</body>
</html>`;

		return c.html(html);
	}
}
