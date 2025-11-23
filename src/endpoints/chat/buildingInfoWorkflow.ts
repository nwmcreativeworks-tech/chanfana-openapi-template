import { Context } from "hono";

interface BuildingInfoState {
	id?: number;
	session_id: string;
	conversation_id: number;
	current_step: string;
	request_type?: string;
	user_data?: any;
	completed: boolean;
	created_at?: string;
	updated_at?: string;
}

export class BuildingInfoWorkflow {

	async getOrCreateState(
		c: Context,
		sessionId: string,
		conversationId: number
	): Promise<BuildingInfoState> {
		// Try to get existing state
		const existing = await c.env.DB.prepare(
			"SELECT * FROM building_info_states WHERE session_id = ? AND completed = 0 ORDER BY created_at DESC LIMIT 1"
		).bind(sessionId).first() as BuildingInfoState | null;

		if (existing) {
			return existing;
		}

		// Create new state
		const result = await c.env.DB.prepare(
			"INSERT INTO building_info_states (session_id, conversation_id, current_step, completed) VALUES (?, ?, ?, 0) RETURNING *"
		).bind(sessionId, conversationId, "menu").first() as BuildingInfoState;

		return result;
	}

	async processStep(
		c: Context,
		state: BuildingInfoState,
		message: string
	): Promise<{ message: string; step: string; completed?: boolean }> {

		const input = message.toLowerCase().trim();

		try {
			switch (state.current_step) {

				case "menu":
					return await this.handleMenuSelection(c, state, input);

				case "rules":
					return await this.handleRulesResponse(c, state, input);

				case "rental_collect":
					return await this.handleRentalCollection(c, state, message);

				case "rental_confirm":
					return await this.handleRentalConfirmation(c, state, input);

				case "access_collect":
					return await this.handleAccessCollection(c, state, message);

				default:
					// Reset to menu
					await this.updateStep(c, state.id!, "menu");
					return {
						message: "Let's start over. What do you need help with today?\n\n1 – Building rules & renter policies\n2 – Renting the building or sanctuary\n3 – Building access / entry\n4 – Media training or tech services\n5 – Something else",
						step: "menu"
					};
			}
		} catch (error) {
			console.error("BuildingInfoWorkflow error:", error);
			return {
				message: "I encountered an error. Let's start over. Type MENU to return to options.",
				step: "error"
			};
		}
	}

	private async handleMenuSelection(
		c: Context,
		state: BuildingInfoState,
		input: string
	): Promise<{ message: string; step: string; completed?: boolean }> {

		if (input === "1") {
			await this.updateStep(c, state.id!, "rules");
			await this.logAdminRequest(c, state.session_id, state.conversation_id, {
				type: "Building Rules Viewed",
				status: "Active"
			});

			return {
				message: this.getRenterPolicyText(),
				step: "rules"
			};
		}

		else if (input === "2") {
			await this.updateStep(c, state.id!, "rental_collect");
			await this.logAdminRequest(c, state.session_id, state.conversation_id, {
				type: "Rental Inquiry",
				status: "Active"
			});

			return {
				message: `To request use of the building, provide:

1. Organization name
2. Contact person
3. Phone number
4. Preferred date(s) + time
5. Type of event

Type it in one message or line by line.
Type CANCEL to stop.`,
				step: "rental_collect"
			};
		}

		else if (input === "3") {
			await this.updateStep(c, state.id!, "access_collect");
			await this.logAdminRequest(c, state.session_id, state.conversation_id, {
				type: "Access Request",
				status: "Active"
			});

			return {
				message: "Please provide your full name and phone number so building management can assist with access.",
				step: "access_collect"
			};
		}

		else if (input === "4") {
			await this.completeFlow(c, state.id!);
			await this.logAdminRequest(c, state.session_id, state.conversation_id, {
				type: "NWM Troubleshooter",
				status: "Redirected",
				message_details: "Redirected to NWM Creative Works Setmore"
			});

			return {
				message: `Media training and technical support is handled by NWM Creative Works.

Book here:
https://nwmcreativeworkproductions.setmore.com/services/01d774e5-be82-4e58-baaf-62acd32bdbca

Type MENU to return.`,
				step: "completed",
				completed: true
			};
		}

		else {
			return {
				message: "Please choose a valid option: 1 - 5",
				step: "menu"
			};
		}
	}

	private async handleRulesResponse(
		c: Context,
		state: BuildingInfoState,
		input: string
	): Promise<{ message: string; step: string; completed?: boolean }> {

		if (input === "yes" || input === "y") {
			await this.updateStep(c, state.id!, "rental_collect");
			return {
				message: `To request use of the building, provide:

1. Organization name
2. Contact person
3. Phone number
4. Preferred date(s) + time
5. Type of event

Type it in one message or line by line.
Type CANCEL to stop.`,
				step: "rental_collect"
			};
		}

		else if (input === "no" || input === "n") {
			await this.completeFlow(c, state.id!);
			return {
				message: "Okay! Type MENU if you need anything else.",
				step: "completed",
				completed: true
			};
		}

		else {
			return {
				message: "Would you like to make a request to rent the building?\n\nReply YES or NO",
				step: "rules"
			};
		}
	}

