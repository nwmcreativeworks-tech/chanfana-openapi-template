import { OpenAPIRoute, OpenAPIRouteSchema } from "chanfana";
import { Context } from "hono";
import { z } from "zod";

export class MaintenanceList extends OpenAPIRoute {
	schema: OpenAPIRouteSchema = {
		tags: ["Maintenance"],
		summary: "List maintenance requests",
		request: {
			query: z.object({
				unit_number: z.string().optional().describe("Filter by unit number"),
				status: z
					.enum(["open", "in_progress", "resolved", "closed"])
					.optional()
					.describe("Filter by status"),
				limit: z.string().optional().default("50").describe("Number of results"),
			}),
		},
		responses: {
			"200": {
				description: "Returns list of maintenance requests",
				content: {
					"application/json": {
						schema: z.object({
							requests: z.array(z.any()),
							total: z.number(),
						}),
					},
				},
			},
		},
	};

	async handle(c: Context) {
		const data = await this.getValidatedData<typeof this.schema>();
		const { unit_number, status, limit } = data.query;

		let query = "SELECT * FROM maintenance_requests WHERE 1=1";
		const params: any[] = [];

		if (unit_number) {
			query += " AND unit_number = ?";
			params.push(unit_number);
		}

		if (status) {
			query += " AND status = ?";
			params.push(status);
		}

		query += " ORDER BY created_at DESC LIMIT ?";
		params.push(parseInt(limit));

		const stmt = c.env.DB.prepare(query);
		const results = await stmt.bind(...params).all();

		return {
			requests: results.results || [],
			total: results.results?.length || 0,
		};
	}
}
