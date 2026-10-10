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
  const res = await turso.execute(
    "SELECT file_path, count(*) as count, min(title) as sample_title FROM materials GROUP BY file_path HAVING count > 1 ORDER BY count DESC"
  );
  console.log("=== DUPLICATED MATERIALS IN DATABASE ===");
  for (const r of res.rows) {
    console.log(`${r.count}x copies -> ${r.sample_title}`);
  }
}

main().catch(console.error);
