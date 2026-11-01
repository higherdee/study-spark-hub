import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireCurrentUserId } from "./auth.server";
import { answerDocumentQuestion } from "./document-study.server";
export const askDocumentQuestionServerFn = createServerFn({ method: "POST" }).validator((input: unknown) => z.object({ materialId: z.string().min(1).max(100), threadId: z.string().uuid().optional(), message: z.string().trim().min(1).max(6000) }).strict().parse(input)).handler(async ({ data }) => answerDocumentQuestion(await requireCurrentUserId(), data));
