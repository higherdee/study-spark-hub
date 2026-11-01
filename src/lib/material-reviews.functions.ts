import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireCurrentUserId } from "./auth.server";
import { getMaterialById, rateMaterial, turso } from "@/integrations/turso/client.server";
export async function materialReviews(userId: string, materialId: string) {
  const material = await getMaterialById(materialId);
  if (!material || material.status !== "verified" && material.user_id !== userId) throw new Error("This material is unavailable.");
  const [rows, totals] = await Promise.all([
    turso.execute({ sql: "SELECT r.rating,r.review,r.user_id,p.full_name,p.username FROM material_ratings r LEFT JOIN profiles p ON p.id=r.user_id WHERE r.material_id=? ORDER BY r.rowid DESC LIMIT 50", args: [materialId] }),
    turso.execute({ sql: "SELECT COUNT(*) AS n,AVG(rating) AS average FROM material_ratings WHERE material_id=?", args: [materialId] }),
  ]);
  return { count: Number(totals.rows[0]?.["n"] || 0), average: Number(totals.rows[0]?.["average"] || 0), reviews: rows.rows.map((row) => ({ rating: Number(row["rating"]), review: String(row["review"] || ""), author: row["username"] ? `@${row["username"]}` : String(row["full_name"] || "Student").split(" ")[0], own: row["user_id"] === userId })) };
}
export const getMaterialReviewsServerFn = createServerFn({ method: "GET" }).validator((data: unknown) => z.object({ materialId: z.string().min(1).max(100) }).parse(data)).handler(async ({ data }) => materialReviews(await requireCurrentUserId(), data.materialId));
export const submitMaterialReviewServerFn = createServerFn({ method: "POST" }).validator((data: unknown) => z.object({ materialId: z.string().min(1).max(100), rating: z.number().int().min(1).max(5), review: z.string().trim().max(1500).default("") }).strict().parse(data)).handler(async ({ data }) => {
  const userId = await requireCurrentUserId();
  await materialReviews(userId, data.materialId);
  return rateMaterial(data.materialId, userId, data.rating, data.review);
});
