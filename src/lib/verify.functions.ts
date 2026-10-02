import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

export const verifyMaterial = createServerFn({ method: "POST" })
  .inputValidator((d: unknown) => z.object({ materialId: z.string() }).parse(d))
  .handler(async ({ data }) => {
    const { getMaterialById, setMaterialStatus, turso } = await import("@/integrations/turso/client");
    const { getFromR2 } = await import("@/integrations/r2/client");
    const { checkMaterial } = await import("./verify.server");

    const m = await getMaterialById(data.materialId);
    if (!m) throw new Error("Material not found");
    if (m.status !== "pending" || m.verification_score !== null) {
      return { status: m.status, score: m.verification_score, notes: m.verification_notes, pages: m.page_count };
    }

    const { bytes } = await getFromR2(m.file_path);
    if (!bytes) throw new Error("Could not read the uploaded file from R2");

    let pages = 1;
    if (m.mime_type === "application/pdf") {
      try {
        const { PDFDocument } = await import("pdf-lib");
        pages = (await PDFDocument.load(bytes, { ignoreEncryption: true })).getPageCount();
      } catch {
        await setMaterialStatus(
          m.id,
          "rejected",
          0,
          "The PDF could not be opened. Please upload a valid, unlocked PDF."
        );
        return { status: "rejected" as const, score: 0, notes: "The PDF could not be opened.", pages: 0 };
      }
    }
    await turso.execute({
      sql: "UPDATE materials SET page_count = ? WHERE id = ?",
      args: [pages, m.id],
    });

    let status: "verified" | "rejected" | "pending" = "pending";
    let score = 0;
    let notes = "Automatic check unavailable right now — an admin will review it.";
    try {
      const v = await checkMaterial(bytes, m.mime_type, m.file_name, m);
      score = v.score;
      notes = v.notes || notes;
      status = v.matches && v.score >= 70 ? "verified" : v.score < 40 ? "rejected" : "pending";
      if (status === "pending") notes = `${notes} Sent to an admin for a final review.`;
    } catch (e) {
      console.error("verification failed", e);
    }

    await setMaterialStatus(m.id, status, score, notes);
    return { status, score, notes, pages };
  });
