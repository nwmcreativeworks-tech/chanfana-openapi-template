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
		.badge-sub_admin { background: #0065FF; color: white; }
		.badge-tenant { background: #00B8D9; color: white; }
		.badge-maintenance { background: #FFAB00; color: #0B1F2A; }
		.badge-active { background: #36B37E; color: white; }
		.badge-inactive { background: #DFE1E6; color: #586069; }
		.badge-notice { background: #0052CC; color: white; }
		.badge-violation { background: #DE350B; color: white; }
		.badge-announcement { background: #00B8D9; color: white; }
		.badge-before { background: #FFAB00; color: #0B1F2A; }
		.badge-after { background: #36B37E; color: white; }
		.badge-unspecified { background: #DFE1E6; color: #586069; }
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
		.btn-small {
			padding: 6px 12px;
			background: #0052CC;
			color: white;
			border: none;
			border-radius: 6px;
			font-size: 12px;
			font-weight: 600;
			cursor: pointer;
			margin-right: 4px;
			transition: all 0.2s;
		}
		.btn-small:hover {
			background: #0065FF;
			transform: translateY(-1px);
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
			<div class="tab" onclick="switchTab('thermostats')">Thermostats</div>
			<div class="tab" onclick="switchTab('messages')">Messages</div>
			<div class="tab" onclick="switchTab('servicePhotos')">Service Photos</div>
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

		<div id="thermostats-tab" class="tab-content">
			<div class="card">
				<h2>🌡️ Thermostat Management <button class="btn btn-primary" onclick="showAddThermostatModal()">+ Add Thermostat</button></h2>
				<table id="thermostatsTable">
					<thead>
						<tr>
							<th>Device Name</th>
							<th>Room Name</th>
							<th>Assigned Users</th>
							<th>Status</th>
							<th>Actions</th>
						</tr>
					</thead>
					<tbody></tbody>
				</table>
			</div>
		</div>

		<div id="messages-tab" class="tab-content">
			<div class="card">
				<h2>📧 Message Center <button class="btn btn-primary" onclick="showSendMessageModal()">+ Send Message</button></h2>
				<table id="messagesTable">
					<thead>
						<tr>
							<th>Date</th>
							<th>To</th>
							<th>Subject</th>
							<th>Type</th>
							<th>Status</th>
						</tr>
					</thead>
					<tbody></tbody>
				</table>
			</div>
		</div>

		<div id="servicePhotos-tab" class="tab-content">
			<div class="card">
				<h2>📸 Service Photos</h2>
				<div style="margin-bottom: 20px; display: flex; gap: 12px;">
					<select id="photoUserFilter" onchange="loadServicePhotos()">
						<option value="">All Users</option>
					</select>
					<select id="photoPhaseFilter" onchange="loadServicePhotos()">
						<option value="">All Phases</option>
						<option value="before">Before</option>
						<option value="after">After</option>
						<option value="unspecified">Unspecified</option>
					</select>
				</div>
				<table id="servicePhotosTable">
					<thead>
						<tr>
							<th>Date</th>
							<th>User</th>
							<th>Unit</th>
							<th>Phase</th>
							<th>Request</th>
							<th>Photo</th>
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
						<option value="sub_admin">Sub Admin</option>
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

	<div class="modal" id="addThermostatModal">
		<div class="modal-content">
			<h2 id="thermostatModalTitle">Add Thermostat</h2>
			<form id="addThermostatForm">
				<input type="hidden" name="id" id="thermostatId">
				<div class="form-group">
					<label>Device Name</label>
					<input type="text" name="device_name" id="thermostatDeviceName" required placeholder="e.g., Sanctuary Thermostat">
				</div>
				<div class="form-group">
					<label>Room Name</label>
					<input type="text" name="room_name" id="thermostatRoomName" required placeholder="e.g., Sanctuary">
				</div>
				<div class="form-group">
					<label>Alexa Device ID</label>
					<input type="text" name="alexa_device_id" id="thermostatAlexaId" required placeholder="e.g., amzn1.alexa-device-id...">
				</div>
				<button type="submit" class="btn btn-primary">Save Thermostat</button>
				<button type="button" class="btn" onclick="closeThermostatModal()">Cancel</button>
			</form>
		</div>
	</div>

	<div class="modal" id="editThermostatPermissionsModal">
		<div class="modal-content">
			<h2>Manage User Access</h2>
			<p id="thermostatPermissionName" style="color: #586069; margin-bottom: 16px;"></p>
			<input type="hidden" id="thermostatPermissionId">
			<div class="form-group">
				<label>Assign Users</label>
				<div id="userCheckboxList" style="max-height: 300px; overflow-y: auto; border: 2px solid #E1E4E8; border-radius: 8px; padding: 12px;">
				</div>
			</div>
			<button class="btn btn-primary" onclick="saveThermostatPermissions()">Save Permissions</button>
			<button class="btn" onclick="closeThermostatPermissionsModal()">Cancel</button>
		</div>
	</div>

	<div class="modal" id="sendMessageModal">
		<div class="modal-content">
			<h2>Send Message to Tenant</h2>
			<form id="sendMessageForm">
				<div class="form-group">
					<label>Recipient</label>
					<select name="userId" id="messageRecipient" required>
						<option value="">Select Tenant</option>
					</select>
				</div>
				<div class="form-group">
					<label>Message Type</label>
					<select name="messageType" required>
						<option value="notice">Notice</option>
						<option value="violation">Violation</option>
						<option value="announcement">Announcement</option>
					</select>
				</div>
				<div class="form-group">
					<label>Subject</label>
					<input type="text" name="subject" placeholder="Optional subject">
				</div>
				<div class="form-group">
					<label>Message</label>
					<textarea name="body" required rows="6" style="width: 100%; padding: 12px 16px; border: 2px solid #E1E4E8; border-radius: 8px; font-size: 15px; font-family: inherit;"></textarea>
				</div>
				<button type="submit" class="btn btn-primary">Send Message</button>
				<button type="button" class="btn" onclick="closeMessageModal()">Cancel</button>
			</form>
		</div>
	</div>

	<div class="modal" id="thermostatControlModal">
		<div class="modal-content">
			<h2>Control Thermostat</h2>
			<p id="controlThermostatName" style="color: #586069; margin-bottom: 16px;"></p>
			<input type="hidden" id="controlThermostatId">
			<div class="form-group">
				<label>Mode</label>
				<select id="controlMode">
					<option value="heat">Heat</option>
					<option value="cool">Cool</option>
					<option value="auto">Auto</option>
					<option value="off">Off</option>
				</select>
			</div>
			<div class="form-group">
				<label>Target Temperature (°F)</label>
				<input type="number" id="controlTemp" min="60" max="80" value="72">
			</div>
			<button class="btn btn-primary" onclick="sendThermostatCommand()">Send Command</button>
			<button class="btn" onclick="closeThermostatControlModal()">Cancel</button>
		</div>
	</div>

	<script>
		// Load dashboard data
		async function loadDashboard() {
			await Promise.all([
				loadUsers(),
				loadThermostats(),
				loadMessages(),
				loadServicePhotos(),
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
						\${req.photos ? \`<button class="btn-small" onclick='viewRequestPhotos(\${JSON.stringify(req.photos).replace(/'/g, "&apos;")})'>📷 View (\${typeof req.photos === 'string' ? JSON.parse(req.photos || "[]").length : (Array.isArray(req.photos) ? req.photos.length : 0)})</button>\` : '-'}
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
		// THERMOSTATS MANAGEMENT (NEW API)
		// ============================================

		async function loadThermostats() {
			const response = await fetch('/admin/api/thermostats');
			const data = await response.json();

			const tbody = document.querySelector('#thermostatsTable tbody');
			tbody.innerHTML = '';

			if (!data.success || data.thermostats.length === 0) {
				tbody.innerHTML = '<tr><td colspan="5" style="text-align: center; padding: 20px;">No thermostats configured yet.</td></tr>';
				return;
			}

			data.thermostats.forEach(thermo => {
				const row = document.createElement('tr');
				const statusIcon = thermo.is_active ? '✅' : '❌';
				const assignedUsers = thermo.assigned_users || [];
				const userCount = assignedUsers.length;

				row.innerHTML = \`
					<td><strong>\${thermo.device_name}</strong></td>
					<td>\${thermo.room_name || '-'}</td>
					<td>
						<span style="color: #586069;">\${userCount} user\${userCount !== 1 ? 's' : ''}</span>
						\${assignedUsers.slice(0, 2).map(u => \`<br><small>\${u.full_name}</small>\`).join('')}
						\${userCount > 2 ? \`<br><small>+\${userCount - 2} more</small>\` : ''}
					</td>
					<td>\${statusIcon} \${thermo.is_active ? 'Active' : 'Inactive'}</td>
					<td>
						<button class="btn-small" onclick="editThermostat(\${thermo.id})">Edit</button>
						<button class="btn-small" onclick="editThermostatPermissions(\${thermo.id}, '\${thermo.device_name}')">👥 Users</button>
						<button class="btn-small" onclick="showThermostatControl(\${thermo.id}, '\${thermo.device_name}')">🎛️ Control</button>
						<button class="btn-small" onclick="deleteThermostat(\${thermo.id})">Delete</button>
					</td>
				\`;

				tbody.appendChild(row);
			});
		}

		function showAddThermostatModal() {
			document.getElementById('thermostatModalTitle').textContent = 'Add Thermostat';
			document.getElementById('addThermostatForm').reset();
			document.getElementById('thermostatId').value = '';
			document.getElementById('addThermostatModal').classList.add('active');
		}

		function closeThermostatModal() {
			document.getElementById('addThermostatModal').classList.remove('active');
		}

		async function editThermostat(id) {
			const response = await fetch('/admin/api/thermostats');
			const data = await response.json();
			const thermostat = data.thermostats.find(t => t.id === id);

			if (thermostat) {
				document.getElementById('thermostatModalTitle').textContent = 'Edit Thermostat';
				document.getElementById('thermostatId').value = thermostat.id;
				document.getElementById('thermostatDeviceName').value = thermostat.device_name;
				document.getElementById('thermostatRoomName').value = thermostat.room_name || '';
				document.getElementById('thermostatAlexaId').value = thermostat.alexa_device_id || '';
				document.getElementById('addThermostatModal').classList.add('active');
			}
		}

		async function deleteThermostat(id) {
			if (!confirm('Are you sure you want to delete this thermostat?')) return;

			const response = await fetch(\`/admin/api/thermostats/\${id}\`, { method: 'DELETE' });
			if (response.ok) {
				loadThermostats();
			} else {
				alert('Failed to delete thermostat');
			}
		}

		document.getElementById('addThermostatForm').addEventListener('submit', async (e) => {
			e.preventDefault();
			const formData = new FormData(e.target);
			const data = Object.fromEntries(formData);
			const id = data.id;
			delete data.id;

			const method = id ? 'PUT' : 'POST';
			const url = id ? \`/admin/api/thermostats/\${id}\` : '/admin/api/thermostats';

			const response = await fetch(url, {
				method: method,
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify(data)
			});

			if (response.ok) {
				closeThermostatModal();
				loadThermostats();
			} else {
				alert('Failed to save thermostat');
			}
		});

		async function editThermostatPermissions(thermostatId, deviceName) {
			document.getElementById('thermostatPermissionId').value = thermostatId;
			document.getElementById('thermostatPermissionName').textContent = \`Device: \${deviceName}\`;

			// Load users and current permissions
			const [usersResponse, thermostatsResponse] = await Promise.all([
				fetch('/admin/users'),
				fetch('/admin/api/thermostats')
			]);

			const usersData = await usersResponse.json();
			const thermostatsData = await thermostatsResponse.json();

			const thermostat = thermostatsData.thermostats.find(t => t.id === thermostatId);
			const assignedUserIds = (thermostat.assigned_users || []).map(u => u.id);

			const checkboxList = document.getElementById('userCheckboxList');
			checkboxList.innerHTML = '';

			usersData.users.forEach(user => {
				const isChecked = assignedUserIds.includes(user.id);
				const div = document.createElement('div');
				div.style.padding = '8px';
				div.innerHTML = \`
					<label style="display: flex; align-items: center; gap: 8px; cursor: pointer;">
						<input type="checkbox" value="\${user.id}" \${isChecked ? 'checked' : ''}>
						<span>\${user.full_name} (\${user.email}) - <span class="badge badge-\${user.role}">\${user.role}</span></span>
					</label>
				\`;
				checkboxList.appendChild(div);
			});

			document.getElementById('editThermostatPermissionsModal').classList.add('active');
		}

		function closeThermostatPermissionsModal() {
			document.getElementById('editThermostatPermissionsModal').classList.remove('active');
		}

		async function saveThermostatPermissions() {
			const thermostatId = document.getElementById('thermostatPermissionId').value;
			const checkboxes = document.querySelectorAll('#userCheckboxList input[type="checkbox"]:checked');
			const userIds = Array.from(checkboxes).map(cb => parseInt(cb.value));

			const response = await fetch(\`/admin/api/thermostats/\${thermostatId}/permissions\`, {
				method: 'PUT',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ userIds })
			});

			if (response.ok) {
				closeThermostatPermissionsModal();
				loadThermostats();
			} else {
				alert('Failed to update permissions');
			}
		}

		function showThermostatControl(thermostatId, deviceName) {
			document.getElementById('controlThermostatId').value = thermostatId;
			document.getElementById('controlThermostatName').textContent = \`Device: \${deviceName}\`;
			document.getElementById('thermostatControlModal').classList.add('active');
		}

		function closeThermostatControlModal() {
			document.getElementById('thermostatControlModal').classList.remove('active');
		}

		async function sendThermostatCommand() {
			const thermostatId = document.getElementById('controlThermostatId').value;
			const mode = document.getElementById('controlMode').value;
			const targetTemperatureF = parseInt(document.getElementById('controlTemp').value);

			const response = await fetch(\`/admin/api/thermostats/\${thermostatId}/command\`, {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ mode, targetTemperatureF })
			});

			const result = await response.json();

			if (result.success) {
				alert(result.message);
				closeThermostatControlModal();
			} else {
				alert('Failed to send command: ' + (result.error || 'Unknown error'));
			}
		}

		// ============================================
		// MESSAGES MANAGEMENT
		// ============================================

		async function loadMessages() {
			const response = await fetch('/admin/api/messages');
			const data = await response.json();

			const tbody = document.querySelector('#messagesTable tbody');
			tbody.innerHTML = '';

			if (!data.success || data.messages.length === 0) {
				tbody.innerHTML = '<tr><td colspan="5" style="text-align: center; padding: 20px;">No messages sent yet.</td></tr>';
				return;
			}

			data.messages.forEach(msg => {
				const row = document.createElement('tr');
				const readStatus = msg.is_read ? '✅ Read' : '📬 Unread';

				row.innerHTML = \`
					<td>\${new Date(msg.created_at).toLocaleDateString()}</td>
					<td>\${msg.tenant_name} (\${msg.tenant_email})</td>
					<td>\${msg.subject || '(No Subject)'}</td>
					<td><span class="badge badge-\${msg.message_type}">\${msg.message_type}</span></td>
					<td>\${readStatus}</td>
				\`;
				tbody.appendChild(row);
			});
		}

		async function showSendMessageModal() {
			// Load users into dropdown
			const response = await fetch('/admin/users');
			const data = await response.json();

			const select = document.getElementById('messageRecipient');
			select.innerHTML = '<option value="">Select Tenant</option>';

			data.users.filter(u => u.role === 'tenant').forEach(user => {
				const option = document.createElement('option');
				option.value = user.id;
				option.textContent = \`\${user.full_name} (\${user.email})\`;
				select.appendChild(option);
			});

			document.getElementById('sendMessageModal').classList.add('active');
		}

		function closeMessageModal() {
			document.getElementById('sendMessageModal').classList.remove('active');
			document.getElementById('sendMessageForm').reset();
		}

		document.getElementById('sendMessageForm').addEventListener('submit', async (e) => {
			e.preventDefault();
			const formData = new FormData(e.target);
			const data = {
				userId: parseInt(formData.get('userId')),
				subject: formData.get('subject'),
				body: formData.get('body'),
				messageType: formData.get('messageType')
			};

			const response = await fetch('/admin/api/messages', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify(data)
			});

			if (response.ok) {
				closeMessageModal();
				loadMessages();
				alert('Message sent successfully');
			} else {
				alert('Failed to send message');
			}
		});

		// ============================================
		// SERVICE PHOTOS MANAGEMENT
		// ============================================

		async function loadServicePhotos() {
			const userId = document.getElementById('photoUserFilter').value;
			const phase = document.getElementById('photoPhaseFilter').value;

			let url = '/admin/api/service-photos?';
			if (userId) url += \`userId=\${userId}&\`;
			if (phase) url += \`phase=\${phase}&\`;

			const response = await fetch(url);
			const data = await response.json();

			// Populate user filter if empty
			if (!document.getElementById('photoUserFilter').innerHTML.includes('option')) {
				const usersResponse = await fetch('/admin/users');
				const usersData = await usersResponse.json();
				const userSelect = document.getElementById('photoUserFilter');
				usersData.users.forEach(user => {
					const option = document.createElement('option');
					option.value = user.id;
					option.textContent = \`\${user.full_name} (\${user.unit_number || 'No Unit'})\`;
					userSelect.appendChild(option);
				});
			}

			const tbody = document.querySelector('#servicePhotosTable tbody');
			tbody.innerHTML = '';

			if (!data.success || data.photos.length === 0) {
				tbody.innerHTML = '<tr><td colspan="6" style="text-align: center; padding: 20px;">No photos found.</td></tr>';
				return;
			}

			data.photos.forEach(photo => {
				const row = document.createElement('tr');
				row.innerHTML = \`
					<td>\${new Date(photo.uploaded_at).toLocaleDateString()}</td>
					<td>\${photo.user_name}</td>
					<td>\${photo.unit_number || '-'}</td>
					<td><span class="badge badge-\${photo.phase}">\${photo.phase}</span></td>
					<td>\${photo.request_category ? \`#\${photo.maintenance_request_id} - \${photo.request_category}\` : 'General'}</td>
					<td><img src="\${photo.photo_url}" style="width: 80px; height: 80px; object-fit: cover; border-radius: 6px; cursor: pointer;" onclick="window.open('\${photo.photo_url}', '_blank')"></td>
				\`;
				tbody.appendChild(row);
			});
		}

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
