import { createFileRoute } from "@tanstack/react-router";
import { uploadToR2 } from "@/integrations/r2/client";
import { createMaterial, setMaterialStatus } from "@/integrations/turso/client";
import { verifyMaterial } from "@/lib/verify.functions";

export const Route = createFileRoute("/api/upload")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        try {
          const formData = await request.formData();
          const file = formData.get("file") as File | null;
          const userId = formData.get("userId") as string | null;
          const title = (formData.get("title") as string | null) || "";
          const course = (formData.get("course") as string | null) || "";
          const courseCode = (formData.get("courseCode") as string | null) || null;
          const institution = (formData.get("institution") as string | null) || "";
          const level = (formData.get("level") as string | null) || null;
          const materialType = (formData.get("materialType") as string | null) || "Lecture notes";
          const description = (formData.get("description") as string | null) || null;

          if (!file || !userId || !title || !course || !institution) {
            return new Response(
              JSON.stringify({ error: "Missing required fields or file." }),
              { status: 400, headers: { "Content-Type": "application/json" } }
            );
          }

          // Pre-audit Check: Size & Type
          if (file.size < 500) {
            return new Response(
              JSON.stringify({ error: "File is too small or empty. Please upload genuine material." }),
              { status: 400, headers: { "Content-Type": "application/json" } }
            );
          }

          if (file.size > 20 * 1024 * 1024) {
            return new Response(
              JSON.stringify({ error: "File exceeds 20MB limit." }),
              { status: 400, headers: { "Content-Type": "application/json" } }
            );
          }

          const arrayBuffer = await file.arrayBuffer();
          const buffer = Buffer.from(arrayBuffer);

          // Content Integrity Audit: Check for valid PDF / Image magic headers
          const header = buffer.subarray(0, 10).toString("binary");
          const isPdf = header.startsWith("%PDF");
          const isJpg = buffer[0] === 0xff && buffer[1] === 0xd8;
          const isPng = buffer[0] === 0x89 && buffer[1] === 0x50 && buffer[2] === 0x4e && buffer[3] === 0x47;
          const isWebp = buffer.subarray(8, 12).toString("binary") === "WEBP";

          if (!isPdf && !isJpg && !isPng && !isWebp) {
            return new Response(
              JSON.stringify({ error: "Invalid file format. Please upload a genuine PDF or document image." }),
              { status: 400, headers: { "Content-Type": "application/json" } }
            );
          }

          // Upload directly to Cloudflare R2 on the backend
          const safeName = file.name.replace(/[^a-zA-Z0-9.-]/g, "_");
          const key = `${userId}/${Date.now()}-${safeName}`;
          await uploadToR2(key, buffer, file.type || "application/octet-stream");

          // Estimate rough page count if PDF
          let pageCount = 1;
          if (isPdf) {
            const matches = buffer.toString("binary").match(/\/Type\s*\/Page[^s]/g);
            pageCount = Math.max(1, matches ? matches.length : 1);
          }

          // Store record in Turso with status = 'pending'
          const material = await createMaterial({
            user_id: userId,
            title: title.trim(),
            course: course.trim(),
            course_code: courseCode?.trim() || null,
            institution: institution.trim(),
            level: level?.trim() || null,
            material_type: materialType,
            description: description?.trim() || null,
            file_path: key,
            file_name: file.name,
            mime_type: file.type || "application/pdf",
            file_size: file.size,
            page_count: pageCount,
          });

          // Run automated audit / verification
          let auditResult = {
            status: "pending",
            score: 75,
            notes: "Queued for audit and review.",
          };

          try {
            const r = await verifyMaterial({ data: { materialId: material.id } });
            auditResult = {
              status: r.status,
              score: r.score ?? 75,
              notes: r.notes ?? "Automated audit complete.",
            };
          } catch (auditErr) {
            console.warn("Automated verifyMaterial error:", auditErr);
          }

          return new Response(
            JSON.stringify({
              success: true,
              material,
              auditResult,
            }),
            { status: 200, headers: { "Content-Type": "application/json" } }
          );
        } catch (err) {
          console.error("Server upload failed:", err);
          return new Response(
            JSON.stringify({
              error: err instanceof Error ? err.message : "Upload processing failed",
            }),
            { status: 500, headers: { "Content-Type": "application/json" } }
          );
        }
      },
    },
  },
});
