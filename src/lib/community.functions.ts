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

export const searchPeersServerFn = createServerFn({ method: "GET" })
  .validator((d: { query: string; currentUserId?: string }) => d)
  .handler(async ({ data }) => {
    const { searchPeers } = await import("@/integrations/turso/community");
    return await searchPeers(data.query, data.currentUserId);
  });

export const checkUsernameAvailableServerFn = createServerFn({ method: "GET" })
  .validator((d: { username: string; excludeUserId?: string }) => d)
  .handler(async ({ data }) => {
    const { checkUsernameAvailable } = await import("@/integrations/turso/community");
    return await checkUsernameAvailable(data.username, data.excludeUserId);
  });

export const updateUsernameServerFn = createServerFn({ method: "POST" })
  .validator((d: { userId: string; username: string }) => d)
  .handler(async ({ data }) => {
    const { updateUsername } = await import("@/integrations/turso/community");
    return await updateUsername(data.userId, data.username);
  });

export const updateAvatarUrlServerFn = createServerFn({ method: "POST" })
  .validator((d: { userId: string; avatarUrl: string }) => d)
  .handler(async ({ data }) => {
    const { updateAvatarUrl } = await import("@/integrations/turso/community");
    return await updateAvatarUrl(data.userId, data.avatarUrl);
  });

export const getOrCreatePeerConversationServerFn = createServerFn({ method: "POST" })
  .validator((d: { user1Id: string; user2Id: string }) => d)
  .handler(async ({ data }) => {
    const { getOrCreatePeerConversation } = await import("@/integrations/turso/community");
    return await getOrCreatePeerConversation(data.user1Id, data.user2Id);
  });

export const getStudentConversationsServerFn = createServerFn({ method: "GET" })
  .validator((d: { userId: string }) => d)
  .handler(async ({ data }) => {
    const { getStudentConversations } = await import("@/integrations/turso/community");
    return await getStudentConversations(data.userId);
  });

export const getDirectMessagesServerFn = createServerFn({ method: "GET" })
  .validator((d: { conversationId: string }) => d)
  .handler(async ({ data }) => {
    const { getDirectMessages } = await import("@/integrations/turso/community");
    return await getDirectMessages(data.conversationId);
  });

export const sendDirectMessageServerFn = createServerFn({ method: "POST" })
  .validator((d: {
    conversationId: string;
    senderId: string;
    content: string;
    materialId?: string;
  }) => d)
  .handler(async ({ data }) => {
    const { sendDirectMessage } = await import("@/integrations/turso/community");
    return await sendDirectMessage(data);
  });

export const forwardMaterialToChatServerFn = createServerFn({ method: "POST" })
  .validator((d: {
    targetType: "peer" | "group";
    targetId: string;
    senderId: string;
    senderName: string;
    materialId: string;
    note?: string;
  }) => d)
  .handler(async ({ data }) => {
    const { sendDirectMessage, sendGroupMessage } = await import("@/integrations/turso/community");
    const content = data.note ? data.note.trim() : "Shared a course document with you.";

    if (data.targetType === "peer") {
      return await sendDirectMessage({
        conversationId: data.targetId,
        senderId: data.senderId,
        content,
        materialId: data.materialId,
      });
    } else {
      return await sendGroupMessage({
        groupId: data.targetId,
        userId: data.senderId,
        userName: data.senderName,
        content,
        materialId: data.materialId,
      });
    }
  });

