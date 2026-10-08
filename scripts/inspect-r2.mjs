import "./dns-resilience.mjs";
import { S3Client, ListObjectsV2Command } from "@aws-sdk/client-s3";

const r2Client = new S3Client({
  region: "auto",
  endpoint: "https://4ac4c0251ef536b199cd90f31059ab22.r2.cloudflarestorage.com",
  forcePathStyle: true,
  credentials: {
    accessKeyId: "d02692497cf7a4c1a727d05980b333d2",
    secretAccessKey: "864f37bed332c3dc6bee9962a915f71d41264643a00974818be3da2f660b38e6",
  },
});

async function main() {
  const res = await r2Client.send(new ListObjectsV2Command({ Bucket: "syllaboss" }));
  console.log("R2 Objects in bucket 'syllaboss':");
  console.log(res.Contents?.map(c => ({ key: c.Key, size: c.Size })));
}

main().catch(console.error);
