import { OpenAPIRoute, OpenAPIRouteSchema } from "chanfana";
import { Context } from "hono";
import { z } from "zod";

// Utility: Generate random token
function generateToken(length: number = 64): string {
	const chars = "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
	const array = new Uint8Array(length);
	crypto.getRandomValues(array);
	return Array.from(array).map(x => chars[x % chars.length]).join('');
}

// Utility: Create JWT-style token (simple HMAC signing)
async function createSignedToken(payload: any, secret: string): Promise<string> {
	const encoder = new TextEncoder();
	const data = encoder.encode(JSON.stringify(payload));
	const keyData = encoder.encode(secret);

	const key = await crypto.subtle.importKey(
		'raw',
		keyData,
		{ name: 'HMAC', hash: 'SHA-256' },
		false,
		['sign']
	);

	const signature = await crypto.subtle.sign('HMAC', key, data);
	const base64Payload = btoa(JSON.stringify(payload));
	const base64Signature = btoa(String.fromCharCode(...new Uint8Array(signature)));

	return `${base64Payload}.${base64Signature}`;
}

// POST /oauth/token - Exchange authorization code for access token
export class OAuthToken extends OpenAPIRoute {
	schema: OpenAPIRouteSchema = {
		tags: ["OAuth"],
		summary: "OAuth token exchange",
		request: {
			body: {
				content: {
					"application/x-www-form-urlencoded": {
						schema: z.object({
							grant_type: z.string(),
							code: z.string().optional(),
							refresh_token: z.string().optional(),
							client_id: z.string().optional(),
							client_secret: z.string().optional(),
						}),
					},
					"application/json": {
						schema: z.object({
							grant_type: z.string(),
							code: z.string().optional(),
							refresh_token: z.string().optional(),
							client_id: z.string().optional(),
							client_secret: z.string().optional(),
						}),
					},
				},
			},
		},
		responses: {
			"200": {
				description: "Returns access token and refresh token",
			},
		},
	};

