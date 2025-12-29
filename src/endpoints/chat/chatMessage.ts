import { OpenAPIRoute, OpenAPIRouteSchema } from "chanfana";
import { Context } from "hono";
import { z } from "zod";
import { ChatRequest, ChatResponse } from "./base";
import { MaintenanceWorkflow } from "./maintenanceWorkflow";
import { BuildingInfoWorkflow } from "./buildingInfoWorkflow";
import { MediaTroubleshootingWorkflow } from "./mediaTroubleshooting";

export class ChatMessage extends OpenAPIRoute {
	schema: OpenAPIRouteSchema = {
		tags: ["Chat"],
		summary: "Send a message to the tenant support chatbot",
		request: {
			body: {
				content: {
					"application/json": {
						schema: ChatRequest,
					},
				},
			},
		},
		responses: {
			"200": {
				description: "Returns the chatbot response",
				content: {
					"application/json": {
						schema: ChatResponse,
					},
				},
			},
		},
	};

	async handle(c: Context) {
		const data = await this.getValidatedData<typeof this.schema>();
		const { message, session_id, tenant_name, unit_number, photos } = data.body as {
			message: string;
			session_id?: string;
			tenant_name?: string;
			unit_number?: string;
			photos?: Array<{ name: string; data: string; type: string }>;
		};

		// Generate or use existing session ID
		const sessionId = session_id || crypto.randomUUID();

		// Get or create conversation
		const conversation = await this.getOrCreateConversation(
			c,
			sessionId,
			tenant_name,
			unit_number
		);

		// Save user message
		await c.env.DB.prepare(
			"INSERT INTO messages (conversation_id, role, content) VALUES (?, ?, ?)"
		)
			.bind(conversation.id, "user", message)
			.run();

		// ========== GLOBAL COMMAND HANDLING ==========
		const cmd = message.toLowerCase().trim();

		if (cmd === "cancel") {
			// Cancel any active workflows
			await this.cancelActiveWorkflows(c, sessionId);
			const responseText = "Request cancelled. Type MENU to return to the main options.";
			await this.saveAssistantMessage(c, conversation.id, responseText);
			return {
				session_id: sessionId,
				message: responseText,
				suggestions: this.generateSuggestions("general"),
				action_taken: { type: "cancelled" },
			};
		}

		if (cmd === "menu") {
			// Cancel workflows and show menu
			await this.cancelActiveWorkflows(c, sessionId);
			const responseText = `How can I help you today?

Choose an option:
1. Adjust my thermostat
2. Submit a maintenance request
3. Help with vMix or media equipment
4. Building information

You can also type CANCEL at any time to stop.`;
			await this.saveAssistantMessage(c, conversation.id, responseText);
			return {
				session_id: sessionId,
				message: responseText,
				suggestions: this.generateSuggestions("general"),
				action_taken: { type: "menu" },
			};
		}

		if (cmd === "restart") {
			// Restart current flow - similar to cancel but with context
			await this.cancelActiveWorkflows(c, sessionId);
			const responseText = "Restarting... Type MENU to see all options.";
			await this.saveAssistantMessage(c, conversation.id, responseText);
			return {
				session_id: sessionId,
				message: responseText,
				suggestions: this.generateSuggestions("general"),
				action_taken: { type: "restart" },
			};
		}

		// Check for active building info workflow
		const buildingInfoWorkflow = new BuildingInfoWorkflow();
		let activeBuildingInfo = null;

		try {
			activeBuildingInfo = await c.env.DB.prepare(
				"SELECT * FROM building_info_states WHERE session_id = ? AND completed = 0 ORDER BY created_at DESC LIMIT 1"
			).bind(sessionId).first();
		} catch (error) {
			console.error("Error checking building info states:", error);
		}

		// Check for active maintenance workflow
		const maintenanceWorkflow = new MaintenanceWorkflow();
		let activeDraft = null;

		try {
			activeDraft = await c.env.DB.prepare(
				"SELECT * FROM maintenance_request_drafts WHERE session_id = ? AND completed = 0 ORDER BY created_at DESC LIMIT 1"
			).bind(sessionId).first();
		} catch (error) {
			// Table might not exist yet if migration hasn't run
			console.error("Error checking maintenance drafts:", error);
		}

		let actionTaken;
		let responseText;
		let intent = { action: "general" }; // Default intent

		// If there's an active building info workflow, continue it
		if (activeBuildingInfo) {
			const result = await buildingInfoWorkflow.processStep(c, activeBuildingInfo, message);
			responseText = result.message;

			if (result.completed) {
				actionTaken = { type: "building_info_completed", details: result };
			} else {
				actionTaken = { type: "building_info_step", step: result.step, details: result };
			}
			intent = { action: "building_info" };
		}
		// If there's an active maintenance workflow, continue it
		else if (activeDraft) {
			const result = await maintenanceWorkflow.processStep(c, activeDraft, message, photos);
			responseText = result.message;

			if (result.completed) {
				actionTaken = { type: "maintenance_workflow_completed", details: result };
			} else {
				actionTaken = { type: "maintenance_workflow_step", step: result.step, details: result };
			}
			intent = { action: "maintenance_request" }; // Set intent for suggestions
		} else {
			// Get conversation history
			const history = await this.getConversationHistory(c, conversation.id);

			// Build system prompt with knowledge base
			const systemPrompt = await this.buildSystemPrompt(c, unit_number);

			// Detect intent and check for special actions
			intent = await this.detectIntent(message);

			// Handle special actions
			if (intent.action === "vmix_support") {
				// Handle media/AV troubleshooting with new workflow
				const mediaWorkflow = new MediaTroubleshootingWorkflow();
				const result = await mediaWorkflow.handleTroubleshooting(
					c,
					sessionId,
					conversation.id,
					message,
					tenant_name
				);
				responseText = mediaWorkflow.formatResponse(result.message, result.guides);
				actionTaken = {
					type: "media_troubleshooting",
					details: result,
					guides: result.guides
				};
			} else if (intent.action === "room_temperature_control") {
				// Handle room-based temperature control
				actionTaken = await this.handleRoomTemperatureControl(c, message, tenant_name, tenant_email);
				responseText = actionTaken.message;
			} else if (intent.action === "thermostat_control" && unit_number) {
				actionTaken = await this.handleThermostatControl(c, message, unit_number);
				responseText = actionTaken.message;
			} else if (intent.action === "building_info") {
				// Start building info workflow
				const state = await buildingInfoWorkflow.getOrCreateState(c, sessionId, conversation.id);
				const result = await buildingInfoWorkflow.processStep(c, state, message);
				responseText = result.message;
				actionTaken = { type: "building_info_started", step: result.step, details: result };
			} else if (intent.action === "maintenance_request") {
				// Start guided maintenance workflow
				const draft = await maintenanceWorkflow.getOrCreateDraft(c, sessionId, conversation.id);
				const result = await maintenanceWorkflow.processStep(c, draft, message, photos);
				responseText = result.message;
				actionTaken = { type: "maintenance_workflow_started", step: result.step, details: result };
			} else {
				// Generate AI response using Cloudflare Workers AI
				responseText = await this.generateAIResponse(
					c,
					systemPrompt,
					history,
					message
				);
			}
		}

		// Save assistant response
		await c.env.DB.prepare(
			"INSERT INTO messages (conversation_id, role, content) VALUES (?, ?, ?)"
		)
			.bind(conversation.id, "assistant", responseText)
			.run();

		// Update conversation timestamp
		await c.env.DB.prepare("UPDATE conversations SET updated_at = CURRENT_TIMESTAMP WHERE id = ?")
			.bind(conversation.id)
			.run();

		// Generate helpful suggestions
		const suggestions = this.generateSuggestions(intent.action);

		return {
			session_id: sessionId,
			message: responseText,
			suggestions,
			action_taken: actionTaken,
		};
	}

