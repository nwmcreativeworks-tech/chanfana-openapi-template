#!/usr/bin/env node
/**
 * Generate SQL to create an admin user with bcrypt hashed password
 * Usage: node scripts/create-admin.js
 */

const bcrypt = require('bcryptjs');

async function generateAdminSQL() {
	// Admin credentials
	const email = 'admin@hospitalchurch.com';
	const password = 'Admin@2025!'; // Change this to your desired password
	const fullName = 'System Administrator';

	// Hash password with bcrypt (10 rounds)
	const passwordHash = await bcrypt.hash(password, 10);

	// Generate SQL
	const sql = `
-- Create Admin User
-- Email: ${email}
-- Password: ${password}
-- IMPORTANT: Change the password after first login!

INSERT INTO users (email, password_hash, full_name, role, is_active, created_at, updated_at)
VALUES (
	'${email}',
	'${passwordHash}',
	'${fullName}',
	'admin',
	1,
	CURRENT_TIMESTAMP,
	CURRENT_TIMESTAMP
);

-- Grant ALL thermostats to admin (run this after creating admin)
-- INSERT OR IGNORE INTO user_thermostat_permissions (user_id, thermostat_id, granted_by_user_id, role_scope)
-- SELECT
--     (SELECT id FROM users WHERE email = '${email}'),
--     id,
--     (SELECT id FROM users WHERE email = '${email}'),
--     'admin'
-- FROM thermostat_devices;
`;

	console.log('='.repeat(80));
	console.log('ADMIN USER CREATION SQL');
	console.log('='.repeat(80));
	console.log(sql);
	console.log('='.repeat(80));
	console.log('\n📋 To create this admin user, run:\n');
	console.log(`npx wrangler d1 execute openapi-template-db --remote --command="INSERT INTO users (email, password_hash, full_name, role, is_active, created_at, updated_at) VALUES ('${email}', '${passwordHash}', '${fullName}', 'admin', 1, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP);"`);
	console.log('\n✅ Admin credentials:');
	console.log(`   Email: ${email}`);
	console.log(`   Password: ${password}`);
	console.log('\n⚠️  IMPORTANT: Change the password after first login!\n');
}

generateAdminSQL().catch(console.error);
