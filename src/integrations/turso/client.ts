import { createClient, type Client, type InValue } from "@libsql/client";
import {
  POINTS_PER_VERIFIED_UPLOAD,
  POINTS_PER_DOWNLOAD,
  POINTS_PER_VIEW,
  POINTS_REGISTRATION_BONUS,
  POINTS_INSTALL_APP_BONUS,
  POINTS_UPGRADE_BONUS,
  POINTS_REFERRAL_REGISTRATION,
  POINTS_REFERRAL_UPGRADE,
  POINTS_PER_30_MIN_STUDY,
  MINIMUM_WITHDRAWAL_POINTS,
  pointsToNaira,
  formatNaira,
  calculateReward,
} from "@/lib/constants";

const TURSO_URL =
  (import.meta.env['TURSO_DATABASE_URL'] as string | undefined) ||
  process.env['TURSO_DATABASE_URL'] ||
  "libsql://syllaboss-db-kunle.aws-us-east-2.turso.io";

const TURSO_AUTH_TOKEN =
  (import.meta.env['TURSO_AUTH_TOKEN'] as string | undefined) ||
  process.env['TURSO_AUTH_TOKEN'] ||
  "eyJhbGciOiJFZERTQSIsInR5cCI6IkpXVCJ9.eyJhIjoicnciLCJpYXQiOjE3OTA5NDU2ODUsImlkIjoiMDFhMGZjYWUtNDUwMS03ZTQxLTkxNzItZGEzNzhkNmNlNDIxIiwia2lkIjoiSW1vS2lmVHNJNEZkMDFsOUVfNDJQQ01TTUtuUXkyR2pTWGhKOUZ1OEVtWSIsInJpZCI6IjQyZjEyNjgxLWZhMGMtNDYwZS04MWIyLTkwMWNjOWQ1MDcyMyJ9.eD10y_k_LzyciYuiNuCsuFRMouzlWrrYTStmQWEuR5XgbM0uWmCutRBc8mnBQSKQN5XYlBM_zpGCi0Q-X23aAQ";

export const turso: Client = createClient({
  url: TURSO_URL,
  authToken: TURSO_AUTH_TOKEN,
});

export type Profile = {
  id: string;
  email: string | null;
  full_name: string | null;
  username?: string | null;
  avatar_url?: string | null;
  current_streak?: number;
  institution: string | null;
  course: string | null;
  department: string | null;
  level: string | null;
  points: number;
  phone: string | null;
  referral_source: string | null;
  study_plan: Record<string, unknown>;
  suspended: boolean;
  onboarding_step: number;
  sylla_plus: boolean;
  referral_code: string;
  referred_by: string | null;
  study_minutes: number;
  app_installed: boolean;
  created_at: string;
  updated_at: string;
};

export type Material = {
  id: string;
  user_id: string;
  title: string;
  course: string;
  course_code: string | null;
  institution: string;
  level: string | null;
  material_type: string;
  description: string | null;
  file_path: string;
  file_name: string;
  mime_type: string;
  file_size: number;
  page_count: number;
  points_awarded: number;
  status: "pending" | "verified" | "rejected";
  verification_score: number | null;
  verification_notes: string | null;
  downloads: number;
  views: number;
  rating_avg?: number | null;
  rating_count?: number | null;
  reviewed_at: string | null;
  created_at: string;
};

export type PointsLedgerEntry = {
  id: string;
  user_id: string;
  amount: number;
  reason: string;
  material_id: string | null;
  withdrawal_id: string | null;
  created_at: string;
};

export type Withdrawal = {
  id: string;
  user_id: string;
  points: number;
  amount_naira: number;
  bank_name: string;
  account_number: string;
  account_name: string;
  status: "pending" | "paid" | "rejected";
  admin_note: string | null;
  processed_at: string | null;
  created_at: string;
};

export type Complaint = {
  id: string;
  material_id: string;
  user_id: string;
  complaint_text: string;
  status: "pending" | "resolved" | "rejected";
  admin_reply: string | null;
  created_at: string;
  updated_at: string;
  material_title?: string | undefined;
  user_email?: string | undefined;
};

export type Announcement = {
  id: string;
  title: string;
  message: string;
  target: "all" | "app_only" | "web_only";
  created_by: string | null;
  created_at: string;
};

export type UserNotification = {
  id: string;
  user_id: string;
  title: string;
  message: string;
  type: string;
  read: boolean;
  created_at: string;
};

