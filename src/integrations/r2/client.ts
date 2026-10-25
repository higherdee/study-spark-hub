import { createServerFn } from "@tanstack/react-start";
import type * as Storage from "./client.server";

type StorageModule = typeof import("./client.server");
type StorageMethod = { [K in keyof StorageModule]: StorageModule[K] extends (...args: any[]) => any ? K : never; }[keyof StorageModule];
type Fn = (...args: any[]) => any;
type Args<K extends StorageMethod> = StorageModule[K] extends Fn ? Parameters<StorageModule[K]> : never;
type CallInput = { name: StorageMethod; args: unknown[] };

const callStorageServerFn = createServerFn({ method: "POST" })
  .validator((value: unknown) => {
    if (!value || typeof value !== "object" || !Array.isArray((value as CallInput).args)) throw new Error("Invalid request");
    return value as CallInput;
  })
  .handler(async ({ data }) => {
    const { requireAdmin, requireCurrentUserId } = await import("@/lib/auth.server");
    const userId = await requireCurrentUserId();
    const key = String(data.args[0] ?? "");
    if (!key.startsWith(`materials/${userId}/`)) await requireAdmin();
    const storage = await import("./client.server");
    const fn = storage[data.name] as unknown as (...values: unknown[]) => unknown;
    return await fn(...data.args);
  });

function createStorageCall<K extends StorageMethod>(name: K) {
  return ((...args: Args<K>) => callStorageServerFn({ data: { name, args } })) as unknown as StorageModule[K];
}
export const uploadToR2 = createStorageCall("uploadToR2");
export const getFromR2 = createStorageCall("getFromR2");
export const getSignedDownloadUrl = createStorageCall("getSignedDownloadUrl");
export const getPresignedUploadUrl = createStorageCall("getPresignedUploadUrl");
export const deleteFromR2 = createStorageCall("deleteFromR2");
export const R2_BUCKET = "syllaboss";
