import { z } from "zod";

export const MaintenanceRequest = z.object({
	id: z.number().int().positive().optional(),
	conversation_id: z.number().int().positive().nullable().optional(),
	tenant_name: z.string().min(1),
	unit_number: z.string().min(1),
	category: z.enum(["hvac", "plumbing", "electrical", "appliance", "media_equipment", "other"]),
	priority: z.enum(["low", "medium", "high", "emergency"]).default("medium"),
	description: z.string().min(10),
	status: z.enum(["open", "in_progress", "resolved", "closed"]).default("open"),
	created_at: z.string().datetime().optional(),
	updated_at: z.string().datetime().optional(),
	resolved_at: z.string().datetime().nullable().optional(),
});

export const MaintenanceRequestUpdate = z.object({
	status: z.enum(["open", "in_progress", "resolved", "closed"]).optional(),
	priority: z.enum(["low", "medium", "high", "emergency"]).optional(),
});

export type MaintenanceRequestType = z.infer<typeof MaintenanceRequest>;
export type MaintenanceRequestUpdateType = z.infer<typeof MaintenanceRequestUpdate>;
