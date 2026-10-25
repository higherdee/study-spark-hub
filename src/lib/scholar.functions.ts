import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { getScholarFlexData, type ScholarFlexData } from "@/integrations/turso/scholar.server";

/**
 * Server function to fetch Campus Wrapped & Scholar Flex stats
 */
export const getScholarFlexDataServerFn = createServerFn({ method: "GET" })
  .validator((d: { userId?: string; username?: string }) => d)
  .handler(async ({ data }): Promise<ScholarFlexData | null> => {
    return await getScholarFlexData({
      userId: data.userId,
      username: data.username,
    });
  });

