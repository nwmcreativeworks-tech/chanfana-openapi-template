import { Context } from "hono";

/**
 * Alexa Smart Home API integration
 * Controls physical thermostats connected to your Alexa account
 */

export class AlexaSmartHomeAPI {
	private apiEndpoint = "https://api.amazonalexa.com";

	/**
	 * Get access token from database
	 */
	private async getAccessToken(c: Context): Promise<string | null> {
		const creds = await c.env.DB.prepare(
			"SELECT access_token, expires_at, refresh_token FROM alexa_credentials ORDER BY created_at DESC LIMIT 1"
		).first();

		if (!creds) {
			return null;
		}

		// Check if token is expired
		const expiresAt = new Date(creds.expires_at as string);
		if (expiresAt < new Date()) {
			// Token expired, need to refresh
			return await this.refreshAccessToken(c, creds.refresh_token as string);
		}

		return creds.access_token as string;
	}

	/**
	 * Refresh expired access token
	 */
	private async refreshAccessToken(c: Context, refreshToken: string): Promise<string | null> {
		// This would need your Alexa app credentials
		// For now, return null and admin will need to re-authenticate
		console.error("Access token expired. Admin needs to re-authenticate with Alexa.");
		return null;
	}

	/**
	 * Discover all thermostats on the Alexa account
	 */
	async discoverThermostats(c: Context) {
		const accessToken = await this.getAccessToken(c);
		if (!accessToken) {
			return { error: "No Alexa credentials found. Please authenticate first." };
		}

		try {
			// Use Alexa Smart Home API to discover devices
			const response = await fetch(`${this.apiEndpoint}/v1/devices`, {
				headers: {
					Authorization: `Bearer ${accessToken}`,
					"Content-Type": "application/json",
				},
			});

			if (!response.ok) {
				throw new Error(`Alexa API error: ${response.status}`);
			}

			const data = await response.json();

			// Filter for thermostats only
			const thermostats = data.endpoints?.filter((device: any) => {
				return device.capabilities?.some(
					(cap: any) =>
						cap.interface === "Alexa.ThermostatController" ||
						cap.interface === "Alexa.TemperatureSensor"
				);
			}) || [];

			return {
				success: true,
				thermostats: thermostats.map((device: any) => ({
					device_id: device.endpointId,
					friendly_name: device.friendlyName,
					manufacturer: device.manufacturerName,
					model: device.modelName,
					capabilities: JSON.stringify(device.capabilities),
				})),
			};
		} catch (error) {
			console.error("Error discovering thermostats:", error);
			return { error: "Failed to discover thermostats" };
		}
	}

	/**
	 * Get current temperature and status of a thermostat
	 */
	async getThermostatStatus(c: Context, deviceId: string) {
		const accessToken = await this.getAccessToken(c);
		if (!accessToken) {
			return { error: "No Alexa credentials found" };
		}

		try {
			const response = await fetch(
				`${this.apiEndpoint}/v1/devices/${deviceId}/states`,
				{
					headers: {
						Authorization: `Bearer ${accessToken}`,
					},
				}
			);

			if (!response.ok) {
				throw new Error(`Alexa API error: ${response.status}`);
			}

			const state = await response.json();

			// Extract temperature info
			const tempSensor = state.properties?.find(
				(p: any) => p.namespace === "Alexa.TemperatureSensor"
			);
			const thermostatMode = state.properties?.find(
				(p: any) => p.namespace === "Alexa.ThermostatController"
			);

			return {
				success: true,
				current_temperature: tempSensor?.value?.value,
				target_temperature: thermostatMode?.targetSetpoint?.value?.value,
				mode: thermostatMode?.thermostatMode?.value,
			};
		} catch (error) {
			console.error("Error getting thermostat status:", error);
			return { error: "Failed to get thermostat status" };
		}
	}

