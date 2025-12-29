import { OpenAPIRoute, OpenAPIRouteSchema } from "chanfana";
import { Context } from "hono";
import { z } from "zod";

/**
 * Escalate Troubleshooting Issue
 * Creates a support ticket when quick fixes don't work
 */
export class EscalateTroubleshooting extends OpenAPIRoute {
	schema: OpenAPIRouteSchema = {
		tags: ["Troubleshooting"],
		summary: "Escalate to advanced support",
		request: {
			body: {
				content: {
					"application/json": {
						schema: z.object({
							troubleshooting_id: z.number().optional(),
							session_id: z.string(),
							user_name: z.string(),
							user_email: z.string().email(),
							escalation_reason: z.string(),
							photos: z.array(z.object({
								name: z.string(),
								data: z.string(), // base64
								type: z.string(),
							})).optional(),
							device: z.string(),
							issue_description: z.string(),
						}),
					},
				},
			},
		},
		responses: {
			"200": {
				description: "Escalation created successfully",
			},
		},
	};

	async handle(c: Context) {
		try {
			const data = await this.getValidatedData<typeof this.schema>();
			const {
				troubleshooting_id,
				session_id,
				user_name,
				user_email,
				escalation_reason,
				photos,
				device,
				issue_description,
			} = data.body;

			// Store photos as JSON
			const photosJson = photos ? JSON.stringify(photos) : null;

			// Create escalation ticket
			const result = await c.env.DB.prepare(`
				INSERT INTO troubleshooting_escalations
				(troubleshooting_id, session_id, user_name, user_email, escalation_reason, photos)
				VALUES (?, ?, ?, ?, ?, ?)
			`).bind(
				troubleshooting_id || null,
				session_id,
				user_name,
				user_email,
				escalation_reason,
				photosJson
			).run();

			const escalationId = result.meta.last_row_id;

			// Create admin request log
			await c.env.DB.prepare(`
				INSERT INTO admin_request_logs
				(request_type, message_details, status, source, session_id)
				VALUES (?, ?, ?, ?, ?)
			`).bind(
				'Media Support Escalation',
				`${user_name} (${user_email}) needs help with ${device}: ${issue_description}`,
				'Active',
				'Troubleshooting Bot',
				session_id
			).run();

			return c.json({
				success: true,
				escalation_id: escalationId,
				message: "Your request has been escalated to NWM Creative Works Advanced Media Support. We'll contact you within 24 hours.",
			});

		} catch (error) {
			console.error("Escalation error:", error);
			return c.json({
				success: false,
				error: "Failed to create escalation",
			}, 500);
		}
	}
}

/**
 * Get User's Escalations
 * Returns escalation tickets for a user
 */
export class GetEscalations extends OpenAPIRoute {
	schema: OpenAPIRouteSchema = {
		tags: ["Troubleshooting"],
		summary: "Get user escalations",
		request: {
			query: z.object({
				session_id: z.string().optional(),
				email: z.string().email().optional(),
				status: z.enum(["pending", "in_progress", "resolved", "cancelled"]).optional(),
			}),
		},
		responses: {
			"200": {
				description: "Returns escalation tickets",
			},
		},
	};

	async handle(c: Context) {
		try {
			const { session_id, email, status } = this.getValidatedData<typeof this.schema>();

			let sql = `
				SELECT
					e.*,
					m.device,
					m.issue
				FROM troubleshooting_escalations e
				LEFT JOIN media_troubleshooting m ON m.id = e.troubleshooting_id
				WHERE 1=1
			`;
			const params: any[] = [];

			if (session_id) {
				sql += ` AND e.session_id = ?`;
				params.push(session_id);
			}

			if (email) {
				sql += ` AND e.user_email = ?`;
				params.push(email);
			}

			if (status) {
				sql += ` AND e.status = ?`;
				params.push(status);
			}

			sql += ` ORDER BY e.created_at DESC`;

			const results = await c.env.DB.prepare(sql).bind(...params).all();

			// Parse photos JSON
			const escalations = results.results.map((row: any) => ({
				...row,
				photos: row.photos ? JSON.parse(row.photos) : [],
			}));

			return c.json({
				success: true,
				escalations,
			});

		} catch (error) {
			console.error("Get escalations error:", error);
			return c.json({
				success: false,
				error: "Failed to get escalations",
			}, 500);
		}
	}
}
