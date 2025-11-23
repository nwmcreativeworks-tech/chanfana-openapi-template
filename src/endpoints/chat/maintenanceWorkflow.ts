import { Context } from "hono";

/**
 * Guided 11-Step Maintenance Request Workflow for Hospital Church
 * Ensures complete data collection and liability protection
 */

export class MaintenanceWorkflow {
	/**
	 * Get or create a maintenance request draft
	 */
	async getOrCreateDraft(c: Context, sessionId: string, conversationId: number) {
		// Check for existing draft
		const existing = await c.env.DB.prepare(
			"SELECT * FROM maintenance_request_drafts WHERE session_id = ? AND completed = 0 ORDER BY created_at DESC LIMIT 1"
		).bind(sessionId).first();

		if (existing) {
			return existing;
		}

		// Create new draft
		const result = await c.env.DB.prepare(
			"INSERT INTO maintenance_request_drafts (conversation_id, session_id, current_step) VALUES (?, ?, 1) RETURNING *"
		).bind(conversationId, sessionId).first();

		return result;
	}

	/**
	 * Process user input and advance to next step
	 */
	async processStep(c: Context, draft: any, userMessage: string): Promise<{ message: string; step: number; completed: boolean }> {
		const step = draft.current_step || 1;

		switch (step) {
			case 1:
				return await this.handleStep1(c, draft, userMessage);
			case 2:
				return await this.handleStep2(c, draft, userMessage);
			case 3:
				return await this.handleStep3(c, draft, userMessage);
			case 4:
				return await this.handleStep4(c, draft, userMessage);
			case 5:
				return await this.handleStep5(c, draft, userMessage);
			case 6:
				return await this.handleStep6(c, draft, userMessage);
			case 7:
				return await this.handleStep7(c, draft, userMessage);
			case 8:
				return await this.handleStep8(c, draft, userMessage);
			case 9:
				return await this.handleStep9(c, draft, userMessage);
			case 10:
				return await this.handleStep10(c, draft, userMessage);
			case 11:
				return await this.handleStep11(c, draft, userMessage);
			default:
				return { message: "Error: Invalid step", step: 1, completed: false };
		}
	}

	/**
	 * STEP 1: Opening Gate & Contact Information
	 */
	private async handleStep1(c: Context, draft: any, userMessage: string) {
		// If this is the first message, show opening gate
		if (!draft.organization_name) {
			await c.env.DB.prepare(
				"UPDATE maintenance_request_drafts SET current_step = 1 WHERE id = ?"
			).bind(draft.id).run();

			return {
				message: `🏛️ **MAINTENANCE REQUEST PORTAL**

You're about to submit a maintenance, damage, or equipment malfunction request to Building Management.

⚠️ **IMPORTANT:** This report is reviewed by the Property Owner and may determine financial responsibility if negligence is confirmed.

Let's keep this fast, clear, and documented.

**STEP 1 OF 11**
Please provide:
1. Your organization / church group name
2. Your full name and position
3. Best phone number and email address

*Example: "Grace Ministry, John Smith - Media Director, 555-1234, john@email.com"*`,
				step: 1,
				completed: false
			};
		}

		// Parse contact information from message
		const lines = userMessage.split(/[,\n]+/).map(l => l.trim());

		// Try to extract info
		let orgName = lines[0] || "";
		let nameAndRole = lines[1] || "";
		let phone = lines[2] || "";
		let email = lines[3] || "";

		// Extract name and role
		let contactName = nameAndRole;
		let contactRole = "";
		if (nameAndRole.includes(" - ")) {
			[contactName, contactRole] = nameAndRole.split(" - ").map(s => s.trim());
		}

		// Validate
		if (!orgName || !contactName || !phone || !email) {
			return {
				message: `❌ **Missing Information**

Please provide all required information in this format:
1. Organization/Church group name
2. Your full name and position
3. Phone number
4. Email address

*Example: "Grace Ministry, John Smith - Media Director, 555-1234, john@email.com"*`,
				step: 1,
				completed: false
			};
		}

		// Save and advance to step 2
		await c.env.DB.prepare(
			`UPDATE maintenance_request_drafts
			SET organization_name = ?, contact_name = ?, contact_role = ?, contact_phone = ?, contact_email = ?, current_step = 2, updated_at = CURRENT_TIMESTAMP
			WHERE id = ?`
		).bind(orgName, contactName, contactRole, phone, email, draft.id).run();

		return {
			message: `✅ Contact information saved!

**STEP 2 OF 11: Location Confirmation**

Where is the issue located? Be specific.

Please select or type:
• Inspiration Studio
• Harmony Hall
• Grace Auditorium
• Media Booth
• Lobby
• Classroom (specify number)
• Hallway
• Restroom (Men/Women)
• Storage Room
• Outdoor / Parking
• Other (please specify)

*Just type the location name*`,
			step: 2,
			completed: false
		};
	}

