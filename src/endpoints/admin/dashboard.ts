import { Context } from "hono";

export class AdminDashboard {
	async handle(c: Context) {
		const html = `<!DOCTYPE html>
<html>
<head>
	<title>Admin Dashboard - Tenant Support System</title>
	<meta name="viewport" content="width=device-width, initial-scale=1">
	<style>
		* { margin: 0; padding: 0; box-sizing: border-box; }
		body {
			font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
			background: #f5f7fa;
		}
		.header {
			background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
			color: white;
			padding: 20px;
			box-shadow: 0 2px 10px rgba(0,0,0,0.1);
		}
		.header h1 {
			font-size: 24px;
			margin-bottom: 5px;
		}
		.header p {
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
			border-radius: 12px;
			padding: 24px;
			box-shadow: 0 2px 8px rgba(0,0,0,0.1);
		}
		.card h2 {
			font-size: 18px;
			color: #333;
			margin-bottom: 16px;
			display: flex;
			align-items: center;
			gap: 10px;
		}
		.stat {
			font-size: 36px;
			font-weight: bold;
			color: #667eea;
			margin-bottom: 8px;
		}
		.stat-label {
			color: #666;
			font-size: 14px;
		}
		table {
			width: 100%;
			border-collapse: collapse;
		}
		th {
			background: #f8f9fa;
			padding: 12px;
			text-align: left;
			font-weight: 600;
			color: #333;
			border-bottom: 2px solid #e1e8ed;
		}
		td {
			padding: 12px;
			border-bottom: 1px solid #e1e8ed;
		}
		.badge {
			display: inline-block;
			padding: 4px 12px;
			border-radius: 12px;
			font-size: 12px;
			font-weight: 600;
		}
		.badge-admin { background: #667eea; color: white; }
		.badge-tenant { background: #48bb78; color: white; }
		.badge-maintenance { background: #ed8936; color: white; }
		.badge-active { background: #48bb78; color: white; }
		.badge-inactive { background: #cbd5e0; color: #718096; }
		.btn {
			padding: 8px 16px;
			border: none;
			border-radius: 6px;
			cursor: pointer;
			font-size: 14px;
			font-weight: 600;
			margin-right: 8px;
		}
		.btn-primary {
			background: #667eea;
			color: white;
		}
		.btn-danger {
			background: #f56565;
			color: white;
		}
		.btn:hover {
			opacity: 0.9;
		}
		.tabs {
			display: flex;
			gap: 10px;
			margin-bottom: 20px;
			border-bottom: 2px solid #e1e8ed;
		}
		.tab {
			padding: 12px 24px;
			cursor: pointer;
			border-bottom: 3px solid transparent;
			font-weight: 600;
			color: #666;
			transition: all 0.3s;
		}
		.tab.active {
			color: #667eea;
			border-bottom-color: #667eea;
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
			background: rgba(0,0,0,0.5);
			align-items: center;
			justify-content: center;
			z-index: 1000;
		}
		.modal.active {
			display: flex;
		}
		.modal-content {
			background: white;
			border-radius: 12px;
			padding: 32px;
			max-width: 500px;
			width: 90%;
		}
		.form-group {
			margin-bottom: 20px;
		}
		.form-group label {
			display: block;
			margin-bottom: 8px;
			font-weight: 600;
			color: #333;
		}
		.form-group input,
		.form-group select {
			width: 100%;
			padding: 10px;
			border: 2px solid #e1e8ed;
			border-radius: 6px;
			font-size: 14px;
		}
	</style>
</head>
<body>
	<div class="header">
		<div class="container">
			<h1>🏢 Admin Dashboard</h1>
			<p>Tenant Support System Management</p>
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
							<th>Unit</th>
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
							<th>Unit</th>
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
							<th>Unit</th>
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
					<label>Unit Number</label>
					<input type="text" name="unit_number">
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
