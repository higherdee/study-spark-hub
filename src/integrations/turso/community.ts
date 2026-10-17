import { turso } from "./client";

export type StudyGroup = {
  id: string;
  name: string;
  description: string | null;
  course_code: string | null;
  institution: string | null;
  category: string;
  created_by: string;
  avatar_color: string;
  created_at: string;
  member_count: number;
  is_member?: boolean;
};

export type GroupMessage = {
  id: string;
  group_id: string;
  user_id: string;
  user_name: string;
  user_institution: string | null;
  content: string;
  material_id: string | null;
  material_title: string | null;
  material_course_code: string | null;
  created_at: string;
};

export type StreakStatus = {
  currentStreak: number;
  longestStreak: number;
  lastStreakDate: string;
  streakMaintainedToday: boolean;
  dailyGoalMinutes: number;
};

/**
 * Updates student daily reading streak
 */
export async function updateStudentStreak(userId: string): Promise<StreakStatus> {
  const rs = await turso.execute({
    sql: "SELECT current_streak, longest_streak, last_streak_date, daily_reading_goal_minutes FROM profiles WHERE id = ? LIMIT 1",
    args: [userId],
  });

  if (rs.rows.length === 0) {
    return {
      currentStreak: 0,
      longestStreak: 0,
      lastStreakDate: "",
      streakMaintainedToday: false,
      dailyGoalMinutes: 20,
    };
  }

  const row = rs.rows[0] as unknown as Record<string, unknown>;
  const currentStreak = Number(row.current_streak) || 0;
  const longestStreak = Number(row.longest_streak) || 0;
  const lastStreakDate = String(row.last_streak_date || "");
  const dailyGoalMinutes = Number(row.daily_reading_goal_minutes) || 20;

  const today = new Date().toISOString().slice(0, 10);
  const yesterdayDate = new Date(Date.now() - 86400000).toISOString().slice(0, 10);

  if (lastStreakDate === today) {
    return {
      currentStreak,
      longestStreak,
      lastStreakDate,
      streakMaintainedToday: true,
      dailyGoalMinutes,
    };
  }

  let nextStreak = 1;
  if (lastStreakDate === yesterdayDate) {
    nextStreak = currentStreak + 1;
  }

  const nextLongest = Math.max(longestStreak, nextStreak);

  await turso.execute({
    sql: `UPDATE profiles 
          SET current_streak = ?, longest_streak = ?, last_streak_date = ?, updated_at = datetime('now')
          WHERE id = ?`,
    args: [nextStreak, nextLongest, today, userId],
  });

  return {
    currentStreak: nextStreak,
    longestStreak: nextLongest,
    lastStreakDate: today,
    streakMaintainedToday: true,
    dailyGoalMinutes,
  };
}

/**
 * Fetches all active study groups with optional search query
 */
export async function getStudyGroups(userId?: string, query?: string): Promise<StudyGroup[]> {
  let sql = `SELECT * FROM study_groups`;
  const args: any[] = [];

  if (query && query.trim()) {
    sql += ` WHERE name LIKE ? OR course_code LIKE ? OR institution LIKE ? OR description LIKE ?`;
    const q = `%${query.trim()}%`;
    args.push(q, q, q, q);
  }

  sql += ` ORDER BY member_count DESC, created_at DESC LIMIT 50`;

  const rs = await turso.execute({ sql, args });

  let userMemberGroupIds = new Set<string>();
  if (userId) {
    const memRs = await turso.execute({
      sql: `SELECT group_id FROM study_group_members WHERE user_id = ?`,
      args: [userId],
    });
    userMemberGroupIds = new Set(memRs.rows.map((r) => String(r.group_id)));
  }

  return rs.rows.map((r: any) => ({
    id: String(r.id),
    name: String(r.name),
    description: r.description ? String(r.description) : null,
    course_code: r.course_code ? String(r.course_code) : null,
    institution: r.institution ? String(r.institution) : null,
    category: String(r.category || "General"),
    created_by: String(r.created_by),
    avatar_color: String(r.avatar_color || "#4f46e5"),
    created_at: String(r.created_at),
    member_count: Number(r.member_count || 1),
    is_member: userMemberGroupIds.has(String(r.id)),
  }));
}

/**
 * Creates a brand new study group
 */
