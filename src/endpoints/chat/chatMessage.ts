import { OpenAPIRoute, OpenAPIRouteSchema } from "chanfana";
import { Context } from "hono";
import { z } from "zod";
import { ChatRequest, ChatResponse } from "./base";
import { MaintenanceWorkflow } from "./maintenanceWorkflow";

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
		const { message, session_id, tenant_name, unit_number } = data.body as {
			message: string;
			session_id?: string;
			tenant_name?: string;
			unit_number?: string;
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

		// Check for active maintenance workflow
		const maintenanceWorkflow = new MaintenanceWorkflow();
		const activeDraft = await c.env.DB.prepare(
			"SELECT * FROM maintenance_request_drafts WHERE session_id = ? AND completed = 0 ORDER BY created_at DESC LIMIT 1"
		).bind(sessionId).first();

		let actionTaken;
		let responseText;

		// If there's an active maintenance workflow, continue it
		if (activeDraft) {
			const result = await maintenanceWorkflow.processStep(c, activeDraft, message);
			responseText = result.message;

			if (result.completed) {
				actionTaken = { type: "maintenance_workflow_completed", details: result };
			} else {
				actionTaken = { type: "maintenance_workflow_step", step: result.step, details: result };
			}
		} else {
			// Get conversation history
			const history = await this.getConversationHistory(c, conversation.id);

			// Build system prompt with knowledge base
			const systemPrompt = await this.buildSystemPrompt(c, unit_number);

			// Detect intent and check for special actions
			const intent = await this.detectIntent(message);

			// Handle special actions
			if (intent.action === "thermostat_control" && unit_number) {
				actionTaken = await this.handleThermostatControl(c, message, unit_number);
				responseText = actionTaken.message;
			} else if (intent.action === "maintenance_request") {
				// Start guided maintenance workflow
				const draft = await maintenanceWorkflow.getOrCreateDraft(c, sessionId, conversation.id);
				const result = await maintenanceWorkflow.processStep(c, draft, message);
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

		// Thermostat keywords
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
			case "maintenance_request":
				return [
					"Check my maintenance requests",
					"What's the status of my request?",
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
}
