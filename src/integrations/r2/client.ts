import {
  S3Client,
  PutObjectCommand,
  GetObjectCommand,
  DeleteObjectCommand,
} from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";

const R2_ENDPOINT =
  (import.meta.env['R2_ENDPOINT'] as string | undefined) ||
  process.env['R2_ENDPOINT'] ||
  "https://4ac4c0251ef536b199cd90f31059ab22.r2.cloudflarestorage.com";

const R2_ACCESS_KEY_ID =
  (import.meta.env['R2_ACCESS_KEY_ID'] as string | undefined) ||
  process.env['R2_ACCESS_KEY_ID'] ||
  "d02692497cf7a4c1a727d05980b333d2";

const R2_SECRET_ACCESS_KEY =
  (import.meta.env['R2_SECRET_ACCESS_KEY'] as string | undefined) ||
  process.env['R2_SECRET_ACCESS_KEY'] ||
  "864f37bed332c3dc6bee9962a915f71d41264643a00974818be3da2f660b38e6";

export const R2_BUCKET =
  (import.meta.env['R2_BUCKET_NAME'] as string | undefined) ||
  process.env['R2_BUCKET_NAME'] ||
  "syllaboss";

export const r2Client = new S3Client({
  region: "auto",
  endpoint: R2_ENDPOINT,
  forcePathStyle: true,
  credentials: {
    accessKeyId: R2_ACCESS_KEY_ID,
    secretAccessKey: R2_SECRET_ACCESS_KEY,
  },
});

export async function uploadToR2(
  key: string,
  body: Uint8Array | Buffer | Blob,
  contentType: string
): Promise<{ key: string; bucket: string }> {
  let uploadBody: any = body;
  if (typeof Blob !== "undefined" && body instanceof Blob) {
    uploadBody = new Uint8Array(await body.arrayBuffer());
  }

  await r2Client.send(
    new PutObjectCommand({
      Bucket: R2_BUCKET,
      Key: key,
      Body: uploadBody,
      ContentType: contentType,
    })
  );

  return { key, bucket: R2_BUCKET };
}

export async function getFromR2(key: string): Promise<{ bytes: Uint8Array; contentType: string }> {
  const res = await r2Client.send(
    new GetObjectCommand({
      Bucket: R2_BUCKET,
      Key: key,
    })
  );

  const bytes = await res.Body!.transformToByteArray();
  return {
    bytes,
    contentType: res.ContentType || "application/octet-stream",
  };
}

export async function getSignedDownloadUrl(key: string, expiresIn = 300): Promise<string> {
  const command = new GetObjectCommand({
    Bucket: R2_BUCKET,
    Key: key,
  });
  return await getSignedUrl(r2Client, command, { expiresIn });
}

export async function getPresignedUploadUrl(
  key: string,
  contentType: string,
  expiresIn = 300
): Promise<string> {
  const command = new PutObjectCommand({
    Bucket: R2_BUCKET,
    Key: key,
    ContentType: contentType,
  });
  return await getSignedUrl(r2Client, command, { expiresIn });
}

export async function deleteFromR2(key: string): Promise<void> {
  await r2Client.send(
    new DeleteObjectCommand({
      Bucket: R2_BUCKET,
      Key: key,
    })
  );
}
