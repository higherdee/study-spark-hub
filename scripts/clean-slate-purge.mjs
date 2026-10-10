import "./dns-resilience.mjs";
import { createClient } from "@libsql/client";
import { S3Client, ListObjectsV2Command, DeleteObjectsCommand } from "@aws-sdk/client-s3";
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

const r2Client = new S3Client({
  region: "auto",
  endpoint: process.env.R2_ENDPOINT || "https://4ac4c0251ef536b199cd90f31059ab22.r2.cloudflarestorage.com",
  forcePathStyle: true,
  credentials: {
    accessKeyId: process.env.R2_ACCESS_KEY_ID || process.env.VITE_R2_ACCESS_KEY_ID || "",
    secretAccessKey: process.env.R2_SECRET_ACCESS_KEY || process.env.VITE_R2_SECRET_ACCESS_KEY || "",
  },
});
const R2_BUCKET = process.env.R2_BUCKET_NAME || "syllaboss";

async function main() {
  console.log("Purging all materials from Turso DB as requested by user...");
  const delRes = await turso.execute("DELETE FROM materials");
  console.log("Deleted materials count:", delRes.rowsAffected);

  try {
    await turso.execute("DELETE FROM points_ledger WHERE reason LIKE '%Farmed%'");
    console.log("Cleaned farmed points ledger entries.");
  } catch (e) {}

  console.log("Purging courseware objects from R2 bucket...");
  let continuationToken = undefined;
  let totalDeletedR2 = 0;

  do {
    const listRes = await r2Client.send(new ListObjectsV2Command({
      Bucket: R2_BUCKET,
      Prefix: "materials/",
      ContinuationToken: continuationToken,
    }));

    if (listRes.Contents && listRes.Contents.length > 0) {
      const keysToDelete = listRes.Contents.map(c => ({ Key: c.Key }));
      await r2Client.send(new DeleteObjectsCommand({
        Bucket: R2_BUCKET,
        Delete: { Objects: keysToDelete },
      }));
      totalDeletedR2 += keysToDelete.length;
      console.log(`Deleted ${totalDeletedR2} objects from R2 materials/...`);
    }
    continuationToken = listRes.NextContinuationToken;
  } while (continuationToken);

  console.log(`Total R2 materials deleted: ${totalDeletedR2}`);
  console.log("Clean slate purge completed successfully! Database and R2 are 100% clean.");
}

main().catch(console.error);
