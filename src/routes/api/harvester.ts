import { createFileRoute } from "@tanstack/react-router";
import { turso } from "@/integrations/turso/client";

export const Route = createFileRoute("/api/harvester")({
  server: {
    handlers: {
      GET: async () => {
        try {
          const [totalRes, farmedRes, todayRes, recentRes, levelRes, typeRes, courseRes, logsRes] = await Promise.all([
            turso.execute("SELECT COUNT(*) as count FROM materials"),
            turso.execute("SELECT COUNT(*) as count FROM materials WHERE user_id = 'syllaboss-harvester-bot'"),
            turso.execute("SELECT COUNT(*) as count FROM materials WHERE user_id = 'syllaboss-harvester-bot' AND created_at >= datetime('now', '-24 hours')"),
            turso.execute("SELECT id, title, course, course_code, institution, level, material_type, file_path, views, downloads, created_at FROM materials ORDER BY created_at DESC LIMIT 20"),
            turso.execute("SELECT level, COUNT(*) as count FROM materials GROUP BY level ORDER BY count DESC"),
            turso.execute("SELECT material_type, COUNT(*) as count FROM materials GROUP BY material_type ORDER BY count DESC"),
            turso.execute("SELECT course, COUNT(*) as count FROM materials GROUP BY course ORDER BY count DESC LIMIT 8"),
            turso.execute("SELECT * FROM harvester_logs ORDER BY created_at DESC LIMIT 10")
          ]);

          const total = Number(totalRes.rows[0]?.['count'] || 0);
          const farmedTotal = Number(farmedRes.rows[0]?.['count'] || 0);
          const farmedToday = Number(todayRes.rows[0]?.['count'] || 0);
          const dailyTarget = 20000;
          const progressPercent = Math.min(100, Math.round((farmedToday / dailyTarget) * 100));

          return Response.json({
            success: true,
            total,
            farmedTotal,
            farmedToday,
            dailyTarget,
            progressPercent,
            recent: recentRes.rows,
            byLevel: levelRes.rows.map(r => ({ name: String(r['level'] || 'General'), value: Number(r['count'] || 0) })),
            byType: typeRes.rows.map(r => ({ name: String(r['material_type'] || 'Other'), value: Number(r['count'] || 0) })),
            byCourse: courseRes.rows.map(r => ({ name: String(r['course'] || 'Other'), value: Number(r['count'] || 0) })),
            logs: logsRes.rows
          });
        } catch (err: any) {
          console.error("Harvester API GET error:", err);
          return Response.json({ success: false, error: err.message }, { status: 500 });
        }
      },

      POST: async ({ request }) => {
        try {
          let count = 50;
          try {
            const body = await request.json();
            if (body && typeof body.count === "number") {
              count = Math.min(Math.max(body.count, 10), 500);
            }
          } catch (e) {}

          // Import and run farm-materials module dynamically
          const { runHarvest } = await import("../../../scripts/farm-materials.mjs");
          const result = await runHarvest(count);

          return Response.json({
            success: true,
            result
          });
        } catch (err: any) {
          console.error("Harvester API POST error:", err);
          return Response.json({ success: false, error: err.message }, { status: 500 });
        }
      }
    }
  }
});
