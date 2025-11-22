import { OpenAPIRoute, OpenAPIRouteSchema } from "chanfana";
import { Context } from "hono";
import { z } from "zod";
import { ThermostatSettings } from "./base";

export class ThermostatRead extends OpenAPIRoute {
	schema: OpenAPIRouteSchema = {
		tags: ["Thermostat"],
		summary: "Get thermostat settings for a unit",
		request: {
			query: z.object({
				unit_number: z.string().describe("Unit number"),
			}),
		},
		responses: {
			"200": {
				description: "Returns thermostat settings",
				content: {
					"application/json": {
						schema: ThermostatSettings,
					},
				},
			},
			"404": {
				description: "Thermostat settings not found",
			},
		},
	};

	async handle(c: Context) {
		const data = await this.getValidatedData<typeof this.schema>();
		const { unit_number } = data.query as { unit_number: string };

		const settings = await c.env.DB.prepare(
			"SELECT * FROM thermostat_settings WHERE unit_number = ?"
		)
			.bind(unit_number)
			.first();

		if (!settings) {
			return c.json(
				{
					success: false,
					error: "Thermostat settings not found for this unit",
				},
				404
			);
		}

		return settings;
	}
}
