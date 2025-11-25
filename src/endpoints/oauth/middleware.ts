import { Context } from "hono";

// Utility: Verify signed token
async function verifySignedToken(token: string, secret: string): Promise<any | null> {
	try {
		const [base64Payload, base64Signature] = token.split('.');
		if (!base64Payload || !base64Signature) return null;

		const payload = JSON.parse(atob(base64Payload));

		// Verify expiration
		if (payload.exp && payload.exp < Math.floor(Date.now() / 1000)) {
			return null; // Token expired
		}

		// Verify signature
		const encoder = new TextEncoder();
		const data = encoder.encode(JSON.stringify(payload));
		const keyData = encoder.encode(secret);

		const key = await crypto.subtle.importKey(
			'raw',
			keyData,
			{ name: 'HMAC', hash: 'SHA-256' },
			false,
			['verify']
		);

		const signatureBytes = new Uint8Array(
			atob(base64Signature).split('').map(c => c.charCodeAt(0))
		);

		const isValid = await crypto.subtle.verify('HMAC', key, signatureBytes, data);

		return isValid ? payload : null;
	} catch (error) {
		console.error('Token verification error:', error);
		return null;
	}
}

/**
 * OAuth middleware - validates Bearer token from Authorization header
 * Extracts user_id and thermostats from token and sets them in context
 */
export async function validateOAuthToken(c: Context, next: () => Promise<void>) {
	const authHeader = c.req.header('Authorization');

	if (!authHeader || !authHeader.startsWith('Bearer ')) {
		return c.json({ error: 'unauthorized', message: 'Missing or invalid Authorization header' }, 401);
	}

	const token = authHeader.substring(7); // Remove 'Bearer ' prefix

	// Verify token signature and expiration
	const jwtSecret = c.env.JWT_SECRET || 'change-this-secret-in-production';
	const payload = await verifySignedToken(token, jwtSecret);

	if (!payload) {
		return c.json({ error: 'invalid_token', message: 'Token is invalid or expired' }, 401);
	}

	// Check if token exists in database (not revoked)
	const tokenRecord = await c.env.DB.prepare(`
		SELECT user_id FROM oauth_tokens WHERE access_token = ?
	`).bind(token).first();

	if (!tokenRecord) {
		return c.json({ error: 'invalid_token', message: 'Token not found or revoked' }, 401);
	}

	// Set user context for downstream handlers
	c.set('oauth_user_id', payload.user_id);
	c.set('oauth_thermostats', payload.thermostats || []);
	c.set('oauth_payload', payload);

	await next();
}

/**
 * Check if user has access to a specific thermostat
 */
export function hasThermostadAccess(c: Context, thermostatId: number): boolean {
	const thermostats = c.get('oauth_thermostats') || [];
	return thermostats.some((t: any) => t.id === thermostatId);
}

/**
 * Check if user has access to a thermostat by Alexa device ID
 */
export function hasAlexaDeviceAccess(c: Context, alexaDeviceId: string): any | null {
	const thermostats = c.get('oauth_thermostats') || [];
	return thermostats.find((t: any) => t.alexa_device_id === alexaDeviceId) || null;
}

/**
 * Get all thermostats accessible to the authenticated user
 */
export function getAuthorizedThermostats(c: Context): any[] {
	return c.get('oauth_thermostats') || [];
}

/**
 * Get authenticated user ID
 */
export function getOAuthUserId(c: Context): number | null {
	return c.get('oauth_user_id') || null;
}
