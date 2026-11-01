import { z } from "zod";
export const preferencePatch = z.object({
  studyReminders: z.boolean().optional(), rewardAlerts: z.boolean().optional(), soundEnabled: z.boolean().optional(),
  studyGoalMinutes: z.number().int().min(30).max(720).multipleOf(30).optional(),
  idleTimeoutMinutes: z.number().int().min(15).max(240).optional(),
  bank: z.object({ name: z.string().trim().max(100), accountNumber: z.string().regex(/^(?:\d{10})?$/), accountName: z.string().trim().max(120) }).strict().optional(),
}).strict();
export type StudyPreferences = z.infer<typeof preferencePatch>;
export function defaultStudyGoal(date = new Date()) { return [0, 6].includes(date.getDay()) ? 150 : 90; }
