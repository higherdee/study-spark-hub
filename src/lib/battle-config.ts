import { z } from "zod";

/** Shared validation keeps custom form values and server requests in agreement. */
export const battleConfigSchema = z.object({
  groupId: z.string().min(1),
  hostId: z.string().min(1),
  hostName: z.string().min(1).max(120),
  hostAvatar: z.string().nullable().optional(),
  title: z.string().trim().min(3, "Give your battle a topic of at least 3 characters.").max(120),
  mode: z.enum(["mcq", "theory"]),
  sourceSummary: z.string().max(20000).optional(),
  sourceContext: z.string().max(200000).optional(),
  timePerQuestion: z.number().int().min(5).max(300).nullable().optional(),
  questionCount: z.number().int().min(1).max(20).optional(),
  stakeAmount: z.number().int().min(0).max(10000).optional(),
  fighterIds: z.array(z.string().min(1)).min(1).max(100),
  sponsoredIds: z.array(z.string().min(1)).max(100).optional(),
});
