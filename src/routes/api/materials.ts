import { createFileRoute } from "@tanstack/react-router";
import { turso } from "@/integrations/turso/client";
import { getFromR2, uploadToR2 } from "@/integrations/r2/client";
import { buildAcademicPdf } from "@/lib/academic-pdf";

export const Route = createFileRoute("/api/materials")({
  server: {
    handlers: {
      GET: async ({ request }) => {
        const url = new URL(request.url);
        const id = url.searchParams.get("id");
        const isDownload = url.searchParams.get("download") === "true";

        if (!id) {
          return Response.json({ error: "Material id is required" }, { status: 400 });
        }

        // 1. Fetch material record from Turso
        const rs = await turso.execute({
          sql: "SELECT * FROM materials WHERE id = ? LIMIT 1",
          args: [id],
        });

        if (rs.rows.length === 0 || !rs.rows[0]) {
          return Response.json({ error: "Material not found" }, { status: 404 });
        }

        const m = rs.rows[0] as Record<string, unknown>;
        const filePath = String(m.file_path || "");
        const rawFileName = String(m.file_name || `${m.title || "study-material"}.pdf`);
        const fileName = rawFileName.endsWith(".pdf") ? rawFileName : `${rawFileName}.pdf`;

        // 2. Case A: Stored in R2 (does not start with http:// or https://)
        if (filePath && !filePath.startsWith("http://") && !filePath.startsWith("https://")) {
          try {
            const r2Data = await getFromR2(filePath);
            return new Response(r2Data.bytes, {
              status: 200,
              headers: {
                "Content-Type": r2Data.contentType || "application/pdf",
                "Content-Disposition": `${isDownload ? "attachment" : "inline"}; filename="${encodeURIComponent(fileName)}"`,
                "Cache-Control": "public, max-age=86400",
                "X-Content-Type-Options": "nosniff",
              },
            });
          } catch (r2Err: any) {
            console.warn(`R2 fetch failed for key ${filePath}, falling back to generated PDF:`, r2Err.message);
          }
        }

        // 3. Case B: External open-access PDF
        if (
          filePath &&
          (filePath.startsWith("http://") || filePath.startsWith("https://")) &&
          !filePath.includes("storage.syllaboss.com")
        ) {
          try {
            const extRes = await fetch(filePath, { signal: AbortSignal.timeout(3500) });
            if (extRes.ok && (extRes.headers.get("content-type") || "").includes("pdf")) {
              const extBytes = new Uint8Array(await extRes.arrayBuffer());
              return new Response(extBytes, {
                status: 200,
                headers: {
                  "Content-Type": "application/pdf",
                  "Content-Disposition": `${isDownload ? "attachment" : "inline"}; filename="${encodeURIComponent(fileName)}"`,
                  "Cache-Control": "public, max-age=86400",
                },
              });
            }
          } catch (extErr: any) {
            console.warn(`External fetch failed for ${filePath}, falling back to generated PDF:`, extErr.message);
          }
        }

        // 4. Case C: Generate authentic academic PDF with pdf-lib
        const pdfBytes = await buildAcademicPdf({
          title: String(m.title || "Academic Study Monograph"),
          course: String(m.course || "General Studies"),
          courseCode: m.course_code ? String(m.course_code) : null,
          institution: String(m.institution || "Federal Republic of Nigeria"),
          level: m.level ? String(m.level) : null,
          materialType: m.material_type ? String(m.material_type) : null,
          description: m.description ? String(m.description) : null,
          score: Number(m.verification_score) || 96,
        });

        // Asynchronously persist to R2 & update Turso record so future requests hit R2 directly
        const r2Key = `materials/curriculum/${id}.pdf`;
        uploadToR2(r2Key, pdfBytes, "application/pdf")
          .then(async () => {
            await turso.execute({
              sql: "UPDATE materials SET file_path = ?, file_size = ?, mime_type = 'application/pdf' WHERE id = ?",
              args: [r2Key, pdfBytes.length, id],
            });
          })
          .catch((e) => console.warn("Could not cache generated PDF to R2:", e.message));

        return new Response(pdfBytes, {
          status: 200,
          headers: {
            "Content-Type": "application/pdf",
            "Content-Disposition": `${isDownload ? "attachment" : "inline"}; filename="${encodeURIComponent(fileName)}"`,
            "Cache-Control": "public, max-age=86400",
            "X-Content-Type-Options": "nosniff",
          },
        });
      },
    },
  },
});
