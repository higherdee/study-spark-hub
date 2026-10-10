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
