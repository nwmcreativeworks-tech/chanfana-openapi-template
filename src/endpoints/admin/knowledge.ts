import { OpenAPIRoute, OpenAPIRouteSchema } from "chanfana";
import { Context } from "hono";
import { z } from "zod";

/**
 * List all knowledge base entries
 */
export class AdminKnowledgeList extends OpenAPIRoute {
	schema: OpenAPIRouteSchema = {
		tags: ["Admin"],
		summary: "List all knowledge base entries",
		responses: {
			"200": {
				description: "Returns list of knowledge base entries",
			},
		},
	};

	async handle(c: Context) {
		const entries = await c.env.DB.prepare(
			"SELECT * FROM knowledge_base ORDER BY category, created_at DESC"
		).all();

		return {
			entries: entries.results || [],
		};
	}
}

/**
 * Create new knowledge base entry
 */
export class AdminKnowledgeCreate extends OpenAPIRoute {
	schema: OpenAPIRouteSchema = {
		tags: ["Admin"],
		summary: "Create knowledge base entry",
		request: {
			body: {
				content: {
					"application/json": {
						schema: z.object({
							category: z.string(),
							question: z.string(),
							answer: z.string(),
							keywords: z.string().optional(),
						}),
					},
				},
			},
		},
		responses: {
			"200": {
				description: "Entry created successfully",
			},
		},
	};

	async handle(c: Context) {
		const data = await this.getValidatedData<typeof this.schema>();
		const { category, question, answer, keywords } = data.body as {
			category: string;
			question: string;
			answer: string;
			keywords?: string;
		};

		await c.env.DB.prepare(
			"INSERT INTO knowledge_base (category, question, answer, keywords) VALUES (?, ?, ?, ?)"
		).bind(category, question, answer, keywords || "").run();

		// Log activity
		await c.env.DB.prepare(
			"INSERT INTO activity_log (user_name, action_type, action_description) VALUES (?, ?, ?)"
		).bind("Admin", "knowledge_created", `Knowledge entry created: ${question}`).run();

		return { success: true, message: "Knowledge entry created successfully" };
	}
}

/**
 * Update knowledge base entry
 */
export class AdminKnowledgeUpdate extends OpenAPIRoute {
	schema: OpenAPIRouteSchema = {
		tags: ["Admin"],
		summary: "Update knowledge base entry",
		request: {
			params: z.object({
				id: z.string(),
			}),
			body: {
				content: {
					"application/json": {
						schema: z.object({
							category: z.string(),
							question: z.string(),
							answer: z.string(),
							keywords: z.string().optional(),
						}),
					},
				},
			},
		},
		responses: {
			"200": {
				description: "Entry updated successfully",
			},
		},
	};

	async handle(c: Context) {
		const data = await this.getValidatedData<typeof this.schema>();
		const { id } = data.params as { id: string };
		const { category, question, answer, keywords } = data.body as {
			category: string;
			question: string;
			answer: string;
			keywords?: string;
		};

		await c.env.DB.prepare(
			"UPDATE knowledge_base SET category = ?, question = ?, answer = ?, keywords = ? WHERE id = ?"
		).bind(category, question, answer, keywords || "", id).run();

		// Log activity
		await c.env.DB.prepare(
			"INSERT INTO activity_log (user_name, action_type, action_description) VALUES (?, ?, ?)"
		).bind("Admin", "knowledge_updated", `Knowledge entry updated: ${question}`).run();

		return { success: true, message: "Knowledge entry updated successfully" };
	}
}

/**
 * Delete knowledge base entry
 */
export class AdminKnowledgeDelete extends OpenAPIRoute {
	schema: OpenAPIRouteSchema = {
		tags: ["Admin"],
		summary: "Delete knowledge base entry",
		request: {
			params: z.object({
				id: z.string(),
			}),
		},
		responses: {
			"200": {
				description: "Entry deleted successfully",
			},
		},
	};

	async handle(c: Context) {
		const data = await this.getValidatedData<typeof this.schema>();
		const { id } = data.params as { id: string };

		const entry = await c.env.DB.prepare("SELECT * FROM knowledge_base WHERE id = ?")
			.bind(id)
			.first();

		if (!entry) {
			return c.json({ error: "Entry not found" }, 404);
		}

		await c.env.DB.prepare("DELETE FROM knowledge_base WHERE id = ?").bind(id).run();

		// Log activity
		await c.env.DB.prepare(
			"INSERT INTO activity_log (user_name, action_type, action_description) VALUES (?, ?, ?)"
		).bind("Admin", "knowledge_deleted", `Knowledge entry deleted: ${entry.question}`).run();

		return { success: true, message: "Knowledge entry deleted successfully" };
	}
}