function mapProfile(row: Record<string, unknown>): Profile {
  const id = String(row['id']);
  const defaultRef = `SYLLA-${id.slice(-6).toUpperCase()}`;
  return {
    id,
    email: row['email'] ? String(row['email']) : null,
    full_name: row['full_name'] ? String(row['full_name']) : null,
    username: row['username'] ? String(row['username']) : null,
    avatar_url: row['avatar_url'] ? String(row['avatar_url']) : null,
    current_streak: Number(row['current_streak'] || 1),
    institution: row['institution'] ? String(row['institution']) : null,
    course: row['course'] ? String(row['course']) : null,
    department: row['department'] ? String(row['department']) : null,
    level: row['level'] ? String(row['level']) : null,
    points: Number(row['points'] || 0),
    phone: row['phone'] ? String(row['phone']) : null,
    referral_source: row['referral_source'] ? String(row['referral_source']) : null,
    study_plan:
      typeof row['study_plan'] === "string"
        ? (JSON.parse((row['study_plan'] as string) || "{}") as Record<string, unknown>)
        : (row['study_plan'] as Record<string, unknown>) || {},
    suspended: Boolean(row['suspended']),
    onboarding_step: row['onboarding_step'] !== null && row['onboarding_step'] !== undefined ? Number(row['onboarding_step']) : 0,
    sylla_plus: Boolean(row['sylla_plus']),
    referral_code: row['referral_code'] ? String(row['referral_code']) : defaultRef,
    referred_by: row['referred_by'] ? String(row['referred_by']) : null,
    study_minutes: Number(row['study_minutes'] || 0),
    app_installed: Boolean(row['app_installed']),
    created_at: String(row['created_at']),
    updated_at: String(row['updated_at']),
  };
}

function mapMaterial(row: Record<string, unknown>): Material {
  return {
    id: String(row['id']),
    user_id: String(row['user_id']),
    title: String(row['title']),
    course: String(row['course']),
    course_code: row['course_code'] ? String(row['course_code']) : null,
    institution: String(row['institution']),
    level: row['level'] ? String(row['level']) : null,
    material_type: String(row['material_type']),
    description: row['description'] ? String(row['description']) : null,
    file_path: String(row['file_path']),
    file_name: String(row['file_name']),
    mime_type: String(row['mime_type']),
    file_size: Number(row['file_size'] || 0),
    page_count: Number(row['page_count'] || 1),
    points_awarded: Number(row['points_awarded'] || 0),
    status: row['status'] as "pending" | "verified" | "rejected",
    verification_score:
      row['verification_score'] !== null && row['verification_score'] !== undefined
        ? Number(row['verification_score'])
        : null,
    verification_notes: row['verification_notes'] ? String(row['verification_notes']) : null,
    downloads: Number(row['downloads'] || 0),
    views: Number(row['views'] || 0),
    rating_avg: row['rating_avg'] !== null && row['rating_avg'] !== undefined ? Number(row['rating_avg']) : 0,
    rating_count: row['rating_count'] !== null && row['rating_count'] !== undefined ? Number(row['rating_count']) : 0,
    reviewed_at: row['reviewed_at'] ? String(row['reviewed_at']) : null,
    created_at: String(row['created_at']),
  };
}

// Safe helper methods for Turso Database

export async function getProfile(userId: string): Promise<Profile | null> {
  const rs = await turso.execute({
    sql: "SELECT * FROM profiles WHERE id = ? LIMIT 1",
    args: [userId],
  });
  if (rs.rows.length === 0 || !rs.rows[0]) return null;
  return mapProfile(rs.rows[0] as unknown as Record<string, unknown>);
}

