import { Context } from "hono";

export class AlexaSkillHandler {
	async handle(c: Context) {
		const request = await c.req.json();

		// Verify it's an Alexa request
		if (!request.version || !request.request) {
			return c.json({ error: "Invalid Alexa request" }, 400);
		}

		const requestType = request.request.type;
		const intent = request.request.intent;

		// Check for account linking
		const accessToken = request.context?.System?.user?.accessToken;
		if (!accessToken && requestType !== "LaunchRequest") {
			return this.buildAccountLinkingResponse();
		}

		// Get unit number from token
		let unitNumber = null;
		let tenantName = null;

		if (accessToken) {
			const tokenData = await c.env.DB.prepare(
				"SELECT unit_number, tenant_name FROM alexa_tokens WHERE access_token = ?"
			)
				.bind(accessToken)
				.first();

			if (tokenData) {
				unitNumber = tokenData.unit_number as string;
				tenantName = tokenData.tenant_name as string;
			}
		}

		// Handle different request types
		switch (requestType) {
			case "LaunchRequest":
				return this.handleLaunch(unitNumber);

			case "IntentRequest":
				return this.handleIntent(c, intent, unitNumber, tenantName);

			case "SessionEndedRequest":
				return this.buildResponse("Goodbye!");

			default:
				return this.buildResponse("I didn't understand that.");
		}
	}

	private handleLaunch(unitNumber: string | null) {
		if (!unitNumber) {
			return this.buildAccountLinkingResponse();
		}

		return this.buildResponse(
			`Welcome to your apartment control system! You can say things like: set temperature to 72, make it warmer, or submit a maintenance request.`
		);
	}

	private async handleIntent(
		c: Context,
		intent: any,
		unitNumber: string | null,
		tenantName: string | null
	) {
		if (!unitNumber) {
			return this.buildAccountLinkingResponse();
		}

		const intentName = intent.name;

		switch (intentName) {
			case "SetTemperatureIntent":
				return this.handleSetTemperature(c, intent, unitNumber);

			case "IncreaseTemperatureIntent":
				return this.handleIncreaseTemperature(c, unitNumber);

			case "DecreaseTemperatureIntent":
				return this.handleDecreaseTemperature(c, unitNumber);

			case "GetTemperatureIntent":
				return this.handleGetTemperature(c, unitNumber);

			case "MaintenanceRequestIntent":
				return this.handleMaintenanceRequest(c, intent, unitNumber, tenantName);

			case "AMAZON.HelpIntent":
				return this.buildResponse(
					"You can control your thermostat by saying: set temperature to 72, make it warmer, or make it cooler. You can also submit maintenance requests by saying: report a leaking sink."
				);

			case "AMAZON.CancelIntent":
			case "AMAZON.StopIntent":
				return this.buildResponse("Goodbye!");

			default:
				return this.buildResponse(
					"I didn't understand that. Try saying: set temperature to 72."
				);
		}
	}

	private async handleSetTemperature(c: Context, intent: any, unitNumber: string) {
		const temperature = intent.slots?.temperature?.value;

		if (!temperature) {
			return this.buildResponse("What temperature would you like?");
		}

		const temp = parseInt(temperature);

		// Validate range
		if (temp < 65 || temp > 78) {
			return this.buildResponse(
				`I can only set the temperature between 65 and 78 degrees for energy efficiency. ${temp} degrees is outside that range.`
			);
		}

		// Get or create thermostat settings
		const existing = await c.env.DB.prepare(
			"SELECT * FROM thermostat_settings WHERE unit_number = ?"
		)
			.bind(unitNumber)
			.first();

		if (!existing) {
			// Create default settings
			await c.env.DB.prepare(
				"INSERT INTO thermostat_settings (unit_number, target_temp, mode) VALUES (?, ?, 'auto')"
			)
				.bind(unitNumber, temp)
				.run();
		} else {
			// Update existing
			await c.env.DB.prepare(
				"UPDATE thermostat_settings SET target_temp = ?, updated_at = CURRENT_TIMESTAMP, updated_by = ? WHERE unit_number = ?"
			)
				.bind(temp, "alexa", unitNumber)
				.run();
		}

		return this.buildResponse(
			`I've set your thermostat to ${temp} degrees. It should reach the target temperature in about 10 to 15 minutes.`
		);
	}

