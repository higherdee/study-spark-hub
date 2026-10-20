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
export { runSuperFastHarvest as runHarvest } from "./super-fast-harvester.mjs";
