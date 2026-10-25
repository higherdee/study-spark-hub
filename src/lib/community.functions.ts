import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import {
  getStudyGroups,
  createStudyGroup,
  joinStudyGroup,
  getGroupMessages,
  sendGroupMessage,
  updateStudentStreak,
} from "@/integrations/turso/community.server";
import { getMaterials } from "@/integrations/turso/client.server";
import { requireAdmin, requireCurrentUserId, requireSelfOrAdmin } from "@/lib/auth.server";

export const getStudyGroupsServerFn = createServerFn({ method: "GET" })
  .validator((d: { userId?: string; query?: string } | undefined) => d || {})
  .handler(async ({ data }) => {
    const userId = await requireCurrentUserId();
    if (data.userId && data.userId !== userId) throw new Error("Forbidden");
    return await getStudyGroups(userId, data.query);
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
    await requireSelfOrAdmin(data.userId);
    return await createStudyGroup(data);
  });

export const joinStudyGroupServerFn = createServerFn({ method: "POST" })
  .validator((d: { groupId: string; userId: string }) => d)
  .handler(async ({ data }) => {
    await requireSelfOrAdmin(data.userId);
    return await joinStudyGroup(data.groupId, data.userId);
  });

export const getGroupMessagesServerFn = createServerFn({ method: "GET" })
  .validator((d: { groupId: string }) => d)
  .handler(async ({ data }) => {
    const userId = await requireCurrentUserId();
    return await getGroupMessages(data.groupId, 60, userId);
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
    await requireSelfOrAdmin(data.userId);
    const profile = await import("@/integrations/turso/client.server").then((db) => db.getProfile(data.userId));
    return await sendGroupMessage({ ...data, userName: profile?.full_name || "Student", userInstitution: profile?.institution || undefined });
  });

export const updateStreakServerFn = createServerFn({ method: "POST" })
  .validator((d: { userId: string }) => d)
  .handler(async ({ data }) => {
    await requireSelfOrAdmin(data.userId);
    return await updateStudentStreak(data.userId);
  });

export const getMaterialsForChatServerFn = createServerFn({ method: "GET" })
  .validator((d: { limit?: number } | undefined) => d || {})
  .handler(async ({ data }) => {
    await requireCurrentUserId();
    return await getMaterials({ status: "verified", limit: data.limit || 40 });
  });

export const searchPeersServerFn = createServerFn({ method: "GET" })
  .validator((d: { query: string; currentUserId?: string }) => d)
  .handler(async ({ data }) => {
    const userId = await requireCurrentUserId();
    if (data.currentUserId && data.currentUserId !== userId) throw new Error("Forbidden");
    const { searchPeers } = await import("@/integrations/turso/community.server");
    return await searchPeers(data.query, userId);
  });

export const checkUsernameAvailableServerFn = createServerFn({ method: "GET" })
  .validator((d: { username: string; excludeUserId?: string | undefined }) => d)
  .handler(async ({ data }) => {
    if (data.excludeUserId) await requireSelfOrAdmin(data.excludeUserId);
    const { checkUsernameAvailable } = await import("@/integrations/turso/community.server");
    return await checkUsernameAvailable(data.username, data.excludeUserId);
  });

export const updateUsernameServerFn = createServerFn({ method: "POST" })
  .validator((d: { userId: string; username: string }) => d)
  .handler(async ({ data }) => {
    await requireSelfOrAdmin(data.userId);
    const { updateUsername } = await import("@/integrations/turso/community.server");
    return await updateUsername(data.userId, data.username);
  });

export const updateAvatarUrlServerFn = createServerFn({ method: "POST" })
  .validator((d: { userId: string; avatarUrl: string }) => d)
  .handler(async ({ data }) => {
    await requireSelfOrAdmin(data.userId);
    const { updateAvatarUrl } = await import("@/integrations/turso/community.server");
    return await updateAvatarUrl(data.userId, data.avatarUrl);
  });

