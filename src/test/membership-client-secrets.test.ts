import { expect, it } from "vitest";
import { mkdtempSync, mkdirSync, writeFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { resolve, join, sep } from "node:path";
import { spawnSync } from "node:child_process";
const script = resolve("scripts/check-client-secrets.mjs");
it.each([false,true])("scans the real browser output folder on Vercel=%s", vercel => {
  const folder = mkdtempSync(join(tmpdir(),"syllaboss-credential-check-"));
  try {
    const publicPath = join(folder,vercel ? ".vercel/output/static" : ".output/public"); mkdirSync(publicPath,{recursive:true});
    const env = { ...process.env, VERCEL: vercel ? "1" : "", PRIVATE_TEST_SECRET: "synthetic-test-credential-value" };
    writeFileSync(join(publicPath,"app.js"),"console.log('study');");
    expect(spawnSync(process.execPath,[script],{cwd:folder,env,encoding:"utf8"}).status).toBe(0);
    writeFileSync(join(publicPath,"app.js"),env.PRIVATE_TEST_SECRET);
    const failure=spawnSync(process.execPath,[script],{cwd:folder,env,encoding:"utf8"});
    expect(failure.status).toBe(1); expect(failure.stderr).toContain("PRIVATE_TEST_SECRET"); expect(failure.stderr).not.toContain(env.PRIVATE_TEST_SECRET);
  } finally {
    if (!resolve(folder).startsWith(resolve(tmpdir()) + sep + "syllaboss-credential-check-")) throw new Error("Unexpected temporary test directory.");
    rmSync(folder,{recursive:true,force:true});
  }
});
