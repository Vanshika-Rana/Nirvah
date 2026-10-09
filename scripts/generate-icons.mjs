import { deflateSync } from "node:zlib";
import { writeFileSync } from "node:fs";
import { mkdirSync } from "node:fs";

function crc32(buf) {
  let c = ~0;
  for (let i = 0; i < buf.length; i += 1) {
    c ^= buf[i];
    for (let j = 0; j < 8; j += 1) c = (c >>> 1) ^ (0xedb88320 & -(c & 1));
  }
  return ~c >>> 0;
}

function chunk(type, data) {
  const t = Buffer.from(type);
  const len = Buffer.alloc(4);
  len.writeUInt32BE(data.length);
  const crcBuf = Buffer.concat([t, data]);
  const crc = Buffer.alloc(4);
  crc.writeUInt32BE(crc32(crcBuf));
  return Buffer.concat([len, crcBuf, crc]);
}

function png(size, paint) {
  const raw = Buffer.alloc((size * 4 + 1) * size);
  for (let y = 0; y < size; y += 1) {
    const row = y * (size * 4 + 1);
    raw[row] = 0;
    for (let x = 0; x < size; x += 1) {
      const [r, g, b, a] = paint(x, y, size);
      const i = row + 1 + x * 4;
      raw[i] = r;
      raw[i + 1] = g;
      raw[i + 2] = b;
      raw[i + 3] = a;
    }
  }
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(size, 0);
  ihdr.writeUInt32BE(size, 4);
  ihdr[8] = 8;
  ihdr[9] = 6;
  return Buffer.concat([
    Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]),
    chunk("IHDR", ihdr),
    chunk("IDAT", deflateSync(raw)),
    chunk("IEND", Buffer.alloc(0)),
  ]);
}

function icon(size) {
  return png(size, (x, y, s) => {
    const cx = s / 2;
    const cy = s / 2;
    const dx = x - cx;
    const dy = y - cy;
    const inCircle = dx * dx + dy * dy <= (s * 0.36) ** 2;
    if (inCircle) return [255, 255, 255, 255];
    return [15, 118, 110, 255];
  });
}

mkdirSync("public", { recursive: true });
writeFileSync("public/icon-192.png", icon(192));
writeFileSync("public/icon-512.png", icon(512));
writeFileSync("public/apple-touch-icon.png", icon(180));
console.log("Wrote PWA icons");