	private async getOrCreateConversation(
		c: Context,
		sessionId: string,
		tenantName?: string,
		unitNumber?: string
	) {
		// Try to get existing conversation
		const existing = await c.env.DB.prepare(
			"SELECT * FROM conversations WHERE session_id = ?"
		)
			.bind(sessionId)
			.first();

		if (existing) {
			return existing;
		}

		// Create new conversation
		const result = await c.env.DB.prepare(
			"INSERT INTO conversations (session_id, tenant_name, unit_number) VALUES (?, ?, ?) RETURNING *"
		)
			.bind(sessionId, tenantName || null, unitNumber || null)
			.first();

		return result;
	}

	private async getConversationHistory(c: Context, conversationId: number) {
		const messages = await c.env.DB.prepare(
			"SELECT role, content FROM messages WHERE conversation_id = ? ORDER BY created_at ASC LIMIT 20"
		)
			.bind(conversationId)
			.all();

		return messages.results || [];
	}

	private async buildSystemPrompt(c: Context, unitNumber?: string) {
		// Get relevant knowledge base entries
		const kb = await c.env.DB.prepare(
			"SELECT category, question, answer FROM knowledge_base ORDER BY category"
		).all();

		let kbText = "";
		if (kb.results && kb.results.length > 0) {
			kbText = "\n\nKNOWLEDGE BASE:\n";
			for (const entry of kb.results) {
				kbText += `\n[${entry.category}] Q: ${entry.question}\nA: ${entry.answer}\n`;
			}
		}

		const systemPrompt = `You are a helpful tenant support chatbot for a residential building. You assist tenants with:

1. THERMOSTAT CONTROL: You can adjust thermostat settings when tenants ask (between 65°F-78°F)
2. MAINTENANCE REQUESTS: You can submit maintenance requests for repairs and issues
3. VMIX TROUBLESHOOTING: You provide step-by-step help for vMix issues on Windows
4. MEDIA EQUIPMENT: You help troubleshoot cameras, microphones, HDMI, and other AV equipment
5. BUILDING INFORMATION: You answer questions about building policies and amenities

CAPABILITIES:
- When a tenant asks to change temperature, you can directly control their thermostat
- When a tenant reports a problem, you can create a maintenance request automatically
- You provide clear, step-by-step instructions for technical issues
- You are friendly, patient, and helpful

IMPORTANT GUIDELINES:
- Keep responses concise and actionable (2-3 short paragraphs max)
- For technical issues, provide numbered step-by-step instructions
- If you don't know something, admit it and offer to submit a maintenance request
- Always confirm unit number for thermostat or maintenance requests
- Be empathetic and professional
${unitNumber ? `\nCURRENT TENANT UNIT: ${unitNumber}` : ""}
${kbText}

Respond naturally and helpfully to the tenant's message.`;

		return systemPrompt;
	}

