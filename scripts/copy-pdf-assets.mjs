import { readFileSync, cpSync, mkdirSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
const packagePath = fileURLToPath(import.meta.resolve("pdfjs-dist/package.json"));
const { version } = JSON.parse(readFileSync(packagePath, "utf8"));
if (!/^\d+\.\d+\.\d+$/.test(version)) throw new Error("Unexpected PDF renderer version");
const source = dirname(packagePath),
  destination = resolve("public/pdf-assets", version);
mkdirSync(destination, { recursive: true });
for (const folder of ["standard_fonts", "cmaps", "wasm"])
  cpSync(join(source, folder), join(destination, folder), { recursive: true });
cpSync(join(source, "LICENSE"), join(destination, "LICENSE"));
console.log(`Prepared PDF reading assets (${version}).`);