	async handle(c: Context) {
		try {
			// Parse form data or JSON
			let params: any;
			const contentType = c.req.header('content-type') || '';

			if (contentType.includes('application/json')) {
				params = await c.req.json();
			} else {
				const formData = await c.req.parseBody();
				params = formData;
			}

			const { grant_type, code, refresh_token, client_id } = params;

			// Handle authorization_code grant
			if (grant_type === 'authorization_code') {
				if (!code) {
					return c.json({ error: 'invalid_request', error_description: 'Missing code parameter' }, 400);
				}

				// Find and validate authorization code
				const authCode = await c.env.DB.prepare(`
					SELECT * FROM oauth_codes
					WHERE code = ? AND expires_at > CURRENT_TIMESTAMP
				`).bind(code).first();

				if (!authCode) {
					return c.json({ error: 'invalid_grant', error_description: 'Invalid or expired authorization code' }, 400);
				}

				// Delete used authorization code (one-time use)
				await c.env.DB.prepare(`DELETE FROM oauth_codes WHERE code = ?`).bind(code).run();

				// Get user info including role
				const user = await c.env.DB.prepare(`
					SELECT id, email, role FROM users WHERE id = ?
				`).bind(authCode.user_id).first();

				if (!user) {
					return c.json({ error: 'invalid_grant', error_description: 'User not found' }, 400);
				}

				// Get thermostats: ALL for admin/sub-admin, assigned only for tenants
				let thermostats;
				if (user.role === 'admin' || user.role === 'sub_admin') {
					// Admins get ALL thermostats
					thermostats = await c.env.DB.prepare(`
						SELECT id, device_name, room_name, alexa_endpoint_id as alexa_device_id
						FROM thermostat_devices
					`).all();
				} else {
					// Tenants only get assigned thermostats
					thermostats = await c.env.DB.prepare(`
						SELECT td.id, td.device_name, td.room_name, td.alexa_endpoint_id as alexa_device_id
						FROM user_thermostat_permissions utp
						JOIN thermostat_devices td ON td.id = utp.thermostat_id
						WHERE utp.user_id = ?
					`).bind(authCode.user_id).all();
				}

				// Create access token payload
				const tokenPayload = {
					user_id: authCode.user_id,
					role: user.role,
					scope: authCode.scope,
					thermostats: (thermostats.results || []).map((t: any) => ({
						id: t.id,
						device_name: t.device_name,
						room_name: t.room_name,
						alexa_device_id: t.alexa_device_id
					})),
					exp: Math.floor(Date.now() / 1000) + 3600, // 1 hour
					iat: Math.floor(Date.now() / 1000)
				};

				// Generate tokens
				const jwtSecret = c.env.JWT_SECRET || 'change-this-secret-in-production';
				const accessToken = await createSignedToken(tokenPayload, jwtSecret);
				const refreshToken = generateToken(64);

				const expiresAt = new Date(Date.now() + 3600 * 1000).toISOString();

				// Store tokens in database
				await c.env.DB.prepare(`
					INSERT INTO oauth_tokens (user_id, access_token, refresh_token, client_id, scope, expires_at)
					VALUES (?, ?, ?, ?, ?, ?)
				`).bind(
					authCode.user_id,
					accessToken,
					refreshToken,
					client_id || authCode.client_id,
					authCode.scope,
					expiresAt
				).run();

				// Log token issuance
				await c.env.DB.prepare(`
					INSERT INTO admin_request_logs (request_type, message_details, status, source)
					VALUES (?, ?, ?, ?)
				`).bind(
					'OAuth Token Issued',
					`Access token issued for user ${authCode.user_id} with ${thermostats.results?.length || 0} thermostats`,
					'Active',
					'OAuth'
				).run();

				return c.json({
					token_type: 'Bearer',
					access_token: accessToken,
					refresh_token: refreshToken,
					expires_in: 3600,
					scope: authCode.scope
				});
			}

			// Handle refresh_token grant
			if (grant_type === 'refresh_token') {
				if (!refresh_token) {
					return c.json({ error: 'invalid_request', error_description: 'Missing refresh_token parameter' }, 400);
				}

				// Find valid refresh token
				const tokenRecord = await c.env.DB.prepare(`
					SELECT * FROM oauth_tokens WHERE refresh_token = ?
				`).bind(refresh_token).first();

				if (!tokenRecord) {
					return c.json({ error: 'invalid_grant', error_description: 'Invalid refresh token' }, 400);
				}

				// Get user info including role
				const user = await c.env.DB.prepare(`
					SELECT id, email, role FROM users WHERE id = ?
				`).bind(tokenRecord.user_id).first();

				if (!user) {
					return c.json({ error: 'invalid_grant', error_description: 'User not found' }, 400);
				}

				// Get thermostats: ALL for admin/sub-admin, assigned only for tenants
				let thermostats;
				if (user.role === 'admin' || user.role === 'sub_admin') {
					// Admins get ALL thermostats
					thermostats = await c.env.DB.prepare(`
						SELECT id, device_name, room_name, alexa_endpoint_id as alexa_device_id
						FROM thermostat_devices
					`).all();
				} else {
					// Tenants only get assigned thermostats
					thermostats = await c.env.DB.prepare(`
						SELECT td.id, td.device_name, td.room_name, td.alexa_endpoint_id as alexa_device_id
						FROM user_thermostat_permissions utp
						JOIN thermostat_devices td ON td.id = utp.thermostat_id
						WHERE utp.user_id = ?
					`).bind(tokenRecord.user_id).all();
				}

				// Create new access token payload
				const tokenPayload = {
					user_id: tokenRecord.user_id,
					role: user.role,
					scope: tokenRecord.scope,
					thermostats: (thermostats.results || []).map((t: any) => ({
						id: t.id,
						device_name: t.device_name,
						room_name: t.room_name,
						alexa_device_id: t.alexa_device_id
					})),
					exp: Math.floor(Date.now() / 1000) + 3600,
					iat: Math.floor(Date.now() / 1000)
				};

				// Generate new access token
				const jwtSecret = c.env.JWT_SECRET || 'change-this-secret-in-production';
				const newAccessToken = await createSignedToken(tokenPayload, jwtSecret);
				const expiresAt = new Date(Date.now() + 3600 * 1000).toISOString();

				// Update token record
				await c.env.DB.prepare(`
					UPDATE oauth_tokens
					SET access_token = ?, expires_at = ?
					WHERE refresh_token = ?
				`).bind(newAccessToken, expiresAt, refresh_token).run();

				return c.json({
					token_type: 'Bearer',
					access_token: newAccessToken,
					refresh_token: refresh_token, // Keep same refresh token
					expires_in: 3600,
					scope: tokenRecord.scope
				});
			}

			return c.json({
				error: 'unsupported_grant_type',
				error_description: 'Only authorization_code and refresh_token grants are supported'
			}, 400);

		} catch (error) {
			console.error('OAuth token error:', error);
			return c.json({ error: 'server_error', error_description: 'Token generation failed' }, 500);
		}
	}
}
