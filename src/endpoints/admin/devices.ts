import { OpenAPIRoute, OpenAPIRouteSchema } from "chanfana";
import { Context } from "hono";
import { z } from "zod";
import { AlexaSmartHomeAPI } from "../alexa/smartHomeApi";

export class AdminDevicesList extends OpenAPIRoute {
	schema: OpenAPIRouteSchema = {
		tags: ["Admin"],
		summary: "List all thermostat devices",
		responses: {
			"200": {
				description: "Returns list of thermostats",
				content: {
					"application/json": {
						schema: z.object({
							devices: z.array(z.any()),
						}),
					},
				},
			},
		},
	};

	async handle(c: Context) {
		const devices = await c.env.DB.prepare(
			"SELECT * FROM thermostat_devices ORDER BY created_at DESC"
		).all();

		return {
			devices: devices.results || [],
		};
	}
}

export class AdminDevicesDiscover extends OpenAPIRoute {
	schema: OpenAPIRouteSchema = {
		tags: ["Admin"],
		summary: "Discover thermostats from Alexa account",
		responses: {
			"200": {
				description: "Returns discovered thermostats",
			},
		},
	};

	async handle(c: Context) {
		const alexaApi = new AlexaSmartHomeAPI();
		const result = await alexaApi.discoverThermostats(c);

		if (result.error) {
			return c.json({ error: result.error }, 400);
		}

		return result;
	}
}

export class AdminDevicesAdd extends OpenAPIRoute {
	schema: OpenAPIRouteSchema = {
		tags: ["Admin"],
		summary: "Add a thermostat device",
		request: {
			body: {
				content: {
					"application/json": {
						schema: z.object({
							device_id: z.string(),
							device_name: z.string(),
							friendly_name: z.string(),
							manufacturer: z.string().optional(),
							model: z.string().optional(),
							unit_number: z.string().optional(),
							user_id: z.number().optional(),
						}),
					},
				},
			},
		},
		responses: {
			"200": {
				description: "Device added successfully",
			},
		},
	};

	async handle(c: Context) {
		const data = await this.getValidatedData<typeof this.schema>();
		const {
			device_id,
			device_name,
			friendly_name,
			manufacturer,
			model,
			unit_number,
			user_id,
		} = data.body as {
			device_id: string;
			device_name: string;
			friendly_name: string;
			manufacturer?: string;
			model?: string;
			unit_number?: string;
			user_id?: number;
		};

		// Check if device already exists
		const existing = await c.env.DB.prepare(
			"SELECT * FROM thermostat_devices WHERE device_id = ?"
		)
			.bind(device_id)
			.first();

		if (existing) {
			return c.json({ error: "Device already exists" }, 400);
		}

		// Add device
		await c.env.DB.prepare(
			`INSERT INTO thermostat_devices
			(device_id, device_name, friendly_name, manufacturer, model, unit_number, user_id, alexa_endpoint_id)
			VALUES (?, ?, ?, ?, ?, ?, ?, ?)`
		)
			.bind(
				device_id,
				device_name,
				friendly_name,
				manufacturer || null,
				model || null,
				unit_number || null,
				user_id || null,
				device_id // Use device_id as endpoint_id for Alexa
			)
			.run();

		// Log activity
		await c.env.DB.prepare(
			"INSERT INTO activity_log (user_name, action_type, action_description, unit_number) VALUES (?, ?, ?, ?)"
		)
			.bind(
				"Admin",
				"device_added",
				`Thermostat added: ${friendly_name}`,
				unit_number || null
			)
			.run();

		return { success: true, message: "Thermostat added successfully" };
	}
}

export class AdminDevicesUpdate extends OpenAPIRoute {
	schema: OpenAPIRouteSchema = {
		tags: ["Admin"],
		summary: "Update thermostat assignment",
		request: {
			params: z.object({
				id: z.string(),
			}),
			body: {
				content: {
					"application/json": {
						schema: z.object({
							unit_number: z.string().optional(),
							user_id: z.number().optional(),
							friendly_name: z.string().optional(),
						}),
					},
				},
			},
		},
		responses: {
			"200": {
				description: "Device updated successfully",
			},
		},
	};

