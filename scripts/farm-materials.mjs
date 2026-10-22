/**
 * Syllaboss Autonomous Web Material Harvester
 * 
 * STRICT ARCHITECTURAL RULE:
 * - NO synthetic or in-memory generated PDFs!
 * - Every single material is an actual authentic PDF downloaded directly from the web.
 * - Sourced from open educational archives, university repositories, and open textbook collections.
 * - Distributed across Nigerian universities and global universities worldwide.
 * - Uploads genuine multi-page PDFs to Cloudflare R2 bucket ('syllaboss').
 * - Registers records in Turso DB ('materials' table) with verified status.
 * - Awards +25 SyllaPoints per upload to Admin.
 */
import { runSuperFastHarvest } from "./super-fast-harvester.mjs";

export { runSuperFastHarvest as runHarvest };

if (process.argv[1] && process.argv[1].endsWith("farm-materials.mjs")) {
  const isInfinite = process.argv.includes("--infinite");
  const countArg = parseInt(process.argv.find(a => !isNaN(parseInt(a, 10)) && !a.startsWith("-")), 10) || 20;

  async function run() {
    do {
      await runSuperFastHarvest(countArg);
      if (isInfinite) {
        console.log("Resting 30s before next high-speed harvest cycle... (Ctrl+C to stop)");
        await new Promise((r) => setTimeout(r, 30000));
      }
    } while (isInfinite);
  }

  run().catch(console.error);
}
