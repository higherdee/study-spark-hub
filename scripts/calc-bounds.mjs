import fs from "fs";

const svg = fs.readFileSync("public/favicon.svg", "utf8");
let minX = Infinity, maxX = -Infinity, minY = Infinity, maxY = -Infinity;

// Find all numbers in d attributes
const paths = [...svg.matchAll(/d="([^"]+)"/g)].map(m => m[1]);
for (const d of paths) {
  const tokens = d.trim().split(/\s+/);
  for (let i = 0; i < tokens.length; i++) {
    // If command letter, skip
    if (/[A-Za-z]/.test(tokens[i])) continue;
    const x = parseFloat(tokens[i]);
    const y = parseFloat(tokens[i+1]);
    if (!isNaN(x) && !isNaN(y)) {
      if (x < minX) minX = x;
      if (x > maxX) maxX = x;
      if (y < minY) minY = y;
      if (y > maxY) maxY = y;
      i++; // consumed y
    }
  }
}

const bounds = {
  minX,
  minY,
  maxX,
  maxY,
  width: maxX - minX,
  height: maxY - minY,
  centerX: (minX + maxX) / 2,
  centerY: (minY + maxY) / 2
};

fs.writeFileSync("scratch/bounds.json", JSON.stringify(bounds, null, 2), "utf8");
console.log("Calculated bounds:", bounds);
