export type MaterialIntent = "preview" | "download";
export interface MaterialAccessRequest { materialId: string; intent: MaterialIntent; resolve: (url: string) => void; reject: (error: Error) => void }
let listener: ((request: MaterialAccessRequest) => void) | null = null;
const waiting: MaterialAccessRequest[] = [];
const pending = new Map<string, Promise<string>>();
export function registerMaterialAccessListener(receive: (request: MaterialAccessRequest) => void) {
  listener = receive;
  queueMicrotask(() => { if (listener === receive) while (waiting.length) receive(waiting.shift()!); });
  return () => { if (listener === receive) listener = null; };
}
export function getMaterialAccessUrl(materialId: string, intent: MaterialIntent): Promise<string> {
  const key = `${intent}:${materialId}`;
  const existing = pending.get(key);
  if (existing) return existing;
  const request = new Promise<string>((resolve, reject) => {
    if (typeof window === "undefined") { reject(new Error("Open materials from your browser.")); return; }
    const value = { materialId, intent, resolve, reject };
    if (listener) listener(value); else waiting.push(value);
  });
  const tracked = request.finally(() => pending.delete(key));
  pending.set(key, tracked);
  return tracked;
}
// Preserve the existing call shape while routing all download buttons through
// the same promotion and quota flow.
export async function getDownloadUrlServerFn({ data }: { data: { materialId: string; userId?: string } }) {
  return { downloadUrl: await getMaterialAccessUrl(data.materialId, "download") };
}
