import { OpenAPIRoute, OpenAPIRouteSchema } from "chanfana";
import { Context } from "hono";
import { z } from "zod";

export class AdminActivityLog extends OpenAPIRoute {
	schema: OpenAPIRouteSchema = {
		tags: ["Admin"],
		summary: "Get activity log",
		request: {
			query: z.object({
				limit: z.string().optional().default("100"),
				unit_number: z.string().optional(),
			}),
		},
		responses: {
			"200": {
				description: "Returns activity log",
				content: {
					"application/json": {
						schema: z.object({
							activities: z.array(z.any()),
						}),
					},
				},
			},
		},
	};

	async handle(c: Context) {
		const data = await this.getValidatedData<typeof this.schema>();
		const { limit, unit_number } = data.query as { limit: string; unit_number?: string };

		let query = "SELECT * FROM activity_log WHERE 1=1";
		const params: any[] = [];

		if (unit_number) {
			query += " AND unit_number = ?";
			params.push(unit_number);
		}

		query += " ORDER BY created_at DESC LIMIT ?";
		params.push(parseInt(limit));

		const activities = await c.env.DB.prepare(query).bind(...params).all();

		return {
			activities: activities.results || [],
		};
	}
}
