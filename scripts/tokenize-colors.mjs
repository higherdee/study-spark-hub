// One-off codemod: replace hardcoded palette hexes in Tailwind arbitrary-value
// classes (e.g. bg-[#edf6f0]/60) with semantic design tokens (bg-muted/60).
import fs from "node:fs";
import path from "node:path";

const MAP = {
  "00110a": "ink",
  "5a6660": "muted-foreground",
  edf6f0: "muted",
  dce5df: "border",
  "446557": "moss",
  "1b7a4e": "brand",
  "0d281e": "forest",
  "151d1a": "foreground",
  "155e3e": "brand-deep",
  e7f0eb: "surface-container",
  c6ebd9: "accent",
  "526359": "ink-soft",
  a87c12: "brass",
  e1eae3: "surface-container-high",
  f6faf7: "surface-container-low",
  "002116": "accent-foreground",
  d6e3db: "border",
  d2e0d7: "border",
  "3f4d45": "ink-soft",
  "424844": "ink-soft",
  f3e8c9: "brass-soft",
  "71540f": "brass-ink",
  e2eae5: "input",
  f3fbf6: "background",
  "749183": "on-primary-container",
};

const SKIP = [
  path.join("src", "components", "scholar"),
  path.join("src", "routes", "index.tsx"),
  "routeTree.gen.ts",
];

let changedFiles = 0;
let replacements = 0;

function walk(dir) {
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, e.name);
    if (SKIP.some((s) => p.includes(s))) continue;
    if (e.isDirectory()) walk(p);
    else if (/\.tsx$/.test(e.name)) {
      const before = fs.readFileSync(p, "utf8");
      const after = before.replace(/-\[#([0-9a-fA-F]{6})\]/g, (m, hex) => {
        const token = MAP[hex.toLowerCase()];
        if (!token) return m;
        replacements++;
        return `-${token}`;
      });
      if (after !== before) {
        fs.writeFileSync(p, after);
        changedFiles++;
      }
    }
  }
}

walk("src");
console.log(`Updated ${changedFiles} files, ${replacements} replacements.`);
