import "./dns-resilience.mjs";
import { createClient } from "@libsql/client";
import fs from "fs";

try {
  const envContent = fs.readFileSync(".env", "utf8");
  for (const line of envContent.split("\n")) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const eqIdx = trimmed.indexOf("=");
    if (eqIdx !== -1) {
      const k = trimmed.slice(0, eqIdx).trim();
      let v = trimmed.slice(eqIdx + 1).trim();
      if ((v.startsWith('"') && v.endsWith('"')) || (v.startsWith("'") && v.endsWith("'"))) v = v.slice(1, -1);
      if (!process.env[k]) process.env[k] = v;
    }
  }
} catch (e) {}

const turso = createClient({
  url: process.env.VITE_TURSO_DATABASE_URL || process.env.TURSO_DATABASE_URL,
  authToken: process.env.VITE_TURSO_AUTH_TOKEN || process.env.TURSO_AUTH_TOKEN,
});

async function main() {
  const total = await turso.execute("SELECT count(*) as count FROM materials WHERE status = 'verified'");
  console.log("TOTAL VERIFIED MATERIALS:", total.rows[0].count);
  const byInst = await turso.execute("SELECT institution, count(*) as count FROM materials GROUP BY institution ORDER BY count DESC");
  console.log("\nBY INSTITUTION:", byInst.rows);
  const byCourse = await turso.execute("SELECT course_code, count(*) as count FROM materials GROUP BY course_code ORDER BY count DESC");
  console.log("\nBY COURSE:", byCourse.rows);
  const books = await turso.execute("SELECT title, course_code, file_size FROM materials WHERE material_type = 'textbook'");
  console.log("\nFARMED TEXTBOOKS (" + books.rows.length + "):");
  for (const b of books.rows) {
    console.log(`- [${b.course_code}] ${b.title} (${(Number(b.file_size) / 1024 / 1024).toFixed(2)} MB)`);
  }
}

main().catch(console.error);
