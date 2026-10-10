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
  console.log("Checking profiles table columns...");
  const info = await db.execute("PRAGMA table_info(profiles)");
  const cols = info.rows.map((r) => r.name);

  if (!cols.includes("username")) {
    console.log("Adding username column to profiles...");
    await db.execute("ALTER TABLE profiles ADD COLUMN username TEXT");
    console.log("Creating unique index on profiles(username)...");
    try {
      await db.execute("CREATE UNIQUE INDEX IF NOT EXISTS idx_profiles_username ON profiles(LOWER(username))");
    } catch (e) {
      console.warn("Index warning:", e.message);
    }
  } else {
    console.log("username column already exists");
  }

  if (!cols.includes("avatar_url")) {
    console.log("Adding avatar_url column to profiles...");
    await db.execute("ALTER TABLE profiles ADD COLUMN avatar_url TEXT");
  } else {
    console.log("avatar_url column already exists");
  }

  // Populate usernames for existing profiles if null
  const unassigned = await db.execute("SELECT id, full_name, email FROM profiles WHERE username IS NULL OR username = ''");
  console.log(`Found ${unassigned.rows.length} profiles without username. Generating handles...`);

  for (const row of unassigned.rows) {
    const raw = String(row.full_name || row.email?.split("@")[0] || "scholar")
      .toLowerCase()
      .replace(/[^a-z0-9_]/g, "_")
      .replace(/_+/g, "_")
      .slice(0, 15);
    const suffix = String(row.id).slice(-4);
    const candidate = `${raw}_${suffix}`;

    await db.execute({
      sql: "UPDATE profiles SET username = ? WHERE id = ?",
      args: [candidate, row.id],
    });
    console.log(`Assigned username: ${candidate} for ${row.id}`);
  }

  console.log("Username and avatar migration completed successfully!");
}

run().catch(console.error);
