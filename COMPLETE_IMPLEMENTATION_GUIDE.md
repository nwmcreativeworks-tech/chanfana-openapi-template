# 🎯 NWM Media Troubleshooting System - Complete Implementation Guide

## Table of Contents
1. [System Overview](#system-overview)
2. [Complete File Structure](#complete-file-structure)
3. [Step-by-Step Implementation](#step-by-step-implementation)
4. [All Code Files](#all-code-files)
5. [Deployment Instructions](#deployment-instructions)
6. [Testing Guide](#testing-guide)
7. [Customization](#customization)

---

## System Overview

### What This System Does

✅ **AI-Powered Troubleshooting**: Automatically searches knowledge base and provides step-by-step fixes
✅ **Scope Limited**: ONLY responds to media/AV questions (video, audio, presentation)
✅ **Smart Escalation**: Creates support tickets when quick fixes fail
✅ **Photo Upload**: Users can attach images/videos of issues
✅ **Success Tracking**: Records which guides work best
✅ **12 Pre-Loaded Guides**: Ready-to-use troubleshooting for common equipment

### Supported Equipment
- **Video**: vMix, Capture Cards, Cameras
- **Audio**: Behringer WING, X-AIR, Zoom Mixers, Microphones
- **Presentation**: Proclaim

---

## Complete File Structure

```
chanfana-openapi-template/
├── migrations/
│   └── 0016_add_media_troubleshooting.sql          # Database schema
├── src/
│   ├── endpoints/
│   │   ├── troubleshooting/
│   │   │   ├── search.ts                           # Search API
│   │   │   ├── escalate.ts                         # Escalation API
│   │   │   └── router.ts                           # Router
│   │   └── chat/
│   │       ├── mediaTroubleshooting.ts             # AI Workflow
│   │       └── chatMessage.ts                      # (Modified)
│   └── index.ts                                    # (Modified)
├── MEDIA_TROUBLESHOOTING_SETUP.md                  # Full docs
├── QUICK_START.md                                  # Quick reference
└── COMPLETE_IMPLEMENTATION_GUIDE.md                # This file
```

---

## Step-by-Step Implementation

### Prerequisites

1. **Cloudflare Account** with Workers enabled
2. **Wrangler CLI** installed: `npm install -g wrangler`
3. **Authenticated**: `wrangler login`
4. **Existing D1 Database** named `DB`

### Installation Steps

#### Step 1: Create All Files

Copy all code from the [All Code Files](#all-code-files) section below.

#### Step 2: Run Database Migration

```bash
npx wrangler d1 migrations apply DB --remote
```

**Expected Output:**
```
✔ Migrations applied successfully:
  - 0016_add_media_troubleshooting.sql
```

#### Step 3: Deploy to Cloudflare

```bash
npx wrangler deploy
```

**Expected Output:**
```
✔ Built successfully
✔ Published to https://tenant-support-chatbot.nwmcreativeworks.workers.dev
```

#### Step 4: Verify Deployment

```bash
curl "https://tenant-support-chatbot.nwmcreativeworks.workers.dev/troubleshooting/devices"
```

**Expected Response:**
```json
{
  "success": true,
  "devices": [
    {"device": "vMix", "category": "Video"},
    {"device": "Behringer WING", "category": "Audio"},
    ...
  ]
}
```

---

## All Code Files

### 1. Database Migration

**File:** `migrations/0016_add_media_troubleshooting.sql`

```sql
-- Migration: Add NWM Media Troubleshooting Knowledge Base
-- Created: 2025-12-29
-- Purpose: Store equipment-specific troubleshooting guides for AV/Media support

CREATE TABLE IF NOT EXISTS media_troubleshooting (
    id INTEGER PRIMARY KEY AUTOINCREMENT NOT NULL,
    category TEXT NOT NULL CHECK(category IN ('Video', 'Audio', 'Presentation', 'Connectivity')),
    device TEXT NOT NULL,
    issue TEXT NOT NULL,
    quick_fix TEXT NOT NULL, -- JSON array of steps
    advanced_redirect TEXT NOT NULL,
    keywords TEXT, -- Space-separated keywords for search
    times_used INTEGER DEFAULT 0,
    success_rate REAL DEFAULT 0.0,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Indexes for fast searching
CREATE INDEX IF NOT EXISTS idx_media_troubleshooting_category ON media_troubleshooting(category);
CREATE INDEX IF NOT EXISTS idx_media_troubleshooting_device ON media_troubleshooting(device);
CREATE INDEX IF NOT EXISTS idx_media_troubleshooting_keywords ON media_troubleshooting(keywords);

-- Insert NWM Creative Works troubleshooting guides
INSERT INTO media_troubleshooting (category, device, issue, quick_fix, advanced_redirect, keywords) VALUES
-- Video Issues
(
    'Video',
    'vMix',
    'My capture card doesn''t show video',
    '["Check USB or PCIe connection", "Confirm camera is powered on", "Verify input is added in VMix using ''Add Input > Camera''", "Check selected resolution matches camera output", "Restart vMix and reconnect device"]',
    'Escalate to Advanced Media Support',
    'vmix capture card video black screen usb pcie camera input'
),
(
    'Video',
    'Capture Card',
    'Computer does not detect capture card',
    '["Try different USB port", "Use powered USB hub", "Update drivers", "Restart computer", "Try different cable"]',
    'Escalate to Advanced Media Support',
    'capture card usb detect drivers computer connection'
),

-- Audio Issues - Behringer WING
(
    'Audio',
    'Behringer WING',
    'No sound is coming out of speakers',
    '["Check master fader level", "Unmute main bus", "Verify speaker is powered on", "Confirm output routing to Main L/R", "Test with known-working mic"]',
    'Escalate to Advanced Media Support',
    'behringer wing audio sound speaker output routing mute fader'
),
(
    'Audio',
    'Behringer WING',
    'Microphone is too low',
    '["Raise channel gain", "Check mic placement", "Increase fader level", "Disable pad if active", "Apply light compression"]',
    'Escalate to Advanced Media Support',
    'behringer wing microphone low volume gain fader quiet'
),
(
    'Audio',
    'Behringer WING',
    'Feedback is happening',
    '["Lower main volume", "Move mic away from speaker", "Reduce high frequency EQ", "Use low-cut filter", "Check mic position"]',
    'Escalate to Advanced Media Support',
    'behringer wing feedback squeal echo microphone speaker eq frequency'
),

-- Audio Issues - X-AIR
(
    'Audio',
    'X-AIR',
    'Mixer not connecting to WiFi',
    '["Restart mixer", "Confirm WiFi light is active", "Reconnect device to correct network", "Restart tablet/phone", "Move closer to router"]',
    'Escalate to Advanced Media Support',
    'xair x-air wifi connection network tablet app reconnect'
),
(
    'Audio',
    'X-AIR',
    'No sound from one channel',
    '["Unmute channel", "Check gain knob", "Confirm routing", "Try different XLR cable", "Test on another channel"]',
    'Escalate to Advanced Media Support',
    'xair x-air channel audio sound mute gain xlr cable routing'
),

-- Audio Issues - Zoom Mixer
(
    'Audio',
    'Zoom Mixer',
    'Participants can''t hear',
    '["Confirm correct mic selected in Zoom", "Unmute in Zoom", "Test mic in computer settings", "Reconnect USB", "Restart Zoom"]',
    'Escalate to Advanced Media Support',
    'zoom mixer microphone audio mute participants hear settings usb'
),
(
    'Audio',
    'Zoom Mixer',
    'Echo in Zoom call',
    '["Use headphones", "Reduce speaker volume", "Disable ''Original Sound''", "Check for multiple mics", "Mute extra devices"]',
    'Escalate to Advanced Media Support',
    'zoom mixer echo feedback loop speaker headphones original sound'
),

-- Audio Issues - Microphone
(
    'Audio',
    'Microphone',
    'No audio from microphone',
    '["Check XLR cable", "Turn on phantom power if needed", "Test on another channel", "Ensure not muted", "Test with second mic"]',
    'Escalate to Advanced Media Support',
    'microphone audio xlr phantom power cable mute channel connection'
),

-- Presentation Issues - Proclaim
(
    'Presentation',
    'Proclaim',
    'Slides are not displaying on screen',
    '["Check display settings", "Confirm correct output screen", "Restart Proclaim", "Ensure HDMI is connected", "Test with second monitor"]',
    'Escalate to Advanced Media Support',
    'proclaim slides display screen hdmi output monitor projection'
),
(
    'Presentation',
    'Proclaim',
    'Video not playing in Proclaim',
    '["Ensure file is fully uploaded", "Check file format compatibility", "Restart Proclaim", "Test video outside Proclaim", "Reinsert file"]',
    'Escalate to Advanced Media Support',
    'proclaim video playback format upload file compatibility codec'
);

-- Escalation tracking table
CREATE TABLE IF NOT EXISTS troubleshooting_escalations (
    id INTEGER PRIMARY KEY AUTOINCREMENT NOT NULL,
    troubleshooting_id INTEGER NOT NULL,
    session_id TEXT NOT NULL,
    user_name TEXT,
    user_email TEXT,
    escalation_reason TEXT NOT NULL,
    photos TEXT, -- JSON array of base64 images
    status TEXT DEFAULT 'pending' CHECK(status IN ('pending', 'in_progress', 'resolved', 'cancelled')),
    assigned_to TEXT,
    resolution_notes TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    resolved_at DATETIME,
    FOREIGN KEY (troubleshooting_id) REFERENCES media_troubleshooting(id) ON DELETE SET NULL
);

CREATE INDEX IF NOT EXISTS idx_troubleshooting_escalations_session ON troubleshooting_escalations(session_id);
CREATE INDEX IF NOT EXISTS idx_troubleshooting_escalations_status ON troubleshooting_escalations(status);
CREATE INDEX IF NOT EXISTS idx_troubleshooting_escalations_created ON troubleshooting_escalations(created_at);
```

---

### 2. Search API Endpoint

**File:** `src/endpoints/troubleshooting/search.ts`

```typescript
import { OpenAPIRoute, OpenAPIRouteSchema } from "chanfana";
import { Context } from "hono";
import { z } from "zod";

/**
 * Search Media Troubleshooting Knowledge Base
 * Finds relevant troubleshooting guides based on user query
 */
export class SearchTroubleshooting extends OpenAPIRoute {
	schema: OpenAPIRouteSchema = {
		tags: ["Troubleshooting"],
		summary: "Search troubleshooting guides",
		request: {
			query: z.object({
				query: z.string().min(3).describe("Search query (issue description, device name, etc)"),
				category: z.enum(["Video", "Audio", "Presentation", "Connectivity"]).optional(),
				device: z.string().optional(),
			}),
		},
		responses: {
			"200": {
				description: "Returns matching troubleshooting guides",
			},
		},
	};

	async handle(c: Context) {
		try {
			const { query, category, device } = this.getValidatedData<typeof this.schema>();

			// Build search query
			let sql = `
				SELECT
					id,
					category,
					device,
					issue,
					quick_fix,
					advanced_redirect,
					times_used,
					success_rate
				FROM media_troubleshooting
				WHERE 1=1
			`;
			const params: any[] = [];

			// Category filter
			if (category) {
				sql += ` AND category = ?`;
				params.push(category);
			}

			// Device filter
			if (device) {
				sql += ` AND LOWER(device) LIKE LOWER(?)`;
				params.push(`%${device}%`);
			}

			// Keyword search (search in issue, device, and keywords)
			const searchTerms = query.toLowerCase().split(' ').filter(t => t.length > 2);
			if (searchTerms.length > 0) {
				const keywordConditions = searchTerms.map(() =>
					`(LOWER(issue) LIKE ? OR LOWER(device) LIKE ? OR LOWER(keywords) LIKE ?)`
				).join(' OR ');

				sql += ` AND (${keywordConditions})`;

				searchTerms.forEach(term => {
					const searchPattern = `%${term}%`;
					params.push(searchPattern, searchPattern, searchPattern);
				});
			}

			// Order by success rate and usage
			sql += ` ORDER BY success_rate DESC, times_used DESC LIMIT 5`;

			const results = await c.env.DB.prepare(sql).bind(...params).all();

			// Parse JSON quick_fix arrays
			const guides = results.results.map((row: any) => ({
				...row,
				quick_fix: JSON.parse(row.quick_fix || '[]'),
			}));

			return c.json({
				success: true,
				count: guides.length,
				guides,
			});

		} catch (error) {
			console.error("Troubleshooting search error:", error);
			return c.json({
				success: false,
				error: "Failed to search troubleshooting guides",
			}, 500);
		}
	}
}

/**
 * Get All Devices
 * Returns list of all supported devices
 */
export class GetDevices extends OpenAPIRoute {
	schema: OpenAPIRouteSchema = {
		tags: ["Troubleshooting"],
		summary: "Get all supported devices",
		responses: {
			"200": {
				description: "Returns list of devices",
			},
		},
	};

	async handle(c: Context) {
		try {
			const results = await c.env.DB.prepare(`
				SELECT DISTINCT device, category
				FROM media_troubleshooting
				ORDER BY category, device
			`).all();

			return c.json({
				success: true,
				devices: results.results,
			});

		} catch (error) {
			console.error("Get devices error:", error);
			return c.json({
				success: false,
				error: "Failed to get devices",
			}, 500);
		}
	}
}

/**
 * Record Troubleshooting Usage
 * Track when a guide is used and whether it worked
 */
export class RecordUsage extends OpenAPIRoute {
	schema: OpenAPIRouteSchema = {
		tags: ["Troubleshooting"],
		summary: "Record troubleshooting guide usage",
		request: {
			body: {
				content: {
					"application/json": {
						schema: z.object({
							guide_id: z.number(),
							worked: z.boolean(),
						}),
					},
				},
			},
		},
		responses: {
			"200": {
				description: "Usage recorded",
			},
		},
	};

	async handle(c: Context) {
		try {
			const data = await this.getValidatedData<typeof this.schema>();
			const { guide_id, worked } = data.body;

			// Get current stats
			const guide = await c.env.DB.prepare(
				`SELECT times_used, success_rate FROM media_troubleshooting WHERE id = ?`
			).bind(guide_id).first();

			if (!guide) {
				return c.json({ success: false, error: "Guide not found" }, 404);
			}

			// Calculate new success rate
			const timesUsed = (guide.times_used || 0) + 1;
			const currentSuccesses = (guide.success_rate || 0) * (guide.times_used || 0);
			const newSuccesses = currentSuccesses + (worked ? 1 : 0);
			const newSuccessRate = newSuccesses / timesUsed;

			// Update stats
			await c.env.DB.prepare(`
				UPDATE media_troubleshooting
				SET times_used = ?, success_rate = ?, updated_at = CURRENT_TIMESTAMP
				WHERE id = ?
			`).bind(timesUsed, newSuccessRate, guide_id).run();

			return c.json({
				success: true,
				times_used: timesUsed,
				success_rate: newSuccessRate,
			});

		} catch (error) {
			console.error("Record usage error:", error);
			return c.json({
				success: false,
				error: "Failed to record usage",
			}, 500);
		}
	}
}
```

---

### 3. Escalation API Endpoint

**File:** `src/endpoints/troubleshooting/escalate.ts`

```typescript
import { OpenAPIRoute, OpenAPIRouteSchema } from "chanfana";
import { Context } from "hono";
import { z } from "zod";

/**
 * Escalate Troubleshooting Issue
 * Creates a support ticket when quick fixes don't work
 */
export class EscalateTroubleshooting extends OpenAPIRoute {
	schema: OpenAPIRouteSchema = {
		tags: ["Troubleshooting"],
		summary: "Escalate to advanced support",
		request: {
			body: {
				content: {
					"application/json": {
						schema: z.object({
							troubleshooting_id: z.number().optional(),
							session_id: z.string(),
							user_name: z.string(),
							user_email: z.string().email(),
							escalation_reason: z.string(),
							photos: z.array(z.object({
								name: z.string(),
								data: z.string(), // base64
								type: z.string(),
							})).optional(),
							device: z.string(),
							issue_description: z.string(),
						}),
					},
				},
			},
		},
		responses: {
			"200": {
				description: "Escalation created successfully",
			},
		},
	};

	async handle(c: Context) {
		try {
			const data = await this.getValidatedData<typeof this.schema>();
			const {
				troubleshooting_id,
				session_id,
				user_name,
				user_email,
				escalation_reason,
				photos,
				device,
				issue_description,
			} = data.body;

			// Store photos as JSON
			const photosJson = photos ? JSON.stringify(photos) : null;

			// Create escalation ticket
			const result = await c.env.DB.prepare(`
				INSERT INTO troubleshooting_escalations
				(troubleshooting_id, session_id, user_name, user_email, escalation_reason, photos)
				VALUES (?, ?, ?, ?, ?, ?)
			`).bind(
				troubleshooting_id || null,
				session_id,
				user_name,
				user_email,
				escalation_reason,
				photosJson
			).run();

			const escalationId = result.meta.last_row_id;

			// Create admin request log
			await c.env.DB.prepare(`
				INSERT INTO admin_request_logs
				(request_type, message_details, status, source, session_id)
				VALUES (?, ?, ?, ?, ?)
			`).bind(
				'Media Support Escalation',
				`${user_name} (${user_email}) needs help with ${device}: ${issue_description}`,
				'Active',
				'Troubleshooting Bot',
				session_id
			).run();

			return c.json({
				success: true,
				escalation_id: escalationId,
				message: "Your request has been escalated to NWM Creative Works Advanced Media Support. We'll contact you within 24 hours.",
			});

		} catch (error) {
			console.error("Escalation error:", error);
			return c.json({
				success: false,
				error: "Failed to create escalation",
			}, 500);
		}
	}
}

/**
 * Get User's Escalations
 * Returns escalation tickets for a user
 */
export class GetEscalations extends OpenAPIRoute {
	schema: OpenAPIRouteSchema = {
		tags: ["Troubleshooting"],
		summary: "Get user escalations",
		request: {
			query: z.object({
				session_id: z.string().optional(),
				email: z.string().email().optional(),
				status: z.enum(["pending", "in_progress", "resolved", "cancelled"]).optional(),
			}),
		},
		responses: {
			"200": {
				description: "Returns escalation tickets",
			},
		},
	};

	async handle(c: Context) {
		try {
			const { session_id, email, status } = this.getValidatedData<typeof this.schema>();

			let sql = `
				SELECT
					e.*,
					m.device,
					m.issue
				FROM troubleshooting_escalations e
				LEFT JOIN media_troubleshooting m ON m.id = e.troubleshooting_id
				WHERE 1=1
			`;
			const params: any[] = [];

			if (session_id) {
				sql += ` AND e.session_id = ?`;
				params.push(session_id);
			}

			if (email) {
				sql += ` AND e.user_email = ?`;
				params.push(email);
			}

			if (status) {
				sql += ` AND e.status = ?`;
				params.push(status);
			}

			sql += ` ORDER BY e.created_at DESC`;

			const results = await c.env.DB.prepare(sql).bind(...params).all();

			// Parse photos JSON
			const escalations = results.results.map((row: any) => ({
				...row,
				photos: row.photos ? JSON.parse(row.photos) : [],
			}));

			return c.json({
				success: true,
				escalations,
			});

		} catch (error) {
			console.error("Get escalations error:", error);
			return c.json({
				success: false,
				error: "Failed to get escalations",
			}, 500);
		}
	}
}
```

---

### 4. Router Configuration

**File:** `src/endpoints/troubleshooting/router.ts`

```typescript
import { fromHono } from "chanfana";
import { Hono } from "hono";
import { SearchTroubleshooting, GetDevices, RecordUsage } from "./search";
import { EscalateTroubleshooting, GetEscalations } from "./escalate";

const troubleshootingRouter = new Hono<{ Bindings: Env }>();

const troubleshootingApi = fromHono(troubleshootingRouter, {
	docs_url: null,
});

// Search and browse
troubleshootingApi.get("/search", SearchTroubleshooting);
troubleshootingApi.get("/devices", GetDevices);
troubleshootingApi.post("/usage", RecordUsage);

// Escalations
troubleshootingApi.post("/escalate", EscalateTroubleshooting);
troubleshootingApi.get("/escalations", GetEscalations);

export default troubleshootingRouter;
```

---

### 5. AI Workflow

**File:** `src/endpoints/chat/mediaTroubleshooting.ts`

```typescript
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
```

---

### 6. Chat Integration (Modification)

**File:** `src/endpoints/chat/chatMessage.ts`

**CHANGES TO MAKE:**

1. Add import at top:
```typescript
import { MediaTroubleshootingWorkflow } from "./mediaTroubleshooting";
```

2. Replace the `vmix_support` handler (around line 174):
```typescript
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
	// ... rest of code
```

---

### 7. Main Router (Modification)

**File:** `src/index.ts`

**CHANGES TO MAKE:**

1. Add import at top (around line 9):
```typescript
import troubleshootingRouter from "./endpoints/troubleshooting/router";
```

2. Register router (around line 193):
```typescript
// Register Chatbot routers
openapi.route("/chat", chatRouter);
openapi.route("/maintenance", maintenanceRouter);
openapi.route("/thermostat", thermostatRouter);
openapi.route("/troubleshooting", troubleshootingRouter);  // ← ADD THIS LINE
```

---

## Deployment Instructions

### Method 1: Using Git (Recommended)

```bash
# 1. Pull latest code
git pull origin claude/tenant-support-chatbot-01XrnRtApwpzz6gJbVNzCdwi

# 2. Run migration
npx wrangler d1 migrations apply DB --remote

# 3. Deploy
npx wrangler deploy
```

### Method 2: Manual File Creation

```bash
# 1. Create migration file
mkdir -p migrations
# Copy code from section 1 above into migrations/0016_add_media_troubleshooting.sql

# 2. Create troubleshooting endpoints
mkdir -p src/endpoints/troubleshooting
# Copy code from sections 2, 3, 4 into respective files

# 3. Create AI workflow
# Copy code from section 5 into src/endpoints/chat/mediaTroubleshooting.ts

# 4. Update existing files
# Follow instructions in sections 6 and 7

# 5. Run migration
npx wrangler d1 migrations apply DB --remote

# 6. Deploy
npx wrangler deploy
```

---

## Testing Guide

### Test 1: Search Endpoint

```bash
curl "https://tenant-support-chatbot.nwmcreativeworks.workers.dev/troubleshooting/search?query=vmix%20capture%20card"
```

**Expected Response:**
```json
{
  "success": true,
  "count": 1,
  "guides": [
    {
      "id": 1,
      "category": "Video",
      "device": "vMix",
      "issue": "My capture card doesn't show video",
      "quick_fix": [
        "Check USB or PCIe connection",
        "Confirm camera is powered on",
        "Verify input is added in VMix using 'Add Input > Camera'",
        "Check selected resolution matches camera output",
        "Restart vMix and reconnect device"
      ],
      "advanced_redirect": "Escalate to Advanced Media Support",
      "times_used": 0,
      "success_rate": 0.0
    }
  ]
}
```

### Test 2: Get Devices

```bash
curl "https://tenant-support-chatbot.nwmcreativeworks.workers.dev/troubleshooting/devices"
```

**Expected Response:**
```json
{
  "success": true,
  "devices": [
    {"device": "Behringer WING", "category": "Audio"},
    {"device": "Capture Card", "category": "Video"},
    {"device": "Microphone", "category": "Audio"},
    {"device": "Proclaim", "category": "Presentation"},
    {"device": "X-AIR", "category": "Audio"},
    {"device": "Zoom Mixer", "category": "Audio"},
    {"device": "vMix", "category": "Video"}
  ]
}
```

### Test 3: Chat Integration

```bash
curl -X POST "https://tenant-support-chatbot.nwmcreativeworks.workers.dev/chat" \
  -H "Content-Type: application/json" \
  -d '{
    "message": "My vMix capture card is not showing video",
    "tenant_name": "Test User"
  }'
```

**Expected:** Bot returns troubleshooting steps

### Test 4: Escalation

```bash
curl -X POST "https://tenant-support-chatbot.nwmcreativeworks.workers.dev/troubleshooting/escalate" \
  -H "Content-Type: application/json" \
  -d '{
    "troubleshooting_id": 1,
    "session_id": "test-session-123",
    "user_name": "John Doe",
    "user_email": "john@example.com",
    "escalation_reason": "Quick fixes did not work",
    "device": "vMix",
    "issue_description": "Capture card still not detecting camera after trying all steps"
  }'
```

**Expected Response:**
```json
{
  "success": true,
  "escalation_id": 1,
  "message": "Your request has been escalated to NWM Creative Works Advanced Media Support. We'll contact you within 24 hours."
}
```

### Test 5: Record Usage

```bash
curl -X POST "https://tenant-support-chatbot.nwmcreativeworks.workers.dev/troubleshooting/usage" \
  -H "Content-Type: application/json" \
  -d '{
    "guide_id": 1,
    "worked": true
  }'
```

**Expected Response:**
```json
{
  "success": true,
  "times_used": 1,
  "success_rate": 1.0
}
```

---

## Customization

### Add New Equipment

```sql
INSERT INTO media_troubleshooting
(category, device, issue, quick_fix, advanced_redirect, keywords)
VALUES (
  'Audio',
  'Shure SM7B',
  'Microphone sounds muffled',
  '["Remove foam windscreen", "Check for presence boost switch", "Increase gain on interface", "Position mic closer to source", "Enable high-pass filter"]',
  'Escalate to Advanced Media Support',
  'shure sm7b microphone muffled audio gain quiet low'
);
```

### Update Contact Info

Edit `src/endpoints/chat/mediaTroubleshooting.ts`:

```typescript
// Around line 65
"If you need hands-on help, I can escalate this to our Advanced Media Support team. Contact: support@nwmcreativeworks.com or 904-555-1234."
```

### Adjust AI Response Length

Edit `src/endpoints/chat/mediaTroubleshooting.ts`:

```typescript
// Around line 150
const aiResponse = await c.env.AI.run('@cf/meta/llama-3.1-8b-instruct', {
	messages: aiMessages,
	max_tokens: 300,  // Reduce from 500 for shorter responses
});
```

---

## Monitoring & Analytics

### View Success Rates

```sql
SELECT
  device,
  issue,
  times_used,
  ROUND(success_rate * 100, 1) as success_percentage
FROM media_troubleshooting
WHERE times_used > 0
ORDER BY success_rate DESC;
```

### View Pending Escalations

```sql
SELECT
  e.id,
  e.user_name,
  e.user_email,
  m.device,
  m.issue,
  e.created_at
FROM troubleshooting_escalations e
LEFT JOIN media_troubleshooting m ON m.id = e.troubleshooting_id
WHERE e.status = 'pending'
ORDER BY e.created_at DESC;
```

### Most Used Guides

```sql
SELECT
  device,
  issue,
  times_used,
  ROUND(success_rate * 100, 1) as success_percentage
FROM media_troubleshooting
ORDER BY times_used DESC
LIMIT 10;
```

---

## Troubleshooting

### Issue: Migration fails

**Solution:**
```bash
# Check existing migrations
npx wrangler d1 migrations list DB --remote

# If 0016 already exists, skip it
```

### Issue: Search returns no results

**Solution:** Check keywords in database:
```sql
SELECT id, device, issue, keywords
FROM media_troubleshooting
WHERE device = 'vMix';
```

### Issue: AI responses too long

**Solution:** Reduce `max_tokens` in mediaTroubleshooting.ts (line 150)

---

## Summary Checklist

- [ ] Create all files from sections 1-5
- [ ] Modify chatMessage.ts (section 6)
- [ ] Modify index.ts (section 7)
- [ ] Run migration: `npx wrangler d1 migrations apply DB --remote`
- [ ] Deploy: `npx wrangler deploy`
- [ ] Test search endpoint
- [ ] Test chat integration
- [ ] Test escalation flow
- [ ] Update NWM contact info
- [ ] Monitor success rates weekly

---

## System Architecture

```
User asks question → Chat detects media keywords
                   ↓
         MediaTroubleshootingWorkflow
                   ↓
    Searches media_troubleshooting table
                   ↓
         AI generates response with steps
                   ↓
    User tries steps → Records success/failure
                   ↓
    If fails → Escalate to support ticket
```

---

**🎉 System Complete and Ready for Deployment!**

**Built by NWM Creative Works**
**Last Updated:** December 29, 2025
