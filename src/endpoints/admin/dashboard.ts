import { Context } from "hono";

export class AdminDashboard {
	async handle(c: Context) {
		const html = `<!DOCTYPE html>
<html lang="en">
<head>
	<meta charset="UTF-8">
	<title>Admin Dashboard - Hospital Church Portal</title>
	<meta name="viewport" content="width=device-width, initial-scale=1">
	<script>
		// Authentication check - must be logged in as admin
		(async function checkAuth() {
			const sessionToken = localStorage.getItem('sessionToken');
			if (!sessionToken) {
				window.location.href = '/login';
				return;
			}

			const response = await fetch('/auth/tenant/verify', {
				headers: { 'Authorization': \`Bearer \${sessionToken}\` }
			});

			if (!response.ok) {
				localStorage.removeItem('sessionToken');
				window.location.href = '/login';
				return;
			}

			const data = await response.json();
			// Check if user is admin
			if (data.user.role !== 'admin') {
				alert('Access denied. Admin privileges required.');
				window.location.href = '/chatbot';
				return;
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
			<div class="tab" onclick="switchTab('activity')">Activity Log</div>
			<div class="tab" onclick="switchTab('maintenance')">Maintenance</div>
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
							<th>Status</th>
							<th>Created</th>
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
			<h2>Add New User</h2>
			<form id="addUserForm">
				<div class="form-group">
					<label>Full Name</label>
					<input type="text" name="full_name" required>
				</div>
				<div class="form-group">
					<label>Email</label>
					<input type="email" name="email" required>
				</div>
				<div class="form-group">
					<label>Password</label>
					<input type="password" name="password" required>
				</div>
				<div class="form-group">
					<label>Auditorium Name</label>
					<select name="unit_number">
						<option value="">Select Auditorium</option>
						<option value="Inspiration Studio">Inspiration Studio</option>
						<option value="Harmony Hall">Harmony Hall</option>
						<option value="Grace Auditorium">Grace Auditorium</option>
					</select>
				</div>
				<div class="form-group">
					<label>Role</label>
					<select name="role">
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

	<script>
		// Load dashboard data
		async function loadDashboard() {
			await Promise.all([
				loadUsers(),
				loadActivity(),
				loadMaintenance(),
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
						<button class="btn btn-danger" onclick="deleteUser(\${user.id})">Delete</button>
					</td>
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
			const data = await response.json();

			document.getElementById('openRequests').textContent = data.requests.filter(r => r.status === 'open').length;

			const tbody = document.querySelector('#maintenanceTable tbody');
			tbody.innerHTML = data.requests.map(req => \`
				<tr>
					<td>#\${req.id}</td>
					<td>\${req.unit_number}</td>
					<td>\${req.tenant_name}</td>
					<td>\${req.category}</td>
					<td>\${req.description.substring(0, 50)}...</td>
					<td>\${req.status}</td>
					<td>\${new Date(req.created_at).toLocaleDateString()}</td>
				</tr>
			\`).join('');
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
			document.getElementById('addUserModal').classList.add('active');
		}

		function closeModal() {
			document.getElementById('addUserModal').classList.remove('active');
		}

		document.getElementById('addUserForm').addEventListener('submit', async (e) => {
			e.preventDefault();
			const formData = new FormData(e.target);
			const data = Object.fromEntries(formData);

			const response = await fetch('/admin/users', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify(data)
			});

			if (response.ok) {
				closeModal();
				loadUsers();
				e.target.reset();
			} else {
				alert('Failed to add user');
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
