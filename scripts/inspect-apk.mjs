import fs from "fs";

let log = "";
try {
  const buf = fs.readFileSync("public/downloads/syllaboss.apk");
  log += `APK total size: ${buf.length}\n`;

  let eocdOffset = -1;
  for (let i = buf.length - 22; i >= 0; i--) {
    if (buf.readUInt32LE(i) === 0x06054b50) {
      eocdOffset = i;
      break;
    }
  }

  const totalEntries = buf.readUInt16LE(eocdOffset + 10);
  const cdOffset = buf.readUInt32LE(eocdOffset + 16);
  log += `Total entries: ${totalEntries}, CD offset: ${cdOffset}\n`;

  let offset = cdOffset;
  for (let i = 0; i < totalEntries; i++) {
    const method = buf.readUInt16LE(offset + 10);
    const compSize = buf.readUInt32LE(offset + 20);
    const uncompSize = buf.readUInt32LE(offset + 24);
    const nameLen = buf.readUInt16LE(offset + 28);
    const extraLen = buf.readUInt16LE(offset + 30);
    const commLen = buf.readUInt16LE(offset + 32);
    const localOffset = buf.readUInt32LE(offset + 42);
    const name = buf.toString("utf8", offset + 46, offset + 46 + nameLen);
    
    const localExtraLen = buf.readUInt16LE(localOffset + 28);
    const localNameLen = buf.readUInt16LE(localOffset + 26);
    const dataOffset = localOffset + 30 + localNameLen + localExtraLen;
    
    log += `- ${name}\n`;
    log += `    method: ${method}, size: ${uncompSize}, compSize: ${compSize}\n`;
    log += `    localExtraLen: ${localExtraLen}, cdExtraLen: ${extraLen}, dataOffset: ${dataOffset}, aligned4: ${dataOffset % 4 === 0}\n`;
    if (localExtraLen > 0) {
      const extraBuf = buf.subarray(localOffset + 30 + localNameLen, localOffset + 30 + localNameLen + localExtraLen);
      log += `    extraBytes: [${[...extraBuf].map(b => "0x" + b.toString(16).padStart(2, "0")).join(", ")}]\n`;
    }

    offset += 46 + nameLen + extraLen + commLen;
  }
} catch (err) {
  log += `ERROR: ${err.stack || err.message}\n`;
}

fs.writeFileSync("inspect_output.txt", log, "utf8");

