import { Context } from "hono";

/**
 * Alexa Smart Home Skill Handler with OAuth Permission Enforcement
 * This endpoint receives directives from Alexa and controls thermostats
 * Only devices the user has permission to access will be discovered and controlled
 */

export class AlexaSmartHomeSkillHandler {
	async handle(c: Context) {
		const request = await c.req.json();

		console.log("Alexa Smart Home Request:", JSON.stringify(request, null, 2));

		const directive = request.directive;
		const namespace = directive?.header?.namespace;
		const name = directive?.header?.name;

		// Extract OAuth token from directive (Alexa includes it in scope)
		const token = directive?.endpoint?.scope?.token || directive?.payload?.scope?.token;

		// Verify token and get user permissions (except for Discovery which has token in payload.scope)
		let userId: number | null = null;
		let authorizedThermostats: any[] = [];

		if (token) {
			const tokenData = await this.verifyToken(c, token);
			if (!tokenData) {
				return c.json(this.errorResponse("INVALID_AUTHORIZATION_CREDENTIAL", "Invalid or expired token"));
			}
			userId = tokenData.user_id;
			authorizedThermostats = tokenData.thermostats || [];
		} else if (namespace !== "Alexa.Discovery") {
			// Token required for all directives except Discovery (which has it in payload.scope)
			return c.json(this.errorResponse("INVALID_AUTHORIZATION_CREDENTIAL", "Missing access token"));
		}

		// Handle different directive types
		switch (namespace) {
			case "Alexa.Discovery":
				return this.handleDiscovery(c, directive);

			case "Alexa.ThermostatController":
				return this.handleThermostatControl(c, directive, userId, authorizedThermostats);

			case "Alexa.PowerController":
				return this.handlePowerControl(c, directive, userId, authorizedThermostats);

			case "Alexa":
				if (name === "ReportState") {
					return this.handleStateReport(c, directive, userId, authorizedThermostats);
				}
				break;
		}

		// Default error response
		return c.json({
			event: {
				header: {
					namespace: "Alexa",
					name: "ErrorResponse",
					messageId: crypto.randomUUID(),
					payloadVersion: "3",
				},
				payload: {
					type: "INTERNAL_ERROR",
					message: "Unsupported directive",
				},
			},
		});
	}

	/**
	 * Verify OAuth token and extract user permissions
	 */
	private async verifyToken(c: Context, token: string): Promise<any | null> {
		try {
			const jwtSecret = c.env.JWT_SECRET || 'change-this-secret-in-production';

			// Decode base64 payload
			const parts = token.split('.');
			if (parts.length !== 2) return null;

			const payloadBase64 = parts[0];
			const signatureBase64 = parts[1];

			// Decode payload
			const payloadJson = atob(payloadBase64);
			const payload = JSON.parse(payloadJson);

			// Check expiration
			if (payload.exp && payload.exp < Math.floor(Date.now() / 1000)) {
				console.log("Token expired");
				return null;
			}

			// Verify signature
			const encoder = new TextEncoder();
			const data = encoder.encode(payloadJson);
			const keyData = encoder.encode(jwtSecret);

			const key = await crypto.subtle.importKey(
				'raw',
				keyData,
				{ name: 'HMAC', hash: 'SHA-256' },
				false,
				['verify']
			);

			const signatureBytes = Uint8Array.from(atob(signatureBase64), c => c.charCodeAt(0));
			const valid = await crypto.subtle.verify('HMAC', key, signatureBytes, data);

			if (!valid) {
				console.log("Invalid token signature");
				return null;
			}

			return payload;
		} catch (error) {
			console.error("Token verification error:", error);
			return null;
		}
	}

