import "./dns-resilience.mjs";
import { createClient } from "@libsql/client";
import { S3Client, ListObjectsV2Command, DeleteObjectsCommand } from "@aws-sdk/client-s3";

const turso = createClient({
  url: process.env.TURSO_DATABASE_URL || "libsql://syllaboss-db-kunle.aws-us-east-2.turso.io",
  authToken: process.env.TURSO_AUTH_TOKEN || "eyJhbGciOiJFZERTQSIsInR5cCI6IkpXVCJ9.eyJhIjoicnciLCJpYXQiOjE3OTA5NDU2ODUsImlkIjoiMDFhMGZjYWUtNDUwMS03ZTQxLTkxNzItZGEzNzhkNmNlNDIxIiwia2lkIjoiSW1vS2lmVHNJNEZkMDFsOUVfNDJQQ01TTUtuUXkyR2pTWGhKOUZ1OEVtWSIsInJpZCI6IjQyZjEyNjgxLWZhMGMtNDYwZS04MWIyLTkwMWNjOWQ1MDcyMyJ9.eD10y_k_LzyciYuiNuCsuFRMouzlWrrYTStmQWEuR5XgbM0uWmCutRBc8mnBQSKQN5XYlBM_zpGCi0Q-X23aAQ",
});

const r2Client = new S3Client({
  region: "auto",
  endpoint: process.env.R2_ENDPOINT || "https://4ac4c0251ef536b199cd90f31059ab22.r2.cloudflarestorage.com",
  forcePathStyle: true,
  credentials: {
    accessKeyId: process.env.R2_ACCESS_KEY_ID || "d02692497cf7a4c1a727d05980b333d2",
    secretAccessKey: process.env.R2_SECRET_ACCESS_KEY || "864f37bed332c3dc6bee9962a915f71d41264643a00974818be3da2f660b38e6",
  },
});
const BUCKET = process.env.R2_BUCKET_NAME || "syllaboss";

async function main() {
  console.log("=== 1. PURGING TURSO MATERIALS AND RELATED TABLES ===");
  try {
    await turso.execute("DELETE FROM material_ratings");
    console.log("Cleared material_ratings.");
  } catch (e) {
    console.log("material_ratings skip/error:", e.message);
  }

  try {
    await turso.execute("DELETE FROM material_user_views");
    console.log("Cleared material_user_views.");
  } catch (e) {
    console.log("material_user_views skip/error:", e.message);
  }

  try {
    await turso.execute("DELETE FROM material_user_downloads");
    console.log("Cleared material_user_downloads.");
  } catch (e) {
    console.log("material_user_downloads skip/error:", e.message);
  }

  try {
    await turso.execute("DELETE FROM harvester_logs");
    console.log("Cleared harvester_logs.");
  } catch (e) {
    console.log("harvester_logs skip/error:", e.message);
  }

  const delMat = await turso.execute("DELETE FROM materials");
  console.log("Deleted ALL materials from Turso! Rows affected:", delMat.rowsAffected);

  const check = await turso.execute("SELECT count(*) as count FROM materials");
  console.log("Current count in materials:", check.rows[0].count);

  console.log("\n=== 2. PURGING R2 MATERIALS BUCKET ===");
  let continuationToken = undefined;
  let totalDeletedR2 = 0;

  do {
    const listRes = await r2Client.send(new ListObjectsV2Command({
      Bucket: BUCKET,
      Prefix: "materials/",
      ContinuationToken: continuationToken,
    }));

    if (listRes.Contents && listRes.Contents.length > 0) {
      const keysToDelete = listRes.Contents.map(c => ({ Key: c.Key }));
      await r2Client.send(new DeleteObjectsCommand({
        Bucket: BUCKET,
        Delete: { Objects: keysToDelete },
      }));
      totalDeletedR2 += keysToDelete.length;
      console.log(`Deleted ${totalDeletedR2} objects from R2...`);
    }

    continuationToken = listRes.NextContinuationToken;
  } while (continuationToken);

  console.log(`\nPurge complete! Total R2 objects deleted: ${totalDeletedR2}`);
}

main().catch(console.error);