	private async detectIntent(message: string): Promise<{ action: string }> {
		const lowerMsg = message.toLowerCase();

		// Building Info keywords
		if (
			lowerMsg.match(
				/\b(building|rules|policy|policies|rent|rental|access|entry|hours|booking|sanctuary|reserve)\b/
			) ||
			lowerMsg.includes("building info") ||
			lowerMsg.includes("building information")
		) {
			return { action: "building_info" };
		}

		// vMix / Media Equipment keywords - check this FIRST before general maintenance
		if (
			lowerMsg.match(
				/\b(vmix|v-mix|v mix|media equipment|video|audio|sound|microphone|mic|camera|recording|streaming|broadcast|mixer|input|output|overlay|transition|title|graphics)\b/
			)
		) {
			return { action: "vmix_support" };
		}

		// Room-based thermostat control (higher priority)
		if (
			lowerMsg.match(/\b(sanctuary|fellowship|tech booth|office|green room|hall|room)\b/) &&
			lowerMsg.match(
				/\b(temperature|temp|thermostat|heat|cool|warm|cold|degrees|hotter|cooler|warmer|set|reduce|increase)\b/
			)
		) {
			return { action: "room_temperature_control" };
		}

		// Thermostat keywords (unit-based control)
		if (
			lowerMsg.match(
				/\b(temperature|temp|thermostat|heat|cool|warm|cold|degrees|hotter|cooler|warmer|set to)\b/
			)
		) {
			return { action: "thermostat_control" };
		}

		// Maintenance keywords
		if (
			lowerMsg.match(
				/\b(broken|not working|fix|repair|maintenance|leak|problem|issue|help|doesn't work|stopped working)\b/
			) &&
			!lowerMsg.match(/\b(how do i|how to|what|why)\b/)
		) {
			return { action: "maintenance_request" };
		}

		return { action: "general" };
	}

	private async handleVmixSupport(
		c: Context,
		message: string,
		systemPrompt: string,
		history: any[]
	) {
		// Search knowledge base for relevant vMix/media entries
		const knowledgeEntries = await c.env.DB.prepare(
			`SELECT * FROM knowledge_base
			WHERE category IN ('vmix', 'media_equipment', 'troubleshooting')
			OR keywords LIKE ? OR keywords LIKE ? OR keywords LIKE ?
			OR question LIKE ? OR answer LIKE ?
			ORDER BY created_at DESC
			LIMIT 5`
		).bind(
			`%audio%`, `%video%`, `%sound%`,
			`%${message.substring(0, 50)}%`,
			`%${message.substring(0, 50)}%`
		).all();

		const entries = knowledgeEntries.results || [];

		// Build enhanced system prompt with KB entries
		let kbContext = "\n\n📚 **RELEVANT KNOWLEDGE BASE ENTRIES:**\n";
		if (entries.length > 0) {
			entries.forEach((entry: any, index: number) => {
				kbContext += `\n${index + 1}. **${entry.question}**\n${entry.answer}\n`;
			});
		} else {
			kbContext += "\nNo specific knowledge base entries found for this issue.\n";
		}

		kbContext += `\n**IMPORTANT INSTRUCTIONS:**
- Use the knowledge base entries above to help troubleshoot the user's issue
- Provide clear, numbered step-by-step instructions
- After providing the solution, ask: "Did this solve your issue? If not, I can help you submit a maintenance request."
- Be specific and reference the knowledge base information when applicable
- If the knowledge base doesn't have relevant info, provide general troubleshooting steps and offer to submit a maintenance request\n`;

		const enhancedPrompt = systemPrompt + kbContext;

		// Generate AI response with KB context
		const aiResponse = await this.generateAIResponse(
			c,
			enhancedPrompt,
			history,
			message
		);

		return {
			message: aiResponse,
			knowledge_entries_used: entries.length,
			entries: entries.map((e: any) => ({ id: e.id, question: e.question }))
		};
	}

	private async handleThermostatControl(
		c: Context,
		message: string,
		unitNumber: string
	) {
		// Extract temperature from message
		const tempMatch = message.match(/\b(\d+)\s*(?:degrees?|°|f)?\b/i);
		const increaseMatch = message.match(/\b(increase|raise|up|warmer|hotter)\b/i);
		const decreaseMatch = message.match(/\b(decrease|lower|down|cooler|colder)\b/i);

		// Get current settings
		const current = await c.env.DB.prepare(
			"SELECT * FROM thermostat_settings WHERE unit_number = ?"
		)
			.bind(unitNumber)
			.first();

		if (!current) {
			// Create default settings if not exists
			await c.env.DB.prepare(
				"INSERT INTO thermostat_settings (unit_number, target_temp, mode) VALUES (?, 72.0, 'auto')"
			)
				.bind(unitNumber)
				.run();
		}

		let newTemp: number;
		const currentTemp = current?.target_temp || 72.0;

		if (tempMatch) {
			newTemp = parseInt(tempMatch[1]);
		} else if (increaseMatch) {
			newTemp = Math.min((currentTemp as number) + 2, 78);
		} else if (decreaseMatch) {
			newTemp = Math.max((currentTemp as number) - 2, 65);
		} else {
			return {
				type: "thermostat_query",
				message: `Your thermostat is currently set to ${currentTemp}°F in ${current?.mode || "auto"} mode. What temperature would you like? (I can set it between 65°F and 78°F)`,
				details: current,
			};
		}

		// Validate temperature range
		if (newTemp < 65 || newTemp > 78) {
			return {
				type: "thermostat_error",
				message: `I can only set the temperature between 65°F and 78°F for energy efficiency. You requested ${newTemp}°F. Would you like me to set it to ${newTemp < 65 ? "65" : "78"}°F instead?`,
				details: { requested: newTemp, min: 65, max: 78 },
			};
		}

		// Update thermostat
		await c.env.DB.prepare(
			"UPDATE thermostat_settings SET target_temp = ?, updated_at = CURRENT_TIMESTAMP, updated_by = ? WHERE unit_number = ?"
		)
			.bind(newTemp, "chatbot", unitNumber)
			.run();

		return {
			type: "thermostat_updated",
			message: `✓ I've set your thermostat to ${newTemp}°F. It should reach the target temperature in about 10-15 minutes. Let me know if you need any other adjustments!`,
			details: {
				old_temp: currentTemp,
				new_temp: newTemp,
				unit_number: unitNumber,
			},
		};
	}

	private async handleRoomTemperatureControl(
		c: Context,
		message: string,
		tenantName?: string,
		tenantEmail?: string
	) {
		// Extract room name from message
		const lowerMsg = message.toLowerCase();
		let roomName: string | null = null;

		const roomPatterns = [
			{ pattern: /\b(sanctuary)\b/, name: "Sanctuary" },
			{ pattern: /\b(fellowship\s*hall?|fellowship)\b/, name: "Fellowship Hall" },
			{ pattern: /\b(tech\s*booth|booth)\b/, name: "Tech Booth" },
			{ pattern: /\b(office|offices)\b/, name: "Office Suite" },
			{ pattern: /\b(green\s*room)\b/, name: "Green Room" }
		];

		for (const { pattern, name } of roomPatterns) {
			if (pattern.test(lowerMsg)) {
				roomName = name;
				break;
			}
		}

		if (!roomName) {
			return {
				type: "room_not_found",
				message: "I couldn't identify which room you're referring to. Available rooms include: Sanctuary, Fellowship Hall, Tech Booth, Office Suite, and Green Room. Please specify the room name."
			};
		}

		// Extract temperature
		const tempMatch = message.match(/\b(\d+)\s*(?:degrees?|°|f)?\b/i);
		const increaseMatch = message.match(/\b(increase|raise|up|warmer|hotter)\b/i);
		const decreaseMatch = message.match(/\b(decrease|lower|down|cooler|colder|reduce)\b/i);

		if (!tempMatch && !increaseMatch && !decreaseMatch) {
			return {
				type: "temperature_not_specified",
				message: `What temperature would you like to set for the ${roomName}? (I can set it between 65°F and 78°F)`
			};
		}

		try {
			// 1. Find the room
			const room = await c.env.DB.prepare(
				"SELECT id, room_name FROM rooms WHERE LOWER(room_name) = LOWER(?)"
			).bind(roomName).first();

			if (!room) {
				return {
					type: "room_not_configured",
					message: `The ${roomName} hasn't been configured in the system yet. Please contact the administrator.`
				};
			}

			// 2. Check tenant permission if email provided
			if (tenantEmail) {
				const permission = await c.env.DB.prepare(
					`SELECT * FROM tenant_room_permissions
					WHERE LOWER(tenant_email) = LOWER(?) AND room_id = ? AND can_control_temp = 1`
				).bind(tenantEmail, room.id).first();

				if (!permission) {
					return {
						type: "permission_denied",
						message: `You don't have permission to control the temperature in the ${roomName}. Please contact the administrator for access.`
					};
				}
			}

			// 3. Find thermostat assigned to room
			const thermostat = await c.env.DB.prepare(
				"SELECT * FROM thermostat_devices_v2 WHERE assigned_room_id = ? AND is_active = 1"
			).bind(room.id).first();

			if (!thermostat) {
				return {
					type: "no_thermostat",
					message: `The ${roomName} doesn't have a thermostat assigned yet. Please contact the administrator.`
				};
			}

			// 4. Calculate target temperature
			let newTemp: number;
			// For room-based control, we don't have current temp stored, so default to 72
			const assumedCurrent = 72;

			if (tempMatch) {
				newTemp = parseInt(tempMatch[1]);
			} else if (increaseMatch) {
				newTemp = Math.min(assumedCurrent + 2, 78);
			} else if (decreaseMatch) {
				newTemp = Math.max(assumedCurrent - 2, 65);
			} else {
				newTemp = assumedCurrent;
			}

			// Validate temperature range
			if (newTemp < 65 || newTemp > 78) {
				return {
					type: "temperature_out_of_range",
					message: `I can only set temperatures between 65°F and 78°F for energy efficiency. You requested ${newTemp}°F.`
				};
			}

			// 5. Log the request
			await c.env.DB.prepare(
				`INSERT INTO admin_request_logs
				(request_type, message_details, status, source, user_name, phone_or_email)
				VALUES (?, ?, ?, ?, ?, ?)`
			).bind(
				"Room Temperature Control",
				`${tenantName || "Tenant"} set ${roomName} to ${newTemp}°F via thermostat ${thermostat.device_name}`,
				"Active",
				"Chat",
				tenantName || "Unknown",
				tenantEmail || "Unknown"
			).run();

			// 6. In production, control the actual Alexa thermostat here
			// Example: await this.controlAlexaThermostat(c, thermostat.alexa_device_id, newTemp);

			return {
				type: "room_temperature_updated",
				message: `✓ I've set the ${roomName} temperature to ${newTemp}°F. The thermostat (${thermostat.device_name}) should reach the target temperature in about 10-15 minutes.`
			};

		} catch (error) {
			console.error("Room temperature control error:", error);
			return {
				type: "error",
				message: "Sorry, I encountered an error controlling the room temperature. Please try again or contact support."
			};
		}
	}

	private async handleMaintenanceRequest(
		c: Context,
		message: string,
		conversationId: number,
		tenantName?: string,
		unitNumber?: string
	) {
		if (!unitNumber || !tenantName) {
			return {
				type: "maintenance_info_needed",
				message:
					"I can help you submit a maintenance request! To proceed, I need your unit number and name. Please provide them in your next message (e.g., 'Unit 101, John Smith').",
				details: null,
			};
		}

		// Detect category
		const lowerMsg = message.toLowerCase();
		let category = "other";

		if (lowerMsg.match(/\b(hvac|heat|ac|air|thermostat|temperature)\b/)) {
			category = "hvac";
		} else if (lowerMsg.match(/\b(plumb|leak|water|sink|toilet|drain)\b/)) {
			category = "plumbing";
		} else if (
			lowerMsg.match(/\b(electric|light|outlet|power|breaker)\b/)
		) {
			category = "electrical";
		} else if (lowerMsg.match(/\b(appliance|fridge|stove|dishwasher|washer|dryer)\b/)) {
			category = "appliance";
		} else if (lowerMsg.match(/\b(vmix|camera|mic|microphone|hdmi|media|video|streaming|broadcast)\b/)) {
			category = "media_equipment";
		} else if (lowerMsg.match(/\b(chair|seating|seat|furniture)\b/)) {
			category = "chairs";
		} else if (lowerMsg.match(/\b(stage|platform|riser)\b/)) {
			category = "stage";
		} else if (lowerMsg.match(/\b(instrument|piano|drum|guitar|keyboard|music)\b/)) {
			category = "musical_instruments";
		} else if (lowerMsg.match(/\b(equipment|gear|device|machine|tool)\b/)) {
			category = "equipment";
		}

		// Detect priority
		let priority = "medium";
		if (
			lowerMsg.match(/\b(emergency|urgent|immediately|asap|critical)\b/)
		) {
			priority = "emergency";
		} else if (lowerMsg.match(/\b(important|soon|high)\b/)) {
			priority = "high";
		}

		// Create maintenance request
		const result = await c.env.DB.prepare(
			`INSERT INTO maintenance_requests
			(conversation_id, tenant_name, unit_number, category, priority, description, status)
			VALUES (?, ?, ?, ?, ?, ?, 'open') RETURNING *`
		)
			.bind(conversationId, tenantName, unitNumber, category, priority, message)
			.first();

		const priorityText = priority === "emergency"
			? "🚨 EMERGENCY - Our team will contact you immediately!"
			: priority === "high"
			? "⚠️ HIGH PRIORITY - We'll address this within 24 hours."
			: "We'll take care of this within 2-3 business days.";

		return {
			type: "maintenance_created",
			message: `✓ Maintenance request #${result.id} created successfully!\n\nCategory: ${category.replace("_", " ")}\nPriority: ${priority.toUpperCase()}\n${priorityText}\n\nYou'll receive updates as we work on this. Is there anything else I can help you with?`,
			details: result,
		};
	}

	private async generateAIResponse(
		c: Context,
		systemPrompt: string,
		history: any[],
		userMessage: string
	): Promise<string> {
		// Build messages array for AI
		const messages = [
			{ role: "system", content: systemPrompt },
			...history.map((h: any) => ({ role: h.role, content: h.content })),
			{ role: "user", content: userMessage },
		];

		try {
			// Use Cloudflare Workers AI
			const response = await c.env.AI.run("@cf/meta/llama-3.1-8b-instruct", {
				messages: messages,
				max_tokens: 500,
				temperature: 0.7,
			});

			return response.response || "I'm here to help! Could you please rephrase your question?";
		} catch (error) {
			console.error("AI Error:", error);
			// Fallback to simple pattern matching
			return this.generateFallbackResponse(userMessage);
		}
	}

	private generateFallbackResponse(message: string): string {
		const lowerMsg = message.toLowerCase();

		if (lowerMsg.includes("hello") || lowerMsg.includes("hi")) {
			return "Hello! I'm your tenant support assistant. I can help you with thermostat control, maintenance requests, vMix troubleshooting, and general building questions. What can I help you with today?";
		}

		if (lowerMsg.includes("thank")) {
			return "You're welcome! Let me know if you need anything else.";
		}

		return "I'm here to help! I can assist you with:\n\n1. Adjusting your thermostat\n2. Submitting maintenance requests\n3. Troubleshooting vMix and media equipment\n4. Answering building questions\n\nWhat would you like help with?";
	}

	private generateSuggestions(action: string): string[] {
		switch (action) {
			case "thermostat_control":
				return [
					"Set temperature to 70°F",
					"Make it warmer",
					"What's the current temperature?",
				];
			case "vmix_support":
				return [
					"Yes, that solved it!",
					"No, still having issues - submit maintenance request",
					"Try another solution",
				];
			case "maintenance_request":
				return [
					"Check my maintenance requests",
					"What's the status of my request?",
				];
			case "building_info":
				return [
					"Building rules",
					"Rent the sanctuary",
					"Request building access",
				];
			default:
				return [
					"Adjust my thermostat",
					"Submit a maintenance request",
					"Help with vMix",
					"Building information",
				];
		}
	}

	private async cancelActiveWorkflows(c: Context, sessionId: string): Promise<void> {
		try {
			// Cancel any active building info workflows
			await c.env.DB.prepare(
				"UPDATE building_info_states SET completed = 1 WHERE session_id = ? AND completed = 0"
			).bind(sessionId).run();

			// Cancel any active maintenance drafts
			await c.env.DB.prepare(
				"UPDATE maintenance_request_drafts SET completed = 1 WHERE session_id = ? AND completed = 0"
			).bind(sessionId).run();
		} catch (error) {
			console.error("Error cancelling workflows:", error);
		}
	}

	private async saveAssistantMessage(c: Context, conversationId: number, message: string): Promise<void> {
		await c.env.DB.prepare(
			"INSERT INTO messages (conversation_id, role, content) VALUES (?, ?, ?)"
		).bind(conversationId, "assistant", message).run();
	}
}
