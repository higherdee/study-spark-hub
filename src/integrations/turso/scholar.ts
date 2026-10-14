import { turso } from "./client";

export interface ScholarArchetype {
  id: string;
  title: string;
  badgeEmoji: string;
  tagline: string;
  quote: string;
  colorTheme: "amber" | "emerald" | "violet" | "rose" | "indigo" | "cyan";
}

export interface ScholarFlexData {
  user: {
    id: string;
    fullName: string;
    username: string;
    avatarUrl?: string | null;
    institution: string;
    course: string;
    level: string;
    points: number;
    studyMinutes: number;
    studyHours: string;
    currentStreak: number;
    longestStreak: number;
    syllaPlus: boolean;
    verifiedUploads: number;
  };
  departmentRank: number;
  departmentTotal: number;
  departmentPercentile: number; // e.g. 3 -> Top 3%
  institutionRank: number;
  institutionTotal: number;
  institutionPercentile: number;
  battlesEntered: number;
  battlesWon: number;
  battleWinRate: number; // percentage (0 - 100)
  archetype: ScholarArchetype;
  shareUrl: string;
  generatedDate: string;
}

/**
 * Assigns an authentic, witty AI Scholar Archetype based on real performance metrics
 */
export function determineScholarArchetype(data: {
  currentStreak: number;
  longestStreak: number;
  studyMinutes: number;
  departmentPercentile: number;
  battleWinRate: number;
  battlesEntered: number;
  verifiedUploads: number;
  points: number;
  course: string;
}): ScholarArchetype {
  // 1. Extreme Streak Titan (14+ days)
  if (data.currentStreak >= 14 || data.longestStreak >= 21) {
    return {
      id: "streak_titan",
      title: "The Unstoppable Streak Titan",
      badgeEmoji: "🔥",
      tagline: "Relentless Academic Momentum",
      quote: "Neither rain, power cuts, nor exam week could break the sacred daily flame.",
      colorTheme: "amber",
    };
  }

  // 2. Battle Arena Dominator (high win rate with 3+ battles)
  if (data.battlesEntered >= 3 && data.battleWinRate >= 70) {
    return {
      id: "quiz_reaper",
      title: "The Quiz Lobby Reaper",
      badgeEmoji: "⚡",
      tagline: "Cold-Blooded Arena Dominator",
      quote: "Enters group battle lobbies only to take everyone's points without remorse.",
      colorTheme: "violet",
    };
  }

  // 3. Top of Department Curve (Top 5%)
  if (data.departmentPercentile <= 5) {
    return {
      id: "cgpa_menace",
      title: "The 4.98 CGPA Menace",
      badgeEmoji: "👑",
      tagline: "Departmental Curve Breaker",
      quote: "Casually sets the departmental curve while claiming 'I swear I didn't even read'.",
      colorTheme: "emerald",
    };
  }

  // 4. Night Owl / Heavy Study Hours (20+ hours)
  if (data.studyMinutes >= 1200) {
    const courseShort = data.course.toLowerCase().includes("mech") || data.course.toLowerCase().includes("eng")
      ? "Thermodynamics"
      : data.course.toLowerCase().includes("med") || data.course.toLowerCase().includes("bio")
      ? "Anatomy"
      : data.course.toLowerCase().includes("law")
      ? "Jurisprudence"
      : "Derivation";
    return {
      id: "night_demon",
      title: `The 2AM ${courseShort} Demon`,
      badgeEmoji: "🧪",
      tagline: "Insomniac Formula Specialist",
      quote: "Fueled by midnight caffeine, deriving proofs when ordinary mortals are fast asleep.",
      colorTheme: "rose",
    };
  }

  // 5. Past Question / Material Collector
  if (data.verifiedUploads >= 3) {
    return {
      id: "material_hoarder",
      title: "The Past Question Hoarder",
      badgeEmoji: "📚",
      tagline: "Academic Archive Cartel",
      quote: "Possesses exam scripts from 2012 that even the head of department has misplaced.",
      colorTheme: "indigo",
    };
  }

  // 6. High Points Accumulator
  if (data.points >= 350) {
    return {
      id: "archmage",
      title: "Formula Sheet Archmage",
      badgeEmoji: "✨",
      tagline: "Master of Academic Currency",
      quote: "Turns lecture slides and practice quizzes into pure SyllaPoints and campus clout.",
      colorTheme: "amber",
    };
  }

  // 7. Starter / Emerging Scholar
  return {
    id: "rising_star",
    title: "The Campus Rising Star",
    badgeEmoji: "🚀",
    tagline: "Uncharted Academic Potential",
    quote: "Building steady streaks, hunting points, and rising through the departmental ranks.",
    colorTheme: "cyan",
  };
}

/**
 * Fetches all metrics and computes ranks for Campus Wrapped & Public Scholar Profile
 */
