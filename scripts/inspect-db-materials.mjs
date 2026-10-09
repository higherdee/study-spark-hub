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

async function testSearch(query) {
  const words = query.trim().split(/\s+/).filter(Boolean);
  const conditions = ["status = 'verified'"];
  const args = [];
  for (const w of words) {
    const term = `%${w}%`;
    conditions.push(
      "(title LIKE ? OR course LIKE ? OR course_code LIKE ? OR institution LIKE ? OR description LIKE ?)"
    );
    args.push(term, term, term, term, term);
  }
  const sql = `SELECT title, course_code, institution, material_type, file_size FROM materials WHERE ${conditions.join(" AND ")} ORDER BY created_at DESC LIMIT 10`;
  const res = await turso.execute({ sql, args });
  console.log(`\n======================================================`);
  console.log(`🔍 SEARCH: "${query}" (Found: ${res.rows.length})`);
  console.log(`======================================================`);
  for (const r of res.rows) {
    console.log(` • [${r.course_code}] [${r.material_type}] ${r.institution}`);
    console.log(`   -> ${r.title} (${(Number(r.file_size)/1024).toFixed(1)} KB)`);
  }
}

async function main() {
  await testSearch("GET 206");
  await testSearch("lathe");
  await testSearch("welding");
  await testSearch("Achievers GET 206");
  await testSearch("FUTA workshop");
  await testSearch("past questions");
  await testSearch("nelkon");
  await testSearch("groundwork history");
}

main().catch(console.error);