	/**
	 * Handle device discovery - only show user's authorized thermostats
	 */
	private async handleDiscovery(c: Context, directive: any) {
		// Extract token from Discovery payload
		const token = directive?.payload?.scope?.token;

		if (!token) {
			return c.json(this.errorResponse("INVALID_AUTHORIZATION_CREDENTIAL", "Missing access token in discovery"));
		}

		const tokenData = await this.verifyToken(c, token);
		if (!tokenData) {
			return c.json(this.errorResponse("INVALID_AUTHORIZATION_CREDENTIAL", "Invalid or expired token"));
		}

		const userId = tokenData.user_id;
		const authorizedThermostats = tokenData.thermostats || [];

		console.log(`Discovery request for user ${userId} with ${authorizedThermostats.length} authorized thermostats`);

		// Get only the thermostats this user has permission to access
		const thermostatIds = authorizedThermostats.map((t: any) => t.id).join(',');

		if (!thermostatIds) {
			// No thermostats assigned to this user
			return c.json({
				event: {
					header: {
						namespace: "Alexa.Discovery",
						name: "Discover.Response",
						messageId: crypto.randomUUID(),
						payloadVersion: "3",
					},
					payload: {
						endpoints: [],
					},
				},
			});
		}

		// Fetch full thermostat details from database
		const thermostats = await c.env.DB.prepare(
			`SELECT * FROM thermostat_devices WHERE id IN (${thermostatIds})`
		).all();

		const endpoints = thermostats.results.map((device: any) => ({
			endpointId: device.alexa_endpoint_id || device.device_id,
			manufacturerName: device.manufacturer || "Amazon",
			friendlyName: device.friendly_name,
			description: `Thermostat for ${device.friendly_name}`,
			displayCategories: ["THERMOSTAT"],
			capabilities: [
				{
					type: "AlexaInterface",
					interface: "Alexa.ThermostatController",
					version: "3",
					properties: {
						supported: [
							{ name: "targetSetpoint" },
							{ name: "thermostatMode" },
						],
						proactivelyReported: false,
						retrievable: true,
					},
					configuration: {
						supportedModes: ["HEAT", "COOL", "AUTO", "OFF"],
						supportsScheduling: false,
					},
				},
				{
					type: "AlexaInterface",
					interface: "Alexa.TemperatureSensor",
					version: "3",
					properties: {
						supported: [{ name: "temperature" }],
						proactivelyReported: false,
						retrievable: true,
					},
				},
				{
					type: "AlexaInterface",
					interface: "Alexa.EndpointHealth",
					version: "3",
					properties: {
						supported: [{ name: "connectivity" }],
						proactivelyReported: false,
						retrievable: true,
					},
				},
				{
					type: "AlexaInterface",
					interface: "Alexa",
					version: "3",
				},
			],
		}));

		return c.json({
			event: {
				header: {
					namespace: "Alexa.Discovery",
					name: "Discover.Response",
					messageId: crypto.randomUUID(),
					payloadVersion: "3",
				},
				payload: {
					endpoints,
				},
			},
		});
	}

	/**
	 * Handle thermostat control (set temperature, mode) - with permission check
	 */
	private async handleThermostatControl(c: Context, directive: any, userId: number | null, authorizedThermostats: any[]) {
		const endpointId = directive.endpoint.endpointId;
		const name = directive.header.name;
		const payload = directive.payload;

		// Get device from database
		const device = await c.env.DB.prepare(
			"SELECT * FROM thermostat_devices WHERE alexa_endpoint_id = ? OR device_id = ?"
		).bind(endpointId, endpointId).first();

		if (!device) {
			return c.json(this.errorResponse("NO_SUCH_ENDPOINT", "Device not found"));
		}

		// Check if user has permission to control this device
		const hasPermission = authorizedThermostats.some((t: any) => t.id === device.id);
		if (!hasPermission) {
			console.log(`User ${userId} attempted to control unauthorized device ${endpointId}`);
			return c.json(this.errorResponse("NOT_SUPPORTED_IN_CURRENT_MODE", "You don't have permission to control this thermostat"));
		}

		let targetTemp = device.target_temperature;
		let mode = device.mode || "AUTO";

		// Handle different control types
		if (name === "SetTargetTemperature") {
			targetTemp = payload.targetSetpoint.value;

			// Update database
			await c.env.DB.prepare(
				"UPDATE thermostat_devices SET target_temperature = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?"
			).bind(targetTemp, device.id).run();

			// Log activity
			await c.env.DB.prepare(
				"INSERT INTO activity_log (action_type, action_description, unit_number, metadata) VALUES (?, ?, ?, ?)"
			).bind(
				"thermostat_change",
				`Alexa set temperature to ${targetTemp}°F`,
				device.unit_number,
				JSON.stringify({ device_id: endpointId, temperature: targetTemp })
			).run();

		} else if (name === "AdjustTargetTemperature") {
			const delta = payload.targetSetpointDelta.value;
			targetTemp = (device.target_temperature || 72) + delta;

			await c.env.DB.prepare(
				"UPDATE thermostat_devices SET target_temperature = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?"
			).bind(targetTemp, device.id).run();

		} else if (name === "SetThermostatMode") {
			mode = payload.thermostatMode.value;

			await c.env.DB.prepare(
				"UPDATE thermostat_devices SET mode = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?"
			).bind(mode, device.id).run();
		}

		// Return success response
		return c.json({
			context: {
				properties: [
					{
						namespace: "Alexa.ThermostatController",
						name: "targetSetpoint",
						value: {
							value: targetTemp,
							scale: "FAHRENHEIT",
						},
						timeOfSample: new Date().toISOString(),
						uncertaintyInMilliseconds: 0,
					},
					{
						namespace: "Alexa.ThermostatController",
						name: "thermostatMode",
						value: mode,
						timeOfSample: new Date().toISOString(),
						uncertaintyInMilliseconds: 0,
					},
				],
			},
			event: {
				header: {
					namespace: "Alexa",
					name: "Response",
					messageId: crypto.randomUUID(),
					correlationToken: directive.header.correlationToken,
					payloadVersion: "3",
				},
				endpoint: {
					endpointId: endpointId,
				},
				payload: {},
			},
		});
	}

