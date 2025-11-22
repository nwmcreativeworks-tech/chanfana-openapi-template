import { OpenAPIRoute, OpenAPIRouteSchema } from "chanfana";
import { Context } from "hono";
import { z } from "zod";
import { MaintenanceRequest } from "./base";

export class MaintenanceRead extends OpenAPIRoute {
	schema: OpenAPIRouteSchema = {
		tags: ["Maintenance"],
		summary: "Get a maintenance request by ID",
		request: {
			params: z.object({
				id: z.string().describe("Maintenance request ID"),
			}),
		},
		responses: {
			"200": {
				description: "Returns the maintenance request",
				content: {
					"application/json": {
						schema: MaintenanceRequest,
					},
				},
			},
			"404": {
				description: "Maintenance request not found",
			},
		},
	};

	async handle(c: Context) {
		const data = await this.getValidatedData<typeof this.schema>();
		const { id } = data.params as { id: string };

		const request = await c.env.DB.prepare(
			"SELECT * FROM maintenance_requests WHERE id = ?"
		)
			.bind(id)
			.first();

		if (!request) {
			return c.json(
				{
					success: false,
					error: "Maintenance request not found",
				},
				404
			);
		}

		return request;
	}
}
