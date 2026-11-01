import { existsSync } from "node:fs";
import { readdir, readFile } from "node:fs/promises";

if (existsSync(".env.local")) process.loadEnvFile(".env.local");
const credentials = Object.entries(process.env).filter(([name, value]) => /(?:SECRET|PRIVATE_KEY|API_KEY|AUTH_TOKEN|ACCESS_TOKEN)/.test(name) && value && value.length > 16);
const publicNames = credentials.filter(([name]) => name.startsWith("VITE_")).map(([name]) => name);
if (publicNames.length) {
  console.error(`Server credentials must not use public variable names: ${publicNames.join(", ")}`);
  process.exit(1);
}
if (!process.argv.includes("--env-only")) {
  const publicDirectory = process.env.VERCEL ? ".vercel/output/static" : ".output/public";
  if (!existsSync(publicDirectory)) throw new Error("Build output is required for the client credential check.");
  const exposed = new Set();
  async function scan(directory) {
    for (const item of await readdir(directory, { withFileTypes: true })) {
      const path = `${directory}/${item.name}`;
      if (item.isDirectory()) await scan(path);
      else if (/\.(?:js|mjs|html|json|map)$/.test(path)) {
        const content = await readFile(path, "utf8");
        for (const [name, value] of credentials) if (content.includes(value)) exposed.add(name);
      }
    }
  }
  await scan(publicDirectory);
  if (exposed.size) {
    console.error(`Server credentials found in client output: ${[...exposed].join(", ")}`);
    process.exit(1);
  }
}
console.log("Client credential check passed.");