export async function upsertProfile(data: {
  id: string;
  email?: string | null | undefined;
  full_name?: string | null | undefined;
  username?: string | null | undefined;
  avatar_url?: string | null | undefined;
  institution?: string | null | undefined;
  course?: string | null | undefined;
  department?: string | null | undefined;
  level?: string | null | undefined;
  phone?: string | null | undefined;
  referral_source?: string | null | undefined;
  study_plan?: Record<string, unknown> | undefined;
  onboarding_step?: number | undefined;
  referred_by?: string | null | undefined;
}): Promise<Profile> {
  const existing = await getProfile(data.id);
  const myRefCode = `SYLLA-${data.id.slice(-6).toUpperCase()}`;

  // Fallback initial username if not provided
  const initialUsername =
    data.username ||
    (data.full_name ? data.full_name.toLowerCase().replace(/[^a-z0-9]/g, "").slice(0, 15) : null) ||
    `student_${data.id.slice(-5)}`;

  if (!existing) {
    // 200 SyllaPoints registration bonus!
    const batchStatements: { sql: string; args: InValue[] }[] = [
      {
        sql: `INSERT INTO profiles (id, email, full_name, username, avatar_url, institution, course, department, level, phone, referral_source, study_plan, onboarding_step, points, referral_code, referred_by)
              VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        args: [
          data.id,
          data.email ?? null,
          data.full_name ?? null,
          initialUsername,
          data.avatar_url ?? null,
          data.institution ?? null,
          data.course ?? null,
          data.department ?? null,
          data.level ?? null,
          data.phone ?? null,
          data.referral_source ?? null,
          JSON.stringify(data.study_plan ?? {}),
          data.onboarding_step ?? 0,
          POINTS_REGISTRATION_BONUS,
          myRefCode,
          data.referred_by ?? null,
        ],
      },
      {
        sql: `INSERT INTO points_ledger (id, user_id, amount, reason)
              VALUES (?, ?, ?, ?)`,
        args: [
          crypto.randomUUID(),
          data.id,
          POINTS_REGISTRATION_BONUS,
          "Welcome bonus: Account registration",
        ],
      },
    ];

    // If referred by another user, award 40 SyllaPoints to the referrer!
    if (data.referred_by) {
      const refRs = await turso.execute({
        sql: "SELECT id FROM profiles WHERE referral_code = ? OR id = ? LIMIT 1",
        args: [data.referred_by, data.referred_by],
      });
      if (refRs.rows.length > 0 && refRs.rows[0]) {
        const referrerId = String(refRs.rows[0]['id']);
        batchStatements.push(
          {
            sql: "UPDATE profiles SET points = points + ? WHERE id = ?",
            args: [POINTS_REFERRAL_REGISTRATION, referrerId],
          },
          {
            sql: `INSERT INTO points_ledger (id, user_id, amount, reason)
                  VALUES (?, ?, ?, ?)`,
            args: [
              crypto.randomUUID(),
              referrerId,
              POINTS_REFERRAL_REGISTRATION,
              `Referral bonus: ${data.full_name || "New friend"} registered with your code`,
            ],
          }
        );
      }
    }

    await turso.batch(batchStatements);
  } else {
    await turso.execute({
      sql: `UPDATE profiles SET
              email = COALESCE(?, email),
              full_name = COALESCE(?, full_name),
              username = COALESCE(?, username),
              avatar_url = COALESCE(?, avatar_url),
              institution = COALESCE(?, institution),
              course = COALESCE(?, course),
              department = COALESCE(?, department),
              level = COALESCE(?, level),
              phone = COALESCE(?, phone),
              referral_source = COALESCE(?, referral_source),
              study_plan = CASE WHEN ? IS NOT NULL THEN ? ELSE study_plan END,
              onboarding_step = COALESCE(?, onboarding_step),
              referred_by = COALESCE(?, referred_by),
              updated_at = datetime('now')
            WHERE id = ?`,
      args: [
        data.email ?? null,
        data.full_name ?? null,
        data.username ?? null,
        data.avatar_url ?? null,
        data.institution ?? null,
        data.course ?? null,
        data.department ?? null,
        data.level ?? null,
        data.phone ?? null,
        data.referral_source ?? null,
        data.study_plan ? "set" : null,
        data.study_plan ? JSON.stringify(data.study_plan) : null,
        data.onboarding_step ?? null,
        data.referred_by ?? null,
        data.id,
      ],
    });
  }
  return (await getProfile(data.id))!;
}

export async function upgradeToSyllaPlus(userId: string): Promise<void> {
  const profile = await getProfile(userId);
  if (!profile) throw new Error("Profile not found");
  if (profile.sylla_plus) return; // already upgraded

  const batch: { sql: string; args: InValue[] }[] = [
    {
      sql: "UPDATE profiles SET sylla_plus = 1, points = points + ? WHERE id = ?",
      args: [POINTS_UPGRADE_BONUS, userId],
    },
    {
      sql: `INSERT INTO points_ledger (id, user_id, amount, reason)
            VALUES (?, ?, ?, ?)`,
      args: [
        crypto.randomUUID(),
        userId,
        POINTS_UPGRADE_BONUS,
        "SyllaPlus upgrade milestone bonus",
      ],
    },
  ];

  // If user was referred, award 200 SyllaPoints to referrer!
  if (profile.referred_by) {
    const refRs = await turso.execute({
      sql: "SELECT id FROM profiles WHERE referral_code = ? OR id = ? LIMIT 1",
      args: [profile.referred_by, profile.referred_by],
    });
    if (refRs.rows.length > 0 && refRs.rows[0]) {
      const referrerId = String(refRs.rows[0]['id']);
      batch.push(
        {
          sql: "UPDATE profiles SET points = points + ? WHERE id = ?",
          args: [POINTS_REFERRAL_UPGRADE, referrerId],
        },
        {
          sql: `INSERT INTO points_ledger (id, user_id, amount, reason)
                VALUES (?, ?, ?, ?)`,
          args: [
            crypto.randomUUID(),
            referrerId,
            POINTS_REFERRAL_UPGRADE,
            `Referral milestone: ${profile.full_name || "Referred user"} upgraded to SyllaPlus!`,
          ],
        }
      );
    }
  }

  await turso.batch(batch);
}

export async function claimAppInstallBonus(userId: string): Promise<boolean> {
  const profile = await getProfile(userId);
  if (!profile || profile.app_installed) return false;

  await turso.batch([
    {
      sql: "UPDATE profiles SET app_installed = 1, points = points + ? WHERE id = ?",
      args: [POINTS_INSTALL_APP_BONUS, userId],
    },
    {
      sql: "INSERT INTO points_ledger (id, user_id, amount, reason) VALUES (?, ?, ?, ?)",
      args: [
        crypto.randomUUID(),
        userId,
        POINTS_INSTALL_APP_BONUS,
        "Installed Syllaboss home screen app",
      ],
    },
  ]);
  return true;
}

export async function recordStudySession(userId: string, minutes: number): Promise<{ pointsAwarded: number }> {
  if (minutes < 30) return { pointsAwarded: 0 };
  const intervals = Math.floor(minutes / 30);
  const profile = await getProfile(userId);
  const isPlus = Boolean(profile?.sylla_plus);
  const basePoints = intervals * POINTS_PER_30_MIN_STUDY;
  const points = calculateReward(basePoints, isPlus);

  await turso.batch([
    {
      sql: "UPDATE profiles SET study_minutes = study_minutes + ?, points = points + ? WHERE id = ?",
      args: [minutes, points, userId],
    },
    {
      sql: "INSERT INTO points_ledger (id, user_id, amount, reason) VALUES (?, ?, ?, ?)",
      args: [
        crypto.randomUUID(),
        userId,
        points,
        `Studied for ${minutes} minutes (${intervals} x 30m)${isPlus ? " [1.3x SyllaPlus]" : ""}`,
      ],
    },
  ]);
  return { pointsAwarded: points };
}

export async function getMaterials(params: {
  q?: string | undefined;
  type?: string | undefined;
  level?: string | undefined;
  status?: string | undefined;
  userId?: string | undefined;
  limit?: number | undefined;
}): Promise<Material[]> {
  const conditions: string[] = [];
  const args: InValue[] = [];

  if (params.status) {
    conditions.push("status = ?");
    args.push(params.status);
  }
  if (params.userId) {
    conditions.push("user_id = ?");
    args.push(params.userId);
  }
  if (params.type) {
    conditions.push("material_type = ?");
    args.push(params.type);
  }
  if (params.level) {
    conditions.push("level = ?");
    args.push(params.level);
  }
  if (params.q && params.q.trim()) {
    const rawTerms = params.q.trim().split(/\s+/).filter(Boolean);
    // Combine tokens into search conditions so multi-word queries like "GET 206 lathe" or "Achievers GET 206" find matching materials
    for (const word of rawTerms) {
      const term = `%${word}%`;
      conditions.push(
        "(title LIKE ? OR course LIKE ? OR course_code LIKE ? OR institution LIKE ? OR description LIKE ?)"
      );
      args.push(term, term, term, term, term);
    }
  }

  const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(" AND ")}` : "";
  const limitClause = params.limit ? `LIMIT ${params.limit}` : "LIMIT 100";
  const orderClause =
    params.status === "verified"
      ? "ORDER BY downloads DESC, views DESC, created_at DESC"
      : "ORDER BY created_at DESC";

  const sql = `SELECT * FROM materials ${whereClause} ${orderClause} ${limitClause}`;
  const rs = await turso.execute({ sql, args });

  return rs.rows.map((r) => mapMaterial(r as unknown as Record<string, unknown>));
}

export async function getTotalMaterialsCount(params?: {
  status?: string | undefined;
}): Promise<number> {
  const conditions: string[] = [];
  const args: InValue[] = [];
  if (params?.status) {
    conditions.push("status = ?");
    args.push(params.status);
  }
  const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(" AND ")}` : "";
  const sql = `SELECT COUNT(*) as count FROM materials ${whereClause}`;
  const rs = await turso.execute({ sql, args });
  return Number(rs.rows[0]?.['count'] || 0);
}


export async function getMaterialById(id: string): Promise<Material | null> {
  const rs = await turso.execute({
    sql: "SELECT * FROM materials WHERE id = ? LIMIT 1",
    args: [id],
  });
  if (rs.rows.length === 0 || !rs.rows[0]) return null;
  return mapMaterial(rs.rows[0] as unknown as Record<string, unknown>);
}

export async function createMaterial(m: {
  id?: string | undefined;
  user_id: string;
  title: string;
  course: string;
  course_code?: string | null | undefined;
  institution: string;
  level?: string | null | undefined;
  material_type: string;
  description?: string | null | undefined;
  file_path: string;
  file_name: string;
  mime_type: string;
  file_size?: number | undefined;
  page_count?: number | undefined;
}): Promise<Material> {
  const id = m.id || crypto.randomUUID();
  await turso.execute({
    sql: `INSERT INTO materials (id, user_id, title, course, course_code, institution, level, material_type, description, file_path, file_name, mime_type, file_size, page_count)
          VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    args: [
      id,
      m.user_id,
      m.title,
      m.course,
      m.course_code ?? null,
      m.institution,
      m.level ?? null,
      m.material_type,
      m.description ?? null,
      m.file_path,
      m.file_name,
      m.mime_type,
      m.file_size ?? 0,
      m.page_count ?? 1,
    ],
  });

  const res = await turso.execute({ sql: "SELECT * FROM materials WHERE id = ? LIMIT 1", args: [id] });
  return mapMaterial(res.rows[0] as unknown as Record<string, unknown>);
}

