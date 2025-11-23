import { OpenAPIRoute, OpenAPIRouteSchema } from "chanfana";
import { Context } from "hono";
import { z } from "zod";

export class AdminChatActivity extends OpenAPIRoute {
	schema: OpenAPIRouteSchema = {
		tags: ["Admin"],
		summary: "Get recent chatbot activity",
		responses: {
			"200": {
				description: "Returns recent chat messages",
				content: {
					"application/json": {
						schema: z.object({
							messages: z.array(z.any()),
						}),
					},
				},
			},
		},
	};

	async handle(c: Context) {
		// Get recent conversations with messages
		const results = await c.env.DB.prepare(
			`SELECT
				c.id as conversation_id,
				c.tenant_name,
				c.unit_number,
				c.created_at,
				m1.content as user_message,
				m1.created_at as user_message_time,
				m2.content as assistant_message,
				m2.created_at as assistant_message_time
			FROM conversations c
			LEFT JOIN messages m1 ON m1.conversation_id = c.id AND m1.role = 'user'
			LEFT JOIN messages m2 ON m2.conversation_id = c.id AND m2.role = 'assistant'
				AND m2.id = (
					SELECT id FROM messages
					WHERE conversation_id = c.id AND role = 'assistant'
					AND created_at > m1.created_at
					ORDER BY created_at ASC LIMIT 1
				)
			WHERE m1.content IS NOT NULL
			ORDER BY m1.created_at DESC
			LIMIT 100`
		).all();

		// Detect intent from user message
		const messagesWithIntent = (results.results || []).map((msg: any) => {
			let intent = 'general';
			const lowerMsg = (msg.user_message || '').toLowerCase();

			if (lowerMsg.match(/vmix|v-mix|media equipment|video|audio/)) {
				intent = 'vmix_support';
			} else if (lowerMsg.match(/temperature|temp|thermostat/)) {
				intent = 'thermostat';
			} else if (lowerMsg.match(/maintenance|repair|broken|fix/)) {
				intent = 'maintenance';
			}

			return {
				...msg,
				intent,
				created_at: msg.user_message_time
			};
		});

		return {
			messages: messagesWithIntent,
		};
	}
}
