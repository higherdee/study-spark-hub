import { createHmac, timingSafeEqual } from "node:crypto";

function matches(expected: string, supplied: string) {
  if (!/^[a-f\d]+$/i.test(supplied) || supplied.length !== expected.length) return false;
  return timingSafeEqual(Buffer.from(expected, "hex"), Buffer.from(supplied, "hex"));
}

export function verifyPaddleSignature(raw: string, signature: string, secret: string, now = Date.now()) {
  if (!secret || !signature || !raw) return false;
  const fields = signature.split(";").map((part) => part.trim().split("="));
  const timestamp = fields.find(([key]) => key === "ts")?.[1];
  if (!timestamp || !/^\d+$/.test(timestamp) || Math.abs(now / 1000 - Number(timestamp)) > 5) return false;
  const expected = createHmac("sha256", secret).update(`${timestamp}:${raw}`).digest("hex");
  return fields.some(([key, value]) => key === "h1" && !!value && matches(expected, value));
}

export function verifyPaystackSignature(raw: string, signature: string, secret: string) {
  return !!secret && !!raw && matches(createHmac("sha512", secret).update(raw).digest("hex"), signature);
}
