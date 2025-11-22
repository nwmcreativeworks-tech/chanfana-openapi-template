import { z } from "zod";

export const ThermostatSettings = z.object({
	id: z.number().int().positive().optional(),
	unit_number: z.string().min(1),
	current_temp: z.number().min(32).max(120).nullable().optional(),
	target_temp: z.number().min(65).max(78).default(72),
	mode: z.enum(["heat", "cool", "auto", "off"]).default("auto"),
	fan_mode: z.enum(["auto", "on"]).default("auto"),
	is_locked: z.number().int().min(0).max(1).default(0),
	min_temp: z.number().min(60).max(70).default(65),
	max_temp: z.number().min(75).max(85).default(78),
	updated_at: z.string().datetime().optional(),
	updated_by: z.string().optional(),
});

export const ThermostatUpdate = z.object({
	target_temp: z.number().min(65).max(78).optional(),
	mode: z.enum(["heat", "cool", "auto", "off"]).optional(),
	fan_mode: z.enum(["auto", "on"]).optional(),
});

export type ThermostatSettingsType = z.infer<typeof ThermostatSettings>;
export type ThermostatUpdateType = z.infer<typeof ThermostatUpdate>;
