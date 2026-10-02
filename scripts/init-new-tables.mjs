import { createClient } from "@libsql/client";

const turso = createClient({
  url: process.env.TURSO_DATABASE_URL || "libsql://syllaboss-db-kunle.aws-us-east-2.turso.io",
  authToken: process.env.TURSO_AUTH_TOKEN || "eyJhbGciOiJFZERTQSIsInR5cCI6IkpXVCJ9.eyJhIjoicnciLCJpYXQiOjE3OTA5NDU2ODUsImlkIjoiMDFhMGZjYWUtNDUwMS03ZTQxLTkxNzItZGEzNzhkNmNlNDIxIiwia2lkIjoiSW1vS2lmVHNJNEZkMDFsOUVfNDJQQ01TTUtuUXkyR2pTWGhKOUZ1OEVtWSIsInJpZCI6IjQyZjEyNjgxLWZhMGMtNDYwZS04MWIyLTkwMWNjOWQ1MDcyMyJ9.eD10y_k_LzyciYuiNuCsuFRMouzlWrrYTStmQWEuR5XgbM0uWmCutRBc8mnBQSKQN5XYlBM_zpGCi0Q-X23aAQ",
});

async function main() {
  await turso.execute(`
    CREATE TABLE IF NOT EXISTS complaints (
      id TEXT PRIMARY KEY,
      material_id TEXT NOT NULL,
      user_id TEXT NOT NULL,
      complaint_text TEXT NOT NULL,
      status TEXT DEFAULT 'pending',
      admin_reply TEXT,
      created_at TEXT DEFAULT (datetime('now')),
      updated_at TEXT DEFAULT (datetime('now'))
    );
  `);

  await turso.execute(`
    CREATE TABLE IF NOT EXISTS announcements (
      id TEXT PRIMARY KEY,
      title TEXT NOT NULL,
      message TEXT NOT NULL,
      target TEXT DEFAULT 'all',
      created_by TEXT,
      created_at TEXT DEFAULT (datetime('now'))
    );
  `);

  await turso.execute(`
    CREATE TABLE IF NOT EXISTS user_notifications (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL,
      title TEXT NOT NULL,
      message TEXT NOT NULL,
      type TEXT DEFAULT 'general',
      read INTEGER DEFAULT 0,
      created_at TEXT DEFAULT (datetime('now'))
    );
  `);

  await turso.execute(`
    UPDATE profiles SET sylla_plus = 1 WHERE email IN ('ayadiolakunle125@gmail.com', 'ayadiolakunle124@gmail.com');
  `);

  console.log("Complaints, Announcements, and Notifications tables created, and SyllaPlus accounts preserved!");
}

main().catch(console.error);
