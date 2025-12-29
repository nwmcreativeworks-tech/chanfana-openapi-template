import { Context } from "hono";

/**
 * NWM Media Troubleshooting Workflow
 * AI-powered troubleshooting assistant for AV/Media equipment
 */
export class MediaTroubleshootingWorkflow {

	/**
	 * Check if message is media/AV related
	 */
	isMediaRelated(message: string): boolean {
		const mediaKeywords = [
			// Video
			'vmix', 'capture card', 'camera', 'video', 'screen', 'display', 'hdmi',
			'monitor', 'projection', 'stream', 'recording',
			// Audio
			'audio', 'sound', 'microphone', 'mic', 'speaker', 'mixer', 'behringer',
			'wing', 'x-air', 'xair', 'zoom', 'feedback', 'echo', 'volume', 'mute',
			'gain', 'xlr', 'phantom power',
			// Presentation
			'proclaim', 'slides', 'powerpoint', 'presentation',
			// General
			'equipment', 'media', 'tech', 'av', 'production',
		];

		const lowerMessage = message.toLowerCase();
		return mediaKeywords.some(keyword => lowerMessage.includes(keyword));
	}

	/**
	 * Search troubleshooting database for relevant guides
	 */
	async searchTroubleshooting(c: Context, query: string): Promise<any[]> {
		const searchTerms = query.toLowerCase().split(' ').filter(t => t.length > 2);

		if (searchTerms.length === 0) {
			return [];
		}

		// Build search query
		const keywordConditions = searchTerms.map(() =>
			`(LOWER(issue) LIKE ? OR LOWER(device) LIKE ? OR LOWER(keywords) LIKE ?)`
		).join(' OR ');

		const sql = `
			SELECT
				id,
				category,
				device,
				issue,
				quick_fix,
				advanced_redirect,
				success_rate,
				times_used
			FROM media_troubleshooting
			WHERE ${keywordConditions}
			ORDER BY success_rate DESC, times_used DESC
			LIMIT 3
		`;

		const params: any[] = [];
		searchTerms.forEach(term => {
			const searchPattern = `%${term}%`;
			params.push(searchPattern, searchPattern, searchPattern);
		});

		try {
			const results = await c.env.DB.prepare(sql).bind(...params).all();

			return results.results.map((row: any) => ({
				...row,
				quick_fix: JSON.parse(row.quick_fix || '[]'),
			}));
		} catch (error) {
			console.error("Search troubleshooting error:", error);
			return [];
		}
	}

	/**
	 * Generate AI prompt for media troubleshooting
	 */
	generateTroubleshootingPrompt(userMessage: string, guides: any[]): string {
		if (guides.length === 0) {
			return `
You are the NWM Creative Works Virtual Media Support Assistant. A user has asked about a media/AV issue, but I couldn't find a specific troubleshooting guide in the database.

User's message: "${userMessage}"

Your role:
1. **Acknowledge** the issue
2. **Ask clarifying questions** to identify the exact device and problem
3. **Suggest general troubleshooting steps** if applicable
4. **Offer escalation** to NWM Creative Works Advanced Media Support

Supported equipment categories:
- Video: vMix, Capture Cards, Cameras
- Audio: Behringer WING, X-AIR, Zoom Mixers, Microphones
- Presentation: Proclaim

Format your response as:
- Friendly and professional
- Clear numbered steps
- Mention that NWM Creative Works specializes in AV/Media support
- End with: "If you need hands-on help, I can escalate this to our Advanced Media Support team."

IMPORTANT: If they ask about business planning, contracts, or advanced setup (not basic troubleshooting), respond:
"This assistant is built for media and AV troubleshooting only. For advanced setup, business planning, or professional services, please contact NWM Creative Works directly at [contact info]."
`;
		}

		// Format guides for AI
		const guidesText = guides.map((guide, i) => `
**Guide ${i + 1}: ${guide.device} - ${guide.issue}**
Category: ${guide.category}
Quick Fix Steps:
${guide.quick_fix.map((step: string, j: number) => `${j + 1}. ${step}`).join('\n')}
Success Rate: ${(guide.success_rate * 100).toFixed(0)}%
${guide.advanced_redirect}
`).join('\n\n---\n\n');

		return `
You are the NWM Creative Works Virtual Media Support Assistant. You have access to proven troubleshooting guides.

User's issue: "${userMessage}"

**Relevant Troubleshooting Guides:**
${guidesText}

Your task:
1. **Identify** which guide best matches the user's issue
2. **Present the quick fix steps** in a friendly, clear format
3. **Explain each step** briefly if needed
4. **Ask if it worked** after presenting the steps
5. **Offer escalation** if steps don't resolve the issue

Response format:
- Start with: "I found a solution for this!"
- Present steps clearly with numbering
- Use encouraging language
- End with: "Try these steps and let me know if it works! If not, I can escalate this to our Advanced Media Support team."

**Scope Limitation:**
- ONLY help with AV/Media troubleshooting
- If they ask about business, planning, or advanced setup, redirect to NWM Creative Works professional services

Keep responses concise and actionable!
`;
	}

	/**
	 * Handle troubleshooting workflow
	 */
	async handleTroubleshooting(
		c: Context,
		sessionId: string,
		conversationId: number,
		userMessage: string,
		tenantName?: string
	): Promise<{ message: string; guides: any[]; requiresFollowup: boolean }> {

		// Check if this is media-related
		if (!this.isMediaRelated(userMessage)) {
			return {
				message: "I'm the NWM Media Troubleshooting Assistant, specialized in video, audio, and presentation equipment support. How can I help with your AV/Media equipment today?",
				guides: [],
				requiresFollowup: false,
			};
		}

		// Search for relevant troubleshooting guides
		const guides = await this.searchTroubleshooting(c, userMessage);

		// Generate AI prompt
		const systemPrompt = this.generateTroubleshootingPrompt(userMessage, guides);

		// Call AI to generate response
		const aiMessages = [
			{ role: 'system', content: systemPrompt },
			{ role: 'user', content: userMessage },
		];

		try {
			const aiResponse = await c.env.AI.run('@cf/meta/llama-3.1-8b-instruct', {
				messages: aiMessages,
				max_tokens: 500,
			});

			let botMessage = '';
			if (aiResponse && typeof aiResponse === 'object' && 'response' in aiResponse) {
				botMessage = (aiResponse as any).response;
			} else {
				botMessage = "I'm having trouble generating a response. Please try again.";
			}

			// Log troubleshooting attempt
			if (guides.length > 0) {
				await c.env.DB.prepare(`
					INSERT INTO admin_request_logs
					(request_type, message_details, status, source, session_id)
					VALUES (?, ?, ?, ?, ?)
				`).bind(
					'Media Troubleshooting',
					`User ${tenantName || 'Unknown'} used guide: ${guides[0].device} - ${guides[0].issue}`,
					'Active',
					'Troubleshooting Bot',
					sessionId
				).run();
			}

			return {
				message: botMessage,
				guides,
				requiresFollowup: true,
			};

		} catch (error) {
			console.error("AI troubleshooting error:", error);
			return {
				message: "I encountered an error. Please try rephrasing your question, or I can escalate to our Advanced Media Support team.",
				guides,
				requiresFollowup: true,
			};
		}
	}

	/**
	 * Format troubleshooting response for chat
	 */
	formatResponse(aiMessage: string, guides: any[]): string {
		let response = aiMessage;

		// Add guide references if present
		if (guides.length > 0) {
			response += `\n\n---\n**Reference**: Based on ${guides.length} proven troubleshooting guide(s) from NWM Creative Works`;
		}

		return response;
	}
}
