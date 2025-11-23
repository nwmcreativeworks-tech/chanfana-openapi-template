import { OpenAPIRoute } from "chanfana";
import { Context } from "hono";

interface AlexaDevice {
	endpointId: string;
	friendlyName: string;
	description?: string;
	manufacturerName?: string;
	displayCategories: string[];
	capabilities: any[];
}

export class AlexaSyncDevicesHandler extends OpenAPIRoute {
	schema = {
		tags: ["Alexa"],
		summary: "Sync Alexa Thermostat Devices",
		description: "Fetches all Alexa Smart Home devices and syncs thermostats to database",
		responses: {
			200: {
				description: "Devices synced successfully",
				content: {
					"application/json": {
						schema: {
							type: "object",
							properties: {
								success: { type: "boolean" },
								devices_synced: { type: "number" },
								devices: { type: "array" },
							},
						},
					},
				},
			},
		},
	};

	async handle(c: Context) {
		try {
			// Get Alexa API credentials from database
			const credentials = await c.env.DB.prepare(
				"SELECT access_token, refresh_token, expires_at FROM alexa_credentials ORDER BY created_at DESC LIMIT 1"
			).first();

			if (!credentials) {
				return c.json({
					success: false,
					error: "No Alexa credentials found. Please complete OAuth flow first.",
				}, 400);
			}

			const accessToken = credentials.access_token as string;

			// Check if token is expired and refresh if needed
			const expiresAt = new Date(credentials.expires_at as string);
			if (expiresAt < new Date()) {
				// Token expired - would need to implement token refresh here
				return c.json({
					success: false,
					error: "Access token expired. Please re-authenticate.",
				}, 401);
			}

			// Fetch devices from Alexa Smart Home API
			const devicesResponse = await fetch("https://api.amazonalexa.com/v1/devices", {
				method: "GET",
				headers: {
					"Authorization": `Bearer ${accessToken}`,
					"Content-Type": "application/json",
				},
			});

			if (!devicesResponse.ok) {
				const errorText = await devicesResponse.text();
				console.error("Alexa API error:", errorText);
				return c.json({
					success: false,
					error: `Alexa API returned ${devicesResponse.status}: ${errorText}`,
				}, devicesResponse.status);
			}

			const devicesData = await devicesResponse.json() as { endpoints: AlexaDevice[] };
			const allDevices = devicesData.endpoints || [];

			// Filter for thermostats only
			const thermostats = allDevices.filter(device =>
				device.displayCategories?.includes("THERMOSTAT") ||
				device.capabilities?.some((cap: any) =>
					cap.interface === "Alexa.ThermostatController" ||
					cap.interface === "Alexa.TemperatureSensor"
				)
			);

			console.log(`Found ${thermostats.length} thermostats out of ${allDevices.length} devices`);

			// Insert or update thermostats in database
			let syncedCount = 0;
			const syncedDevices = [];

			for (const thermostat of thermostats) {
				try {
					// Check if device already exists
					const existing = await c.env.DB.prepare(
						"SELECT id, assigned_room_id FROM thermostat_devices_v2 WHERE alexa_device_id = ?"
					).bind(thermostat.endpointId).first();

					const capabilities = JSON.stringify(thermostat.capabilities);
					const manufacturer = thermostat.manufacturerName || "Unknown";

					if (existing) {
						// Update existing device
						await c.env.DB.prepare(
							`UPDATE thermostat_devices_v2
							SET device_name = ?,
								manufacturer = ?,
								capabilities = ?,
								last_sync = CURRENT_TIMESTAMP,
								updated_at = CURRENT_TIMESTAMP
							WHERE alexa_device_id = ?`
						).bind(
							thermostat.friendlyName,
							manufacturer,
							capabilities,
							thermostat.endpointId
						).run();

						syncedDevices.push({
							id: existing.id,
							alexa_device_id: thermostat.endpointId,
							device_name: thermostat.friendlyName,
							assigned_room_id: existing.assigned_room_id,
							status: "updated",
						});
					} else {
						// Insert new device
						const result = await c.env.DB.prepare(
							`INSERT INTO thermostat_devices_v2
							(alexa_device_id, device_name, manufacturer, capabilities, last_sync)
							VALUES (?, ?, ?, ?, CURRENT_TIMESTAMP)
							RETURNING id`
						).bind(
							thermostat.endpointId,
							thermostat.friendlyName,
							manufacturer,
							capabilities
						).first();

						syncedDevices.push({
							id: result?.id,
							alexa_device_id: thermostat.endpointId,
							device_name: thermostat.friendlyName,
							assigned_room_id: null,
							status: "new",
						});
					}

					syncedCount++;
				} catch (error) {
					console.error(`Error syncing device ${thermostat.endpointId}:`, error);
				}
			}

			return c.json({
				success: true,
				devices_synced: syncedCount,
				total_thermostats: thermostats.length,
				total_devices: allDevices.length,
				devices: syncedDevices,
			});

		} catch (error) {
			console.error("Sync devices error:", error);
			return c.json({
				success: false,
				error: error instanceof Error ? error.message : "Unknown error occurred",
			}, 500);
		}
	}
}
