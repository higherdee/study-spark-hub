import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import {
  getStudyGroups,
  createStudyGroup,
  joinStudyGroup,
  getGroupMessages,
  sendGroupMessage,
  updateStudentStreak,
} from "@/integrations/turso/community";
import { getMaterials } from "@/integrations/turso/client";

export const getStudyGroupsServerFn = createServerFn({ method: "GET" })
  .validator((d: { userId?: string; query?: string } | undefined) => d || {})
  .handler(async ({ data }) => {
    return await getStudyGroups(data.userId, data.query);
  });

export const createStudyGroupServerFn = createServerFn({ method: "POST" })
  .validator((d: {
    name: string;
    description?: string;
    course_code?: string;
    institution?: string;
    category?: string;
    userId: string;
    avatarColor?: string;
  }) => d)
  .handler(async ({ data }) => {
    return await createStudyGroup(data);
  });

export const joinStudyGroupServerFn = createServerFn({ method: "POST" })
  .validator((d: { groupId: string; userId: string }) => d)
  .handler(async ({ data }) => {
    return await joinStudyGroup(data.groupId, data.userId);
  });

export const getGroupMessagesServerFn = createServerFn({ method: "GET" })
  .validator((d: { groupId: string }) => d)
  .handler(async ({ data }) => {
    return await getGroupMessages(data.groupId);
  });

export const sendGroupMessageServerFn = createServerFn({ method: "POST" })
  .validator((d: {
    groupId: string;
    userId: string;
    userName: string;
    userInstitution?: string;
    content: string;
    materialId?: string;
    materialTitle?: string;
    materialCourseCode?: string;
  }) => d)
  .handler(async ({ data }) => {
    return await sendGroupMessage(data);
  });

export const updateStreakServerFn = createServerFn({ method: "POST" })
  .validator((d: { userId: string }) => d)
  .handler(async ({ data }) => {
    return await updateStudentStreak(data.userId);
  });

export const getMaterialsForChatServerFn = createServerFn({ method: "GET" })
  .validator((d: { limit?: number } | undefined) => d || {})
  .handler(async ({ data }) => {
    return await getMaterials({ status: "verified", limit: data.limit || 40 });
  });