export async function createStudyGroup(data: {
  name: string;
  description?: string;
  course_code?: string;
  institution?: string;
  category?: string;
  userId: string;
  avatarColor?: string;
}): Promise<StudyGroup> {
  const id = `group-${crypto.randomUUID()}`;
  const now = new Date().toISOString();
  const color = data.avatarColor || "#4f46e5";

  await turso.batch([
    {
      sql: `INSERT INTO study_groups (id, name, description, course_code, institution, category, created_by, avatar_color, created_at, member_count)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 1)`,
      args: [
        id,
        data.name.trim(),
        data.description?.trim() || null,
        data.course_code?.trim() || null,
        data.institution?.trim() || "All Universities",
        data.category?.trim() || "General",
        data.userId,
        color,
        now,
      ],
    },
    {
      sql: `INSERT INTO study_group_members (id, group_id, user_id, role, joined_at)
            VALUES (?, ?, ?, 'admin', ?)`,
      args: [crypto.randomUUID(), id, data.userId, now],
    },
    {
      sql: `INSERT INTO group_messages (id, group_id, user_id, user_name, user_institution, content, created_at)
            VALUES (?, ?, 'system', 'Boss Community AI', ?, ?, ?)`,
      args: [
        crypto.randomUUID(),
        id,
        data.institution || "Syllaboss",
        `Study group "${data.name}" created! Welcome fellow students to discuss course topics and share academic materials.`,
        now,
      ],
    },
  ]);

  return {
    id,
    name: data.name.trim(),
    description: data.description?.trim() || null,
    course_code: data.course_code?.trim() || null,
    institution: data.institution?.trim() || null,
    category: data.category?.trim() || "General",
    created_by: data.userId,
    avatar_color: color,
    created_at: now,
    member_count: 1,
    is_member: true,
  };
}

/**
 * Joins an existing study group
 */
export async function joinStudyGroup(groupId: string, userId: string): Promise<boolean> {
  try {
    await turso.batch([
      {
        sql: `INSERT OR IGNORE INTO study_group_members (id, group_id, user_id, role)
              VALUES (?, ?, ?, 'member')`,
        args: [crypto.randomUUID(), groupId, userId],
      },
      {
        sql: `UPDATE study_groups SET member_count = member_count + 1 WHERE id = ?`,
        args: [groupId],
      },
    ]);
    return true;
  } catch (err) {
    return false;
  }
}

/**
 * Fetches recent messages for a group
 */
export async function getGroupMessages(groupId: string, limit = 60): Promise<GroupMessage[]> {
  const rs = await turso.execute({
    sql: `SELECT * FROM group_messages WHERE group_id = ? ORDER BY created_at ASC LIMIT ?`,
    args: [groupId, limit],
  });

  return rs.rows.map((r: any) => ({
    id: String(r.id),
    group_id: String(r.group_id),
    user_id: String(r.user_id),
    user_name: String(r.user_name),
    user_institution: r.user_institution ? String(r.user_institution) : null,
    content: String(r.content),
    material_id: r.material_id ? String(r.material_id) : null,
    material_title: r.material_title ? String(r.material_title) : null,
    material_course_code: r.material_course_code ? String(r.material_course_code) : null,
    created_at: String(r.created_at),
  }));
}

/**
 * Sends a message in a study group (with optional attached library material)
 */
