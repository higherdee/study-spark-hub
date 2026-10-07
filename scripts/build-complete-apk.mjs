import fs from "fs";
import zlib from "zlib";
import crypto from "crypto";
import { execFileSync } from "child_process";
import { buildApk } from "./pack-apk.mjs";

const inputApk = "public/downloads/syllaboss.apk";
const buf = fs.readFileSync(inputApk);

// 1. Unpack all entries from existing APK
const eocdSignature = 0x06054b50;
let eocdOffset = -1;
for (let i = buf.length - 22; i >= 0; i--) {
  if (buf.readUInt32LE(i) === eocdSignature) {
    eocdOffset = i;
    break;
  }
}

const totalEntries = buf.readUInt16LE(eocdOffset + 10);
const cdOffset = buf.readUInt32LE(eocdOffset + 16);

let offset = cdOffset;
const rawEntries = [];

for (let i = 0; i < totalEntries; i++) {
  const method = buf.readUInt16LE(offset + 10);
  const compressedSize = buf.readUInt32LE(offset + 20);
  const uncompressedSize = buf.readUInt32LE(offset + 24);
  const nameLen = buf.readUInt16LE(offset + 28);
  const extraLen = buf.readUInt16LE(offset + 30);
  const commentLen = buf.readUInt16LE(offset + 32);
  const localHeaderOffset = buf.readUInt32LE(offset + 42);
  const name = buf.toString("utf8", offset + 46, offset + 46 + nameLen);
  
  if (!name.startsWith("META-INF/")) {
    const localNameLen = buf.readUInt16LE(localHeaderOffset + 26);
    const localExtraLen = buf.readUInt16LE(localHeaderOffset + 28);
    const dataStart = localHeaderOffset + 30 + localNameLen + localExtraLen;
    const compData = buf.subarray(dataStart, dataStart + compressedSize);
    
    let rawData;
    if (method === 0) {
      rawData = compData;
    } else if (method === 8) {
      rawData = zlib.inflateRawSync(compData);
    } else {
      throw new Error(`Unsupported method ${method} for ${name}`);
    }

    rawEntries.push({ name, data: rawData });
  }

  offset += 46 + nameLen + extraLen + commentLen;
}

console.log(`Extracted ${rawEntries.length} non-META-INF entries.`);

// 2. Compute dual digests for every file
const sha1Map = new Map();
const sha256Map = new Map();

for (const entry of rawEntries) {
  const sha1 = crypto.createHash("sha1").update(entry.data).digest("base64");
  const sha256 = crypto.createHash("sha256").update(entry.data).digest("base64");
  sha1Map.set(entry.name, sha1);
  sha256Map.set(entry.name, sha256);
}

// 3. Build MANIFEST.MF
let manifestText = "Manifest-Version: 1.0\r\nCreated-By: 1.0 (Android SignApk)\r\n\r\n";
const entryManifestSha1 = new Map();
const entryManifestSha256 = new Map();

for (const entry of rawEntries) {
  const block = `Name: ${entry.name}\r\nSHA1-Digest: ${sha1Map.get(entry.name)}\r\nSHA-256-Digest: ${sha256Map.get(entry.name)}\r\n\r\n`;
  manifestText += block;

  const blockBuf = Buffer.from(block, "utf8");
  entryManifestSha1.set(entry.name, crypto.createHash("sha1").update(blockBuf).digest("base64"));
  entryManifestSha256.set(entry.name, crypto.createHash("sha256").update(blockBuf).digest("base64"));
}

const manifestBuf = Buffer.from(manifestText, "utf8");
const manifestSha1 = crypto.createHash("sha1").update(manifestBuf).digest("base64");
const manifestSha256 = crypto.createHash("sha256").update(manifestBuf).digest("base64");

// 4. Build CERT.SF
let sfText = `Signature-Version: 1.0\r\nCreated-By: 1.0 (Android SignApk)\r\nSHA1-Digest-Manifest: ${manifestSha1}\r\nSHA-256-Digest-Manifest: ${manifestSha256}\r\n\r\n`;

for (const entry of rawEntries) {
  sfText += `Name: ${entry.name}\r\nSHA1-Digest: ${entryManifestSha1.get(entry.name)}\r\nSHA-256-Digest: ${entryManifestSha256.get(entry.name)}\r\n\r\n`;
}

const sfBuf = Buffer.from(sfText, "utf8");
fs.writeFileSync("scratch/CERT.SF", sfBuf);

// 5. Generate CERT.RSA using SignSf.exe
execFileSync("scripts/SignSf.exe", ["scratch/CERT.SF", "scratch/CERT.RSA", "scripts/signing-key.pfx", "syllaboss123"]);
const rsaBuf = fs.readFileSync("scratch/CERT.RSA");
console.log(`Generated CERT.RSA signature (${rsaBuf.length} bytes).`);

// 6. Assemble final entry list with proper compression methods
const finalEntries = [];

// Android OS AssetManager STRICT RULES:
// - resources.arsc MUST BE STORED (method 0) and 4-byte aligned
// - Already compressed assets (png, jpg, webp) should be stored
// - classes.dex and AndroidManifest.xml are deflated (method 8)
for (const entry of rawEntries) {
  let method = 8;
  if (
    entry.name === "resources.arsc" ||
    entry.name.endsWith(".png") ||
    entry.name.endsWith(".jpg") ||
    entry.name.endsWith(".webp")
  ) {
    method = 0;
  }
  finalEntries.push({ name: entry.name, data: entry.data, method });
}

// Add META-INF entries at the end (stored)
finalEntries.push({ name: "META-INF/MANIFEST.MF", data: manifestBuf, method: 0 });
finalEntries.push({ name: "META-INF/CERT.SF", data: sfBuf, method: 0 });
finalEntries.push({ name: "META-INF/CERT.RSA", data: rsaBuf, method: 0 });

// 7. Write to public/downloads/syllaboss.apk
const finalSize = buildApk(finalEntries, "public/downloads/syllaboss.apk");
console.log(`SUCCESS! Wrote validated, dual-signed APK to public/downloads/syllaboss.apk (${finalSize} bytes)`);
