import { OpenAPIRoute, OpenAPIRouteSchema } from "chanfana";
import { Context } from "hono";
import { z } from "zod";
import { MaintenanceRequestUpdate } from "./base";

export class MaintenanceUpdate extends OpenAPIRoute {
	schema: OpenAPIRouteSchema = {
		tags: ["Maintenance"],
		summary: "Update a maintenance request",
		request: {
			params: z.object({
				id: z.string().describe("Maintenance request ID"),
			}),
			body: {
				content: {
					"application/json": {
						schema: MaintenanceRequestUpdate,
					},
				},
			},
		},
		responses: {
			"200": {
				description: "Returns the updated maintenance request",
				content: {
					"application/json": {
						schema: z.object({
							success: z.boolean(),
							request: z.any(),
						}),
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
		const { status, priority } = data.body as { status?: string; priority?: string };

		// Check if request exists
		const existing = await c.env.DB.prepare(
			"SELECT * FROM maintenance_requests WHERE id = ?"
		)
			.bind(id)
			.first();

		if (!existing) {
			return c.json(
				{
					success: false,
					error: "Maintenance request not found",
				},
				404
			);
		}

		// Build update query
		const updates: string[] = [];
		const params: any[] = [];

		if (status) {
			updates.push("status = ?");
			params.push(status);

			// If marking as resolved, set resolved_at
			if (status === "resolved" || status === "closed") {
				updates.push("resolved_at = CURRENT_TIMESTAMP");
			}
		}

		if (priority) {
			updates.push("priority = ?");
			params.push(priority);
		}

		updates.push("updated_at = CURRENT_TIMESTAMP");
		params.push(id);

		const query = `UPDATE maintenance_requests SET ${updates.join(", ")} WHERE id = ?`;
		await c.env.DB.prepare(query).bind(...params).run();

		// Return updated request
		const updated = await c.env.DB.prepare(
			"SELECT * FROM maintenance_requests WHERE id = ?"
		)
			.bind(id)
			.first();

		return {
			success: true,
			request: updated,
		};
	}
}