export async function sendGroupMessage(data: {
  groupId: string;
  userId: string;
  userName: string;
  userInstitution?: string;
  content: string;
  materialId?: string;
  materialTitle?: string;
  materialCourseCode?: string;
}): Promise<GroupMessage> {
  const id = crypto.randomUUID();
  const now = new Date().toISOString();

  await turso.execute({
    sql: `INSERT INTO group_messages (id, group_id, user_id, user_name, user_institution, content, material_id, material_title, material_course_code, created_at)
          VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    args: [
      id,
      data.groupId,
      data.userId,
      data.userName,
      data.userInstitution || null,
      data.content.trim(),
      data.materialId || null,
      data.materialTitle || null,
      data.materialCourseCode || null,
      now,
    ],
  });

  return {
    id,
    group_id: data.groupId,
    user_id: data.userId,
    user_name: data.userName,
    user_institution: data.userInstitution || null,
    content: data.content.trim(),
    material_id: data.materialId || null,
    material_title: data.materialTitle || null,
    material_course_code: data.materialCourseCode || null,
    created_at: now,
  };
}

export type PeerUser = {
  id: string;
  username: string;
  full_name: string;
  avatar_url: string | null;
  institution: string | null;
  course: string | null;
  level: string | null;
  points: number;
};

export type DirectConversation = {
  id: string;
  peer: PeerUser;
  last_message_text: string | null;
  last_message_at: string;
  unread_count: number;
};

export type DirectMessage = {
  id: string;
  conversation_id: string;
  sender_id: string;
  sender_name: string;
  sender_avatar: string | null;
  content: string;
  material_id: string | null;
  material_title?: string | null;
  material_course?: string | null;
  created_at: string;
  is_read: boolean;
};

/**
 * Searches students strictly by @username for privacy protection
 */
export async function searchPeers(query: string, currentUserId?: string, limit = 20): Promise<PeerUser[]> {
  const stripped = query.trim().toLowerCase().replace(/^@/, "");
  const cleanQ = `%${stripped}%`;
  const rs = await turso.execute({
    sql: `SELECT id, username, full_name, avatar_url, institution, course, level, points
          FROM profiles
          WHERE id != ? AND LOWER(COALESCE(username, '')) LIKE ?
          ORDER BY points DESC
          LIMIT ?`,
    args: [currentUserId || "", cleanQ, limit],
  });

  return rs.rows.map((r: any) => ({
    id: String(r.id),
    username: String(r.username || r.id.slice(-6)),
    full_name: String(r.full_name || "Scholar"),
    avatar_url: r.avatar_url ? String(r.avatar_url) : null,
    institution: r.institution ? String(r.institution) : null,
    course: r.course ? String(r.course) : null,
    level: r.level ? String(r.level) : null,
    points: Number(r.points || 0),
  }));
}

/**
 * Validates whether a username is available (case-insensitive)
 */
export async function checkUsernameAvailable(username: string, excludeUserId?: string): Promise<{ available: boolean; message?: string }> {
  const clean = username.trim().toLowerCase();
  if (clean.length < 3) return { available: false, message: "Username must be at least 3 characters" };
  if (clean.length > 25) return { available: false, message: "Username cannot exceed 25 characters" };
  if (!/^[a-z0-9_]+$/.test(clean)) return { available: false, message: "Only letters, numbers, and underscores allowed" };

  const rs = await turso.execute({
    sql: "SELECT id FROM profiles WHERE LOWER(username) = ? AND id != ? LIMIT 1",
    args: [clean, excludeUserId || ""],
  });

  if (rs.rows.length > 0) {
    return { available: false, message: "Username is already taken" };
  }
  return { available: true };
}

/**
 * Sets user profile username
 */
export async function updateUsername(userId: string, username: string): Promise<{ success: boolean; username: string }> {
  const check = await checkUsernameAvailable(username, userId);
  if (!check.available) {
    throw new Error(check.message || "Username is not available");
  }

  const clean = username.trim().toLowerCase();
  await turso.execute({
    sql: "UPDATE profiles SET username = ?, updated_at = datetime('now') WHERE id = ?",
    args: [clean, userId],
  });
  return { success: true, username: clean };
}

/**
 * Sets user profile avatar
 */
export async function updateAvatarUrl(userId: string, avatarUrl: string): Promise<boolean> {
  await turso.execute({
    sql: "UPDATE profiles SET avatar_url = ?, updated_at = datetime('now') WHERE id = ?",
    args: [avatarUrl, userId],
  });
  return true;
}

/**
 * Finds or creates a 1-on-1 direct peer conversation
 */
export async function getOrCreatePeerConversation(user1Id: string, user2Id: string): Promise<{ id: string; peer: PeerUser }> {
  const rs = await turso.execute({
    sql: `SELECT id FROM direct_conversations 
          WHERE (user1_id = ? AND user2_id = ?) OR (user1_id = ? AND user2_id = ?) 
          LIMIT 1`,
    args: [user1Id, user2Id, user2Id, user1Id],
  });

  let convId = rs.rows[0]?.id ? String(rs.rows[0].id) : null;
  if (!convId) {
    convId = crypto.randomUUID();
    await turso.execute({
      sql: `INSERT INTO direct_conversations (id, user1_id, user2_id, last_message_text, last_message_at)
            VALUES (?, ?, ?, 'Started conversation', datetime('now'))`,
      args: [convId, user1Id, user2Id],
    });
  }

  const peerRs = await turso.execute({
    sql: `SELECT id, username, full_name, avatar_url, institution, course, level, points FROM profiles WHERE id = ? LIMIT 1`,
    args: [user2Id],
  });

  const p = peerRs.rows[0] as any;
  const peer: PeerUser = {
    id: user2Id,
    username: p?.username || user2Id.slice(-6),
    full_name: p?.full_name || "Scholar",
    avatar_url: p?.avatar_url || null,
    institution: p?.institution || null,
    course: p?.course || null,
    level: p?.level || null,
    points: Number(p?.points || 0),
  };

  return { id: convId, peer };
}

/**
 * Retrieves all direct conversations for a user with real unread counts
 */
export async function getStudentConversations(userId: string): Promise<DirectConversation[]> {
  const rs = await turso.execute({
    sql: `
      SELECT 
        c.id, c.user1_id, c.user2_id, c.last_message_text, c.last_message_at,
        p.id as peer_id, p.username as peer_username, p.full_name as peer_full_name,
        p.avatar_url as peer_avatar_url, p.institution as peer_institution,
        p.course as peer_course, p.level as peer_level, p.points as peer_points,
        (
          SELECT COUNT(*) 
          FROM direct_messages dm 
          WHERE dm.conversation_id = c.id 
            AND dm.sender_id != ? 
            AND (dm.is_read = 0 OR dm.is_read IS NULL)
        ) as unread_count
      FROM direct_conversations c
      JOIN profiles p ON p.id = CASE WHEN c.user1_id = ? THEN c.user2_id ELSE c.user1_id END
      WHERE c.user1_id = ? OR c.user2_id = ?
      ORDER BY c.last_message_at DESC
    `,
    args: [userId, userId, userId, userId],
  });

  return rs.rows.map((r: any) => ({
    id: String(r.id),
    peer: {
      id: String(r.peer_id),
      username: String(r.peer_username || r.peer_id.slice(-6)),
      full_name: String(r.peer_full_name || "Scholar"),
      avatar_url: r.peer_avatar_url ? String(r.peer_avatar_url) : null,
      institution: r.peer_institution ? String(r.peer_institution) : null,
      course: r.peer_course ? String(r.peer_course) : null,
      level: r.peer_level ? String(r.peer_level) : null,
      points: Number(r.peer_points || 0),
    },
    last_message_text: r.last_message_text ? String(r.last_message_text) : null,
    last_message_at: String(r.last_message_at || ""),
    unread_count: Number(r.unread_count || 0),
  }));
}

/**
 * Marks all incoming messages in a conversation as read
 */
export async function markDirectMessagesRead(conversationId: string, readerUserId: string): Promise<void> {
  await turso.execute({
    sql: "UPDATE direct_messages SET is_read = 1 WHERE conversation_id = ? AND sender_id != ?",
    args: [conversationId, readerUserId],
  });
}

/**
 * Fetches messages in a 1-on-1 conversation
 */
export async function getDirectMessages(conversationId: string, limit = 80): Promise<DirectMessage[]> {
  const rs = await turso.execute({
    sql: `
      SELECT 
        m.id, m.conversation_id, m.sender_id, m.content, m.material_id, m.created_at, m.is_read,
        p.username as sender_username, p.full_name as sender_name, p.avatar_url as sender_avatar,
        mat.title as mat_title, mat.course as mat_course
      FROM direct_messages m
      JOIN profiles p ON p.id = m.sender_id
      LEFT JOIN materials mat ON mat.id = m.material_id
      WHERE m.conversation_id = ?
      ORDER BY m.created_at ASC
      LIMIT ?
    `,
    args: [conversationId, limit],
  });

  return rs.rows.map((r: any) => ({
    id: String(r.id),
    conversation_id: String(r.conversation_id),
    sender_id: String(r.sender_id),
    sender_name: String(r.sender_username ? `@${r.sender_username}` : r.sender_name || "Scholar"),
    sender_avatar: r.sender_avatar ? String(r.sender_avatar) : null,
    content: String(r.content),
    material_id: r.material_id ? String(r.material_id) : null,
    material_title: r.mat_title ? String(r.mat_title) : null,
    material_course: r.mat_course ? String(r.mat_course) : null,
    created_at: String(r.created_at),
    is_read: Boolean(r.is_read),
  }));
}

/**
 * Sends a 1-on-1 direct message
 */
export async function sendDirectMessage(data: {
  conversationId: string;
  senderId: string;
  content: string;
  materialId?: string;
}): Promise<DirectMessage> {
  const id = crypto.randomUUID();
  const now = new Date().toISOString();

  await turso.execute({
    sql: `INSERT INTO direct_messages (id, conversation_id, sender_id, content, material_id, created_at, is_read)
          VALUES (?, ?, ?, ?, ?, datetime('now'), 0)`,
    args: [id, data.conversationId, data.senderId, data.content.trim(), data.materialId || null],
  });

  await turso.execute({
    sql: `UPDATE direct_conversations SET last_message_text = ?, last_message_at = datetime('now') WHERE id = ?`,
    args: [data.content.slice(0, 100), data.conversationId],
  });

  const pRs = await turso.execute({
    sql: "SELECT username, full_name, avatar_url FROM profiles WHERE id = ? LIMIT 1",
    args: [data.senderId],
  });
  const sender = pRs.rows[0] as any;

  let matTitle: string | null = null;
  let matCourse: string | null = null;
  if (data.materialId) {
    const matRs = await turso.execute({
      sql: "SELECT title, course FROM materials WHERE id = ? LIMIT 1",
      args: [data.materialId],
    });
    matTitle = matRs.rows[0]?.title ? String(matRs.rows[0].title) : null;
    matCourse = matRs.rows[0]?.course ? String(matRs.rows[0].course) : null;
  }

  return {
    id,
    conversation_id: data.conversationId,
    sender_id: data.senderId,
    sender_name: sender?.username ? `@${sender.username}` : sender?.full_name || "Scholar",
    sender_avatar: sender?.avatar_url || null,
    content: data.content.trim(),
    material_id: data.materialId || null,
    material_title: matTitle,
    material_course: matCourse,
    created_at: now,
    is_read: false,
  };
}

/**
 * Edit a direct message if sent within 10 minutes
 */
export async function editDirectMessage(data: {
  messageId: string;
  userId: string;
  newContent: string;
}): Promise<boolean> {
  const rs = await turso.execute({
    sql: `SELECT sender_id, created_at FROM direct_messages WHERE id = ? LIMIT 1`,
    args: [data.messageId],
  });
  if (rs.rows.length === 0) return false;
  const msg = rs.rows[0] as any;
  if (msg.sender_id !== data.userId) return false;

  const createdAt = new Date(String(msg.created_at)).getTime();
  const diffMinutes = (Date.now() - createdAt) / (1000 * 60);
  if (diffMinutes > 10) {
    throw new Error("Messages can only be edited within 10 minutes of sending.");
  }

  await turso.execute({
    sql: `UPDATE direct_messages SET content = ? WHERE id = ? AND sender_id = ?`,
    args: [data.newContent.trim(), data.messageId, data.userId],
  });
  return true;
}

/**
 * Delete a direct message
 */
export async function deleteDirectMessage(data: {
  messageId: string;
  userId: string;
}): Promise<boolean> {
  await turso.execute({
    sql: `DELETE FROM direct_messages WHERE id = ? AND sender_id = ?`,
    args: [data.messageId, data.userId],
  });
  return true;
}

/**
 * Edit a group message if sent within 10 minutes
 */
export async function editGroupMessage(data: {
  messageId: string;
  userId: string;
  newContent: string;
}): Promise<boolean> {
  const rs = await turso.execute({
    sql: `SELECT user_id, created_at FROM group_messages WHERE id = ? LIMIT 1`,
    args: [data.messageId],
  });
  if (rs.rows.length === 0) return false;
  const msg = rs.rows[0] as any;
  if (msg.user_id !== data.userId) return false;

  const createdAt = new Date(String(msg.created_at)).getTime();
  const diffMinutes = (Date.now() - createdAt) / (1000 * 60);
  if (diffMinutes > 10) {
    throw new Error("Messages can only be edited within 10 minutes of sending.");
  }

  await turso.execute({
    sql: `UPDATE group_messages SET content = ? WHERE id = ? AND user_id = ?`,
    args: [data.newContent.trim(), data.messageId, data.userId],
  });
  return true;
}

/**
 * Delete a group message
 */
export async function deleteGroupMessage(data: {
  messageId: string;
  userId: string;
}): Promise<boolean> {
  await turso.execute({
    sql: `DELETE FROM group_messages WHERE id = ? AND user_id = ?`,
    args: [data.messageId, data.userId],
  });
  return true;
}

/**
 * Add a peer to a study group
 */
export async function addMemberToStudyGroup(data: {
  groupId: string;
  memberUserId: string;
}): Promise<boolean> {
  await turso.batch([
    {
      sql: `INSERT OR IGNORE INTO study_group_members (id, group_id, user_id, role, joined_at)
            VALUES (?, ?, ?, 'member', datetime('now'))`,
      args: [crypto.randomUUID(), data.groupId, data.memberUserId],
    },
    {
      sql: `UPDATE study_groups SET member_count = member_count + 1 WHERE id = ?`,
      args: [data.groupId],
    },
  ]);
  return true;
}

export type GroupMemberWithBalance = {
  id: string;
  full_name: string;
  username: string | null;
  avatar_url: string | null;
  points: number;
};

/**
 * Fetch all members of a study group (or 1v1 direct conversation) with their live points balance
 */
export async function getStudyGroupMembersWithBalances(groupId: string): Promise<GroupMemberWithBalance[]> {
  // 1. Check if this ID belongs to a 1v1 direct conversation
  const directRs = await turso.execute({
    sql: `SELECT user1_id, user2_id FROM direct_conversations WHERE id = ? LIMIT 1`,
    args: [groupId],
  });

  if (directRs.rows.length > 0) {
    const row = directRs.rows[0] as any;
    const pRs = await turso.execute({
      sql: `SELECT id, full_name, username, avatar_url, points FROM profiles WHERE id IN (?, ?)`,
      args: [String(row.user1_id), String(row.user2_id)],
    });
    return pRs.rows.map((r: any) => ({
      id: String(r.id),
      full_name: String(r.full_name || "Student"),
      username: r.username ? String(r.username) : null,
      avatar_url: r.avatar_url ? String(r.avatar_url) : null,
      points: Number(r.points) || 0,
    }));
  }

  // 2. Otherwise fetch group members from study_group_members
  const rs = await turso.execute({
    sql: `SELECT p.id, p.full_name, p.username, p.avatar_url, p.points
          FROM study_group_members sgm
          JOIN profiles p ON p.id = sgm.user_id
          WHERE sgm.group_id = ?
          ORDER BY p.full_name ASC`,
    args: [groupId],
  });

  return rs.rows.map((r: any) => ({
    id: String(r.id),
    full_name: String(r.full_name || "Student"),
    username: r.username ? String(r.username) : null,
    avatar_url: r.avatar_url ? String(r.avatar_url) : null,
    points: Number(r.points) || 0,
  }));
}

/**
 * Sends a battle announcement (challenge drop or conclusion receipt)
 * into either a study group stream or a 1v1 direct peer conversation
 */
export async function sendBattleAnnouncementMessage(data: {
  targetId: string;
  userId: string;
  userName: string;
  userInstitution?: string | undefined;
  content: string;
  materialId?: string | undefined;
  materialTitle?: string | undefined;
  materialCourseCode?: string | undefined;
}): Promise<any> {
  const directRs = await turso.execute({
    sql: `SELECT id FROM direct_conversations WHERE id = ? LIMIT 1`,
    args: [data.targetId],
  });

  if (directRs.rows.length > 0) {
    return await sendDirectMessage({
      conversationId: data.targetId,
      senderId: data.userId,
      content: data.content,
      materialId: data.materialId,
    });
  }

  return await sendGroupMessage({
    groupId: data.targetId,
    userId: data.userId,
    userName: data.userName,
    userInstitution: data.userInstitution,
    content: data.content,
    materialId: data.materialId,
    materialTitle: data.materialTitle,
    materialCourseCode: data.materialCourseCode,
  });
}


export type StudyBattle = {
  id: string;
  group_id: string;
  host_id: string;
  host_name: string;
  title: string;
  mode: "mcq" | "theory";
  source_summary: string | null;
  time_per_question: number | null;
  question_count: number;
  questions_json: string;
  stake_amount: number;
  total_pot: number;
  status: "lobby" | "active" | "grading" | "completed" | "cancelled";
  winner_ids_json: string | null;
  created_at: string;
  updated_at: string;
};

export type BattleParticipant = {
  id: string;
  battle_id: string;
  user_id: string;
  user_name: string;
  avatar_url: string | null;
  role: "fighter" | "spectator";
  status: "invited" | "joined" | "submitted" | "declined";
  stake_paid: number;
  sponsored_by: string | null;
  score: number;
  answers_json: string | null;
  submitted_at: string | null;
  created_at: string;
};

/**
 * Creates a new Study Battle and initializes participants
 */
export async function createStudyBattleRecord(data: {
  id: string;
  groupId: string;
  hostId: string;
  hostName: string;
  hostAvatar?: string | null;
  title: string;
  mode: "mcq" | "theory";
  sourceSummary?: string;
  timePerQuestion?: number | null;
  questionCount: number;
  questionsJson: string;
  stakeAmount: number;
  fighterIds: string[];
  sponsoredIds?: string[];
}): Promise<StudyBattle> {
  const now = new Date().toISOString();
  const initialPot = data.stakeAmount; // Host's stake

  // Prepare batch statements
  const batchStatements: any[] = [
    {
      sql: `INSERT INTO study_battles (
              id, group_id, host_id, host_name, title, mode, source_summary,
              time_per_question, question_count, questions_json, stake_amount,
              total_pot, status, created_at, updated_at
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'lobby', ?, ?)`,
      args: [
        data.id,
        data.groupId,
        data.hostId,
        data.hostName,
        data.title,
        data.mode,
        data.sourceSummary || null,
        data.timePerQuestion || null,
        data.questionCount,
        data.questionsJson,
        data.stakeAmount,
        initialPot,
        now,
        now,
      ],
    },
  ];

  // If stake > 0, deduct from host's balance
  if (data.stakeAmount > 0) {
    batchStatements.push({
      sql: `UPDATE profiles SET points = MAX(0, points - ?) WHERE id = ?`,
      args: [data.stakeAmount, data.hostId],
    });
  }

  // Add host as joined fighter
  batchStatements.push({
    sql: `INSERT INTO battle_participants (
            id, battle_id, user_id, user_name, avatar_url, role, status, stake_paid, created_at
          ) VALUES (?, ?, ?, ?, ?, 'fighter', 'joined', ?, ?)`,
    args: [
      crypto.randomUUID(),
      data.id,
      data.hostId,
      data.hostName,
      data.hostAvatar || null,
      data.stakeAmount,
      now,
    ],
  });

  // Query member names for invited fighters
  for (const fId of data.fighterIds) {
    if (fId === data.hostId) continue;
    const isSponsored = data.sponsoredIds?.includes(fId);
    batchStatements.push({
      sql: `INSERT INTO battle_participants (
              id, battle_id, user_id, user_name, avatar_url, role, status, stake_paid, sponsored_by, created_at
            ) SELECT ?, ?, p.id, p.full_name, p.avatar_url, 'fighter', ?, ?, ?, ?
              FROM profiles p WHERE p.id = ?`,
      args: [
        crypto.randomUUID(),
        data.id,
        isSponsored ? "joined" : "invited",
        isSponsored ? data.stakeAmount : 0,
        isSponsored ? data.hostId : null,
        now,
        fId,
      ],
    });

    if (isSponsored && data.stakeAmount > 0) {
      // Deduct sponsored stake from host
      batchStatements.push({
        sql: `UPDATE profiles SET points = MAX(0, points - ?) WHERE id = ?`,
        args: [data.stakeAmount, data.hostId],
      });
      batchStatements.push({
        sql: `UPDATE study_battles SET total_pot = total_pot + ? WHERE id = ?`,
        args: [data.stakeAmount, data.id],
      });
    }
  }

  await turso.batch(batchStatements);

  return {
    id: data.id,
    group_id: data.groupId,
    host_id: data.hostId,
    host_name: data.hostName,
    title: data.title,
    mode: data.mode,
    source_summary: data.sourceSummary || null,
    time_per_question: data.timePerQuestion || null,
    question_count: data.questionCount,
    questions_json: data.questionsJson,
    stake_amount: data.stakeAmount,
    total_pot: initialPot + (data.sponsoredIds?.length || 0) * data.stakeAmount,
    status: "lobby",
    winner_ids_json: null,
    created_at: now,
    updated_at: now,
  };
}

/**
 * Fetch battle details
 */
export async function getStudyBattle(battleId: string): Promise<StudyBattle | null> {
  const rs = await turso.execute({
    sql: `SELECT * FROM study_battles WHERE id = ? LIMIT 1`,
    args: [battleId],
  });
  if (rs.rows.length === 0) return null;
  const r: any = rs.rows[0];
  return {
    id: String(r.id),
    group_id: String(r.group_id),
    host_id: String(r.host_id),
    host_name: String(r.host_name),
    title: String(r.title),
    mode: r.mode as "mcq" | "theory",
    source_summary: r.source_summary ? String(r.source_summary) : null,
    time_per_question: r.time_per_question ? Number(r.time_per_question) : null,
    question_count: Number(r.question_count) || 5,
    questions_json: String(r.questions_json),
    stake_amount: Number(r.stake_amount) || 0,
    total_pot: Number(r.total_pot) || 0,
    status: r.status as any,
    winner_ids_json: r.winner_ids_json ? String(r.winner_ids_json) : null,
    created_at: String(r.created_at),
    updated_at: String(r.updated_at),
  };
}

/**
 * Fetch battle participants
 */
export async function getBattleParticipants(battleId: string): Promise<BattleParticipant[]> {
  const rs = await turso.execute({
    sql: `SELECT * FROM battle_participants WHERE battle_id = ? ORDER BY created_at ASC`,
    args: [battleId],
  });

  return rs.rows.map((r: any) => ({
    id: String(r.id),
    battle_id: String(r.battle_id),
    user_id: String(r.user_id),
    user_name: String(r.user_name),
    avatar_url: r.avatar_url ? String(r.avatar_url) : null,
    role: r.role as "fighter" | "spectator",
    status: r.status as "invited" | "joined" | "submitted" | "declined",
    stake_paid: Number(r.stake_paid) || 0,
    sponsored_by: r.sponsored_by ? String(r.sponsored_by) : null,
    score: Number(r.score) || 0,
    answers_json: r.answers_json ? String(r.answers_json) : null,
    submitted_at: r.submitted_at ? String(r.submitted_at) : null,
    created_at: String(r.created_at),
  }));
}

/**
 * Atomically locks stake into escrow and joins the battle
 */
export async function joinBattleEscrowRecord(data: {
  battleId: string;
  userId: string;
  userName: string;
  avatarUrl?: string | null;
  role?: "fighter" | "spectator";
}): Promise<{ success: boolean; error?: string }> {
  // 1. Fetch battle details to verify stake amount and status
  const battle = await getStudyBattle(data.battleId);
  if (!battle) return { success: false, error: "Battle not found" };
  if (battle.status !== "lobby" && battle.status !== "active") {
    return { success: false, error: "Battle is no longer accepting participants" };
  }

  const isFighter = (data.role || "fighter") === "fighter";

  // Check if participant row already exists
  const existingRs = await turso.execute({
    sql: `SELECT id, status, stake_paid, role FROM battle_participants WHERE battle_id = ? AND user_id = ? LIMIT 1`,
    args: [data.battleId, data.userId],
  });
  const existing = existingRs.rows[0] as any;

  if (isFighter && battle.stake_amount > 0 && (!existing || existing.stake_paid < battle.stake_amount)) {
    // Check user points balance
    const userRes = await turso.execute({
      sql: `SELECT points FROM profiles WHERE id = ? LIMIT 1`,
      args: [data.userId],
    });
    const currentPoints = Number(userRes.rows[0]?.points) || 0;
    if (currentPoints < battle.stake_amount) {
      return {
        success: false,
        error: `Insufficient points. You have ${currentPoints} pts, but this battle requires ${battle.stake_amount} pts.`,
      };
    }

    const batchStatements: any[] = [
      {
        sql: `UPDATE profiles SET points = points - ? WHERE id = ?`,
        args: [battle.stake_amount, data.userId],
      },
      {
        sql: `UPDATE study_battles SET total_pot = total_pot + ? WHERE id = ?`,
        args: [battle.stake_amount, data.battleId],
      },
    ];

    if (existing) {
      batchStatements.push({
        sql: `UPDATE battle_participants SET status = 'joined', stake_paid = ?, role = 'fighter' WHERE id = ?`,
        args: [battle.stake_amount, existing.id],
      });
    } else {
      batchStatements.push({
        sql: `INSERT INTO battle_participants (
                id, battle_id, user_id, user_name, avatar_url, role, status, stake_paid, created_at
              ) VALUES (?, ?, ?, ?, ?, 'fighter', 'joined', ?, datetime('now'))`,
        args: [
          crypto.randomUUID(),
          data.battleId,
          data.userId,
          data.userName,
          data.avatarUrl || null,
          battle.stake_amount,
        ],
      });
    }

    await turso.batch(batchStatements);
  } else {
    // Free or spectator join, or already paid
    if (existing) {
      await turso.execute({
        sql: `UPDATE battle_participants SET status = 'joined', role = ? WHERE id = ?`,
        args: [data.role || existing.role || "fighter", existing.id],
      });
    } else {
      await turso.execute({
        sql: `INSERT INTO battle_participants (
                id, battle_id, user_id, user_name, avatar_url, role, status, stake_paid, created_at
              ) VALUES (?, ?, ?, ?, ?, ?, 'joined', 0, datetime('now'))`,
        args: [
          crypto.randomUUID(),
          data.battleId,
          data.userId,
          data.userName,
          data.avatarUrl || null,
          data.role || "spectator",
        ],
      });
    }
  }

  return { success: true };
}

/**
 * Decline battle participation
 */
export async function declineBattleRecord(data: {
  battleId: string;
  userId: string;
}): Promise<boolean> {
  await turso.execute({
    sql: `UPDATE battle_participants SET status = 'declined' WHERE battle_id = ? AND user_id = ?`,
    args: [data.battleId, data.userId],
  });
  return true;
}

/**
 * Submit participant's answers and score
 */
export async function submitBattleAnswersRecord(data: {
  battleId: string;
  userId: string;
  score: number;
  answersJson: string;
}): Promise<{ allSubmitted: boolean; participantCount: number; submittedCount: number }> {
  // Update participant status and score
  await turso.execute({
    sql: `UPDATE battle_participants 
          SET status = 'submitted', score = ?, answers_json = ?, submitted_at = datetime('now')
          WHERE battle_id = ? AND user_id = ?`,
    args: [data.score, data.answersJson, data.battleId, data.userId],
  });

  // Check if all joined fighters have submitted
  const rs = await turso.execute({
    sql: `SELECT 
            COUNT(CASE WHEN role = 'fighter' AND status IN ('joined', 'submitted') THEN 1 END) as total_fighters,
            COUNT(CASE WHEN role = 'fighter' AND status = 'submitted' THEN 1 END) as submitted_fighters
          FROM battle_participants 
          WHERE battle_id = ?`,
    args: [data.battleId],
  });

  const totalFighters = Number(rs.rows[0]?.total_fighters) || 0;
  const submittedFighters = Number(rs.rows[0]?.submitted_fighters) || 0;
  const allSubmitted = totalFighters > 0 && submittedFighters >= totalFighters;

  if (allSubmitted) {
    await turso.execute({
      sql: `UPDATE study_battles SET status = 'grading' WHERE id = ? AND status != 'completed'`,
      args: [data.battleId],
    });
  }

  return {
    allSubmitted,
    participantCount: totalFighters,
    submittedCount: submittedFighters,
  };
}

/**
 * Conclude battle: award pot points to winner(s), mark battle completed
 */
export async function concludeBattleRecord(data: {
  battleId: string;
  winners: Array<{ userId: string; score: number }>;
}): Promise<{ success: boolean; potDistributed: number }> {
  const battle = await getStudyBattle(data.battleId);
  if (!battle) return { success: false, potDistributed: 0 };

  const pot = battle.total_pot;
  const batchStatements: any[] = [];
  const winnerIds = data.winners.map((w) => w.userId);

  if (pot > 0 && winnerIds.length > 0) {
    const pointsPerWinner = Math.floor(pot / winnerIds.length);
    for (const wId of winnerIds) {
      batchStatements.push({
        sql: `UPDATE profiles SET points = points + ? WHERE id = ?`,
        args: [pointsPerWinner, wId],
      });
    }
  }

  batchStatements.push({
    sql: `UPDATE study_battles 
          SET status = 'completed', winner_ids_json = ?, updated_at = datetime('now')
          WHERE id = ?`,
    args: [JSON.stringify(winnerIds), data.battleId],
  });

  if (batchStatements.length > 0) {
    await turso.batch(batchStatements);
  }

  return { success: true, potDistributed: pot };
}

/**
 * Get unsubmitted slowpokes for nudging
 */
export async function getSlowpokesRecord(battleId: string): Promise<Array<{ userId: string; userName: string }>> {
  const rs = await turso.execute({
    sql: `SELECT user_id, user_name 
          FROM battle_participants 
          WHERE battle_id = ? AND role = 'fighter' AND status IN ('invited', 'joined')`,
    args: [battleId],
  });

  return rs.rows.map((r: any) => ({
    userId: String(r.user_id),
    userName: String(r.user_name),
  }));
}



