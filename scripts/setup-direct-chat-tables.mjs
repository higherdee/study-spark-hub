import "./dns-resilience.mjs";
import { createClient } from "@libsql/client";
import fs from "fs";

let url = process.env.TURSO_DATABASE_URL;
let token = process.env.TURSO_AUTH_TOKEN;

if (!url || !token) {
  try {
    const env = fs.readFileSync(".env.local", "utf8");
    for (const l of env.split("\n")) {
      if (l.startsWith("TURSO_DATABASE_URL=")) url = l.split("=")[1].trim().replace(/^["']|["']$/g, "");
      if (l.startsWith("TURSO_AUTH_TOKEN=")) token = l.split("=")[1].trim().replace(/^["']|["']$/g, "");
    }
  } catch (e) {}
}

const db = createClient({ url, authToken: token });

async function run() {
  console.log("Setting up direct peer chat tables...");

  await db.execute(`
    CREATE TABLE IF NOT EXISTS direct_conversations (
      id TEXT PRIMARY KEY,
      user1_id TEXT NOT NULL,
      user2_id TEXT NOT NULL,
      last_message_text TEXT,
      last_message_at TEXT DEFAULT (datetime('now')),
      created_at TEXT DEFAULT (datetime('now'))
    )
  `);

  await db.execute(`
    CREATE INDEX IF NOT EXISTS idx_dc_users ON direct_conversations(user1_id, user2_id)
  `);

  await db.execute(`
    CREATE TABLE IF NOT EXISTS direct_messages (
      id TEXT PRIMARY KEY,
      conversation_id TEXT NOT NULL,
      sender_id TEXT NOT NULL,
      content TEXT NOT NULL,
      material_id TEXT,
      created_at TEXT DEFAULT (datetime('now')),
      is_read INTEGER DEFAULT 0
    )
  `);

  await db.execute(`
    CREATE INDEX IF NOT EXISTS idx_dm_conv ON direct_messages(conversation_id, created_at)
  `);

  // Ensure group_messages also supports material_id
  const gmInfo = await db.execute("PRAGMA table_info(group_messages)");
  const gmCols = gmInfo.rows.map((r) => r.name);
  if (!gmCols.includes("material_id")) {
    await db.execute("ALTER TABLE group_messages ADD COLUMN material_id TEXT");
    console.log("Added material_id to group_messages");
  }

  // Ensure study_groups has avatar_url and is_general
  const sgInfo = await db.execute("PRAGMA table_info(study_groups)");
  const sgCols = sgInfo.rows.map((r) => r.name);
  if (!sgCols.includes("avatar_url")) {
    await db.execute("ALTER TABLE study_groups ADD COLUMN avatar_url TEXT");
  }

  console.log("Peer chat tables initialized successfully!");
}

run().catch(console.error);
