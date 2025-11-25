import { OpenAPIRoute } from "chanfana";
import { Context } from "hono";

// GET /admin/api/messages
export class GetAdminMessagesApi extends OpenAPIRoute {
	schema = {
		tags: ["Admin - Messages API"],
		summary: "Get all tenant messages (sent by staff)",
		responses: {
			200: { description: "List of messages" },
		},
	};

	async handle(c: Context) {
		const messages = await c.env.DB.prepare(
			`SELECT
				tm.*,
				u.full_name as tenant_name,
				u.email as tenant_email,
				u.last_login as tenant_last_login,
				sender.full_name as sender_name
			FROM tenant_messages tm
			JOIN users u ON u.id = tm.user_id
			LEFT JOIN users sender ON sender.id = tm.sender_user_id
			ORDER BY tm.created_at DESC`
		).all();

		return c.json({
			success: true,
			messages: messages.results || [],
		});
	}
}

// POST /admin/api/messages
export class SendMessageApi extends OpenAPIRoute {
	schema = {
		tags: ["Admin - Messages API"],
		summary: "Send message to a tenant",
		request: {
			body: {
				content: {
					"application/json": {
						schema: {
							type: "object",
							properties: {
								userId: { type: "number" },
								subject: { type: "string" },
								body: { type: "string" },
								messageType: { type: "string", enum: ["notice", "violation", "announcement"] },
							},
							required: ["userId", "body"],
						},
					},
				},
			},
		},
		responses: {
			201: { description: "Message sent" },
		},
	};

	async handle(c: Context) {
		const requestBody = await c.req.json();
		const { userId, subject, body, messageType } = requestBody;

		// In production, extract sender from session/auth token
		// For now, use 1 as placeholder admin
		const senderUserId = 1;

		const result = await c.env.DB.prepare(
			`INSERT INTO tenant_messages
			(user_id, sender_user_id, subject, body, message_type)
			VALUES (?, ?, ?, ?, ?)
			RETURNING *`
		).bind(
			userId,
			senderUserId,
			subject || "(No Subject)",
			body,
			messageType || "notice"
		).first();

		// Log to admin request logs
		await c.env.DB.prepare(
			`INSERT INTO admin_request_logs
			(request_type, message_details, status, source, user_name)
			VALUES (?, ?, ?, ?, ?)`
		).bind(
			"Message Sent",
			`${messageType || 'notice'}: ${subject || '(No Subject)'}`,
			"Sent",
			"Admin Panel",
			`User ID ${userId}`
		).run();

		return c.json({
			success: true,
			message: result,
		}, 201);
	}
}
