import { OpenAPIRoute, Str } from "chanfana";
import { Context } from "hono";
import { BuildingInfoWorkflow } from "./chat/buildingInfoWorkflow";
import { MaintenanceWorkflow } from "./chat/maintenanceWorkflow";

// Alexa Request Types
interface AlexaRequest {
	version: string;
	session: {
		new: boolean;
		sessionId: string;
		user: {
			userId: string;
		};
	};
	request: {
		type: "LaunchRequest" | "IntentRequest" | "SessionEndedRequest";
		requestId: string;
		timestamp: string;
		locale: string;
		intent?: {
			name: string;
			slots?: Record<string, { name: string; value: string }>;
		};
	};
	context: any;
}

// Alexa Response Types
interface AlexaResponse {
	version: string;
	sessionAttributes?: Record<string, any>;
	response: {
		outputSpeech: {
			type: "PlainText" | "SSML";
			text?: string;
			ssml?: string;
		};
		card?: {
			type: "Simple";
			title: string;
			content: string;
		};
		reprompt?: {
			outputSpeech: {
				type: "PlainText";
				text: string;
			};
		};
		shouldEndSession: boolean;
	};
}

export class AlexaHandler extends OpenAPIRoute {
	schema = {
		tags: ["Alexa"],
		summary: "Alexa Skill Handler",
		request: {
			body: {
				content: {
					"application/json": {
						schema: {
							type: "object",
							properties: {
								version: { type: "string" },
								session: { type: "object" },
								request: { type: "object" },
								context: { type: "object" },
							},
						},
					},
				},
			},
		},
		responses: {
			200: {
				description: "Alexa response",
				content: {
					"application/json": {
						schema: {
							type: "object",
						},
					},
				},
			},
		},
	};

	async handle(c: Context) {
		try {
			const alexaRequest: AlexaRequest = await c.req.json();
			const sessionId = alexaRequest.session.sessionId;
			const userId = alexaRequest.session.user.userId;

			// Get or create conversation
			let conversation = await c.env.DB.prepare(
				"SELECT * FROM conversations WHERE session_id = ? LIMIT 1"
			).bind(sessionId).first();

			if (!conversation) {
				conversation = await c.env.DB.prepare(
					"INSERT INTO conversations (session_id, tenant_name) VALUES (?, ?) RETURNING *"
				).bind(sessionId, `alexa_${userId}`).first();
			}

			const conversationId = conversation.id;

			// Route based on request type
			if (alexaRequest.request.type === "LaunchRequest") {
				return this.handleLaunchRequest(c);
			}

			if (alexaRequest.request.type === "IntentRequest") {
				const intentName = alexaRequest.request.intent?.name;

				switch (intentName) {
					case "MaintenanceIntent":
						return await this.handleMaintenanceIntent(c, sessionId, conversationId, alexaRequest);

					case "BuildingInfoIntent":
						return await this.handleBuildingInfoIntent(c, sessionId, conversationId, alexaRequest);

					case "SetRoomTemperatureIntent":
						return await this.handleSetRoomTemperatureIntent(c, alexaRequest, userId);

					case "AMAZON.HelpIntent":
						return this.handleHelpIntent(c);

					case "AMAZON.CancelIntent":
					case "AMAZON.StopIntent":
						return this.handleStopIntent(c);

					default:
						return this.handleUnknownIntent(c);
				}
			}

			if (alexaRequest.request.type === "SessionEndedRequest") {
				return this.handleSessionEnded(c);
			}

			return this.buildResponse("I didn't understand that request.", false);

		} catch (error) {
			console.error("Alexa handler error:", error);
			return this.buildResponse(
				"Sorry, I encountered an error processing your request.",
				true
			);
		}
	}

	private handleLaunchRequest(c: Context): Response {
		const speech = "Welcome to Hospital Church Tenant Support. " +
			"You can ask me about building information, or submit a maintenance request. " +
			"What would you like to do?";

		return this.buildResponse(speech, false, {
			title: "Hospital Church Tenant Support",
			content: "Say 'building info' or 'maintenance request' to get started."
		});
	}

	private async handleMaintenanceIntent(
		c: Context,
		sessionId: string,
		conversationId: number,
		alexaRequest: AlexaRequest
	): Promise<Response> {
		const workflow = new MaintenanceWorkflow();

		// Check for active draft
		let draft = await c.env.DB.prepare(
			"SELECT * FROM maintenance_request_drafts WHERE session_id = ? AND completed = 0 ORDER BY created_at DESC LIMIT 1"
		).bind(sessionId).first();

		if (!draft) {
			// Start new maintenance request
			draft = await workflow.getOrCreateDraft(c, sessionId, conversationId);

			const speech = "Starting a maintenance request. " +
				"First, I need your organization name, your full name, your role, " +
				"phone number, and email address. You can say them all at once, or one at a time.";

			return this.buildResponse(speech, false);
		}

		// Process the user's input for current step
		const userMessage = alexaRequest.request.intent?.slots?.["UserInput"]?.value || "";
		const result = await workflow.processStep(c, draft, userMessage);

		// Convert text response to speech-friendly format
		const speech = this.textToSpeech(result.message);

		return this.buildResponse(speech, result.completed);
	}

	private async handleBuildingInfoIntent(
		c: Context,
		sessionId: string,
		conversationId: number,
		alexaRequest: AlexaRequest
	): Promise<Response> {
		const workflow = new BuildingInfoWorkflow();

		// Get or create state
		const state = await workflow.getOrCreateState(c, sessionId, conversationId);

		// Process the user's input
		const userMessage = alexaRequest.request.intent?.slots?.["UserInput"]?.value || "menu";
		const result = await workflow.processStep(c, state, userMessage);

		// Convert text response to speech-friendly format
		const speech = this.textToSpeech(result.message);

		return this.buildResponse(speech, result.completed || false);
	}

