import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireCurrentUserId } from "./auth.server";
import { createAnswerShare, readAnswerShare } from "./sharing.server";
export const shareAnswerServerFn = createServerFn({ method: "POST" })
  .validator((data: unknown) =>
    z.object({ threadId: z.string().uuid(), content: z.string().min(1).max(100000) }).parse(data),
  )
  .handler(async ({ data }) => createAnswerShare(await requireCurrentUserId(), data));
export const readSharedAnswerServerFn = createServerFn({ method: "GET" })
  .validator((data: unknown) => z.object({ id: z.string().uuid() }).parse(data))
  .handler(async ({ data }) => {
    await requireCurrentUserId();
    return readAnswerShare(data.id);
  });