	/**
	 * STEP 2: Location Confirmation
	 */
	private async handleStep2(c: Context, draft: any, userMessage: string) {
		const location = userMessage.trim();

		if (location.length < 3) {
			return {
				message: `❌ Please provide a specific location.

Examples: "Inspiration Studio", "Grace Auditorium", "Men's Restroom", "Hallway near Lobby"`,
				step: 2,
				completed: false
			};
		}

		// Save and advance to step 3
		await c.env.DB.prepare(
			`UPDATE maintenance_request_drafts SET location = ?, current_step = 3, updated_at = CURRENT_TIMESTAMP WHERE id = ?`
		).bind(location, draft.id).run();

		return {
			message: `✅ Location: ${location}

**STEP 3 OF 11: Issue Type Classification**

What type of issue are you reporting?

Please type the category:
• Electrical / Power
• HVAC / Thermostat
• Plumbing / Water
• Audio / Video / Media Equipment
• Furniture / Fixture
• Chairs
• Stage
• Musical Instruments
• Structural (wall, door, ceiling, floor)
• Cleaning / Restroom / Sanitation
• Safety / Security
• Other

*Just type the category name*`,
			step: 3,
			completed: false
		};
	}

	/**
	 * STEP 3: Issue Type Classification
	 */
	private async handleStep3(c: Context, draft: any, userMessage: string) {
		const lowerMsg = userMessage.toLowerCase();
		let category = "";

		// Map user input to categories
		if (lowerMsg.match(/electric|power/)) category = "Electrical / Power";
		else if (lowerMsg.match(/hvac|thermostat|heat|cool|air/)) category = "HVAC / Thermostat";
		else if (lowerMsg.match(/plumb|water|leak|sink|toilet/)) category = "Plumbing / Water";
		else if (lowerMsg.match(/audio|video|media|camera|mic|sound/)) category = "Audio / Video / Media Equipment";
		else if (lowerMsg.match(/furniture|fixture|table|desk/)) category = "Furniture / Fixture";
		else if (lowerMsg.match(/chair|seating|seat/)) category = "Chairs";
		else if (lowerMsg.match(/stage|platform/)) category = "Stage";
		else if (lowerMsg.match(/instrument|piano|drum|guitar|music/)) category = "Musical Instruments";
		else if (lowerMsg.match(/structural|wall|door|ceiling|floor/)) category = "Structural";
		else if (lowerMsg.match(/clean|restroom|sanitation/)) category = "Cleaning / Restroom / Sanitation";
		else if (lowerMsg.match(/safety|security/)) category = "Safety / Security";
		else category = "Other";

		// Save and advance to step 4
		await c.env.DB.prepare(
			`UPDATE maintenance_request_drafts SET issue_category = ?, current_step = 4, updated_at = CURRENT_TIMESTAMP WHERE id = ?`
		).bind(category, draft.id).run();

		return {
			message: `✅ Category: ${category}

**STEP 4 OF 11: Urgency Filter**

How urgent is this issue?

Please type:
• **Critical** – Unsafe / water leaking / power outage / service-blocking
• **High** – Disrupts service or major function
• **Medium** – Partial impairment
• **Low** – Cosmetic or minor issue

*Just type: Critical, High, Medium, or Low*`,
			step: 4,
			completed: false
		};
	}

