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
  const books = await turso.execute("SELECT title, institution, course_code, material_type, file_size, page_count, downloads, views, rating_avg FROM materials WHERE institution LIKE '%Achievers%' LIMIT 10");
  console.log("\nSAMPLE ACHIEVERS UNIVERSITY MATERIALS (" + books.rows.length + "):");
  for (const b of books.rows) {
    console.log(`- [${b.course_code}] ${b.title} (${(Number(b.file_size) / 1024 / 1024).toFixed(2)} MB, ${b.page_count} pgs, ${b.material_type}, dl:${b.downloads}, v:${b.views}, r:${b.rating_avg})`);
  }

  const globalSample = await turso.execute("SELECT title, institution, course_code, file_size, page_count FROM materials WHERE institution LIKE '%Cambridge%' OR institution LIKE '%MIT%' OR institution LIKE '%Massachusetts%' OR institution LIKE '%Oxford%' LIMIT 10");
  console.log("\nSAMPLE GLOBAL MATERIALS (" + globalSample.rows.length + "):");
  for (const g of globalSample.rows) {
    console.log(`- [${g.course_code}] ${g.institution}: ${g.title} (${(Number(g.file_size) / 1024 / 1024).toFixed(2)} MB, ${g.page_count} pgs)`);
  }
}

main().catch(console.error);
