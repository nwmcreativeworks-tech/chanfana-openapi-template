import { z } from "zod";

// Conversation schema
export const Conversation = z.object({
	id: z.number().int().positive().optional(),
	session_id: z.string().uuid(),
	tenant_name: z.string().optional(),
	unit_number: z.string().optional(),
	created_at: z.string().datetime().optional(),
	updated_at: z.string().datetime().optional(),
});

export type ConversationType = z.infer<typeof Conversation>;

// Message schema
export const Message = z.object({
	id: z.number().int().positive().optional(),
	conversation_id: z.number().int().positive(),
	role: z.enum(["user", "assistant", "system"]),
	content: z.string(),
	created_at: z.string().datetime().optional(),
});

export type MessageType = z.infer<typeof Message>;

// Photo schema
export const Photo = z.object({
	name: z.string(),
	data: z.string(), // base64 encoded image
	type: z.string(), // MIME type (e.g., "image/jpeg")
});

// Chat request schema
export const ChatRequest = z.object({
	message: z.string().min(1).max(2000),
	session_id: z.string().uuid().optional(),
	tenant_name: z.string().optional(),
	unit_number: z.string().optional(),
	photos: z.array(Photo).max(3).optional(),
});

export type ChatRequestType = z.infer<typeof ChatRequest>;

// Chat response schema
export const ChatResponse = z.object({
	session_id: z.string().uuid(),
	message: z.string(),
	suggestions: z.array(z.string()).optional(),
	action_taken: z
		.object({
			type: z.string(),
			details: z.any(),
		})
		.optional(),
});

export type ChatResponseType = z.infer<typeof ChatResponse>;
