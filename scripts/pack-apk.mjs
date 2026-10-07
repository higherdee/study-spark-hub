import fs from "fs";
import zlib from "zlib";

// Clean standalone ZIP packer for Android APK
// Complies strictly with Android OS libziparchive (zip_archive.cc) and zipalign standards:
// 1. Resources.arsc and stored assets are 4-byte aligned.
// 2. Extra fields adhere to the ZIP TLV specification using Android's official tag 0xd935.
// 3. Central Directory headers omit the alignment padding (extraFieldLength = 0), matching zipalign.
// 4. META-INF files have zero extra fields.

export function buildApk(entries, outputPath) {
  const buffers = [];
  const cdEntries = [];
  let currentOffset = 0;

  for (const entry of entries) {
    const { name, data, method } = entry;
    const nameBuf = Buffer.from(name, "utf8");
    const crc = zlib.crc32(data);
    let compData = data;
    const compMethod = method; // 0 = Stored, 8 = Deflate

    if (compMethod === 8) {
      compData = zlib.deflateRawSync(data);
    }

    // Android 4-byte alignment check for uncompressed entries (like resources.arsc)
    let extraBuf = Buffer.alloc(0);
    const isMeta = name.startsWith("META-INF/");

    if (compMethod === 0 && !isMeta) {
      const baseOffset = currentOffset + 30 + nameBuf.length;
      const rem = baseOffset % 4;
      if (rem !== 0) {
        // Alignment tag 0xd935 (kAlignmentExtraFieldTag)
        // Format: [0x35, 0xd9] (2-byte ID) + [padLen (2 bytes)] + padLen zero bytes
        const padLen = 4 - rem;
        extraBuf = Buffer.alloc(4 + padLen);
        extraBuf.writeUInt16LE(0xd935, 0);
        extraBuf.writeUInt16LE(padLen, 2);
      }
    }

    // Local file header (30 bytes + nameLen + extraLen)
    const localHeader = Buffer.alloc(30);
    localHeader.writeUInt32LE(0x04034b50, 0); // signature
    localHeader.writeUInt16LE(20, 4); // version needed
    localHeader.writeUInt16LE(0, 6); // general purpose flags
    localHeader.writeUInt16LE(compMethod, 8); // compression method (0 or 8)
    localHeader.writeUInt16LE(0, 10); // last mod time
    localHeader.writeUInt16LE(0, 12); // last mod date
    localHeader.writeUInt32LE(crc, 14); // crc-32
    localHeader.writeUInt32LE(compData.length, 18); // compressed size
    localHeader.writeUInt32LE(data.length, 22); // uncompressed size
    localHeader.writeUInt16LE(nameBuf.length, 26); // file name length
    localHeader.writeUInt16LE(extraBuf.length, 28); // extra field length

    const entryOffset = currentOffset;
    buffers.push(localHeader, nameBuf, extraBuf, compData);
    currentOffset += localHeader.length + nameBuf.length + extraBuf.length + compData.length;

    // Save for Central Directory
    cdEntries.push({
      nameBuf,
      crc,
      compMethod,
      compSize: compData.length,
      uncompSize: data.length,
      offset: entryOffset
    });
  }

  // Central directory
  const cdStart = currentOffset;
  for (const cd of cdEntries) {
    const cdHeader = Buffer.alloc(46);
    cdHeader.writeUInt32LE(0x02014b50, 0); // signature
    cdHeader.writeUInt16LE(20, 4); // version made by
    cdHeader.writeUInt16LE(20, 6); // version needed to extract
    cdHeader.writeUInt16LE(0, 8); // general purpose bit flag
    cdHeader.writeUInt16LE(cd.compMethod, 10); // compression method (0 or 8)
    cdHeader.writeUInt16LE(0, 12); // last mod time
    cdHeader.writeUInt16LE(0, 14); // last mod date
    cdHeader.writeUInt32LE(cd.crc, 16); // crc-32
    cdHeader.writeUInt32LE(cd.compSize, 20); // compressed size
    cdHeader.writeUInt32LE(cd.uncompSize, 24); // uncompressed size
    cdHeader.writeUInt16LE(cd.nameBuf.length, 28); // file name length
    cdHeader.writeUInt16LE(0, 30); // extra field length in CD is ALWAYS 0 (zipalign standard)
    cdHeader.writeUInt16LE(0, 32); // comment length
    cdHeader.writeUInt16LE(0, 34); // disk number start
    cdHeader.writeUInt16LE(0, 36); // internal file attributes
    cdHeader.writeUInt32LE(0, 38); // external file attributes
    cdHeader.writeUInt32LE(cd.offset, 42); // relative offset of local header

    buffers.push(cdHeader, cd.nameBuf);
    currentOffset += cdHeader.length + cd.nameBuf.length;
  }

  const cdSize = currentOffset - cdStart;

  // End of central directory record (22 bytes)
  const eocd = Buffer.alloc(22);
  eocd.writeUInt32LE(0x06054b50, 0); // signature
  eocd.writeUInt16LE(0, 4); // disk number
  eocd.writeUInt16LE(0, 6); // start disk
  eocd.writeUInt16LE(cdEntries.length, 8); // total records on disk
  eocd.writeUInt16LE(cdEntries.length, 10); // total records
  eocd.writeUInt32LE(cdSize, 12); // size of CD
  eocd.writeUInt32LE(cdStart, 16); // offset of start of CD
  eocd.writeUInt16LE(0, 20); // comment length

  buffers.push(eocd);

  const fullZip = Buffer.concat(buffers);
  fs.writeFileSync(outputPath, fullZip);
  return fullZip.length;
}
