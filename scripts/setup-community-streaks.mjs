import "./dns-resilience.mjs";
import { createClient } from "@libsql/client";
import fs from "fs";

// Load .env
try {
  const envContent = fs.readFileSync(".env", "utf8");
  for (const line of envContent.split("\n")) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const eqIdx = trimmed.indexOf("=");
    if (eqIdx !== -1) {
      const k = trimmed.slice(0, eqIdx).trim();
      let v = trimmed.slice(eqIdx + 1).trim();
      if ((v.startsWith('"') && v.endsWith('"')) || (v.startsWith("'") && v.endsWith("'"))) {
        v = v.slice(1, -1);
      }
      if (!process.env[k]) process.env[k] = v;
    }
  }
} catch (e) {}

const turso = createClient({
  url: process.env.VITE_TURSO_DATABASE_URL || process.env.TURSO_DATABASE_URL || "",
  authToken: process.env.VITE_TURSO_AUTH_TOKEN || process.env.TURSO_AUTH_TOKEN || "",
});

async function main() {
  console.log("Setting up Community Chat, Study Groups, and Streaks in Turso DB...");

  // 1. Add streak and reminder columns to profiles if not already present
  const profileCols = [
    "ALTER TABLE profiles ADD COLUMN current_streak INTEGER NOT NULL DEFAULT 0",
    "ALTER TABLE profiles ADD COLUMN longest_streak INTEGER NOT NULL DEFAULT 0",
    "ALTER TABLE profiles ADD COLUMN last_streak_date TEXT DEFAULT ''",
    "ALTER TABLE profiles ADD COLUMN daily_reading_goal_minutes INTEGER NOT NULL DEFAULT 20",
    "ALTER TABLE profiles ADD COLUMN last_reading_reminder_dismissed TEXT DEFAULT ''",
  ];

  for (const sql of profileCols) {
    try {
      await turso.execute(sql);
      console.log("Executed column migration:", sql.slice(0, 50));
    } catch (e) {
      // Column may already exist
      if (!e.message?.includes("duplicate column")) {
        console.log("Profile col note:", e.message);
      }
    }
  }

  // 2. Study Groups Table
  await turso.execute(`
    CREATE TABLE IF NOT EXISTS study_groups (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      description TEXT,
      course_code TEXT,
      institution TEXT,
      category TEXT DEFAULT 'General',
      created_by TEXT NOT NULL,
      avatar_color TEXT DEFAULT '#4f46e5',
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      member_count INTEGER DEFAULT 1
    )
  `);
  console.log("Created table: study_groups");

  // 3. Study Group Members Table
  await turso.execute(`
    CREATE TABLE IF NOT EXISTS study_group_members (
      id TEXT PRIMARY KEY,
      group_id TEXT NOT NULL,
      user_id TEXT NOT NULL,
      role TEXT DEFAULT 'member',
      joined_at TEXT NOT NULL DEFAULT (datetime('now')),
      UNIQUE(group_id, user_id)
    )
  `);
  console.log("Created table: study_group_members");

  // 4. Group Messages Table (Supports text + shared library materials)
  await turso.execute(`
    CREATE TABLE IF NOT EXISTS group_messages (
      id TEXT PRIMARY KEY,
      group_id TEXT NOT NULL,
      user_id TEXT NOT NULL,
      user_name TEXT NOT NULL,
      user_institution TEXT,
      content TEXT NOT NULL,
      material_id TEXT,
      material_title TEXT,
      material_course_code TEXT,
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    )
  `);
  console.log("Created table: group_messages");

  // 5. Seed default high-value study groups if none exist
  const existingGroups = await turso.execute("SELECT COUNT(*) as count FROM study_groups");
  const count = Number(existingGroups.rows[0]?.count || 0);

  if (count === 0) {
    console.log("Seeding initial student study groups...");
    const initialGroups = [
      {
        id: "group-get206-achievers",
        name: "Achievers Engineering Hub (GET 206)",
        description: "Workshop practice questions, lab manual discussions, machine tools, and exam prep for 200L Achievers engineers.",
        course_code: "GET 206",
        institution: "Achievers University, Owo",
        category: "Engineering",
        created_by: "user_3K8n3Oi8mns8nPhMbE95iGNK7dj",
        avatar_color: "#2563eb",
      },
      {
        id: "group-mth101-nigeria",
        name: "General Mathematics & Calculus (MTH 101)",
        description: "Differentiation, limits, integration past questions, and Euclid geometry across all Nigerian universities.",
        course_code: "MTH 101",
        institution: "All Universities (NUC CCMAS)",
        category: "Mathematics",
        created_by: "user_3K8n3Oi8mns8nPhMbE95iGNK7dj",
        avatar_color: "#7c3aed",
      },
      {
        id: "group-phy102-lab",
        name: "General Physics & Electricity (PHY 102)",
        description: "DC circuits, magnetic fields, Gauss's law problem sets, and physics lab experiment sharing.",
        course_code: "PHY 102",
        institution: "All Universities (NUC CCMAS)",
        category: "Sciences",
        created_by: "user_3K8n3Oi8mns8nPhMbE95iGNK7dj",
        avatar_color: "#059669",
      },
      {
        id: "group-premed-biology",
        name: "Pre-Med & Biological Sciences Forum (BIO 101)",
        description: "Cellular organization, genetics notes, anatomy diagrams, and study flashcards.",
        course_code: "BIO 101",
        institution: "All Universities (NUC CCMAS)",
        category: "Health & Life Sciences",
        created_by: "user_3K8n3Oi8mns8nPhMbE95iGNK7dj",
        avatar_color: "#db2777",
      },
      {
        id: "group-bus-eco-finance",
        name: "Business, Economics & Accounting Circle",
        description: "Microeconomics past questions, financial statement preparation, and business case studies.",
        course_code: "BUS 101",
        institution: "All Universities",
        category: "Social & Management Sciences",
        created_by: "user_3K8n3Oi8mns8nPhMbE95iGNK7dj",
        avatar_color: "#d97706",
      },
    ];

    for (const g of initialGroups) {
      await turso.execute({
        sql: `INSERT INTO study_groups (id, name, description, course_code, institution, category, created_by, avatar_color)
              VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
        args: [g.id, g.name, g.description, g.course_code, g.institution, g.category, g.created_by, g.avatar_color],
      });

      // Add seed welcome message
      await turso.execute({
        sql: `INSERT INTO group_messages (id, group_id, user_id, user_name, user_institution, content, material_id, material_title, material_course_code)
              VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        args: [
          `msg-welcome-${g.id}`,
          g.id,
          "system",
          "Boss Community AI",
          g.institution,
          `Welcome to the ${g.name}! Feel free to ask questions, share lecture notes, and attach materials from the library.`,
          null,
          null,
          null,
        ],
      });
    }
  }

  console.log("✅ Community & Streaks migration completed successfully!");
}

main().catch(console.error);
