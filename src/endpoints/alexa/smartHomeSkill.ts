import { Context } from "hono";

/**
 * Alexa Smart Home Skill Handler
 * This endpoint receives directives from Alexa and controls thermostats
 */

export class AlexaSmartHomeSkillHandler {
	async handle(c: Context) {
		const request = await c.req.json();

		console.log("Alexa Smart Home Request:", JSON.stringify(request, null, 2));

		const directive = request.directive;
		const namespace = directive?.header?.namespace;
		const name = directive?.header?.name;

		// Handle different directive types
		switch (namespace) {
			case "Alexa.Discovery":
				return this.handleDiscovery(c, directive);

			case "Alexa.ThermostatController":
				return this.handleThermostatControl(c, directive);

			case "Alexa.PowerController":
				return this.handlePowerControl(c, directive);

			case "Alexa":
				if (name === "ReportState") {
					return this.handleStateReport(c, directive);
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
	 * Handle device discovery
	 */
	private async handleDiscovery(c: Context, directive: any) {
		// Get all thermostats from database
		const thermostats = await c.env.DB.prepare(
			"SELECT * FROM thermostat_devices WHERE unit_number IS NOT NULL"
		).all();

		const endpoints = thermostats.results.map((device: any) => ({
			endpointId: device.device_id,
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
	 * Handle thermostat control (set temperature, mode)
	 */
	private async handleThermostatControl(c: Context, directive: any) {
		const endpointId = directive.endpoint.endpointId;
		const name = directive.header.name;
		const payload = directive.payload;

		// Get device from database
		const device = await c.env.DB.prepare(
			"SELECT * FROM thermostat_devices WHERE device_id = ?"
		).bind(endpointId).first();

		if (!device) {
			return this.errorResponse("NO_SUCH_ENDPOINT", "Device not found");
		}

		let targetTemp = device.target_temperature;
		let mode = device.mode || "AUTO";

		// Handle different control types
		if (name === "SetTargetTemperature") {
			targetTemp = payload.targetSetpoint.value;

			// Update database
			await c.env.DB.prepare(
				"UPDATE thermostat_devices SET target_temperature = ?, updated_at = CURRENT_TIMESTAMP WHERE device_id = ?"
			).bind(targetTemp, endpointId).run();

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
				"UPDATE thermostat_devices SET target_temperature = ?, updated_at = CURRENT_TIMESTAMP WHERE device_id = ?"
			).bind(targetTemp, endpointId).run();

		} else if (name === "SetThermostatMode") {
			mode = payload.thermostatMode.value;

			await c.env.DB.prepare(
				"UPDATE thermostat_devices SET mode = ?, updated_at = CURRENT_TIMESTAMP WHERE device_id = ?"
			).bind(mode, endpointId).run();
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
	private async handlePowerControl(c: Context, directive: any) {
		const endpointId = directive.endpoint.endpointId;
		const name = directive.header.name;

		const mode = name === "TurnOn" ? "AUTO" : "OFF";

		await c.env.DB.prepare(
			"UPDATE thermostat_devices SET mode = ?, updated_at = CURRENT_TIMESTAMP WHERE device_id = ?"
		).bind(mode, endpointId).run();

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
	private async handleStateReport(c: Context, directive: any) {
		const endpointId = directive.endpoint.endpointId;

		const device = await c.env.DB.prepare(
			"SELECT * FROM thermostat_devices WHERE device_id = ?"
		).bind(endpointId).first();

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