	private async handleRentalCollection(
		c: Context,
		state: BuildingInfoState,
		message: string
	): Promise<{ message: string; step: string }> {

		// Store the rental details
		await c.env.DB.prepare(
			"UPDATE building_info_states SET user_data = ? WHERE id = ?"
		).bind(JSON.stringify({ rental_details: message }), state.id).run();

		await this.updateStep(c, state.id!, "rental_confirm");

		return {
			message: `Please review your information:

${message}

If correct, type: CONFIRM
To stop, type: CANCEL`,
			step: "rental_confirm"
		};
	}

	private async handleRentalConfirmation(
		c: Context,
		state: BuildingInfoState,
		input: string
	): Promise<{ message: string; step: string; completed?: boolean }> {

		if (input === "confirm") {
			// Get the stored data
			const userData = state.user_data ? JSON.parse(state.user_data as any) : {};

			// Log to admin
			await this.logAdminRequest(c, state.session_id, state.conversation_id, {
				type: "Rental Inquiry",
				status: "Submitted",
				message_details: userData.rental_details
			});

			await this.completeFlow(c, state.id!);

			return {
				message: `✅ Your inquiry has been submitted to Building Management.

You will be contacted shortly.

Type MENU to return to options.`,
				step: "completed",
				completed: true
			};
		}

		else {
			return {
				message: `Please review your information and type CONFIRM to submit, or CANCEL to stop.`,
				step: "rental_confirm"
			};
		}
	}

	private async handleAccessCollection(
		c: Context,
		state: BuildingInfoState,
		message: string
	): Promise<{ message: string; step: string; completed?: boolean }> {

		if (message.trim().length < 6) {
			return {
				message: "Please provide a valid name and phone number.",
				step: "access_collect"
			};
		}

		// Log to admin
		await this.logAdminRequest(c, state.session_id, state.conversation_id, {
			type: "Access Request",
			status: "Submitted",
			phone_or_email: message,
			message_details: message
		});

		await this.completeFlow(c, state.id!);

		return {
			message: `✅ Your access request has been sent to management.

Type MENU to return.`,
			step: "completed",
			completed: true
		};
	}

	private getRenterPolicyText(): string {
		return `Hospital Church of Jacksonville — Renter Policy & Regulations
Effective: Immediate | Applies to all renters, tenants & guest ministries

NON-SUPERSESSION:
This does not replace any signed contract. The signed agreement overrides this document.

1) Building Overview
Access is a privilege and may be revoked at any time.
Restricted: Offices, tech closets, admin/storage areas.

2) Authorized Areas
✅ Main Sanctuary
✅ Fellowship / Overflow Hall
✅ Designated Bathrooms
✅ Limited Parking

❌ Booths, offices, classrooms, rooftop, storage = NOT included without written approval

3) Access Rules
• 1 hour before / 1 hour after
• No overnight stays
• No code sharing

4) Equipment Use
Do NOT unplug, modify, re-route, or connect personal devices.
ANY damage is 100% tenant responsibility.

5) Cleaning (MANDATORY)
Trash removed, areas wiped, layout restored
Failure = minimum $150 charge

6) Damage Reporting
All damage must be reported immediately

7) Safety
No smoking, no alcohol, no flames, no unsupervised children

8) Noise Violations = Event cancellation

CONTACT
GracePoint Services LLC
904-293-4426
gracepointservicesllc@gmail.com

Would you like to make a request to rent the building?

Reply YES or NO`;
	}

	private async updateStep(c: Context, stateId: number, newStep: string): Promise<void> {
		await c.env.DB.prepare(
			"UPDATE building_info_states SET current_step = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?"
		).bind(newStep, stateId).run();
	}

	private async completeFlow(c: Context, stateId: number): Promise<void> {
		await c.env.DB.prepare(
			"UPDATE building_info_states SET completed = 1, updated_at = CURRENT_TIMESTAMP WHERE id = ?"
		).bind(stateId).run();
	}

	private async logAdminRequest(
		c: Context,
		sessionId: string,
		conversationId: number,
		data: {
			type: string;
			status?: string;
			user_name?: string;
			phone_or_email?: string;
			location?: string;
			issue_category?: string;
			equipment_type?: string;
			message_details?: string;
			source?: string;
		}
	): Promise<void> {
		try {
			await c.env.DB.prepare(
				`INSERT INTO admin_request_logs
				(request_type, status, user_name, phone_or_email, location, issue_category, equipment_type, message_details, source, session_id, conversation_id)
				VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
			).bind(
				data.type,
				data.status || "Active",
				data.user_name || null,
				data.phone_or_email || null,
				data.location || null,
				data.issue_category || null,
				data.equipment_type || null,
				data.message_details || null,
				data.source || "Tenant Portal",
				sessionId,
				conversationId
			).run();
		} catch (error) {
			console.error("Error logging admin request:", error);
			// Don't fail the request if logging fails
		}
	}
}