	/**
	 * Handle power control (turn on/off)
	 */
	private async handlePowerControl(c: Context, directive: any, userId: number | null, authorizedThermostats: any[]) {
		const endpointId = directive.endpoint.endpointId;
		const name = directive.header.name;

		// Get device from database
		const device = await c.env.DB.prepare(
			"SELECT * FROM thermostat_devices WHERE alexa_endpoint_id = ? OR device_id = ?"
		).bind(endpointId, endpointId).first();

		if (!device) {
			return c.json(this.errorResponse("NO_SUCH_ENDPOINT", "Device not found"));
		}

		// Check permission
		const hasPermission = authorizedThermostats.some((t: any) => t.id === device.id);
		if (!hasPermission) {
			return c.json(this.errorResponse("NOT_SUPPORTED_IN_CURRENT_MODE", "You don't have permission to control this thermostat"));
		}

		const mode = name === "TurnOn" ? "AUTO" : "OFF";

		await c.env.DB.prepare(
			"UPDATE thermostat_devices SET mode = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?"
		).bind(mode, device.id).run();

		return c.json({
			event: {
				header: {
					namespace: "Alexa",
					name: "Response",
					messageId: crypto.randomUUID(),
					correlationToken: directive.header.correlationToken,
					payloadVersion: "3",
				},
				endpoint: {
					endpointId: endpointId,
				},
				payload: {},
			},
		});
	}

	/**
	 * Handle state report request
	 */
	private async handleStateReport(c: Context, directive: any, userId: number | null, authorizedThermostats: any[]) {
		const endpointId = directive.endpoint.endpointId;

		const device = await c.env.DB.prepare(
			"SELECT * FROM thermostat_devices WHERE alexa_endpoint_id = ? OR device_id = ?"
		).bind(endpointId, endpointId).first();

		if (!device) {
			return this.errorResponse("NO_SUCH_ENDPOINT", "Device not found");
		}

		return c.json({
			context: {
				properties: [
					{
						namespace: "Alexa.ThermostatController",
						name: "targetSetpoint",
						value: {
							value: device.target_temperature || 72,
							scale: "FAHRENHEIT",
						},
						timeOfSample: new Date().toISOString(),
						uncertaintyInMilliseconds: 0,
					},
					{
						namespace: "Alexa.ThermostatController",
						name: "thermostatMode",
						value: device.mode || "AUTO",
						timeOfSample: new Date().toISOString(),
						uncertaintyInMilliseconds: 0,
					},
					{
						namespace: "Alexa.TemperatureSensor",
						name: "temperature",
						value: {
							value: device.current_temperature || 72,
							scale: "FAHRENHEIT",
						},
						timeOfSample: new Date().toISOString(),
						uncertaintyInMilliseconds: 0,
					},
					{
						namespace: "Alexa.EndpointHealth",
						name: "connectivity",
						value: {
							value: device.is_online ? "OK" : "UNREACHABLE",
						},
						timeOfSample: new Date().toISOString(),
						uncertaintyInMilliseconds: 0,
					},
				],
			},
			event: {
				header: {
					namespace: "Alexa",
					name: "StateReport",
					messageId: crypto.randomUUID(),
					correlationToken: directive.header.correlationToken,
					payloadVersion: "3",
				},
				endpoint: {
					endpointId: endpointId,
				},
				payload: {},
			},
		});
	}

	/**
	 * Helper to create error responses
	 */
	private errorResponse(type: string, message: string) {
		return {
			event: {
				header: {
					namespace: "Alexa",
					name: "ErrorResponse",
					messageId: crypto.randomUUID(),
					payloadVersion: "3",
				},
				payload: {
					type,
					message,
				},
			},
		};
	}
}
