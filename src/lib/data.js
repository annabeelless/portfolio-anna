import site from '../data/site.json';
import services from '../data/services.json';
const mods = import.meta.glob('../content/projects/*.json', { eager: true });
export const projects = Object.entries(mods).map(([p, m]) => ({ slug: p.split('/').pop().replace('.json', ''), ...(m.default || m) })).sort((a, b) => a.order - b.order);
export { site, services };
export const rel = (depth) => (p) => (depth ? '../'.repeat(depth) : './') + String(p).replace(/^\//, '');
export const filters = ['All', 'SMM', 'Cars', 'Events', 'Ads', 'Videos', 'AI', 'Branding', 'Web'];
export const visuals = projects.flatMap((p) => [
  ...p.feed.map((src) => ({ src, p, kind: 'feed' })),
  ...p.stories.map((src) => ({ src, p, kind: 'stories' })),
  ...p.ads.map((src) => ({ src, p, kind: 'ads' })),
]);
export const pad = (n) => String(n).padStart(2, '0');
