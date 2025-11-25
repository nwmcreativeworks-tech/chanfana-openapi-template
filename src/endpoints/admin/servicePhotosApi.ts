import { OpenAPIRoute } from "chanfana";
import { Context } from "hono";

// GET /admin/api/service-photos
export class GetServicePhotosApi extends OpenAPIRoute {
	schema = {
		tags: ["Admin - Service Photos API"],
		summary: "Get all service photos (before/after)",
		responses: {
			200: { description: "List of service photos" },
		},
	};

	async handle(c: Context) {
		// Get query parameters for filtering
		const url = new URL(c.req.url);
		const userId = url.searchParams.get("userId");
		const phase = url.searchParams.get("phase");
		const startDate = url.searchParams.get("startDate");
		const endDate = url.searchParams.get("endDate");

		let query = `
			SELECT
				sp.*,
				u.full_name as user_name,
				u.email as user_email,
				u.unit_number,
				mr.id as request_id,
				mr.category as request_category
			FROM service_photos sp
			JOIN users u ON u.id = sp.user_id
			LEFT JOIN maintenance_requests mr ON mr.id = sp.maintenance_request_id
			WHERE 1=1
		`;

		const bindings: any[] = [];

		if (userId) {
			query += " AND sp.user_id = ?";
			bindings.push(userId);
		}

		if (phase && phase !== "all") {
			query += " AND sp.phase = ?";
			bindings.push(phase);
		}

		if (startDate) {
			query += " AND sp.uploaded_at >= ?";
			bindings.push(startDate);
		}

		if (endDate) {
			query += " AND sp.uploaded_at <= ?";
			bindings.push(endDate);
		}

		query += " ORDER BY sp.uploaded_at DESC";

		const stmt = c.env.DB.prepare(query);
		const result = await (bindings.length > 0 ? stmt.bind(...bindings) : stmt).all();

		return c.json({
			success: true,
			photos: result.results || [],
			count: result.results?.length || 0,
		});
	}
}
