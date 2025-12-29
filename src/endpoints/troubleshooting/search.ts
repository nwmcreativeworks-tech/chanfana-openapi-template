import { OpenAPIRoute, OpenAPIRouteSchema } from "chanfana";
import { Context } from "hono";
import { z } from "zod";

/**
 * Search Media Troubleshooting Knowledge Base
 * Finds relevant troubleshooting guides based on user query
 */
export class SearchTroubleshooting extends OpenAPIRoute {
	schema: OpenAPIRouteSchema = {
		tags: ["Troubleshooting"],
		summary: "Search troubleshooting guides",
		request: {
			query: z.object({
				query: z.string().min(3).describe("Search query (issue description, device name, etc)"),
				category: z.enum(["Video", "Audio", "Presentation", "Connectivity"]).optional(),
				device: z.string().optional(),
			}),
		},
		responses: {
			"200": {
				description: "Returns matching troubleshooting guides",
			},
		},
	};

	async handle(c: Context) {
		try {
			const { query, category, device } = this.getValidatedData<typeof this.schema>();

			// Build search query
			let sql = `
				SELECT
					id,
					category,
					device,
					issue,
					quick_fix,
					advanced_redirect,
					times_used,
					success_rate
				FROM media_troubleshooting
				WHERE 1=1
			`;
			const params: any[] = [];

			// Category filter
			if (category) {
				sql += ` AND category = ?`;
				params.push(category);
			}

			// Device filter
			if (device) {
				sql += ` AND LOWER(device) LIKE LOWER(?)`;
				params.push(`%${device}%`);
			}

			// Keyword search (search in issue, device, and keywords)
			const searchTerms = query.toLowerCase().split(' ').filter(t => t.length > 2);
			if (searchTerms.length > 0) {
				const keywordConditions = searchTerms.map(() =>
					`(LOWER(issue) LIKE ? OR LOWER(device) LIKE ? OR LOWER(keywords) LIKE ?)`
				).join(' OR ');

				sql += ` AND (${keywordConditions})`;

				searchTerms.forEach(term => {
					const searchPattern = `%${term}%`;
					params.push(searchPattern, searchPattern, searchPattern);
				});
			}

			// Order by success rate and usage
			sql += ` ORDER BY success_rate DESC, times_used DESC LIMIT 5`;

			const results = await c.env.DB.prepare(sql).bind(...params).all();

			// Parse JSON quick_fix arrays
			const guides = results.results.map((row: any) => ({
				...row,
				quick_fix: JSON.parse(row.quick_fix || '[]'),
			}));

			return c.json({
				success: true,
				count: guides.length,
				guides,
			});

		} catch (error) {
			console.error("Troubleshooting search error:", error);
			return c.json({
				success: false,
				error: "Failed to search troubleshooting guides",
			}, 500);
		}
	}
}

/**
 * Get All Devices
 * Returns list of all supported devices
 */
export class GetDevices extends OpenAPIRoute {
	schema: OpenAPIRouteSchema = {
		tags: ["Troubleshooting"],
		summary: "Get all supported devices",
		responses: {
			"200": {
				description: "Returns list of devices",
			},
		},
	};

	async handle(c: Context) {
		try {
			const results = await c.env.DB.prepare(`
				SELECT DISTINCT device, category
				FROM media_troubleshooting
				ORDER BY category, device
			`).all();

			return c.json({
				success: true,
				devices: results.results,
			});

		} catch (error) {
			console.error("Get devices error:", error);
			return c.json({
				success: false,
				error: "Failed to get devices",
			}, 500);
		}
	}
}

/**
 * Record Troubleshooting Usage
 * Track when a guide is used and whether it worked
 */
export class RecordUsage extends OpenAPIRoute {
	schema: OpenAPIRouteSchema = {
		tags: ["Troubleshooting"],
		summary: "Record troubleshooting guide usage",
		request: {
			body: {
				content: {
					"application/json": {
						schema: z.object({
							guide_id: z.number(),
							worked: z.boolean(),
						}),
					},
				},
			},
		},
		responses: {
			"200": {
				description: "Usage recorded",
			},
		},
	};

	async handle(c: Context) {
		try {
			const data = await this.getValidatedData<typeof this.schema>();
			const { guide_id, worked } = data.body;

			// Get current stats
			const guide = await c.env.DB.prepare(
				`SELECT times_used, success_rate FROM media_troubleshooting WHERE id = ?`
			).bind(guide_id).first();

			if (!guide) {
				return c.json({ success: false, error: "Guide not found" }, 404);
			}

			// Calculate new success rate
			const timesUsed = (guide.times_used || 0) + 1;
			const currentSuccesses = (guide.success_rate || 0) * (guide.times_used || 0);
			const newSuccesses = currentSuccesses + (worked ? 1 : 0);
			const newSuccessRate = newSuccesses / timesUsed;

			// Update stats
			await c.env.DB.prepare(`
				UPDATE media_troubleshooting
				SET times_used = ?, success_rate = ?, updated_at = CURRENT_TIMESTAMP
				WHERE id = ?
			`).bind(timesUsed, newSuccessRate, guide_id).run();

			return c.json({
				success: true,
				times_used: timesUsed,
				success_rate: newSuccessRate,
			});

		} catch (error) {
			console.error("Record usage error:", error);
			return c.json({
				success: false,
				error: "Failed to record usage",
			}, 500);
		}
	}
}
