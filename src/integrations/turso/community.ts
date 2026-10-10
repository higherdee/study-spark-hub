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
        `🎉 Study group "${data.name}" created! Welcome fellow students to discuss course topics and share academic materials.`,
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
 * Retrieves all direct conversations for a user
 */
export async function getStudentConversations(userId: string): Promise<DirectConversation[]> {
  const rs = await turso.execute({
    sql: `
      SELECT 
        c.id, c.user1_id, c.user2_id, c.last_message_text, c.last_message_at,
        p.id as peer_id, p.username as peer_username, p.full_name as peer_full_name,
        p.avatar_url as peer_avatar_url, p.institution as peer_institution,
        p.course as peer_course, p.level as peer_level, p.points as peer_points
      FROM direct_conversations c
      JOIN profiles p ON p.id = CASE WHEN c.user1_id = ? THEN c.user2_id ELSE c.user1_id END
      WHERE c.user1_id = ? OR c.user2_id = ?
      ORDER BY c.last_message_at DESC
    `,
    args: [userId, userId, userId],
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
    unread_count: 0,
  }));
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

