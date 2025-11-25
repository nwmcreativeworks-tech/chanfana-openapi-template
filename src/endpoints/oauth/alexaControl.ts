import { OpenAPIRoute, OpenAPIRouteSchema } from "chanfana";
import { Context } from "hono";
import { z } from "zod";
import { validateOAuthToken, getAuthorizedThermostats, hasAlexaDeviceAccess, getOAuthUserId } from "./middleware";

/**
 * GET /alexa/discover-devices
 * Returns list of thermostats the authenticated user can control
 * Used by Alexa during device discovery
 */
export class AlexaDiscoverDevices extends OpenAPIRoute {
	schema: OpenAPIRouteSchema = {
		tags: ["Alexa OAuth"],
		summary: "Discover authorized thermostat devices",
		security: [{ BearerAuth: [] }],
		responses: {
			"200": {
				description: "Returns list of authorized thermostats",
			},
		},
	};

	async handle(c: Context) {
		// Middleware already validated token and set context
		const thermostats = getAuthorizedThermostats(c);
		const userId = getOAuthUserId(c);

		// Get user info
		const user = await c.env.DB.prepare(
			`SELECT full_name, email, unit_number FROM users WHERE id = ?`
		).bind(userId).first();

		// Format devices for Alexa Smart Home API
		const devices = thermostats.map((thermo: any) => ({
			endpointId: thermo.alexa_device_id || `thermostat-${thermo.id}`,
			manufacturerName: "Hospital Church",
			friendlyName: thermo.device_name || `${thermo.room_name} Thermostat`,
			description: `Thermostat in ${thermo.room_name}`,
			displayCategories: ["THERMOSTAT"],
			capabilities: [
				{
					type: "AlexaInterface",
					interface: "Alexa.ThermostatController",
					version: "3",
					properties: {
						supported: [
							{ name: "targetSetpoint" },
							{ name: "thermostatMode" }
						],
						proactivelyReported: false,
						retrievable: true
					}
				},
				{
					type: "AlexaInterface",
					interface: "Alexa.TemperatureSensor",
					version: "3",
					properties: {
						supported: [{ name: "temperature" }],
						proactivelyReported: false,
						retrievable: true
					}
				},
				{
					type: "AlexaInterface",
					interface: "Alexa.EndpointHealth",
					version: "3",
					properties: {
						supported: [{ name: "connectivity" }],
						proactivelyReported: false,
						retrievable: true
					}
				}
			],
			cookie: {
				thermostat_id: thermo.id,
				room_name: thermo.room_name
			}
		}));

		return c.json({
			event: {
				header: {
					namespace: "Alexa.Discovery",
					name: "Discover.Response",
					payloadVersion: "3",
					messageId: crypto.randomUUID()
				},
				payload: {
					endpoints: devices
				}
			},
			user: {
				name: user?.full_name,
				email: user?.email,
				unit: user?.unit_number
			},
			discovered_count: devices.length
		});
	}
}

/**
 * POST /alexa/control-thermostat
 * Control a thermostat via Alexa
 * Validates user has permission before executing command
 */
export class AlexaControlThermostat extends OpenAPIRoute {
	schema: OpenAPIRouteSchema = {
		tags: ["Alexa OAuth"],
		summary: "Control thermostat via Alexa",
		security: [{ BearerAuth: [] }],
		request: {
			body: {
				content: {
					"application/json": {
						schema: z.object({
							alexa_device_id: z.string().optional(),
							thermostat_id: z.number().optional(),
							mode: z.enum(['heat', 'cool', 'auto', 'off']).optional(),
							target_temperature_f: z.number().min(60).max(85).optional(),
						}),
					},
				},
			},
		},
		responses: {
			"200": {
				description: "Command executed successfully",
			},
		},
	};

	async handle(c: Context) {
		try {
			const body = await c.req.json();
			const { alexa_device_id, thermostat_id, mode, target_temperature_f } = body;

			let thermostat: any = null;

			// Find thermostat by Alexa device ID or thermostat ID
			if (alexa_device_id) {
				thermostat = hasAlexaDeviceAccess(c, alexa_device_id);
			} else if (thermostat_id) {
				const thermostats = getAuthorizedThermostats(c);
				thermostat = thermostats.find((t: any) => t.id === thermostat_id);
			}

			if (!thermostat) {
				return c.json({
					error: 'forbidden',
					message: 'You do not have permission to control this thermostat'
				}, 403);
			}

			const userId = getOAuthUserId(c);

			// Log the control command
			await c.env.DB.prepare(`
				INSERT INTO admin_request_logs
				(request_type, message_details, status, source, user_name)
				VALUES (?, ?, ?, ?, ?)
			`).bind(
				'Alexa Thermostat Control',
				`User ${userId} controlled ${thermostat.device_name}: mode=${mode || 'N/A'}, temp=${target_temperature_f || 'N/A'}°F`,
				'Executed',
				'Alexa OAuth',
				`User ${userId}`
			).run();

			// TODO: Replace with actual Alexa Smart Home API call
			// This is where you would send the command to the physical device via Alexa API
			// For now, we just log and return success

			return c.json({
				success: true,
				thermostat_id: thermostat.id,
				device_name: thermostat.device_name,
				room_name: thermostat.room_name,
				command: {
					mode: mode,
					target_temperature_f: target_temperature_f
				},
				message: `Command sent to ${thermostat.device_name}`,
				note: 'This is a stub. Integrate with Alexa Smart Home API for actual device control.'
			});

		} catch (error) {
			console.error('Alexa control error:', error);
			return c.json({ error: 'server_error', message: 'Command execution failed' }, 500);
		}
	}
}

/**
 * GET /alexa/thermostat-status
 * Get current status of a thermostat
 */
export class AlexaThermostatStatus extends OpenAPIRoute {
	schema: OpenAPIRouteSchema = {
		tags: ["Alexa OAuth"],
		summary: "Get thermostat status",
		security: [{ BearerAuth: [] }],
		request: {
			query: z.object({
				alexa_device_id: z.string().optional(),
				thermostat_id: z.string().optional(),
			}),
		},
		responses: {
			"200": {
				description: "Returns thermostat status",
			},
		},
	};

	async handle(c: Context) {
		const { alexa_device_id, thermostat_id } = c.req.query();

		let thermostat: any = null;

		// Find thermostat by Alexa device ID or thermostat ID
		if (alexa_device_id) {
			thermostat = hasAlexaDeviceAccess(c, alexa_device_id);
		} else if (thermostat_id) {
			const thermostats = getAuthorizedThermostats(c);
			thermostat = thermostats.find((t: any) => t.id === parseInt(thermostat_id));
		}

		if (!thermostat) {
			return c.json({
				error: 'forbidden',
				message: 'You do not have permission to view this thermostat'
			}, 403);
		}

		// TODO: Replace with actual Alexa Smart Home API call to get current status
		// For now, return mock data
		return c.json({
			success: true,
			thermostat_id: thermostat.id,
			device_name: thermostat.device_name,
			room_name: thermostat.room_name,
			status: {
				current_temperature_f: 72,
				target_temperature_f: 70,
				mode: 'auto',
				is_online: true
			},
			note: 'This is mock data. Integrate with Alexa Smart Home API for real-time status.'
		});
	}
}
