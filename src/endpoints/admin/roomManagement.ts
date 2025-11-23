import { OpenAPIRoute, Str, Num } from "chanfana";
import { Context } from "hono";

// ============================================
// ROOMS MANAGEMENT
// ============================================

export class GetRooms extends OpenAPIRoute {
	schema = {
		tags: ["Admin - Rooms"],
		summary: "Get all rooms",
		responses: {
			200: {
				description: "List of rooms",
				content: {
					"application/json": {
						schema: {
							type: "object",
							properties: {
								success: { type: "boolean" },
								rooms: { type: "array" },
							},
						},
					},
				},
			},
		},
	};

	async handle(c: Context) {
		const rooms = await c.env.DB.prepare(
			"SELECT * FROM rooms ORDER BY room_name ASC"
		).all();

		return c.json({
			success: true,
			rooms: rooms.results || [],
		});
	}
}

export class CreateRoom extends OpenAPIRoute {
	schema = {
		tags: ["Admin - Rooms"],
		summary: "Create a new room",
		request: {
			body: {
				content: {
					"application/json": {
						schema: {
							type: "object",
							properties: {
								room_name: { type: "string" },
								description: { type: "string" },
							},
							required: ["room_name"],
						},
					},
				},
			},
		},
		responses: {
			201: {
				description: "Room created successfully",
			},
		},
	};

	async handle(c: Context) {
		const body = await c.req.json();
		const { room_name, description } = body;

		if (!room_name) {
			return c.json({ success: false, error: "room_name is required" }, 400);
		}

		try {
			const result = await c.env.DB.prepare(
				"INSERT INTO rooms (room_name, description) VALUES (?, ?) RETURNING *"
			).bind(room_name, description || null).first();

			return c.json({
				success: true,
				room: result,
			}, 201);
		} catch (error) {
			return c.json({
				success: false,
				error: "Room name already exists or database error",
			}, 400);
		}
	}
}

export class DeleteRoom extends OpenAPIRoute {
	schema = {
		tags: ["Admin - Rooms"],
		summary: "Delete a room",
		request: {
			params: {
				id: Num({
					description: "Room ID",
					required: true,
				}),
			},
		},
		responses: {
			200: {
				description: "Room deleted successfully",
			},
		},
	};

	async handle(c: Context) {
		const id = c.req.param("id");

		await c.env.DB.prepare(
			"DELETE FROM rooms WHERE id = ?"
		).bind(id).run();

		return c.json({
			success: true,
			message: "Room deleted successfully",
		});
	}
}

// ============================================
// THERMOSTATS MANAGEMENT
// ============================================

export class GetThermostats extends OpenAPIRoute {
	schema = {
		tags: ["Admin - Thermostats"],
		summary: "Get all thermostats with room assignments",
		responses: {
			200: {
				description: "List of thermostats",
			},
		},
	};

	async handle(c: Context) {
		const thermostats = await c.env.DB.prepare(
			`SELECT
				t.*,
				r.room_name,
				r.description as room_description
			FROM thermostat_devices_v2 t
			LEFT JOIN rooms r ON t.assigned_room_id = r.id
			ORDER BY t.device_name ASC`
		).all();

		return c.json({
			success: true,
			thermostats: thermostats.results || [],
		});
	}
}

export class AssignThermostatToRoom extends OpenAPIRoute {
	schema = {
		tags: ["Admin - Thermostats"],
		summary: "Assign thermostat to a room",
		request: {
			params: {
				id: Num({
					description: "Thermostat ID",
					required: true,
				}),
			},
			body: {
				content: {
					"application/json": {
						schema: {
							type: "object",
							properties: {
								room_id: { type: "number" },
							},
							required: ["room_id"],
						},
					},
				},
			},
		},
		responses: {
			200: {
				description: "Thermostat assigned successfully",
			},
		},
	};