	/**
	 * STEP 4: Urgency Filter
	 */
	private async handleStep4(c: Context, draft: any, userMessage: string) {
		const lowerMsg = userMessage.toLowerCase();
		let urgency = "";
		let priorityHigh = false;

		if (lowerMsg.match(/critical|emergency|urgent/)) {
			urgency = "Critical";
			priorityHigh = true;
		} else if (lowerMsg.match(/high/)) {
			urgency = "High";
		} else if (lowerMsg.match(/medium|moderate/)) {
			urgency = "Medium";
		} else if (lowerMsg.match(/low|minor/)) {
			urgency = "Low";
		} else {
			return {
				message: `❌ Please specify urgency level: Critical, High, Medium, or Low`,
				step: 4,
				completed: false
			};
		}

		// Save and advance to step 5
		await c.env.DB.prepare(
			`UPDATE maintenance_request_drafts SET urgency_level = ?, priority_high_notify = ?, current_step = 5, updated_at = CURRENT_TIMESTAMP WHERE id = ?`
		).bind(urgency, priorityHigh ? 1 : 0, draft.id).run();

		const urgencyIcon = urgency === "Critical" ? "🚨" : urgency === "High" ? "🔴" : urgency === "Medium" ? "🟡" : "🟢";

		return {
			message: `${urgencyIcon} Urgency: ${urgency}${priorityHigh ? " - Building owner will be notified immediately" : ""}

**STEP 5 OF 11: Detailed Description**

In your own words, describe exactly what happened.

⚠️ **Important:**
• Stick to FACTS only — no guesses or assumptions
• Be specific and detailed
• Minimum 250 characters required

*Example: "The projector in Grace Auditorium suddenly shut off during service at 10:45 AM. Power button does not respond. Checked all cables and they appear connected properly."*`,
			step: 5,
			completed: false
		};
	}

	/**
	 * STEP 5: Description
	 */
	private async handleStep5(c: Context, draft: any, userMessage: string) {
		const description = userMessage.trim();

		if (description.length < 250) {
			return {
				message: `❌ Description too short (${description.length}/250 characters minimum)

Please provide a detailed description of exactly what happened. Include:
• When it occurred
• What you observed
• What you've already checked
• Any relevant details

Current length: ${description.length} characters
Needed: ${250 - description.length} more characters`,
				step: 5,
				completed: false
			};
		}

		// Save and advance to step 6
		await c.env.DB.prepare(
			`UPDATE maintenance_request_drafts SET incident_description = ?, current_step = 6, updated_at = CURRENT_TIMESTAMP WHERE id = ?`
		).bind(description, draft.id).run();

		return {
			message: `✅ Description saved (${description.length} characters)

**STEP 6 OF 11: Cause Clarification**

Based on your knowledge, this issue was caused by:

Please type:
• **Normal wear & tear**
• **Accidental damage**
• **Possible misuse**
• **Unknown / Not sure**

*This helps determine responsibility and prevent future issues*`,
			step: 6,
			completed: false
		};
	}