	async handle(c: Context) {
		const data = await this.getValidatedData<typeof this.schema>();
		const { id } = data.params as { id: string };
		const { unit_number, user_id, friendly_name } = data.body as {
			unit_number?: string;
			user_id?: number;
			friendly_name?: string;
		};

		const updates: string[] = [];
		const params: any[] = [];

		if (unit_number !== undefined) {
			updates.push("unit_number = ?");
			params.push(unit_number);
		}

		if (user_id !== undefined) {
			updates.push("user_id = ?");
			params.push(user_id);
		}

		if (friendly_name !== undefined) {
			updates.push("friendly_name = ?");
			params.push(friendly_name);
		}

		updates.push("updated_at = CURRENT_TIMESTAMP");
		params.push(id);

		const query = `UPDATE thermostat_devices SET ${updates.join(", ")} WHERE id = ?`;
		await c.env.DB.prepare(query).bind(...params).run();

		// Log activity
		await c.env.DB.prepare(
			"INSERT INTO activity_log (user_name, action_type, action_description) VALUES (?, ?, ?)"
		)
			.bind("Admin", "device_updated", `Thermostat assignment updated`)
			.run();

		return { success: true, message: "Device updated successfully" };
	}
}

export class AdminDevicesDelete extends OpenAPIRoute {
	schema: OpenAPIRouteSchema = {
		tags: ["Admin"],
		summary: "Remove a thermostat device",
		request: {
			params: z.object({
				id: z.string(),
			}),
		},
		responses: {
			"200": {
				description: "Device removed successfully",
			},
		},
	};

	async handle(c: Context) {
		const data = await this.getValidatedData<typeof this.schema>();
		const { id } = data.params as { id: string };

		const device = await c.env.DB.prepare("SELECT * FROM thermostat_devices WHERE id = ?")
			.bind(id)
			.first();

		if (!device) {
			return c.json({ error: "Device not found" }, 404);
		}

		await c.env.DB.prepare("DELETE FROM thermostat_devices WHERE id = ?")
			.bind(id)
			.run();

		// Log activity
		await c.env.DB.prepare(
			"INSERT INTO activity_log (user_name, action_type, action_description) VALUES (?, ?, ?)"
		)
			.bind(
				"Admin",
				"device_deleted",
				`Thermostat removed: ${device.friendly_name}`
			)
			.run();

		return { success: true, message: "Device removed successfully" };
	}
}

export class AdminDevicesSync extends OpenAPIRoute {
	schema: OpenAPIRouteSchema = {
		tags: ["Admin"],
		summary: "Sync thermostat status from Alexa",
		request: {
			params: z.object({
				id: z.string(),
			}),
		},
		responses: {
			"200": {
				description: "Status synced successfully",
			},
		},
	};

	async handle(c: Context) {
		const data = await this.getValidatedData<typeof this.schema>();
		const { id } = data.params as { id: string };

		const device = await c.env.DB.prepare("SELECT * FROM thermostat_devices WHERE id = ?")
			.bind(id)
			.first();

		if (!device) {
			return c.json({ error: "Device not found" }, 404);
		}

		// Get status from Alexa
		const alexaApi = new AlexaSmartHomeAPI();
		const status = await alexaApi.getThermostatStatus(c, device.device_id as string);

		if (status.error) {
			return c.json({ error: status.error }, 400);
		}

		// Update database
		await c.env.DB.prepare(
			`UPDATE thermostat_devices
			SET current_temperature = ?, target_temperature = ?, mode = ?, last_sync = CURRENT_TIMESTAMP
			WHERE id = ?`
		)
			.bind(
				status.current_temperature,
				status.target_temperature,
				status.mode,
				id
			)
			.run();

		return {
			success: true,
			status,
		};
	}
}
