import { OpenAPIRoute, OpenAPIRouteSchema } from "chanfana";
import { Context } from "hono";
import { z } from "zod";
import { ThermostatUpdate } from "./base";

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
						schema: ThermostatUpdate,
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
		const { unit_number } = data.query;
		const { target_temp, mode, fan_mode } = data.body;

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