export const getOrCreatePeerConversationServerFn = createServerFn({ method: "POST" })
  .validator((d: { user1Id: string; user2Id: string }) => d)
  .handler(async ({ data }) => {
    const actor = await requireCurrentUserId();
    if (data.user1Id !== actor) throw new Error("Forbidden");
    const { getOrCreatePeerConversation } = await import("@/integrations/turso/community.server");
    return await getOrCreatePeerConversation(data.user1Id, data.user2Id);
  });

export const getStudentConversationsServerFn = createServerFn({ method: "GET" })
  .validator((d: { userId: string }) => d)
  .handler(async ({ data }) => {
    await requireSelfOrAdmin(data.userId);
    const { getStudentConversations } = await import("@/integrations/turso/community.server");
    return await getStudentConversations(data.userId);
  });

export const getDirectMessagesServerFn = createServerFn({ method: "GET" })
  .validator((d: { conversationId: string }) => d)
  .handler(async ({ data }) => {
    const userId = await requireCurrentUserId();
    const { getDirectMessages } = await import("@/integrations/turso/community.server");
    return await getDirectMessages(data.conversationId, 80, userId);
  });

export const sendDirectMessageServerFn = createServerFn({ method: "POST" })
  .validator((d: {
    conversationId: string;
    senderId: string;
    content: string;
    materialId?: string;
  }) => d)
  .handler(async ({ data }) => {
    await requireSelfOrAdmin(data.senderId);
    const { sendDirectMessage } = await import("@/integrations/turso/community.server");
    return await sendDirectMessage(data);
  });

export const markDirectMessagesReadServerFn = createServerFn({ method: "POST" })
  .validator((d: { conversationId: string; readerUserId: string }) => d)
  .handler(async ({ data }) => {
    await requireSelfOrAdmin(data.readerUserId);
    const { markDirectMessagesRead } = await import("@/integrations/turso/community.server");
    await markDirectMessagesRead(data.conversationId, data.readerUserId);
    return { success: true };
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
    await requireSelfOrAdmin(data.senderId);
    const { sendDirectMessage, sendGroupMessage } = await import("@/integrations/turso/community.server");
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

export const editDirectMessageServerFn = createServerFn({ method: "POST" })
  .validator((d: { messageId: string; userId: string; newContent: string }) => d)
  .handler(async ({ data }) => {
    await requireSelfOrAdmin(data.userId);
    const { editDirectMessage } = await import("@/integrations/turso/community.server");
    return await editDirectMessage(data);
  });

export const deleteDirectMessageServerFn = createServerFn({ method: "POST" })
  .validator((d: { messageId: string; userId: string }) => d)
  .handler(async ({ data }) => {
    await requireSelfOrAdmin(data.userId);
    const { deleteDirectMessage } = await import("@/integrations/turso/community.server");
    return await deleteDirectMessage(data);
  });

export const editGroupMessageServerFn = createServerFn({ method: "POST" })
  .validator((d: { messageId: string; userId: string; newContent: string }) => d)
  .handler(async ({ data }) => {
    await requireSelfOrAdmin(data.userId);
    const { editGroupMessage } = await import("@/integrations/turso/community.server");
    return await editGroupMessage(data);
  });

export const deleteGroupMessageServerFn = createServerFn({ method: "POST" })
  .validator((d: { messageId: string; userId: string }) => d)
  .handler(async ({ data }) => {
    await requireSelfOrAdmin(data.userId);
    const { deleteGroupMessage } = await import("@/integrations/turso/community.server");
    return await deleteGroupMessage(data);
  });

export const addMemberToStudyGroupServerFn = createServerFn({ method: "POST" })
  .validator((d: { groupId: string; memberUserId: string }) => d)
  .handler(async ({ data }) => {
    const actorUserId = await requireCurrentUserId();
    const { addMemberToStudyGroup } = await import("@/integrations/turso/community.server");
    return await addMemberToStudyGroup({ ...data, actorUserId });
  });