export async function deleteMaterial(id: string, userId: string): Promise<boolean> {
  const rs = await turso.execute({
    sql: "DELETE FROM materials WHERE id = ? AND user_id = ? AND status != 'verified'",
    args: [id, userId],
  });
  return rs.rowsAffected > 0;
}

export async function setMaterialStatus(
  materialId: string,
  status: "verified" | "rejected" | "pending",
  score: number | null,
  notes: string | null
): Promise<void> {
  const matRs = await turso.execute({ sql: "SELECT * FROM materials WHERE id = ? LIMIT 1", args: [materialId] });
  if (matRs.rows.length === 0 || !matRs.rows[0]) throw new Error("Material not found");
  const m = matRs.rows[0] as unknown as Record<string, unknown>;
  const uploaderId = String(m['user_id']);

  const uploaderProfile = await getProfile(uploaderId);
  const isPlus = Boolean(uploaderProfile?.sylla_plus);
  const basePoints = status === "verified" ? POINTS_PER_VERIFIED_UPLOAD : 0;
  const points = calculateReward(basePoints, isPlus);

  await turso.batch([
    {
      sql: `UPDATE materials
            SET status = ?, verification_score = ?, verification_notes = ?, points_awarded = ?, reviewed_at = datetime('now')
            WHERE id = ?`,
      args: [status, score ?? null, notes ?? null, points, materialId],
    },
    ...(status === "verified" && points > 0
      ? [
          {
            sql: "UPDATE profiles SET points = points + ? WHERE id = ?",
            args: [points, uploaderId],
          },
          {
            sql: `INSERT INTO points_ledger (id, user_id, amount, reason, material_id)
                  VALUES (?, ?, ?, ?, ?)`,
            args: [
              crypto.randomUUID(),
              uploaderId,
              points,
              `Verified upload: ${String(m['title'])} (+${points} SyllaPoints)${isPlus ? " [1.3x SyllaPlus]" : ""}`,
              materialId,
            ],
          },
          {
            sql: "INSERT INTO user_notifications (id, user_id, title, message, type) VALUES (?, ?, ?, ?, 'reward')",
            args: [
              crypto.randomUUID(),
              uploaderId,
              `Material Verified! (+${points} SyllaPoints)`,
              `Your upload "${String(m['title'])}" was verified. Points have been added to your wallet!`,
            ],
          },
        ]
      : status === "rejected"
      ? [
          {
            sql: "INSERT INTO user_notifications (id, user_id, title, message, type) VALUES (?, ?, ?, ?, 'general')",
            args: [
              crypto.randomUUID(),
              uploaderId,
              `Material review update: "${String(m['title'])}"`,
              notes || "Your file was rejected. You can lodge an appeal from your materials tab.",
            ],
          },
        ]
      : []),
  ]);
}

