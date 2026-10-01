// Generates placeholder PNG app icons (no dependencies). Replace with real artwork before launch.
import { deflateSync } from "node:zlib";
import { mkdirSync, writeFileSync } from "node:fs";

const crcTable = Array.from({ length: 256 }, (_, n) => {
  let c = n;
  for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
  return c >>> 0;
});
const crc = (buf) => {
  let c = 0xffffffff;
  for (const b of buf) c = crcTable[(c ^ b) & 255] ^ (c >>> 8);
  return (c ^ 0xffffffff) >>> 0;
};
const chunk = (type, data) => {
  const len = Buffer.alloc(4);
  len.writeUInt32BE(data.length);
  const td = Buffer.concat([Buffer.from(type), data]);
  const c = Buffer.alloc(4);
  c.writeUInt32BE(crc(td));
  return Buffer.concat([len, td, c]);
};

function png(size, { maskable }) {
  const raw = Buffer.alloc((size * 4 + 1) * size);
  const pad = maskable ? 0.2 : 0.14; // safe zone for maskable icons
  for (let y = 0; y < size; y++) {
    raw[y * (size * 4 + 1)] = 0;
    for (let x = 0; x < size; x++) {
      const t = (x + y) / (2 * size);
      let r = 123 - 49 * t, g = 108 - 47 * t, b = 255 - 31 * t; // gradient #7b6cff -> #4a3de0
      // Draw an "M": two verticals + two diagonals meeting in the middle.
      const u = (x / size - pad) / (1 - 2 * pad);
      const v = (y / size - pad) / (1 - 2 * pad);
      const w = 0.13;
      let on = false;
      if (u >= 0 && u <= 1 && v >= 0 && v <= 1) {
        const left = u < w, right = u > 1 - w;
        const d1 = Math.abs(u - 0.5 * v) < w * 0.9 && u < 0.5;
        const d2 = Math.abs(1 - u - 0.5 * v) < w * 0.9 && u >= 0.5;
        on = left || right || d1 || d2;
      }
      if (on) r = g = b = 255;
      const i = y * (size * 4 + 1) + 1 + x * 4;
      raw[i] = r; raw[i + 1] = g; raw[i + 2] = b; raw[i + 3] = 255;
    }
  }
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(size, 0); ihdr.writeUInt32BE(size, 4);
  ihdr[8] = 8; ihdr[9] = 6;
  return Buffer.concat([Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]), chunk("IHDR", ihdr), chunk("IDAT", deflateSync(raw)), chunk("IEND", Buffer.alloc(0))]);
}

mkdirSync("public/icons", { recursive: true });
writeFileSync("public/icons/icon-192.png", png(192, { maskable: false }));
writeFileSync("public/icons/icon-512.png", png(512, { maskable: false }));
writeFileSync("public/icons/maskable-512.png", png(512, { maskable: true }));
writeFileSync("public/icons/apple-touch-icon.png", png(180, { maskable: false }));
console.log("icons written");