	private async handleIncreaseTemperature(c: Context, unitNumber: string) {
		const current = await c.env.DB.prepare(
			"SELECT * FROM thermostat_settings WHERE unit_number = ?"
		)
			.bind(unitNumber)
			.first();

		const currentTemp = current ? (current.target_temp as number) : 72;
		const newTemp = Math.min(currentTemp + 2, 78);

		if (newTemp === 78 && currentTemp === 78) {
			return this.buildResponse(
				"Your thermostat is already at the maximum temperature of 78 degrees."
			);
		}

		await c.env.DB.prepare(
			"UPDATE thermostat_settings SET target_temp = ?, updated_at = CURRENT_TIMESTAMP, updated_by = ? WHERE unit_number = ?"
		)
			.bind(newTemp, "alexa", unitNumber)
			.run();

		return this.buildResponse(`I've increased the temperature to ${newTemp} degrees.`);
	}

	private async handleDecreaseTemperature(c: Context, unitNumber: string) {
		const current = await c.env.DB.prepare(
			"SELECT * FROM thermostat_settings WHERE unit_number = ?"
		)
			.bind(unitNumber)
			.first();

		const currentTemp = current ? (current.target_temp as number) : 72;
		const newTemp = Math.max(currentTemp - 2, 65);

		if (newTemp === 65 && currentTemp === 65) {
			return this.buildResponse(
				"Your thermostat is already at the minimum temperature of 65 degrees."
			);
		}

		await c.env.DB.prepare(
			"UPDATE thermostat_settings SET target_temp = ?, updated_at = CURRENT_TIMESTAMP, updated_by = ? WHERE unit_number = ?"
		)
			.bind(newTemp, "alexa", unitNumber)
			.run();

		return this.buildResponse(`I've decreased the temperature to ${newTemp} degrees.`);
	}

	private async handleGetTemperature(c: Context, unitNumber: string) {
		const settings = await c.env.DB.prepare(
			"SELECT * FROM thermostat_settings WHERE unit_number = ?"
		)
			.bind(unitNumber)
			.first();

		if (!settings) {
			return this.buildResponse(
				"I don't have any thermostat settings for your unit yet. Try setting a temperature first."
			);
		}

		return this.buildResponse(
			`Your thermostat is currently set to ${settings.target_temp} degrees in ${settings.mode} mode.`
		);
	}

	private async handleMaintenanceRequest(
		c: Context,
		intent: any,
		unitNumber: string,
		tenantName: string | null
	) {
		const issue = intent.slots?.issue?.value;

		if (!issue) {
			return this.buildResponse("What would you like to report?");
		}

		// Create a dummy conversation for tracking
		const conversation = await c.env.DB.prepare(
			"INSERT INTO conversations (session_id, tenant_name, unit_number) VALUES (?, ?, ?) RETURNING *"
		)
			.bind(crypto.randomUUID(), tenantName || "Alexa User", unitNumber)
			.first();

		// Auto-detect category
		const lowerIssue = issue.toLowerCase();
		let category = "other";

		if (lowerIssue.match(/\b(hvac|heat|ac|air|thermostat|temperature)\b/)) {
			category = "hvac";
		} else if (lowerIssue.match(/\b(plumb|leak|water|sink|toilet|drain)\b/)) {
			category = "plumbing";
		} else if (lowerIssue.match(/\b(electric|light|outlet|power|breaker)\b/)) {
			category = "electrical";
		} else if (lowerIssue.match(/\b(appliance|fridge|stove|dishwasher|washer|dryer)\b/)) {
			category = "appliance";
		}

		// Create maintenance request
		const result = await c.env.DB.prepare(
			`INSERT INTO maintenance_requests
			(conversation_id, tenant_name, unit_number, category, priority, description, status)
			VALUES (?, ?, ?, ?, 'medium', ?, 'open') RETURNING *`
		)
			.bind(
				conversation.id,
				tenantName || "Alexa User",
				unitNumber,
				category,
				issue
			)
			.first();

		return this.buildResponse(
			`I've created maintenance request number ${result.id} for ${issue}. Our team will address this within 2 to 3 business days.`
		);
	}

	private buildResponse(speechText: string, shouldEndSession = true) {
		return {
			version: "1.0",
			response: {
				outputSpeech: {
					type: "PlainText",
					text: speechText,
				},
				shouldEndSession,
			},
		};
	}

	private buildAccountLinkingResponse() {
		return {
			version: "1.0",
			response: {
				outputSpeech: {
					type: "PlainText",
					text: "Please link your apartment unit in the Alexa app to use this skill.",
				},
				card: {
					type: "LinkAccount",
				},
				shouldEndSession: true,
			},
		};
	}
}