export async function recordMaterialView(materialId: string, viewerUserId?: string): Promise<void> {
  const matRs = await turso.execute({ sql: "SELECT user_id, title FROM materials WHERE id = ? LIMIT 1", args: [materialId] });
  if (matRs.rows.length === 0 || !matRs.rows[0]) return;
  const m = matRs.rows[0] as unknown as Record<string, unknown>;
  const uploaderId = String(m['user_id']);

  // If viewer is provided, check if already viewed or if viewing own material
  if (viewerUserId) {
    if (viewerUserId === uploaderId) return; // Uploader viewing their own file does not inflate metrics

    const viewedCheck = await turso.execute({
      sql: "SELECT 1 FROM material_user_views WHERE user_id = ? AND material_id = ? LIMIT 1",
      args: [viewerUserId, materialId],
    });
    if (viewedCheck.rows.length > 0) {
      return; // Already viewed by this student
    }

    await turso.execute({
      sql: "INSERT OR IGNORE INTO material_user_views (user_id, material_id) VALUES (?, ?)",
      args: [viewerUserId, materialId],
    });
  }

  const uploaderProfile = await getProfile(uploaderId);
  const isPlus = Boolean(uploaderProfile?.sylla_plus);
  const points = calculateReward(POINTS_PER_VIEW, isPlus);

  await turso.batch([
    {
      sql: "UPDATE materials SET views = views + 1 WHERE id = ?",
      args: [materialId],
    },
    {
      sql: "UPDATE profiles SET points = points + ? WHERE id = ?",
      args: [points, uploaderId],
    },
    {
      sql: "INSERT INTO points_ledger (id, user_id, amount, reason, material_id) VALUES (?, ?, ?, ?, ?)",
      args: [
        crypto.randomUUID(),
        uploaderId,
        points,
        `Student viewed "${String(m['title'])}" (+${points} SyllaPoints)${isPlus ? " [1.3x SyllaPlus]" : ""}`,
        materialId,
      ],
    },
  ]);
}

export async function recordMaterialDownload(materialId: string, downloaderUserId?: string): Promise<string> {
  const matRs = await turso.execute({ sql: "SELECT file_path, user_id, title FROM materials WHERE id = ? LIMIT 1", args: [materialId] });
  if (matRs.rows.length === 0 || !matRs.rows[0]) throw new Error("Material not found");
  const m = matRs.rows[0] as unknown as Record<string, unknown>;
  const uploaderId = String(m['user_id']);

  // Check single download rule: each student can only download a material once
  if (downloaderUserId) {
    const dlCheck = await turso.execute({
      sql: "SELECT 1 FROM material_user_downloads WHERE user_id = ? AND material_id = ? LIMIT 1",
      args: [downloaderUserId, materialId],
    });

    if (dlCheck.rows.length > 0) {
      // Already downloaded by this user! Return file directly without double counting or re-awarding points
      return String(m['file_path']);
    }

    await turso.execute({
      sql: "INSERT OR IGNORE INTO material_user_downloads (user_id, material_id) VALUES (?, ?)",
      args: [downloaderUserId, materialId],
    });

    // If downloader is the uploader, return file without points reward
    if (downloaderUserId === uploaderId) {
      return String(m['file_path']);
    }
  }

  const uploaderProfile = await getProfile(uploaderId);
  const isPlus = Boolean(uploaderProfile?.sylla_plus);
  const points = calculateReward(POINTS_PER_DOWNLOAD, isPlus);

  await turso.batch([
    {
      sql: "UPDATE materials SET downloads = downloads + 1 WHERE id = ?",
      args: [materialId],
    },
    {
      sql: "UPDATE profiles SET points = points + ? WHERE id = ?",
      args: [points, uploaderId],
    },
    {
      sql: "INSERT INTO points_ledger (id, user_id, amount, reason, material_id) VALUES (?, ?, ?, ?, ?)",
      args: [
        crypto.randomUUID(),
        uploaderId,
        points,
        `Student downloaded "${String(m['title'])}" (+${points} SyllaPoints)${isPlus ? " [1.3x SyllaPlus]" : ""}`,
        materialId,
      ],
    },
  ]);

  return String(m['file_path']);
}