export async function getScholarFlexData(identifier: {
  userId?: string;
  username?: string;
}): Promise<ScholarFlexData | null> {
  let profileRow: any = null;

  if (identifier.userId) {
    const rs = await turso.execute({
      sql: `SELECT * FROM profiles WHERE id = ? LIMIT 1`,
      args: [identifier.userId],
    });
    profileRow = rs.rows[0];
  } else if (identifier.username) {
    const cleanUsername = identifier.username.replace(/^@/, "").trim().toLowerCase();
    const rs = await turso.execute({
      sql: `SELECT * FROM profiles WHERE LOWER(username) = ? LIMIT 1`,
      args: [cleanUsername],
    });
    profileRow = rs.rows[0];
  }

  if (!profileRow) return null;

  const userId = String(profileRow.id);
  const fullName = String(profileRow.full_name || "Scholar");
  const username = String(profileRow.username || `scholar_${userId.slice(0, 6)}`);
  const avatarUrl = profileRow.avatar_url ? String(profileRow.avatar_url) : null;
  const institution = String(profileRow.institution || "Campus University");
  const course = String(profileRow.course || "General Studies");
  const level = String(profileRow.level || "100 Level");
  const points = Number(profileRow.points || 0);
  const studyMinutes = Number(profileRow.study_minutes || 0);
  const currentStreak = Number(profileRow.current_streak || 1);
  const longestStreak = Number(profileRow.longest_streak || currentStreak || 1);
  const syllaPlus = Boolean(profileRow.sylla_plus);

  // 1. Department Rank & Percentile
  let departmentRank = 1;
  let departmentTotal = 1;
  let departmentPercentile = 5;

  try {
    const deptRs = await turso.execute({
      sql: `
        SELECT 
          (SELECT COUNT(*) FROM profiles WHERE course = ? AND points > ?) as higher_count,
          (SELECT COUNT(*) FROM profiles WHERE course = ? AND (points > 0 OR study_minutes > 0)) as total_count
      `,
      args: [course, points, course],
    });
    const higher = Number(deptRs.rows[0]?.higher_count || 0);
    const total = Math.max(1, Number(deptRs.rows[0]?.total_count || 1));
    departmentRank = higher + 1;
    departmentTotal = total;
    departmentPercentile = Math.max(1, Math.min(100, Math.round((departmentRank / total) * 100)));
  } catch (err) {
    console.warn("Department rank calculation fallback:", err);
  }

  // 2. Institution Rank & Percentile
  let institutionRank = 1;
  let institutionTotal = 1;
  let institutionPercentile = 10;

  try {
    const instRs = await turso.execute({
      sql: `
        SELECT 
          (SELECT COUNT(*) FROM profiles WHERE institution = ? AND points > ?) as higher_count,
          (SELECT COUNT(*) FROM profiles WHERE institution = ? AND (points > 0 OR study_minutes > 0)) as total_count
      `,
      args: [institution, points, institution],
    });
    const higher = Number(instRs.rows[0]?.higher_count || 0);
    const total = Math.max(1, Number(instRs.rows[0]?.total_count || 1));
    institutionRank = higher + 1;
    institutionTotal = total;
    institutionPercentile = Math.max(1, Math.min(100, Math.round((institutionRank / total) * 100)));
  } catch (err) {
    console.warn("Institution rank calculation fallback:", err);
  }

  // 3. Battle Stats & Win-rate
  let battlesEntered = 0;
  let battlesWon = 0;

  try {
    const battleRs = await turso.execute({
      sql: `SELECT COUNT(*) as total_battles FROM battle_participants WHERE user_id = ? AND role = 'fighter'`,
      args: [userId],
    });
    battlesEntered = Number(battleRs.rows[0]?.total_battles || 0);

    const winRs = await turso.execute({
      sql: `
        SELECT COUNT(*) as won_count
        FROM study_battles sb
        JOIN battle_participants bp ON bp.battle_id = sb.id AND bp.user_id = ?
        WHERE sb.status = 'completed' AND (
          sb.winner_ids_json LIKE ('%' || ? || '%')
          OR bp.score = (SELECT MAX(score) FROM battle_participants bp2 WHERE bp2.battle_id = sb.id)
        )
      `,
      args: [userId, userId],
    });
    battlesWon = Number(winRs.rows[0]?.won_count || 0);
  } catch (err) {
    console.warn("Battle stats calculation fallback:", err);
  }

  const battleWinRate = battlesEntered > 0 ? Math.round((battlesWon / battlesEntered) * 100) : 0;

  // 4. Verified Uploads
  let verifiedUploads = 0;
  try {
    const matRs = await turso.execute({
      sql: `SELECT COUNT(*) as cnt FROM materials WHERE user_id = ? AND status = 'verified'`,
      args: [userId],
    });
    verifiedUploads = Number(matRs.rows[0]?.cnt || 0);
  } catch {}

  // 5. AI Scholar Archetype
  const archetype = determineScholarArchetype({
    currentStreak,
    longestStreak,
    studyMinutes,
    departmentPercentile,
    battleWinRate,
    battlesEntered,
    verifiedUploads,
    points,
    course,
  });

  const now = new Date();
  const options: Intl.DateTimeFormatOptions = { month: "short", day: "numeric", year: "numeric" };
  const generatedDate = now.toLocaleDateString("en-US", options);

  return {
    user: {
      id: userId,
      fullName,
      username,
      avatarUrl,
      institution,
      course,
      level,
      points,
      studyMinutes,
      studyHours: (studyMinutes / 60).toFixed(1),
      currentStreak,
      longestStreak,
      syllaPlus,
      verifiedUploads,
    },
    departmentRank,
    departmentTotal,
    departmentPercentile,
    institutionRank,
    institutionTotal,
    institutionPercentile,
    battlesEntered,
    battlesWon,
    battleWinRate,
    archetype,
    shareUrl: `https://syllaboss.org/scholar/${username}`,
    generatedDate,
  };
}