	/**
	 * Set thermostat temperature
	 */
	async setTemperature(c: Context, deviceId: string, temperature: number) {
		const accessToken = await this.getAccessToken(c);
		if (!accessToken) {
			return { error: "No Alexa credentials found" };
		}

		try {
			// Use Alexa Smart Home Skill API to send directive
			const directive = {
				directive: {
					header: {
						namespace: "Alexa.ThermostatController",
						name: "SetTargetTemperature",
						payloadVersion: "3",
						messageId: crypto.randomUUID(),
					},
					endpoint: {
						endpointId: deviceId,
						scope: {
							type: "BearerToken",
							token: accessToken,
						},
					},
					payload: {
						targetSetpoint: {
							value: temperature,
							scale: "FAHRENHEIT",
						},
					},
				},
			};

			const response = await fetch(`${this.apiEndpoint}/v3/events`, {
				method: "POST",
				headers: {
					Authorization: `Bearer ${accessToken}`,
					"Content-Type": "application/json",
				},
				body: JSON.stringify(directive),
			});

			if (!response.ok) {
				throw new Error(`Alexa API error: ${response.status}`);
			}

			const result = await response.json();

			return {
				success: true,
				message: `Temperature set to ${temperature}°F`,
				result,
			};
		} catch (error) {
			console.error("Error setting temperature:", error);
			return { error: "Failed to set temperature" };
		}
	}

	/**
	 * Adjust temperature (increase/decrease)
	 */
	async adjustTemperature(c: Context, deviceId: string, delta: number) {
		const accessToken = await this.getAccessToken(c);
		if (!accessToken) {
			return { error: "No Alexa credentials found" };
		}

		try {
			const directive = {
				directive: {
					header: {
						namespace: "Alexa.ThermostatController",
						name: "AdjustTargetTemperature",
						payloadVersion: "3",
						messageId: crypto.randomUUID(),
					},
					endpoint: {
						endpointId: deviceId,
						scope: {
							type: "BearerToken",
							token: accessToken,
						},
					},
					payload: {
						targetSetpointDelta: {
							value: delta,
							scale: "FAHRENHEIT",
						},
					},
				},
			};

			const response = await fetch(`${this.apiEndpoint}/v3/events`, {
				method: "POST",
				headers: {
					Authorization: `Bearer ${accessToken}`,
					"Content-Type": "application/json",
				},
				body: JSON.stringify(directive),
			});

			if (!response.ok) {
				throw new Error(`Alexa API error: ${response.status}`);
			}

			const result = await response.json();

			return {
				success: true,
				message: `Temperature adjusted by ${delta > 0 ? "+" : ""}${delta}°F`,
				result,
			};
		} catch (error) {
			console.error("Error adjusting temperature:", error);
			return { error: "Failed to adjust temperature" };
		}
	}

	/**
	 * Set thermostat mode (HEAT, COOL, AUTO, OFF)
	 */
	async setMode(c: Context, deviceId: string, mode: string) {
		const accessToken = await this.getAccessToken(c);
		if (!accessToken) {
			return { error: "No Alexa credentials found" };
		}

		try {
			const directive = {
				directive: {
					header: {
						namespace: "Alexa.ThermostatController",
						name: "SetThermostatMode",
						payloadVersion: "3",
						messageId: crypto.randomUUID(),
					},
					endpoint: {
						endpointId: deviceId,
						scope: {
							type: "BearerToken",
							token: accessToken,
						},
					},
					payload: {
						thermostatMode: {
							value: mode.toUpperCase(),
						},
					},
				},
			};

			const response = await fetch(`${this.apiEndpoint}/v3/events`, {
				method: "POST",
				headers: {
					Authorization: `Bearer ${accessToken}`,
					"Content-Type": "application/json",
				},
				body: JSON.stringify(directive),
			});

			if (!response.ok) {
				throw new Error(`Alexa API error: ${response.status}`);
			}

			const result = await response.json();

			return {
				success: true,
				message: `Thermostat mode set to ${mode}`,
				result,
			};
		} catch (error) {
			console.error("Error setting mode:", error);
			return { error: "Failed to set mode" };
		}
	}
}
