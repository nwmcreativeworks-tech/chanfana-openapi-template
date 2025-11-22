import { OpenAPIRoute, OpenAPIRouteSchema } from "chanfana";
import { Context } from "hono";
import { z } from "zod";

export class Login extends OpenAPIRoute {
	schema: OpenAPIRouteSchema = {
		tags: ["Auth"],
		summary: "User login",
		request: {
			body: {
				content: {
					"application/json": {
						schema: z.object({
							email: z.string().email(),
							password: z.string(),
						}),
					},
				},
			},
		},
		responses: {
			"200": {
				description: "Login successful",
				content: {
					"application/json": {
						schema: z.object({
							success: z.boolean(),
							session_token: z.string(),
							user: z.object({
								id: z.number(),
								email: z.string(),
								full_name: z.string(),
								role: z.string(),
								unit_number: z.string().nullable(),
							}),
						}),
					},
				},
			},
		},
	};

	async handle(c: Context) {
		const data = await this.getValidatedData<typeof this.schema>();
		const { email, password } = data.body as { email: string; password: string };

		// Find user
		const user = await c.env.DB.prepare("SELECT * FROM users WHERE email = ? AND is_active = 1")
			.bind(email)
			.first();

		if (!user) {
			return c.json({ success: false, error: "Invalid credentials" }, 401);
		}

		// In production, use bcrypt.compare()
		// For now, simple comparison (INSECURE - FIX IN PRODUCTION!)
		const passwordHash = password + "hash"; // Simple hash simulation
		if (user.password_hash !== passwordHash) {
			return c.json({ success: false, error: "Invalid credentials" }, 401);
		}

		// Generate session token
		const sessionToken = `SESSION_${crypto.randomUUID()}`;
		const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // 7 days

		await c.env.DB.prepare(
			"INSERT INTO user_sessions (user_id, session_token, expires_at) VALUES (?, ?, ?)"
		)
			.bind(user.id, sessionToken, expiresAt.toISOString())
			.run();

		// Update last login
		await c.env.DB.prepare("UPDATE users SET last_login = CURRENT_TIMESTAMP WHERE id = ?")
			.bind(user.id)
			.run();

		// Log activity
		await c.env.DB.prepare(
			"INSERT INTO activity_log (user_id, user_name, action_type, action_description, unit_number) VALUES (?, ?, ?, ?, ?)"
		)
			.bind(
				user.id,
				user.full_name,
				"login",
				`${user.full_name} logged in`,
				user.unit_number
			)
			.run();

		return {
			success: true,
			session_token: sessionToken,
			user: {
				id: user.id,
				email: user.email,
				full_name: user.full_name,
				role: user.role,
				unit_number: user.unit_number,
			},
		};
	}
}
