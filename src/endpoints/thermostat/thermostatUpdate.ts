import { OpenAPIRoute, OpenAPIRouteSchema } from "chanfana";
import { Context } from "hono";
import { z } from "zod";
import { ThermostatUpdate as ThermostatUpdateSchema } from "./base";
import { AlexaSmartHomeAPI } from "../alexa/smartHomeApi";

export class ThermostatUpdate extends OpenAPIRoute {
	schema: OpenAPIRouteSchema = {
		tags: ["Thermostat"],
		summary: "Update thermostat settings",
		request: {
			query: z.object({
				unit_number: z.string().describe("Unit number"),
			}),
			body: {
				content: {
					"application/json": {
						schema: ThermostatUpdateSchema,
					},
				},
			},
		},
		responses: {
			"200": {
				description: "Returns updated thermostat settings",
				content: {
					"application/json": {
						schema: z.object({
							success: z.boolean(),
							settings: z.any(),
							message: z.string(),
						}),
					},
				},
			},
			"400": {
				description: "Invalid request",
			},
			"404": {
				description: "Thermostat not found",
			},
		},
	};

	async handle(c: Context) {
		const data = await this.getValidatedData<typeof this.schema>();
		const { unit_number } = data.query as { unit_number: string };
		const { target_temp, mode, fan_mode } = data.body as { target_temp?: number; mode?: string; fan_mode?: string };

		// Check if there's a physical Alexa thermostat assigned to this unit
		const device = await c.env.DB.prepare(
			"SELECT * FROM thermostat_devices WHERE unit_number = ?"
		)
			.bind(unit_number)
			.first();

		if (device) {
			// Use Alexa API to control physical thermostat
			return this.controlPhysicalThermostat(c, device, target_temp, mode);
		}

		// Fall back to virtual thermostat (database only)
		return this.controlVirtualThermostat(c, unit_number, target_temp, mode, fan_mode);
	}

	private async controlPhysicalThermostat(
		c: Context,
		device: any,
		target_temp?: number,
		mode?: string
	) {
		const alexaApi = new AlexaSmartHomeAPI();

		// Set temperature if provided
		if (target_temp !== undefined) {
			const result = await alexaApi.setTemperature(
				c,
				device.device_id as string,
				target_temp
			);

			if (result.error) {
				return c.json({ success: false, error: result.error }, 400);
			}

			// Log activity
			await c.env.DB.prepare(
				"INSERT INTO activity_log (action_type, action_description, unit_number, metadata) VALUES (?, ?, ?, ?)"
			)
				.bind(
					"thermostat_change",
					`Temperature set to ${target_temp}°F`,
					device.unit_number,
					JSON.stringify({ device_id: device.device_id, temp: target_temp })
				)
				.run();

			return {
				success: true,
				message: `Thermostat set to ${target_temp}°F`,
				device: device.friendly_name,
			};
		}

		// Set mode if provided
		if (mode) {
			const result = await alexaApi.setMode(c, device.device_id as string, mode);

			if (result.error) {
				return c.json({ success: false, error: result.error }, 400);
			}

			return {
				success: true,
				message: `Thermostat mode set to ${mode}`,
				device: device.friendly_name,
			};
		}

		return c.json({ error: "No changes specified" }, 400);
	}

	private async controlVirtualThermostat(
		c: Context,
		unit_number: string,
		target_temp?: number,
		mode?: string,
		fan_mode?: string
	) {

		// Check if settings exist
		const existing = await c.env.DB.prepare(
			"SELECT * FROM thermostat_settings WHERE unit_number = ?"
		)
			.bind(unit_number)
			.first();

		if (!existing) {
			// Create default settings
			await c.env.DB.prepare(
				`INSERT INTO thermostat_settings (unit_number, target_temp, mode, fan_mode)
				VALUES (?, ?, ?, ?)`
			)
				.bind(
					unit_number,
					target_temp || 72,
					mode || "auto",
					fan_mode || "auto"
				)
				.run();
		} else {
			// Check if locked
			if (existing.is_locked === 1) {
				return c.json(
					{
						success: false,
						error:
							"Thermostat is locked. Please contact building management.",
					},
					400
				);
			}

			// Validate temperature range
			if (target_temp) {
				if (
					target_temp < (existing.min_temp as number) ||
					target_temp > (existing.max_temp as number)
				) {
					return c.json(
						{
							success: false,
							error: `Temperature must be between ${existing.min_temp}°F and ${existing.max_temp}°F`,
						},
						400
					);
				}
			}

			// Build update query
			const updates: string[] = [];
			const params: any[] = [];

			if (target_temp !== undefined) {
				updates.push("target_temp = ?");
				params.push(target_temp);
			}

			if (mode) {
				updates.push("mode = ?");
				params.push(mode);
			}

			if (fan_mode) {
				updates.push("fan_mode = ?");
				params.push(fan_mode);
			}

			updates.push("updated_at = CURRENT_TIMESTAMP");
			updates.push("updated_by = ?");
			params.push("api");
			params.push(unit_number);

			const query = `UPDATE thermostat_settings SET ${updates.join(", ")} WHERE unit_number = ?`;
			await c.env.DB.prepare(query).bind(...params).run();
		}

		// Return updated settings
		const updated = await c.env.DB.prepare(
			"SELECT * FROM thermostat_settings WHERE unit_number = ?"
		)
			.bind(unit_number)
			.first();

		return {
			success: true,
			settings: updated,
			message: `Thermostat updated successfully. Target temperature: ${updated.target_temp}°F`,
		};
	}
}