export async function rateMaterial(
  materialId: string,
  userId: string,
  rating: number,
  review?: string
): Promise<{ rating_avg: number; rating_count: number }> {
  const id = crypto.randomUUID();
  const clampedRating = Math.max(1, Math.min(5, Math.round(rating * 10) / 10));

  await turso.execute({
    sql: `INSERT INTO material_ratings (id, material_id, user_id, rating, review)
          VALUES (?, ?, ?, ?, ?)
          ON CONFLICT(material_id, user_id) DO UPDATE SET rating = excluded.rating, review = excluded.review, updated_at = CURRENT_TIMESTAMP`,
    args: [id, materialId, userId, clampedRating, review || null],
  });

  const statsRs = await turso.execute({
    sql: "SELECT AVG(rating) as avg_rating, COUNT(*) as count_rating FROM material_ratings WHERE material_id = ?",
    args: [materialId],
  });

  const avg = Number(statsRs.rows[0]?.['avg_rating'] || clampedRating);
  const count = Number(statsRs.rows[0]?.['count_rating'] || 1);
  const roundedAvg = Math.round(avg * 10) / 10;

  await turso.execute({
    sql: "UPDATE materials SET rating_avg = ?, rating_count = ? WHERE id = ?",
    args: [roundedAvg, count, materialId],
  });

  return { rating_avg: roundedAvg, rating_count: count };
}

export async function getUserRating(materialId: string, userId: string): Promise<number | null> {
  const rs = await turso.execute({
    sql: "SELECT rating FROM material_ratings WHERE material_id = ? AND user_id = ? LIMIT 1",
    args: [materialId, userId],
  });
  if (rs.rows.length === 0 || !rs.rows[0]) return null;
  return Number(rs.rows[0]['rating']);
}

// Complaints & Dispute Resolution
export async function createComplaint(
  materialId: string,
  userId: string,
  complaintText: string
): Promise<string> {
  const id = crypto.randomUUID();
  await turso.execute({
    sql: "INSERT INTO complaints (id, material_id, user_id, complaint_text, status) VALUES (?, ?, ?, ?, 'pending')",
    args: [id, materialId, userId, complaintText],
  });
  return id;
}

export async function getComplaints(params?: { userId?: string | undefined; status?: string | undefined }): Promise<Complaint[]> {
  const conditions: string[] = [];
  const args: InValue[] = [];
  if (params?.userId) {
    conditions.push("c.user_id = ?");
    args.push(params.userId);
  }
  if (params?.status) {
    conditions.push("c.status = ?");
    args.push(params.status);
  }
  const where = conditions.length > 0 ? `WHERE ${conditions.join(" AND ")}` : "";
  const sql = `
    SELECT c.*, m.title as material_title, p.email as user_email
    FROM complaints c
    LEFT JOIN materials m ON c.material_id = m.id
    LEFT JOIN profiles p ON c.user_id = p.id
    ${where}
    ORDER BY c.created_at DESC
  `;
  const rs = await turso.execute({ sql, args });
  return rs.rows.map((r) => {
    const row = r as unknown as Record<string, unknown>;
    return {
      id: String(row['id']),
      material_id: String(row['material_id']),
      user_id: String(row['user_id']),
      complaint_text: String(row['complaint_text']),
      status: (row['status'] as "pending" | "resolved" | "rejected") || "pending",
      admin_reply: row['admin_reply'] ? String(row['admin_reply']) : null,
      created_at: String(row['created_at']),
      updated_at: String(row['updated_at']),
      material_title: row['material_title'] ? String(row['material_title']) : undefined,
      user_email: row['user_email'] ? String(row['user_email']) : undefined,
    };
  });
}

