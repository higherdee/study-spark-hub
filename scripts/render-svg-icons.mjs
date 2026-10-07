import fs from "fs";
import path from "path";
import { Resvg } from "@resvg/resvg-js";

const svgPath = path.resolve("public/favicon.svg");
const svgContent = fs.readFileSync(svgPath, "utf8");

// Generate PNG for given size
function renderPng(size) {
  const resvg = new Resvg(svgContent, {
    fitTo: {
      mode: "width",
      value: size,
    },
    background: "rgba(0, 0, 0, 0)", // transparent background
  });
  const pngData = resvg.render();
  return pngData.asPng();
}

console.log("Rendering public/icon-512.png...");
const png512 = renderPng(512);
fs.writeFileSync("public/icon-512.png", png512);
console.log(`Saved public/icon-512.png (${png512.length} bytes)`);

console.log("Rendering public/icon-192.png...");
const png192 = renderPng(192);
fs.writeFileSync("public/icon-192.png", png192);
console.log(`Saved public/icon-192.png (${png192.length} bytes)`);

console.log("Rendering public/favicon.png...");
const png48 = renderPng(48);
fs.writeFileSync("public/favicon.png", png48);
console.log(`Saved public/favicon.png (${png48.length} bytes)`);

// Also build a proper multi-size Windows .ico file containing [256, 128, 64, 48, 32, 16]
const icoSizes = [256, 128, 64, 48, 32, 16];
const icoImages = icoSizes.map(size => ({ size, data: renderPng(size) }));

// Windows ICO format specification
// Header: 6 bytes (Reserved 0, Type 1 for icon, Count)
// Directory entries: 16 bytes each
// Image data: raw PNG data (PNG format is natively supported in ICO since Windows Vista)
const header = Buffer.alloc(6);
header.writeUInt16LE(0, 0); // Reserved
header.writeUInt16LE(1, 2); // ICO type
header.writeUInt16LE(icoImages.length, 4); // Number of images

let currentDataOffset = 6 + (16 * icoImages.length);
const dirBuffers = [];
const dataBuffers = [];

for (const img of icoImages) {
  const dir = Buffer.alloc(16);
  dir.writeUInt8(img.size === 256 ? 0 : img.size, 0); // width (0 = 256)
  dir.writeUInt8(img.size === 256 ? 0 : img.size, 1); // height (0 = 256)
  dir.writeUInt8(0, 2); // color palette (0 = no palette)
  dir.writeUInt8(0, 3); // reserved
  dir.writeUInt16LE(1, 4); // color planes
  dir.writeUInt16LE(32, 6); // bits per pixel
  dir.writeUInt32LE(img.data.length, 8); // size of image data
  dir.writeUInt32LE(currentDataOffset, 12); // offset of image data

  dirBuffers.push(dir);
  dataBuffers.push(img.data);
  currentDataOffset += img.data.length;
}

const fullIco = Buffer.concat([header, ...dirBuffers, ...dataBuffers]);
fs.writeFileSync("public/downloads/app.ico", fullIco);
console.log(`Saved public/downloads/app.ico (${fullIco.length} bytes, multi-size 256..16)`);
