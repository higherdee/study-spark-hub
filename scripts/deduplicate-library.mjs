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
  console.log("Fetching all materials to deduplicate...");
  const res = await turso.execute("SELECT id, title, file_path, institution, course_code FROM materials");
  
  // Group by file_path
  const byFile = new Map();
  for (const row of res.rows) {
    if (!byFile.has(row.file_path)) {
      byFile.set(row.file_path, []);
    }
    byFile.get(row.file_path).push(row);
  }

  console.log(`Found ${res.rows.length} total entries across ${byFile.size} unique files.`);

  let deletedCount = 0;
  let updatedCount = 0;

  for (const [filePath, rows] of byFile.entries()) {
    // Determine the canonical record to keep
    const keeper = rows[0];

    // Clean the title: remove any trailing ' (University Name)'
    let cleanTitle = keeper.title.replace(/\s*\([^)]+(?:University|College|Institute|Polytechnic|ETH|TU|IIT|MIT)[^)]*\)$/i, "").trim();

    // Determine the proper institution based on the document
    let canonicalInstitution = keeper.institution;
    if (cleanTitle.includes("MIT") || cleanTitle.includes("Massachusetts Institute")) {
      canonicalInstitution = "Massachusetts Institute of Technology";
    } else if (cleanTitle.includes("Cambridge")) {
      canonicalInstitution = "University of Cambridge";
    } else if (cleanTitle.includes("Groundwork of Nigerian History")) {
      canonicalInstitution = "National Curriculum (NUC CCMAS)";
    } else if (cleanTitle.includes("Workshop Practice")) {
      canonicalInstitution = "Achievers University, Owo";
    } else if (cleanTitle.includes("Manufacturing Process")) {
      canonicalInstitution = "National Curriculum (NUC CCMAS Recommended)";
    } else if (cleanTitle.includes("OpenStax") || cleanTitle.includes("University Physics") || cleanTitle.includes("Financial Accounting") || cleanTitle.includes("Microeconomics") || cleanTitle.includes("Introduction to Business")) {
      canonicalInstitution = "National Curriculum (NUC CCMAS Recommended)";
    }

    // Update the keeper with clean title and proper institution
    await turso.execute({
      sql: "UPDATE materials SET title = ?, institution = ? WHERE id = ?",
      args: [cleanTitle, canonicalInstitution, keeper.id],
    });
    updatedCount++;

    // Delete all duplicate clones
    const duplicateIds = rows.slice(1).map(r => r.id);
    for (const dupId of duplicateIds) {
      await turso.execute({
        sql: "DELETE FROM materials WHERE id = ?",
        args: [dupId],
      });
      deletedCount++;
    }

    console.log(`[KEPT 1] [${keeper.course_code}] ${cleanTitle} -> ${canonicalInstitution} (Deleted ${duplicateIds.length} duplicate clones)`);
  }

  console.log(`\n✅ Cleaned library successfully!`);
  console.log(`Kept ${updatedCount} unique authentic materials.`);
  console.log(`Deleted ${deletedCount} duplicate entries.`);
}

main().catch(console.error);