	async handle(c: Context) {
		const id = c.req.param("id");
		const body = await c.req.json();
		const { room_id } = body;

		if (!room_id) {
			return c.json({ success: false, error: "room_id is required" }, 400);
		}

		await c.env.DB.prepare(
			"UPDATE thermostat_devices_v2 SET assigned_room_id = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?"
		).bind(room_id, id).run();

		return c.json({
			success: true,
			message: "Thermostat assigned to room successfully",
		});
	}
}

export class UnassignThermostatFromRoom extends OpenAPIRoute {
	schema = {
		tags: ["Admin - Thermostats"],
		summary: "Remove thermostat room assignment",
		request: {
			params: {
				id: Num({
					description: "Thermostat ID",
					required: true,
				}),
			},
		},
		responses: {
			200: {
				description: "Thermostat unassigned successfully",
			},
		},
	};

	async handle(c: Context) {
		const id = c.req.param("id");

		await c.env.DB.prepare(
			"UPDATE thermostat_devices_v2 SET assigned_room_id = NULL, updated_at = CURRENT_TIMESTAMP WHERE id = ?"
		).bind(id).run();

		return c.json({
			success: true,
			message: "Thermostat unassigned from room successfully",
		});
	}
}

// ============================================
// TENANT PERMISSIONS MANAGEMENT
// ============================================

export class GetTenantPermissions extends OpenAPIRoute {
	schema = {
		tags: ["Admin - Tenant Permissions"],
		summary: "Get all tenant room permissions",
		responses: {
			200: {
				description: "List of tenant permissions",
			},
		},
	};

	async handle(c: Context) {
		const permissions = await c.env.DB.prepare(
			`SELECT
				p.*,
				r.room_name
			FROM tenant_room_permissions p
			JOIN rooms r ON p.room_id = r.id
			ORDER BY p.tenant_name ASC, r.room_name ASC`
		).all();

		return c.json({
			success: true,
			permissions: permissions.results || [],
		});
	}
}

export class CreateTenantPermission extends OpenAPIRoute {
	schema = {
		tags: ["Admin - Tenant Permissions"],
		summary: "Grant tenant access to a room",
		request: {
			body: {
				content: {
					"application/json": {
						schema: {
							type: "object",
							properties: {
								tenant_name: { type: "string" },
								tenant_email: { type: "string" },
								room_id: { type: "number" },
								can_control_temp: { type: "boolean" },
							},
							required: ["tenant_name", "tenant_email", "room_id"],
						},
					},
				},
			},
		},
		responses: {
			201: {
				description: "Permission created successfully",
			},
		},
	};

	async handle(c: Context) {
		const body = await c.req.json();
		const { tenant_name, tenant_email, room_id, can_control_temp } = body;

		if (!tenant_name || !tenant_email || !room_id) {
			return c.json({
				success: false,
				error: "tenant_name, tenant_email, and room_id are required",
			}, 400);
		}

		try {
			const result = await c.env.DB.prepare(
				`INSERT INTO tenant_room_permissions
				(tenant_name, tenant_email, room_id, can_control_temp)
				VALUES (?, ?, ?, ?)
				RETURNING *`
			).bind(
				tenant_name,
				tenant_email,
				room_id,
				can_control_temp !== undefined ? (can_control_temp ? 1 : 0) : 1
			).first();

			return c.json({
				success: true,
				permission: result,
			}, 201);
		} catch (error) {
			return c.json({
				success: false,
				error: "Failed to create permission. May already exist.",
			}, 400);
		}
	}
}

export class DeleteTenantPermission extends OpenAPIRoute {
	schema = {
		tags: ["Admin - Tenant Permissions"],
		summary: "Revoke tenant room access",
		request: {
			params: {
				id: Num({
					description: "Permission ID",
					required: true,
				}),
			},
		},
		responses: {
			200: {
				description: "Permission deleted successfully",
			},
		},
	};

	async handle(c: Context) {
		const id = c.req.param("id");

		await c.env.DB.prepare(
			"DELETE FROM tenant_room_permissions WHERE id = ?"
		).bind(id).run();

		return c.json({
			success: true,
			message: "Permission deleted successfully",
		});
	}
}
