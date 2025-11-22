import { OpenAPIRoute, OpenAPIRouteSchema } from "chanfana";
import { Context } from "hono";
import { z } from "zod";

export class AdminUsersList extends OpenAPIRoute {
	schema: OpenAPIRouteSchema = {
		tags: ["Admin"],
		summary: "List all users",
		responses: {
			"200": {
				description: "Returns list of users",
				content: {
					"application/json": {
						schema: z.object({
							users: z.array(z.any()),
						}),
					},
				},
			},
		},
	};

	async handle(c: Context) {
		const users = await c.env.DB.prepare(
			"SELECT id, email, full_name, unit_number, role, is_active, last_login, created_at FROM users ORDER BY created_at DESC"
		).all();

		return {
			users: users.results || [],
		};
	}
}

export class AdminUsersCreate extends OpenAPIRoute {
	schema: OpenAPIRouteSchema = {
		tags: ["Admin"],
		summary: "Create a new user",
		request: {
			body: {
				content: {
					"application/json": {
						schema: z.object({
							email: z.string().email(),
							password: z.string().min(6),
							full_name: z.string(),
							unit_number: z.string().optional(),
							role: z.enum(["admin", "tenant", "maintenance"]),
						}),
					},
				},
			},
		},
		responses: {
			"200": {
				description: "User created successfully",
			},
		},
	};

	async handle(c: Context) {
		const data = await this.getValidatedData<typeof this.schema>();
		const { email, password, full_name, unit_number, role } = data.body as {
			email: string;
			password: string;
			full_name: string;
			unit_number?: string;
			role: string;
		};

		// Simple hash (INSECURE - use bcrypt in production!)
		const passwordHash = password + "hash";

		await c.env.DB.prepare(
			"INSERT INTO users (email, password_hash, full_name, unit_number, role) VALUES (?, ?, ?, ?, ?)"
		)
			.bind(email, passwordHash, full_name, unit_number || null, role)
			.run();

		// Log activity
		await c.env.DB.prepare(
			"INSERT INTO activity_log (user_name, action_type, action_description) VALUES (?, ?, ?)"
		)
			.bind("Admin", "user_created", `New user created: ${full_name} (${email})`)
			.run();

		return { success: true, message: "User created successfully" };
	}
}

export class AdminUsersDelete extends OpenAPIRoute {
	schema: OpenAPIRouteSchema = {
		tags: ["Admin"],
		summary: "Delete a user",
		request: {
			params: z.object({
				id: z.string(),
			}),
		},
		responses: {
			"200": {
				description: "User deleted successfully",
			},
		},
	};

	async handle(c: Context) {
		const data = await this.getValidatedData<typeof this.schema>();
		const { id } = data.params as { id: string };

		const user = await c.env.DB.prepare("SELECT * FROM users WHERE id = ?")
			.bind(id)
			.first();

		if (!user) {
			return c.json({ error: "User not found" }, 404);
		}

		await c.env.DB.prepare("DELETE FROM users WHERE id = ?").bind(id).run();

		// Log activity
		await c.env.DB.prepare(
			"INSERT INTO activity_log (user_name, action_type, action_description) VALUES (?, ?, ?)"
		)
			.bind("Admin", "user_deleted", `User deleted: ${user.full_name} (${user.email})`)
			.run();

		return { success: true, message: "User deleted successfully" };
	}
}
