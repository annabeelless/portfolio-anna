// Image helper: light preview for the page, original for the lightbox, real size for layout.
import fs from 'node:fs';
let meta = {};
try { meta = JSON.parse(fs.readFileSync('src/data/imgmeta.json', 'utf8')); } catch { meta = {}; }
export const img = (src, u) => {
  const m = meta[src] || {};
  return { src: u(m.t || src), full: u(src), w: m.w, h: m.h, ratio: m.w && m.h ? `${m.w} / ${m.h}` : undefined };
};
