// Pre-build: make light preview copies of every site image (public/img/**)
// and record real sizes, so pages load small previews and the lightbox opens the original.
import fs from 'node:fs';
import path from 'node:path';
import sharp from 'sharp';

const ROOT = 'public/img';
const OUT = 'src/data/imgmeta.json';
const MAX = 1400; // longest side of the preview
const SKIP = /-(t\d+|1280|2048|3200)\.webp$/;
const meta = {};
const walk = (d) => fs.readdirSync(d, { withFileTypes: true }).flatMap((e) => e.isDirectory() ? walk(path.join(d, e.name)) : [path.join(d, e.name)]);
const files = walk(ROOT).filter((f) => /\.(jpe?g|png|webp)$/i.test(f) && !SKIP.test(f));
let made = 0;
for (const f of files) {
  try {
    const m = await sharp(f).metadata();
    const key = '/' + path.relative('public', f).split(path.sep).join('/');
    const entry = { w: m.width, h: m.height };
    if (Math.max(m.width, m.height) > MAX * 1.15) {
      const t = f.replace(/\.(jpe?g|png|webp)$/i, `-t${MAX}.webp`);
      if (!fs.existsSync(t) || fs.statSync(t).mtimeMs < fs.statSync(f).mtimeMs) {
        await sharp(f).rotate().resize({ width: m.width >= m.height ? MAX : undefined, height: m.height > m.width ? MAX : undefined }).webp({ quality: 82 }).toFile(t);
        made++;
      }
      entry.t = '/' + path.relative('public', t).split(path.sep).join('/');
    }
    meta[key] = entry;
  } catch (e) { console.warn('thumbs: skip', f, e.message); }
}
fs.writeFileSync(OUT, JSON.stringify(meta));
console.log(`thumbs: ${files.length} images, ${made} previews made`);
