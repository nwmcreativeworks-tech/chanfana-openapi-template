import { OpenAPIRoute } from "chanfana";
import { Context } from "hono";

// POST /tenant/api/service-photos
export class UploadServicePhotosApi extends OpenAPIRoute {
	schema = {
		tags: ["Tenant - Service Photos API"],
		summary: "Upload service photos (before/after)",
		request: {
			body: {
				content: {
					"application/json": {
						schema: {
							type: "object",
							properties: {
								userId: { type: "number" },
								maintenanceRequestId: { type: "number" },
								phase: { type: "string", enum: ["before", "after", "unspecified"] },
								photos: { type: "array", items: { type: "string" } },
							},
							required: ["userId", "photos"],
						},
					},
				},
			},
		},
		responses: {
			201: { description: "Photos uploaded" },
		},
	};

	async handle(c: Context) {
		const body = await c.req.json();
		const { userId, maintenanceRequestId, phase, photos } = body;

		if (!photos || !Array.isArray(photos) || photos.length === 0) {
			return c.json({ success: false, error: "No photos provided" }, 400);
		}

		if (photos.length > 10) {
			return c.json({ success: false, error: "Maximum 10 photos per upload" }, 400);
		}

		const insertedPhotos = [];

		for (const photoUrl of photos) {
			const result = await c.env.DB.prepare(
				`INSERT INTO service_photos
				(user_id, maintenance_request_id, photo_url, phase)
				VALUES (?, ?, ?, ?)
				RETURNING *`
			).bind(
				userId,
				maintenanceRequestId || null,
				photoUrl,
				phase || "unspecified"
			).first();

			insertedPhotos.push(result);
		}

		return c.json({
			success: true,
			photos: insertedPhotos,
			count: insertedPhotos.length,
		}, 201);
	}
}

// GET /tenant/api/service-photos
export class GetTenantServicePhotosApi extends OpenAPIRoute {
	schema = {
		tags: ["Tenant - Service Photos API"],
		summary: "Get service photos for logged-in tenant",
		responses: {
			200: { description: "List of photos" },
		},
	};

	async handle(c: Context) {
		const url = new URL(c.req.url);
		const userId = url.searchParams.get("userId") || "1";

		const result = await c.env.DB.prepare(
			`SELECT
				sp.*,
				mr.category as request_category
			FROM service_photos sp
			LEFT JOIN maintenance_requests mr ON mr.id = sp.maintenance_request_id
			WHERE sp.user_id = ?
			ORDER BY sp.uploaded_at DESC`
		).bind(userId).all();

		return c.json({
			success: true,
			photos: result.results || [],
		});
	}
}
