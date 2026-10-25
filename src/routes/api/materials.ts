import { createFileRoute } from "@tanstack/react-router";
import { turso, isUserAdmin } from "@/integrations/turso/client.server";
import { getFromR2 } from "@/integrations/r2/client.server";
import { requireCurrentUserId } from "@/lib/auth.server";

export const Route = createFileRoute("/api/materials")({
  server: {
    handlers: {
      GET: async ({ request }) => {
        const url = new URL(request.url);
        const id = url.searchParams.get("id");
        const isDownload = url.searchParams.get("download") === "true";
        if (!id) return Response.json({ error: "Material id is required" }, { status: 400 });

        const result = await turso.execute({
          sql: "SELECT id, user_id, title, file_path, file_name, mime_type, status FROM materials WHERE id = ? LIMIT 1",
          args: [id],
        });
        const material = result.rows[0] as Record<string, unknown> | undefined;
        if (!material) return Response.json({ error: "Material not found" }, { status: 404 });

        const status = String(material.status || "pending");
        if (status !== "verified") {
          let requester: string;
          try {
            requester = await requireCurrentUserId();
          } catch {
            return Response.json({ error: "Material not found" }, { status: 404 });
          }
          const admin = requester === String(material.user_id) ? false : await isUserAdmin(requester);
          if (requester !== String(material.user_id) && !admin) {
            return Response.json({ error: "Material not found" }, { status: 404 });
          }
        }

        const filePath = String(material.file_path || "");
        if (!filePath.startsWith("materials/")) {
          return Response.json({ error: "The stored material file is unavailable." }, { status: 404 });
        }

        try {
          const file = await getFromR2(filePath);
          const contentType = String(material.mime_type || file.contentType || "application/octet-stream");
          const safeType = ["application/pdf", "image/jpeg", "image/png", "image/webp"].includes(contentType)
            ? contentType
            : "application/octet-stream";
          const fileName = String(material.file_name || "study-material").replace(/[\r\n"\\]/g, "_");
          const verified = status === "verified";
          return new Response(file.bytes, {
            status: 200,
            headers: {
              "Content-Type": safeType,
              "Content-Disposition": `${isDownload ? "attachment" : "inline"}; filename="${fileName}"`,
              "Cache-Control": verified ? "public, max-age=3600" : "private, no-store",
              "X-Content-Type-Options": "nosniff",
              "Referrer-Policy": "no-referrer",
            },
          });
        } catch {
          return Response.json({ error: "The material file could not be retrieved." }, { status: 404 });
        }
      },
    },
  },
});
