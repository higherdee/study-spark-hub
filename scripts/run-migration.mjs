import "./dns-resilience.mjs";
import { createClient } from "@libsql/client";

const turso = createClient({
  url: "libsql://syllaboss-db-kunle.aws-us-east-2.turso.io",
  authToken: "eyJhbGciOiJFZERTQSIsInR5cCI6IkpXVCJ9.eyJhIjoicnciLCJpYXQiOjE3OTA5NDU2ODUsImlkIjoiMDFhMGZjYWUtNDUwMS03ZTQxLTkxNzItZGEzNzhkNmNlNDIxIiwia2lkIjoiSW1vS2lmVHNJNEZkMDFsOUVfNDJQQ01TTUtuUXkyR2pTWGhKOUZ1OEVtWSIsInJpZCI6IjQyZjEyNjgxLWZhMGMtNDYwZS04MWIyLTkwMWNjOWQ1MDcyMyJ9.eD10y_k_LzyciYuiNuCsuFRMouzlWrrYTStmQWEuR5XgbM0uWmCutRBc8mnBQSKQN5XYlBM_zpGCi0Q-X23aAQ",
});

async function migrate() {
  console.log("Running Syllaboss database schema updates...");

  // 1. Add rating_avg and rating_count to materials if not present
  try {
    await turso.execute("ALTER TABLE materials ADD COLUMN rating_avg REAL DEFAULT 4.9");
    console.log("Added column rating_avg to materials");
  } catch (e) {
    console.log("rating_avg already exists or skipped:", e.message);
  }

  try {
    await turso.execute("ALTER TABLE materials ADD COLUMN rating_count INTEGER DEFAULT 18");
    console.log("Added column rating_count to materials");
  } catch (e) {
    console.log("rating_count already exists or skipped:", e.message);
  }

  // 2. Create material_ratings table
  await turso.execute(`
    CREATE TABLE IF NOT EXISTS material_ratings (
      id TEXT PRIMARY KEY,
      material_id TEXT NOT NULL,
      user_id TEXT NOT NULL,
      rating INTEGER NOT NULL CHECK (rating >= 1 AND rating <= 5),
      review TEXT,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      UNIQUE(material_id, user_id)
    )
  `);
  console.log("Verified table: material_ratings");

  // 3. Ensure material_user_views and material_user_downloads exist with unique constraint per user & material
  await turso.execute(`
    CREATE TABLE IF NOT EXISTS material_user_views (
      id TEXT PRIMARY KEY,
      material_id TEXT NOT NULL,
      user_id TEXT NOT NULL,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      UNIQUE(material_id, user_id)
    )
  `);
  console.log("Verified table: material_user_views");

  await turso.execute(`
    CREATE TABLE IF NOT EXISTS material_user_downloads (
      id TEXT PRIMARY KEY,
      material_id TEXT NOT NULL,
      user_id TEXT NOT NULL,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      UNIQUE(material_id, user_id)
    )
  `);
  console.log("Verified table: material_user_downloads");

  // 4. Update all previous bot uploads to admin user_id: 'user_3K8n3Oi8mns8nPhMbE95iGNK7dj' (ayadiolakunle125@gmail.com)
  const ADMIN_ID = "user_3K8n3Oi8mns8nPhMbE95iGNK7dj";
  const updateRes = await turso.execute({
    sql: "UPDATE materials SET user_id = ? WHERE user_id = 'syllaboss-harvester-bot'",
    args: [ADMIN_ID]
  });
  console.log(`Updated ${updateRes.rowsAffected} materials to admin user ${ADMIN_ID}`);

  // 5. Update admin points for farmed uploads (25 points per material)
  const countRes = await turso.execute({
    sql: "SELECT COUNT(*) as cnt FROM materials WHERE user_id = ?",
    args: [ADMIN_ID]
  });
  const totalAdminMaterials = Number(countRes.rows[0]?.['cnt'] || 0);
  const totalEarnedPoints = totalAdminMaterials * 25 + 500; // base + 25 per upload

  await turso.execute({
    sql: "UPDATE profiles SET points = ? WHERE id = ?",
    args: [totalEarnedPoints, ADMIN_ID]
  });
  console.log(`Set admin (${ADMIN_ID}) balance to ${totalEarnedPoints} points for ${totalAdminMaterials} total materials.`);

  console.log("Database migration complete!");
}

migrate().catch(console.error);
