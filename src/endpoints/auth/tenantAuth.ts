import { OpenAPIRoute, OpenAPIRouteSchema } from "chanfana";
import { Context } from "hono";
import { z } from "zod";
import * as bcrypt from "bcryptjs";

/**
 * Tenant Login - Professional authentication with bcrypt
 */
export class TenantLogin extends OpenAPIRoute {
	schema: OpenAPIRouteSchema = {
		tags: ["Auth"],
		summary: "Tenant login",
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
			},
		},
	};

	async handle(c: Context) {
		try {
			const data = await this.getValidatedData<typeof this.schema>();
			const { email, password } = data.body as { email: string; password: string };

			// Get user from database
			const user = await c.env.DB.prepare(
				"SELECT * FROM users WHERE email = ? AND is_active = 1"
			).bind(email).first();

			if (!user) {
				return c.json({ success: false, error: "Invalid credentials" }, 401);
			}

			// Verify password using bcrypt
			const passwordMatch = await bcrypt.compare(password, user.password_hash as string);

			if (!passwordMatch) {
				return c.json({ success: false, error: "Invalid credentials" }, 401);
			}

			// Create session
			const sessionToken = crypto.randomUUID();
			const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(); // 7 days

			await c.env.DB.prepare(
				`INSERT INTO user_sessions (user_id, session_token, expires_at)
				VALUES (?, ?, ?)`
			).bind(user.id, sessionToken, expiresAt).run();

			// Update last login
			await c.env.DB.prepare(
				"UPDATE users SET last_login = CURRENT_TIMESTAMP WHERE id = ?"
			).bind(user.id).run();

			return c.json({
				success: true,
				session_token: sessionToken,
				user: {
					id: user.id,
					email: user.email,
					full_name: user.full_name,
					unit_number: user.unit_number,
					role: user.role,
				},
			});
		} catch (error) {
			console.error("Tenant login error:", error);
			return c.json({ success: false, error: "Login failed" }, 500);
		}
	}
}

/**
 * Tenant Logout
 */
export class TenantLogout extends OpenAPIRoute {
	schema: OpenAPIRouteSchema = {
		tags: ["Auth"],
		summary: "Tenant logout",
		responses: {
			"200": {
				description: "Logout successful",
			},
		},
	};

	async handle(c: Context) {
		const sessionToken = c.req.header("Authorization")?.replace("Bearer ", "");

		if (sessionToken) {
			await c.env.DB.prepare(
				"DELETE FROM user_sessions WHERE session_token = ?"
			).bind(sessionToken).run();
		}

		return c.json({ success: true });
	}
}

/**
 * Verify Session
 */
export class VerifySession extends OpenAPIRoute {
	schema: OpenAPIRouteSchema = {
		tags: ["Auth"],
		summary: "Verify session token",
		responses: {
			"200": {
				description: "Session valid",
			},
		},
	};

	async handle(c: Context) {
		const sessionToken = c.req.header("Authorization")?.replace("Bearer ", "");

		if (!sessionToken) {
			return c.json({ error: "No session token" }, 401);
		}

		const session = await c.env.DB.prepare(
			`SELECT s.*, u.* FROM user_sessions s
			JOIN users u ON s.user_id = u.id
			WHERE s.session_token = ? AND s.expires_at > datetime('now') AND u.is_active = 1`
		).bind(sessionToken).first();

		if (!session) {
			return c.json({ error: "Invalid or expired session" }, 401);
		}

		return c.json({
			success: true,
			user: {
				id: session.user_id,
				email: session.email,
				full_name: session.full_name,
				unit_number: session.unit_number,
				role: session.role,
			},
		});
	}
}
