import { OpenAPIRoute } from "chanfana";
import { Context } from "hono";

// GET /tenant/api/messages
export class GetTenantMessagesApi extends OpenAPIRoute {
	schema = {
		tags: ["Tenant - Messages API"],
		summary: "Get messages for logged-in tenant",
		responses: {
			200: { description: "List of messages" },
		},
	};

	async handle(c: Context) {
		// In production, extract userId from session/auth token
		// For now, we'll accept it as a query parameter for testing
		const url = new URL(c.req.url);
		const userId = url.searchParams.get("userId") || "1";
		const unreadOnly = url.searchParams.get("unreadOnly") === "true";

		let query = `
			SELECT
				tm.*,
				sender.full_name as sender_name
			FROM tenant_messages tm
			LEFT JOIN users sender ON sender.id = tm.sender_user_id
			WHERE tm.user_id = ?
		`;

		const bindings: any[] = [userId];

		if (unreadOnly) {
			query += " AND tm.is_read = 0";
		}

		query += " ORDER BY tm.created_at DESC";

		const result = await c.env.DB.prepare(query).bind(...bindings).all();

		// Get unread count
		const unreadResult = await c.env.DB.prepare(
			"SELECT COUNT(*) as count FROM tenant_messages WHERE user_id = ? AND is_read = 0"
		).bind(userId).first();

		return c.json({
			success: true,
			messages: result.results || [],
			unread_count: (unreadResult as any)?.count || 0,
		});
	}
}

// POST /tenant/api/messages/:id/read
export class MarkMessageReadApi extends OpenAPIRoute {
	schema = {
		tags: ["Tenant - Messages API"],
		summary: "Mark message as read",
		responses: {
			200: { description: "Message marked as read" },
		},
	};

	async handle(c: Context) {
		const id = c.req.param("id");

		await c.env.DB.prepare(
			`UPDATE tenant_messages
			SET is_read = 1, read_at = CURRENT_TIMESTAMP
			WHERE id = ?`
		).bind(id).run();

		// Get updated unread count for this user
		const message = await c.env.DB.prepare(
			"SELECT user_id FROM tenant_messages WHERE id = ?"
		).bind(id).first();

		if (message) {
			const unreadResult = await c.env.DB.prepare(
				"SELECT COUNT(*) as count FROM tenant_messages WHERE user_id = ? AND is_read = 0"
			).bind((message as any).user_id).first();

			return c.json({
				success: true,
				unread_count: (unreadResult as any)?.count || 0,
			});
		}

		return c.json({ success: true, unread_count: 0 });
	}
}