	/**
	 * STEP 6: Cause Clarification
	 */
	private async handleStep6(c: Context, draft: any, userMessage: string) {
		const lowerMsg = userMessage.toLowerCase();
		let cause = "";

		if (lowerMsg.match(/normal|wear.*tear|aging/)) {
			cause = "Normal wear & tear";
		} else if (lowerMsg.match(/accident|accidental/)) {
			cause = "Accidental damage";
		} else if (lowerMsg.match(/misuse|improper|incorrect/)) {
			cause = "Possible misuse";
		} else if (lowerMsg.match(/unknown|not sure|don't know/)) {
			cause = "Unknown / Not sure";
		} else {
			return {
				message: `❌ Please select one of the cause options:
• Normal wear & tear
• Accidental damage
• Possible misuse
• Unknown / Not sure`,
				step: 6,
				completed: false
			};
		}

		// Save and advance to step 7
		await c.env.DB.prepare(
			`UPDATE maintenance_request_drafts SET probable_cause = ?, current_step = 7, updated_at = CURRENT_TIMESTAMP WHERE id = ?`
		).bind(cause, draft.id).run();

		return {
			message: `✅ Probable cause: ${cause}

**STEP 7 OF 11: Equipment Check**

Is church-owned equipment involved in this issue?

Please answer:
• **Yes**
• **No**
• **Not sure**

*This is critical for tracking asset damage and liability*`,
			step: 7,
			completed: false
		};
	}

	/**
	 * STEP 7: Equipment Check
	 */
	private async handleStep7(c: Context, draft: any, userMessage: string) {
		const lowerMsg = userMessage.toLowerCase();

		if (lowerMsg.match(/^yes|^y\b/)) {
			// Equipment involved - ask for details
			await c.env.DB.prepare(
				`UPDATE maintenance_request_drafts SET equipment_involved = 'Yes', updated_at = CURRENT_TIMESTAMP WHERE id = ?`
			).bind(draft.id).run();

			return {
				message: `⚠️ Equipment is involved.

Please describe the equipment:
• Equipment name/type
• Model/serial number (if visible)
• Specific location

*Example: "Sony HDMI Camera, Model PXW-Z150, mounted in Media Booth"*`,
				step: 7,
				completed: false
			};
		} else if (lowerMsg.match(/^no|^n\b/)) {
			// No equipment - move to step 8
			await c.env.DB.prepare(
				`UPDATE maintenance_request_drafts SET equipment_involved = 'No', current_step = 8, updated_at = CURRENT_TIMESTAMP WHERE id = ?`
			).bind(draft.id).run();

			return {
				message: `✅ No equipment involved

**STEP 8 OF 11: Evidence Upload**

📸 Upload clear evidence so management can assess without delay.

**REQUIRED:** At least one of the following:
• 2 photos showing the issue
• 1 video (if malfunction/noise/movement)
• Screenshot (if software/display issue)

⚠️ **Note:** Photo upload will be available in your portal. For now, please describe what photos you would take and type "PHOTOS READY" when you're prepared to upload them via the admin dashboard.

*Or type "SKIP" if you cannot provide photos (may delay processing)*`,
				step: 8,
				completed: false
			};
		} else if (lowerMsg.match(/not sure|unsure|maybe/)) {
			await c.env.DB.prepare(
				`UPDATE maintenance_request_drafts SET equipment_involved = 'Not sure', current_step = 8, updated_at = CURRENT_TIMESTAMP WHERE id = ?`
			).bind(draft.id).run();

			return {
				message: `✅ Equipment involvement: Not sure

**STEP 8 OF 11: Evidence Upload**

📸 Upload clear evidence so management can assess without delay.

**REQUIRED:** At least one of the following:
• 2 photos showing the issue
• 1 video (if malfunction/noise/movement)
• Screenshot (if software/display issue)

⚠️ **Note:** Photo upload will be available in your portal. For now, please describe what photos you would take and type "PHOTOS READY" when you're prepared to upload them via the admin dashboard.

*Or type "SKIP" if you cannot provide photos (may delay processing)*`,
				step: 8,
				completed: false
			};
		} else if (draft.equipment_involved === 'Yes' && userMessage.length > 10) {
			// This is the equipment details
			await c.env.DB.prepare(
				`UPDATE maintenance_request_drafts SET equipment_details = ?, current_step = 8, updated_at = CURRENT_TIMESTAMP WHERE id = ?`
			).bind(userMessage, draft.id).run();

			return {
				message: `✅ Equipment details saved

**STEP 8 OF 11: Evidence Upload**

📸 Upload clear evidence so management can assess without delay.

**REQUIRED:** At least one of the following:
• 2 photos showing the issue
• 1 video (if malfunction/noise/movement)
• Screenshot (if software/display issue)

⚠️ **Note:** Photo upload will be available in your portal. For now, please describe what photos you would take and type "PHOTOS READY" when you're prepared to upload them via the admin dashboard.

*Or type "SKIP" if you cannot provide photos (may delay processing)*`,
				step: 8,
				completed: false
			};
		}

		return {
			message: `❌ Please answer: Yes, No, or Not sure`,
			step: 7,
			completed: false
		};
	}

	/**
	 * STEP 8: Evidence Upload
	 */
	private async handleStep8(c: Context, draft: any, userMessage: string) {
		const lowerMsg = userMessage.toLowerCase();

		if (lowerMsg.includes("photos ready") || lowerMsg.includes("ready")) {
			await c.env.DB.prepare(
				`UPDATE maintenance_request_drafts SET evidence_uploaded = 1, current_step = 9, updated_at = CURRENT_TIMESTAMP WHERE id = ?`
			).bind(draft.id).run();
		} else if (lowerMsg.includes("skip")) {
			await c.env.DB.prepare(
				`UPDATE maintenance_request_drafts SET evidence_uploaded = 0, current_step = 9, updated_at = CURRENT_TIMESTAMP WHERE id = ?`
			).bind(draft.id).run();
		} else {
			return {
				message: `Please type "PHOTOS READY" when you're ready to proceed, or "SKIP" to continue without photos.`,
				step: 8,
				completed: false
			};
		}

		return {
			message: `✅ Evidence noted

**STEP 9 OF 11: Access & Availability**

When can someone access this area for inspection or repair?

Please provide:
1. Preferred days/times
2. On-site contact for access
3. Special access needs (keys, codes, etc.)

*Example: "Weekdays 9am-5pm, Contact Sarah Johnson 555-9876, Need key from church office"*`,
			step: 9,
			completed: false
		};
	}

	/**
	 * STEP 9: Access & Availability
	 */
	private async handleStep9(c: Context, draft: any, userMessage: string) {
		const accessInfo = userMessage.trim();

		if (accessInfo.length < 20) {
			return {
				message: `❌ Please provide complete access information:
• When (days/times)
• Who to contact
• Any special access requirements`,
				step: 9,
				completed: false
			};
		}

		// Parse access info (simple approach)
		await c.env.DB.prepare(
			`UPDATE maintenance_request_drafts SET access_window = ?, current_step = 10, updated_at = CURRENT_TIMESTAMP WHERE id = ?`
		).bind(accessInfo, draft.id).run();

		return {
			message: `✅ Access information saved

**STEP 10 OF 11: Liability Confirmation**

⚖️ **IMPORTANT LEGAL ACKNOWLEDGMENT**

By submitting this request, you confirm:

✓ The information provided is accurate and truthful
✓ You understand that if the issue is caused by negligence, misuse, or unauthorized activity, your organization may be financially responsible for repair or replacement

**Do you agree to these terms?**

Type:
• **I AGREE** to confirm and proceed
• **I DO NOT AGREE** to cancel this request`,
			step: 10,
			completed: false
		};
	}

	/**
	 * STEP 10: Liability Confirmation
	 */
	private async handleStep10(c: Context, draft: any, userMessage: string) {
		const lowerMsg = userMessage.toLowerCase();

		if (lowerMsg.match(/i agree|yes|confirm|accept/)) {
			await c.env.DB.prepare(
				`UPDATE maintenance_request_drafts SET liability_confirmed = 1, current_step = 11, updated_at = CURRENT_TIMESTAMP WHERE id = ?`
			).bind(draft.id).run();

			return {
				message: `✅ Terms accepted

**STEP 11 OF 11: Final Submission**

Please review your request:

📍 Location: ${draft.location}
📋 Category: ${draft.issue_category}
⚡ Urgency: ${draft.urgency_level}
👤 Contact: ${draft.contact_name} (${draft.organization_name})

Type **SUBMIT** to finalize your request, or **CANCEL** to discard.`,
				step: 11,
				completed: false
			};
		} else if (lowerMsg.match(/i do not agree|no|cancel|disagree/)) {
			// Cancel the request
			await c.env.DB.prepare(
				`DELETE FROM maintenance_request_drafts WHERE id = ?`
			).bind(draft.id).run();

			return {
				message: `❌ Maintenance request cancelled.

Your information has been discarded. You can start a new request anytime by saying "I need to submit a maintenance request".`,
				step: 1,
				completed: true
			};
		}

		return {
			message: `Please respond with "I AGREE" or "I DO NOT AGREE"`,
			step: 10,
			completed: false
		};
	}

	/**
	 * STEP 11: Final Submission
	 */
	private async handleStep11(c: Context, draft: any, userMessage: string) {
		const lowerMsg = userMessage.toLowerCase();

		if (!lowerMsg.includes("submit")) {
			if (lowerMsg.includes("cancel")) {
				await c.env.DB.prepare(
					`DELETE FROM maintenance_request_drafts WHERE id = ?`
				).bind(draft.id).run();

				return {
					message: `Request cancelled.`,
					step: 1,
					completed: true
				};
			}

			return {
				message: `Type **SUBMIT** to finalize, or **CANCEL** to discard.`,
				step: 11,
				completed: false
			};
		}

		// Generate ticket number
		const year = new Date().getFullYear();
		const randomNum = Math.floor(Math.random() * 10000).toString().padStart(4, '0');
		const ticketNumber = `HCX-${year}-${randomNum}`;

		// Create final maintenance request
		await c.env.DB.prepare(
			`INSERT INTO maintenance_requests
			(ticket_number, conversation_id, tenant_name, unit_number, category, priority, description, status,
			 organization_name, contact_name, contact_role, contact_phone, contact_email,
			 location, location_details, urgency_level, incident_description, probable_cause,
			 equipment_involved, equipment_details, access_window, liability_confirmed)
			VALUES (?, ?, ?, ?, ?, ?, ?, 'open', ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 1)`
		).bind(
			ticketNumber,
			draft.conversation_id,
			draft.organization_name || draft.contact_name,
			draft.location,
			draft.issue_category,
			draft.urgency_level === "Critical" || draft.urgency_level === "High" ? "high" : "medium",
			draft.incident_description,
			draft.organization_name,
			draft.contact_name,
			draft.contact_role,
			draft.contact_phone,
			draft.contact_email,
			draft.location,
			draft.location_details || null,
			draft.urgency_level,
			draft.incident_description,
			draft.probable_cause,
			draft.equipment_involved,
			draft.equipment_details,
			draft.access_window,
		).run();

		// Mark draft as completed
		await c.env.DB.prepare(
			`UPDATE maintenance_request_drafts SET completed = 1, ticket_number = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?`
		).bind(ticketNumber, draft.id).run();

		// Log activity
		await c.env.DB.prepare(
			`INSERT INTO activity_log (user_name, action_type, action_description, unit_number)
			VALUES (?, ?, ?, ?)`
		).bind(
			draft.contact_name,
			"maintenance_request_submitted",
			`Maintenance request ${ticketNumber} submitted - ${draft.issue_category} - ${draft.urgency_level} priority`,
			draft.location
		).run();

		const urgencyResponse = draft.urgency_level === "Critical"
			? "🚨 **CRITICAL** - Building Management has been notified immediately and will contact you ASAP."
			: draft.urgency_level === "High"
			? "🔴 **HIGH PRIORITY** - We'll address this within 24 hours."
			: draft.urgency_level === "Medium"
			? "🟡 **MEDIUM PRIORITY** - We'll address this within 2-3 business days."
			: "🟢 **LOW PRIORITY** - We'll address this within 1 week.";

		return {
			message: `✅ **MAINTENANCE REQUEST SUBMITTED**

📋 **Ticket Number:** ${ticketNumber}

Your report has been officially logged and sent to Building Management.

${urgencyResponse}

**Next Steps:**
• Building Management will review your request
• You'll be contacted at: ${draft.contact_phone}
• Check status anytime in the admin dashboard

⚠️ **Important:** Do not attempt further repairs unless authorized.

${draft.urgency_level !== "Critical" ? "\n💡 Would you like guidance on preventing this issue in the future? (Yes/No)" : ""}`,
			step: 11,
			completed: true
		};
	}
}
