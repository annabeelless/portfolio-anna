import site from '../data/site.json';
import services from '../data/services.json';
const mods = import.meta.glob('../content/projects/*.json', { eager: true });
const LISTS = ['tags', 'services', 'feed', 'stories', 'ads', 'scope', 'panelImages', 'extras', 'chapters', 'videos', 'stats', 'heroMeta'];
const norm = (d) => { const o = { ...d }; for (const k of LISTS) if (!Array.isArray(o[k])) o[k] = []; if (!o.wall?.length) delete o.wall; if (!o.stats.length) delete o.stats; if (!o.testimonial?.text || /goes here/i.test(o.testimonial.text)) delete o.testimonial; o.order = Number(o.order) || 99; return o; };
export const projects = Object.entries(mods).map(([p, m]) => norm({ slug: p.split('/').pop().replace('.json', ''), ...(m.default || m) })).sort((a, b) => a.order - b.order);
export { site, services };
export const rel = (depth) => (p) => (depth ? '../'.repeat(depth) : './') + String(p).replace(/^\//, '');
export const filters = ['All', 'SMM', 'Cars', 'Events', 'Ads', 'Videos', 'AI', 'Branding', 'Web'];
export const visuals = projects.flatMap((p) => [
  ...p.feed.map((src) => ({ src, p, kind: 'feed' })),
  ...p.stories.map((src) => ({ src, p, kind: 'stories' })),
  ...p.ads.map((src) => ({ src, p, kind: 'ads' })),
]);
export const pad = (n) => String(n).padStart(2, '0');
