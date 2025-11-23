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

		// Store password as-is (for small church use - not high security)
		const passwordHash = password;

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

export class AdminUsersUpdate extends OpenAPIRoute {
	schema: OpenAPIRouteSchema = {
		tags: ["Admin"],
		summary: "Update a user",
		request: {
			params: z.object({
				id: z.string(),
			}),
			body: {
				content: {
					"application/json": {
						schema: z.object({
							email: z.string().email().optional(),
							password: z.string().min(6).optional(),
							full_name: z.string().optional(),
							unit_number: z.string().optional(),
							role: z.enum(["admin", "tenant", "maintenance"]).optional(),
						}),
					},
				},
			},
		},
		responses: {
			"200": {
				description: "User updated successfully",
			},
		},
	};

	async handle(c: Context) {
		const data = await this.getValidatedData<typeof this.schema>();
		const { id } = data.params as { id: string };
		const updates = data.body as {
			email?: string;
			password?: string;
			full_name?: string;
			unit_number?: string;
			role?: string;
		};

		// Check if user exists
		const user = await c.env.DB.prepare("SELECT * FROM users WHERE id = ?")
			.bind(id)
			.first();

		if (!user) {
			return c.json({ error: "User not found" }, 404);
		}

		// Build update query dynamically
		const updateFields = [];
		const values = [];

		if (updates.full_name) {
			updateFields.push("full_name = ?");
			values.push(updates.full_name);
		}
		if (updates.email) {
			updateFields.push("email = ?");
			values.push(updates.email);
		}
		if (updates.password) {
			updateFields.push("password_hash = ?");
			values.push(updates.password); // Store as-is for church use
		}
		if (updates.unit_number !== undefined) {
			updateFields.push("unit_number = ?");
			values.push(updates.unit_number || null);
		}
		if (updates.role) {
			updateFields.push("role = ?");
			values.push(updates.role);
		}

		if (updateFields.length > 0) {
			values.push(id);
			await c.env.DB.prepare(
				`UPDATE users SET ${updateFields.join(", ")} WHERE id = ?`
			).bind(...values).run();

			// Log activity
			await c.env.DB.prepare(
				"INSERT INTO activity_log (user_name, action_type, action_description) VALUES (?, ?, ?)"
			).bind("Admin", "user_updated", `User updated: ${updates.full_name || user.full_name}`).run();
		}

		return { success: true, message: "User updated successfully" };
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
