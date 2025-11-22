import { OpenAPIRoute, OpenAPIRouteSchema } from "chanfana";
import { Context } from "hono";
import { z } from "zod";

export class ChatHistory extends OpenAPIRoute {
	schema: OpenAPIRouteSchema = {
		tags: ["Chat"],
		summary: "Get conversation history",
		request: {
			query: z.object({
				session_id: z.string().uuid().describe("Session ID to get history for"),
			}),
		},
		responses: {
			"200": {
				description: "Returns conversation history",
				content: {
					"application/json": {
						schema: z.object({
							session_id: z.string(),
							messages: z.array(
								z.object({
									id: z.number(),
									role: z.string(),
									content: z.string(),
									created_at: z.string(),
								})
							),
							tenant_info: z
								.object({
									tenant_name: z.string().nullable(),
									unit_number: z.string().nullable(),
								})
								.optional(),
						}),
					},
				},
			},
			"404": {
				description: "Conversation not found",
			},
		},
	};

	async handle(c: Context) {
		const data = await this.getValidatedData<typeof this.schema>();
		const { session_id } = data.query as { session_id: string };

		// Get conversation
		const conversation = await c.env.DB.prepare(
			"SELECT * FROM conversations WHERE session_id = ?"
		)
			.bind(session_id)
			.first();

		if (!conversation) {
			return c.json(
				{
					success: false,
					error: "Conversation not found",
				},
				404
			);
		}

		// Get messages
		const messages = await c.env.DB.prepare(
			"SELECT id, role, content, created_at FROM messages WHERE conversation_id = ? ORDER BY created_at ASC"
		)
			.bind(conversation.id)
			.all();

		return {
			session_id,
			messages: messages.results || [],
			tenant_info: {
				tenant_name: conversation.tenant_name,
				unit_number: conversation.unit_number,
			},
		};
	}
}