export async function replyToComplaint(
  complaintId: string,
  adminReply: string,
  newStatus: "resolved" | "rejected" = "resolved"
): Promise<void> {
  const cRs = await turso.execute({
    sql: "SELECT c.*, m.title as material_title FROM complaints c LEFT JOIN materials m ON c.material_id = m.id WHERE c.id = ? LIMIT 1",
    args: [complaintId],
  });
  if (cRs.rows.length === 0 || !cRs.rows[0]) throw new Error("Complaint not found");
  const c = cRs.rows[0] as unknown as Record<string, unknown>;
  const userId = String(c['user_id']);
  const matTitle = c['material_title'] ? String(c['material_title']) : "Material";

  await turso.batch([
    {
      sql: "UPDATE complaints SET admin_reply = ?, status = ?, updated_at = datetime('now') WHERE id = ?",
      args: [adminReply, newStatus, complaintId],
    },
    {
      sql: "INSERT INTO user_notifications (id, user_id, title, message, type) VALUES (?, ?, ?, ?, 'complaint_reply')",
      args: [
        crypto.randomUUID(),
        userId,
        `Appeal update: "${matTitle}"`,
        `Admin replied: ${adminReply}`,
      ],
    },
  ]);
}

// Announcements & Bulk Messaging
export async function createAnnouncement(
  title: string,
  message: string,
  target: "all" | "app_only" | "web_only" = "all",
  adminId: string
): Promise<string> {
  const id = crypto.randomUUID();
  await turso.execute({
    sql: "INSERT INTO announcements (id, title, message, target, created_by) VALUES (?, ?, ?, ?, ?)",
    args: [id, title, message, target, adminId],
  });

  let targetQuery = "SELECT id FROM profiles";
  if (target === "app_only") {
    targetQuery = "SELECT id FROM profiles WHERE app_installed = 1";
  } else if (target === "web_only") {
    targetQuery = "SELECT id FROM profiles WHERE app_installed = 0";
  }
  const usersRs = await turso.execute(targetQuery);
  const notifBatch = usersRs.rows.map((u) => ({
    sql: "INSERT INTO user_notifications (id, user_id, title, message, type) VALUES (?, ?, ?, ?, 'broadcast')",
    args: [crypto.randomUUID(), String((u as Record<string, unknown>)['id']), title, message],
  }));

  if (notifBatch.length > 0) {
    for (let i = 0; i < notifBatch.length; i += 50) {
      await turso.batch(notifBatch.slice(i, i + 50));
    }
  }

  return id;
}

export async function getAnnouncements(): Promise<Announcement[]> {
  const rs = await turso.execute("SELECT * FROM announcements ORDER BY created_at DESC LIMIT 30");
  return rs.rows.map((r) => {
    const row = r as unknown as Record<string, unknown>;
    return {
      id: String(row['id']),
      title: String(row['title']),
      message: String(row['message']),
      target: (row['target'] as "all" | "app_only" | "web_only") || "all",
      created_by: row['created_by'] ? String(row['created_by']) : null,
      created_at: String(row['created_at']),
    };
  });
}

// Notifications
export async function getUserNotifications(userId: string): Promise<UserNotification[]> {
  const rs = await turso.execute({
    sql: "SELECT * FROM user_notifications WHERE user_id = ? ORDER BY created_at DESC LIMIT 50",
    args: [userId],
  });
  return rs.rows.map((r) => {
    const row = r as unknown as Record<string, unknown>;
    return {
      id: String(row['id']),
      user_id: String(row['user_id']),
      title: String(row['title']),
      message: String(row['message']),
      type: String(row['type'] || "general"),
      read: Boolean(row['read']),
      created_at: String(row['created_at']),
    };
  });
}

export async function markNotificationRead(notificationId: string): Promise<void> {
  await turso.execute({
    sql: "UPDATE user_notifications SET read = 1 WHERE id = ?",
    args: [notificationId],
  });
}

export async function requestWithdrawal(
  userId: string,
  points: number,
  bankName: string,
  accountNumber: string,
  accountName: string
): Promise<string> {
  const profile = await getProfile(userId);
  if (!profile) throw new Error("Profile not found");
  if (profile.suspended) throw new Error("Account suspended");
  if (points < MINIMUM_WITHDRAWAL_POINTS) {
    throw new Error(`Minimum withdrawal is ${MINIMUM_WITHDRAWAL_POINTS.toLocaleString()} SyllaPoints (₦${formatNaira(pointsToNaira(MINIMUM_WITHDRAWAL_POINTS))})`);
  }
  if (profile.points < points) throw new Error("Insufficient SyllaPoints balance");

  const amountNaira = pointsToNaira(points);
  const withdrawalId = crypto.randomUUID();

  await turso.batch([
    {
      sql: "UPDATE profiles SET points = points - ? WHERE id = ?",
      args: [points, userId],
    },
    {
      sql: `INSERT INTO withdrawals (id, user_id, points, amount_naira, bank_name, account_number, account_name, status)
            VALUES (?, ?, ?, ?, ?, ?, ?, 'pending')`,
      args: [withdrawalId, userId, points, amountNaira, bankName, accountNumber, accountName],
    },
    {
      sql: `INSERT INTO points_ledger (id, user_id, amount, reason, withdrawal_id)
            VALUES (?, ?, ?, ?, ?)`,
      args: [
        crypto.randomUUID(),
        userId,
        -points,
        `Withdrawal request: ₦${amountNaira.toLocaleString()}`,
        withdrawalId,
      ],
    },
  ]);

  return withdrawalId;
}

