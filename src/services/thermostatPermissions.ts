import { Context } from "hono";

/**
 * Thermostat permission checking service
 * Ensures users can only control thermostats they have access to
 */

export async function getUserThermostats(c: Context, userId: number) {
	return await c.env.DB.prepare(
		`SELECT td.*
		FROM user_thermostat_permissions utp
		JOIN thermostat_devices td ON td.id = utp.thermostat_id
		WHERE utp.user_id = ?`
	).bind(userId).all();
}

export interface ThermostatAccessResult {
	allowed: boolean;
	thermostat?: any;
	multiple?: boolean;
	devices?: any[];
}

export async function userHasThermostatAccess(
	c: Context,
	userId: number,
	roomOrDeviceName?: string
): Promise<ThermostatAccessResult> {
	// Fetch all thermostats for user
	const result = await getUserThermostats(c, userId);
	const devices = result.results || [];

	if (!devices.length) {
		return { allowed: false };
	}

	// If no specific room requested
	if (!roomOrDeviceName) {
		if (devices.length === 1) {
			// User has exactly one thermostat - allow access to it
			return { allowed: true, thermostat: devices[0] };
		}
		// User has multiple thermostats - need to specify which one
		return { allowed: false, multiple: true, devices };
	}

	// Look for matching device by room_name or device_name
	const normalized = roomOrDeviceName.toLowerCase();
	const match = devices.find((d: any) =>
		(d.room_name || '').toLowerCase() === normalized ||
		(d.device_name || '').toLowerCase() === normalized
	);

	return match ? { allowed: true, thermostat: match } : { allowed: false, devices };
}

/**
 * Grant thermostat access to a user
 */
export async function grantThermostatAccess(
	c: Context,
	userId: number,
	thermostatId: number,
	grantedByUserId: number
): Promise<boolean> {
	try {
		await c.env.DB.prepare(
			`INSERT OR IGNORE INTO user_thermostat_permissions
			(user_id, thermostat_id, granted_by_user_id, role_scope)
			VALUES (?, ?, ?, 'tenant')`
		).bind(userId, thermostatId, grantedByUserId).run();
		return true;
	} catch (error) {
		console.error("Error granting thermostat access:", error);
		return false;
	}
}

/**
 * Revoke thermostat access from a user
 */
export async function revokeThermostatAccess(
	c: Context,
	userId: number,
	thermostatId: number
): Promise<boolean> {
	try {
		await c.env.DB.prepare(
			`DELETE FROM user_thermostat_permissions
			WHERE user_id = ? AND thermostat_id = ?`
		).bind(userId, thermostatId).run();
		return true;
	} catch (error) {
		console.error("Error revoking thermostat access:", error);
		return false;
	}
}

/**
 * Update thermostat permissions for a device (replace all)
 */
export async function updateThermostatPermissions(
	c: Context,
	thermostatId: number,
	userIds: number[],
	grantedByUserId: number
): Promise<boolean> {
	try {
		// Start by deleting existing permissions
		await c.env.DB.prepare(
			`DELETE FROM user_thermostat_permissions WHERE thermostat_id = ?`
		).bind(thermostatId).run();

		// Insert new permissions
		for (const userId of userIds) {
			await c.env.DB.prepare(
				`INSERT INTO user_thermostat_permissions
				(user_id, thermostat_id, granted_by_user_id, role_scope)
				VALUES (?, ?, ?, 'tenant')`
			).bind(userId, thermostatId, grantedByUserId).run();
		}

		return true;
	} catch (error) {
		console.error("Error updating thermostat permissions:", error);
		return false;
	}
}
