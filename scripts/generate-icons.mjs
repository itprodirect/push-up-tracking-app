// Generates simple placeholder PNG icons for the PWA manifest.
// Pure Node — no dependencies. Solid dark background with a cyan circle.
// Replace with real branded PNGs later; the manifest paths stay the same.
import { deflateSync } from 'node:zlib';
import { writeFileSync, mkdirSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const publicDir = resolve(__dirname, '..', 'public');
mkdirSync(publicDir, { recursive: true });

// CRC32 table
const crcTable = (() => {
  const t = new Uint32Array(256);
  for (let n = 0; n < 256; n++) {
    let c = n;
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    t[n] = c >>> 0;
  }
  return t;
})();

function crc32(buf) {
  let crc = 0xffffffff;
  for (let i = 0; i < buf.length; i++) crc = crcTable[(crc ^ buf[i]) & 0xff] ^ (crc >>> 8);
  return (crc ^ 0xffffffff) >>> 0;
}

function chunk(type, data) {
  const len = Buffer.alloc(4);
  len.writeUInt32BE(data.length, 0);
  const typeBuf = Buffer.from(type, 'ascii');
  const crcBuf = Buffer.alloc(4);
  crcBuf.writeUInt32BE(crc32(Buffer.concat([typeBuf, data])), 0);
  return Buffer.concat([len, typeBuf, data, crcBuf]);
}

function makePng(size, { maskable = false } = {}) {
  const sig = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(size, 0);
  ihdr.writeUInt32BE(size, 4);
  ihdr[8] = 8; // bit depth
  ihdr[9] = 2; // color type: truecolor RGB
  ihdr[10] = 0;
  ihdr[11] = 0;
  ihdr[12] = 0;

  // Palette
  const bg = [0x0f, 0x17, 0x2a]; // slate-900
  const fg = [0x22, 0xd3, 0xee]; // cyan-400
  const mid = [0x08, 0x91, 0xb2]; // cyan-600

  const cx = size / 2;
  const cy = size / 2;
  // Maskable icons need "safe area" — keep art inside a 40% radius circle.
  const r = maskable ? size * 0.28 : size * 0.34;
  const ringR = r * 1.25;

  const raw = Buffer.alloc(size * (1 + size * 3));
  let off = 0;
  for (let y = 0; y < size; y++) {
    raw[off++] = 0; // filter: none
    for (let x = 0; x < size; x++) {
      const dx = x - cx;
      const dy = y - cy;
      const d2 = dx * dx + dy * dy;
      let color;
      if (d2 < r * r) color = fg;
      else if (d2 < ringR * ringR) color = mid;
      else color = bg;
      raw[off++] = color[0];
      raw[off++] = color[1];
      raw[off++] = color[2];
    }
  }

  const idat = deflateSync(raw);
  return Buffer.concat([sig, chunk('IHDR', ihdr), chunk('IDAT', idat), chunk('IEND', Buffer.alloc(0))]);
}

const targets = [
  { file: 'icon-192.png', size: 192 },
  { file: 'icon-512.png', size: 512 },
  { file: 'icon-512-maskable.png', size: 512, maskable: true },
];

for (const t of targets) {
  const buf = makePng(t.size, { maskable: t.maskable });
  writeFileSync(resolve(publicDir, t.file), buf);
  console.log(`wrote ${t.file} (${buf.length} bytes)`);
}