export async function getPointsLedger(userId: string): Promise<PointsLedgerEntry[]> {
  const rs = await turso.execute({
    sql: "SELECT * FROM points_ledger WHERE user_id = ? ORDER BY created_at DESC LIMIT 50",
    args: [userId],
  });
  return rs.rows as unknown as PointsLedgerEntry[];
}

export async function getWithdrawals(userId: string): Promise<Withdrawal[]> {
  const rs = await turso.execute({
    sql: "SELECT * FROM withdrawals WHERE user_id = ? ORDER BY created_at DESC",
    args: [userId],
  });
  return rs.rows as unknown as Withdrawal[];
}

export async function isUserAdmin(userId: string): Promise<boolean> {
  const rs = await turso.execute({
    sql: "SELECT id FROM user_roles WHERE user_id = ? AND role = 'admin' LIMIT 1",
    args: [userId],
  });
  return rs.rows.length > 0;
}

export async function adminToggleAdmin(userId: string, grant: boolean): Promise<void> {
  if (grant) {
    await turso.execute({
      sql: "INSERT OR IGNORE INTO user_roles (id, user_id, role) VALUES (?, ?, 'admin')",
      args: [crypto.randomUUID(), userId],
    });
  } else {
    await turso.execute({
      sql: "DELETE FROM user_roles WHERE user_id = ? AND role = 'admin'",
      args: [userId],
    });
  }
}

export async function adminSetSuspended(userId: string, suspended: boolean): Promise<void> {
  await turso.execute({
    sql: "UPDATE profiles SET suspended = ? WHERE id = ?",
    args: [suspended ? 1 : 0, userId],
  });
}

export async function adminAdjustPoints(userId: string, amount: number, reason: string): Promise<void> {
  await turso.batch([
    {
      sql: "UPDATE profiles SET points = MAX(0, points + ?) WHERE id = ?",
      args: [amount, userId],
    },
    {
      sql: "INSERT INTO points_ledger (id, user_id, amount, reason) VALUES (?, ?, ?, ?)",
      args: [crypto.randomUUID(), userId, amount, reason],
    },
  ]);
}

export interface LeaderboardEntry {
  id: string;
  rank: number;
  full_name: string;
  username?: string | null;
  avatar_url?: string | null;
  institution: string;
  course: string;
  level: string;
  points: number;
  study_minutes: number;
  sylla_plus: boolean;
  verified_uploads: number;
}

export async function getLeaderboard(limit = 50): Promise<LeaderboardEntry[]> {
  const rs = await turso.execute({
    sql: `
      SELECT 
        p.id, 
        p.full_name, 
        p.username,
        p.avatar_url,
        p.institution, 
        p.course, 
        p.level, 
        p.points, 
        p.study_minutes, 
        p.sylla_plus,
        (SELECT COUNT(*) FROM materials m WHERE m.user_id = p.id AND m.status = 'verified') AS verified_uploads
      FROM profiles p
      WHERE p.points > 0 OR p.study_minutes > 0
      ORDER BY p.points DESC, p.study_minutes DESC
      LIMIT ?
    `,
    args: [limit],
  });

  return rs.rows.map((r, idx) => ({
    id: String(r['id']),
    rank: idx + 1,
    full_name: r['full_name'] ? String(r['full_name']) : "Scholar",
    username: r['username'] ? String(r['username']) : null,
    avatar_url: r['avatar_url'] ? String(r['avatar_url']) : null,
    institution: r['institution'] ? String(r['institution']) : "Nigerian University",
    course: r['course'] ? String(r['course']) : "General Studies",
    level: r['level'] ? String(r['level']) : "100 Level",
    points: Number(r['points'] || 0),
    study_minutes: Number(r['study_minutes'] || 0),
    sylla_plus: Boolean(r['sylla_plus']),
    verified_uploads: Number(r['verified_uploads'] || 0),
  }));
}


export async function adminProcessWithdrawal(
  withdrawalId: string,
  status: "paid" | "rejected",
  note: string
): Promise<void> {
  const wRs = await turso.execute({
    sql: "SELECT * FROM withdrawals WHERE id = ? LIMIT 1",
    args: [withdrawalId],
  });
  if (wRs.rows.length === 0 || !wRs.rows[0]) throw new Error("Withdrawal not found");
  const w = wRs.rows[0] as unknown as Record<string, unknown>;

  if (status === "rejected") {
    await turso.batch([
      {
        sql: "UPDATE withdrawals SET status = 'rejected', admin_note = ?, processed_at = datetime('now') WHERE id = ?",
        args: [note, withdrawalId],
      },
      {
        sql: "UPDATE profiles SET points = points + ? WHERE id = ?",
        args: [Number(w['points']), String(w['user_id'])],
      },
      {
        sql: "INSERT INTO points_ledger (id, user_id, amount, reason, withdrawal_id) VALUES (?, ?, ?, ?, ?)",
        args: [
          crypto.randomUUID(),
          String(w['user_id']),
          Number(w['points']),
          `Refunded withdrawal: ${note}`,
          withdrawalId,
        ],
      },
    ]);
  } else {
    await turso.execute({
      sql: "UPDATE withdrawals SET status = 'paid', admin_note = ?, processed_at = datetime('now') WHERE id = ?",
      args: [note, withdrawalId],
    });
  }
}