	private async handleSetRoomTemperatureIntent(
		c: Context,
		alexaRequest: AlexaRequest,
		userId: string
	): Promise<Response> {
		const slots = alexaRequest.request.intent?.slots;
		const roomName = slots?.["Room"]?.value;
		const temperature = slots?.["Temperature"]?.value;

		if (!roomName || !temperature) {
			return this.buildResponse(
				"I didn't catch the room name or temperature. Please say something like 'set sanctuary to 72 degrees'",
				false
			);
		}

		const temp = parseInt(temperature);

		// Validate temperature range
		if (temp < 65 || temp > 78) {
			return this.buildResponse(
				`I can only set temperatures between 65 and 78 degrees for energy efficiency. ${temp} degrees is outside that range.`,
				false
			);
		}

		try {
			// 1. Find the room
			const room = await c.env.DB.prepare(
				"SELECT id, room_name FROM rooms WHERE LOWER(room_name) = LOWER(?)"
			).bind(roomName).first();

			if (!room) {
				return this.buildResponse(
					`I couldn't find a room called ${roomName}. Available rooms may include Sanctuary, Fellowship Hall, or Tech Booth.`,
					false
				);
			}

			// 2. Find thermostat assigned to that room
			const thermostat = await c.env.DB.prepare(
				"SELECT * FROM thermostat_devices_v2 WHERE assigned_room_id = ? AND is_active = 1"
			).bind(room.id).first();

			if (!thermostat) {
				return this.buildResponse(
					`The ${roomName} doesn't have a thermostat configured yet. Please contact the administrator.`,
					false
				);
			}

			// 3. Check tenant permission (if tenant email provided in context)
			const tenantEmail = alexaRequest.context?.System?.user?.email;
			if (tenantEmail) {
				const permission = await c.env.DB.prepare(
					`SELECT * FROM tenant_room_permissions
					WHERE LOWER(tenant_email) = LOWER(?) AND room_id = ? AND can_control_temp = 1`
				).bind(tenantEmail, room.id).first();

				if (!permission) {
					return this.buildResponse(
						`You don't have permission to control the temperature in the ${roomName}. Please contact the administrator.`,
						false
					);
				}
			}

			// 4. Log the admin request
			await c.env.DB.prepare(
				`INSERT INTO admin_request_logs
				(request_type, message_details, status, source, session_id)
				VALUES (?, ?, ?, ?, ?)`
			).bind(
				"Room Temperature Control",
				`Alexa user ${userId} set ${roomName} to ${temp}°F via thermostat ${thermostat.device_name}`,
				"Active",
				"Alexa",
				alexaRequest.session.sessionId
			).run();

			// 5. In production, you would call Alexa Smart Home API here to actually control the thermostat
			// For now, we'll just confirm the action
			// Example:
			// await this.controlAlexaThermostat(c, thermostat.alexa_device_id, temp);

			return this.buildResponse(
				`I've set the ${roomName} temperature to ${temp} degrees. It should reach the target temperature in about 10 to 15 minutes.`,
				true
			);

		} catch (error) {
			console.error("SetRoomTemperatureIntent error:", error);
			return this.buildResponse(
				"Sorry, I encountered an error setting the temperature. Please try again later.",
				true
			);
		}
	}

	private handleHelpIntent(c: Context): Response {
		const speech = "I can help you with building information, such as rules and rental policies, " +
			"or help you submit a maintenance request. " +
			"What would you like to do?";

		return this.buildResponse(speech, false);
	}

	private handleStopIntent(c: Context): Response {
		const speech = "Goodbye! Come back anytime you need help.";
		return this.buildResponse(speech, true);
	}

	private handleUnknownIntent(c: Context): Response {
		const speech = "I didn't understand that. " +
			"You can ask about building information, or submit a maintenance request. " +
			"What would you like to do?";

		return this.buildResponse(speech, false);
	}

	private handleSessionEnded(c: Context): Response {
		// Session ended by user or timeout
		return this.buildResponse("Session ended.", true);
	}

	/**
	 * Convert text response to speech-friendly format
	 * Removes markdown, emojis, and excessive formatting
	 */
	private textToSpeech(text: string): string {
		return text
			// Remove markdown headers
			.replace(/#+\s+/g, "")
			// Remove markdown bold
			.replace(/\*\*(.+?)\*\*/g, "$1")
			// Remove markdown italic
			.replace(/\*(.+?)\*/g, "$1")
			// Remove emojis (simple pattern)
			.replace(/[\u{1F300}-\u{1F9FF}]/gu, "")
			// Remove excessive newlines
			.replace(/\n{3,}/g, "\n\n")
			// Replace bullet points with "and"
			.replace(/\n[-•]\s+/g, ", ")
			// Clean up
			.trim();
	}

	/**
	 * Build standardized Alexa response
	 */
	private buildResponse(
		speechText: string,
		shouldEndSession: boolean,
		card?: { title: string; content: string }
	): Response {
		const response: AlexaResponse = {
			version: "1.0",
			response: {
				outputSpeech: {
					type: "PlainText",
					text: speechText,
				},
				shouldEndSession,
			},
		};

		if (card) {
			response.response.card = {
				type: "Simple",
				title: card.title,
				content: card.content,
			};
		}

		if (!shouldEndSession) {
			response.response.reprompt = {
				outputSpeech: {
					type: "PlainText",
					text: "What would you like to do?",
				},
			};
		}

		return new Response(JSON.stringify(response), {
			status: 200,
			headers: {
				"Content-Type": "application/json",
			},
		});
	}
}
