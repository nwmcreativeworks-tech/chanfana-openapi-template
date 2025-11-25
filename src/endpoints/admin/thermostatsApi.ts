import { OpenAPIRoute } from "chanfana";
import { Context } from "hono";
import { isStaff } from "../../services/roleHelpers";
import { updateThermostatPermissions } from "../../services/thermostatPermissions";

// GET /admin/api/thermostats
export class GetThermostatsApi extends OpenAPIRoute {
	schema = {
		tags: ["Admin - Thermostats API"],
		summary: "Get all thermostats with assigned users",
		responses: {
			200: { description: "List of thermostats" },
		},
	};

	async handle(c: Context) {
		// Get thermostats with their assigned user count
		const thermostats = await c.env.DB.prepare(
			`SELECT
				td.*,
				COUNT(utp.user_id) as assigned_user_count
			FROM thermostat_devices td
			LEFT JOIN user_thermostat_permissions utp ON td.id = utp.thermostat_id
			GROUP BY td.id
			ORDER BY td.room_name ASC`
		).all();

		// For each thermostat, get the list of assigned users
		const thermostatsWithUsers = await Promise.all(
			(thermostats.results || []).map(async (thermo: any) => {
				const users = await c.env.DB.prepare(
					`SELECT u.id, u.full_name, u.email, u.unit_number
					FROM user_thermostat_permissions utp
					JOIN users u ON u.id = utp.user_id
					WHERE utp.thermostat_id = ?`
				).bind(thermo.id).all();

				return {
					...thermo,
					assigned_users: users.results || [],
				};
			})
		);

		return c.json({
			success: true,
			thermostats: thermostatsWithUsers,
		});
	}
}

// POST /admin/api/thermostats
// NOTE: Thermostats are created via Alexa sync, not manually
// This endpoint is disabled - admins can only update room_name and assign users
export class CreateThermostatApi extends OpenAPIRoute {
	schema = {
		tags: ["Admin - Thermostats API"],
		summary: "Create thermostat (disabled - use Alexa sync instead)",
		responses: {
			403: { description: "Thermostats must be synced from Alexa" },
		},
	};

	async handle(c: Context) {
		return c.json({
			success: false,
			error: "Thermostats cannot be created manually. Use Alexa device sync to import thermostats.",
		}, 403);
	}
}

// PUT /admin/api/thermostats/:id
// Admins can only rename the room - device details are managed by Alexa sync
export class UpdateThermostatApi extends OpenAPIRoute {
	schema = {
		tags: ["Admin - Thermostats API"],
		summary: "Update thermostat room name",
		request: {
			body: {
				content: {
					"application/json": {
						schema: {
							type: "object",
							properties: {
								room_name: { type: "string" },
							},
							required: ["room_name"],
						},
					},
				},
			},
		},
		responses: {
			200: { description: "Room name updated" },
		},
	};

	async handle(c: Context) {
		const id = c.req.param("id");
		const body = await c.req.json();
		const { room_name } = body;

		await c.env.DB.prepare(
			`UPDATE thermostat_devices
			SET room_name = ?, updated_at = CURRENT_TIMESTAMP
			WHERE id = ?`
		).bind(room_name, id).run();

		// Log the change
		await c.env.DB.prepare(
			`INSERT INTO admin_request_logs (request_type, message_details, status, source)
			VALUES (?, ?, ?, ?)`
		).bind(
			"Thermostat Room Rename",
			`Room renamed for thermostat ${id} to: ${room_name}`,
			"Updated",
			"Admin Panel"
		).run();

		return c.json({
			success: true,
			message: "Room name updated successfully",
		});
	}
}

// PUT /admin/api/thermostats/:id/permissions
export class UpdateThermostatPermissionsApi extends OpenAPIRoute {
	schema = {
		tags: ["Admin - Thermostats API"],
		summary: "Update thermostat user permissions",
		request: {
			body: {
				content: {
					"application/json": {
						schema: {
							type: "object",
							properties: {
								userIds: { type: "array", items: { type: "number" } },
							},
							required: ["userIds"],
						},
					},
				},
			},
		},
		responses: {
			200: { description: "Permissions updated" },
		},
	};

	async handle(c: Context) {
		const id = parseInt(c.req.param("id"));
		const body = await c.req.json();
		const { userIds } = body;

		// Get current user (staff member making the change)
		// In a real implementation, extract from session/auth token
		// For now, we'll use 1 as a placeholder for the admin
		const grantedByUserId = 1;

		const success = await updateThermostatPermissions(c, id, userIds, grantedByUserId);

		return c.json({
			success,
			message: success ? "Permissions updated successfully" : "Failed to update permissions",
		});
	}
}

// POST /admin/api/thermostats/:id/command
export class ThermostatCommandApi extends OpenAPIRoute {
	schema = {
		tags: ["Admin - Thermostats API"],
		summary: "Send command to thermostat (admin control)",
		request: {
			body: {
				content: {
					"application/json": {
						schema: {
							type: "object",
							properties: {
								mode: { type: "string", enum: ["cool", "heat", "off", "auto"] },
								targetTemperatureF: { type: "number", minimum: 65, maximum: 80 },
							},
						},
					},
				},
			},
		},
		responses: {
			200: { description: "Command sent" },
		},
	};

	async handle(c: Context) {
		const id = c.req.param("id");
		const body = await c.req.json();
		const { mode, targetTemperatureF } = body;

		// Get thermostat details
		const thermostat = await c.env.DB.prepare(
			"SELECT * FROM thermostat_devices WHERE id = ?"
		).bind(id).first();

		if (!thermostat) {
			return c.json({ success: false, error: "Thermostat not found" }, 404);
		}

		// TODO: In production, call actual Alexa Smart Home API here
		// Example:
		// await controlAlexaThermostat(thermostat.alexa_endpoint_id, mode, targetTemperatureF);

		// Log the command
		await c.env.DB.prepare(
			`INSERT INTO admin_request_logs
			(request_type, message_details, status, source)
			VALUES (?, ?, ?, ?)`
		).bind(
			"Thermostat Control - Admin",
			`Admin set ${thermostat.room_name} to ${targetTemperatureF || 'N/A'}°F, mode: ${mode || 'unchanged'}`,
			"Active",
			"Admin Panel"
		).run();

		return c.json({
			success: true,
			message: `Command sent to ${thermostat.room_name}`,
			details: { mode, targetTemperatureF },
		});
	}
}
