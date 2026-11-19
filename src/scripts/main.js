import Lenis from 'lenis';
import { ribbon } from './ribbon.js';

const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
const mobile = () => matchMedia('(max-width: 860px)').matches;
const clamp = (v, a = 0, b = 1) => Math.min(b, Math.max(a, v));
const ease = (t) => 1 - Math.pow(1 - t, 3);

// always open a new page at the top (or at its #anchor)
if ('scrollRestoration' in history) history.scrollRestoration = 'manual';
window.scrollTo(0, 0);
addEventListener('pageshow', () => { if (!location.hash) window.scrollTo(0, 0); });

// page load sequence
requestAnimationFrame(() => requestAnimationFrame(() => document.documentElement.classList.add('is-loaded')));

// smooth scroll
let lenis = null;
if (!reduce) {
  lenis = new Lenis({ lerp: 0.085, smoothWheel: true });
  const raf = (t) => { lenis.raf(t); requestAnimationFrame(raf); };
  requestAnimationFrame(raf);
  lenis.scrollTo(0, { immediate: true });
}
const toTop = () => { if (location.hash || window.__abUser?.()) return; lenis?.scrollTo(0, { immediate: true, force: true }); window.scrollTo(0, 0); };
toTop();
addEventListener('pageshow', toTop);
addEventListener('load', () => {
  const t = location.hash && document.getElementById(location.hash.slice(1));
  if (t) setTimeout(() => (lenis ? lenis.scrollTo(t, { offset: -90, immediate: true, force: true }) : t.scrollIntoView()), 60);
  else [0, 120, 400, 900].forEach((d) => setTimeout(toTop, d));
});
document.querySelectorAll('a[href^="#"]').forEach((a) => a.addEventListener('click', (e) => {
  const id = a.getAttribute('href').slice(1);
  const el = id === 'top' ? document.body : document.getElementById(id);
  if (!el) return; e.preventDefault();
  const atBottom = innerHeight + scrollY >= document.documentElement.scrollHeight - 4;
  const go = (y) => (lenis ? lenis.scrollTo(y, { duration: 1.2 }) : scrollTo({ top: typeof y === 'number' ? y : el.getBoundingClientRect().top + scrollY, behavior: 'smooth' }));
  if (id === 'contacts') {
    // land with the contacts heading near the top; if the page can't scroll that far, just settle at the bottom
    const target = Math.min(el.getBoundingClientRect().top + scrollY - 70, document.documentElement.scrollHeight - innerHeight);
    if (!atBottom) go(target);
    const cards = el.querySelector('.contacts');
    if (cards) {
      cards.classList.remove('is-flash'); void cards.offsetWidth; cards.classList.add('is-flash');
      setTimeout(() => cards.classList.remove('is-flash'), 1800);
    }
    return;
  }
  go(el);
}));

// mobile menu
const menu = document.querySelector('[data-menu]');
if (menu) {
  const set = (open) => {
    document.documentElement.classList.toggle('menu-open', open);
    menu.setAttribute('aria-hidden', String(!open));
    document.querySelectorAll('[data-menu-toggle]').forEach((b) => b.setAttribute('aria-expanded', String(open)));
    open ? lenis?.stop() : lenis?.start();
  };
  document.querySelectorAll('[data-menu-toggle]').forEach((b) => b.addEventListener('click', () => set(!document.documentElement.classList.contains('menu-open'))));
  menu.querySelectorAll('[data-menu-link]').forEach((a) => a.addEventListener('click', () => set(false)));
  addEventListener('keydown', (e) => { if (e.key === 'Escape') set(false); });
}

// back-to-top button
const totop = document.querySelector('[data-totop]');
if (totop) {
  const t = () => totop.classList.toggle('is-on', scrollY > innerHeight * 0.6);
  addEventListener('scroll', t, { passive: true }); t();
  totop.addEventListener('click', () => (lenis ? lenis.scrollTo(0, { duration: 1.6 }) : scrollTo({ top: 0, behavior: 'smooth' })));
}

// images fade in softly once loaded
document.querySelectorAll('main img').forEach((img) => {
  img.classList.add('img-fade');
  const ok = () => img.classList.add('is-ready');
  img.complete && img.naturalWidth ? ok() : img.addEventListener('load', ok, { once: true });
});

// fit hero wordmark to the full width
const mark = document.querySelector('[data-fit]');
function fit() {
  if (!mark) return;
  mark.style.setProperty('--fit', '100px'); mark.style.justifyContent = 'flex-start';
  const w = [...mark.children].reduce((s, c) => s + c.getBoundingClientRect().width, 0);
  const avail = mark.clientWidth;
  mark.style.setProperty('--fit', `${(100 * avail / w) * 0.985}px`); mark.style.justifyContent = '';
}
if (mark) { fit(); document.fonts?.ready.then(fit); addEventListener('resize', fit); }

// horizontal projects + filters
const hs = document.querySelector('[data-hscroll]');
const track = hs?.querySelector('[data-track]');
function sizeH() {
  if (!hs || !track) return;
  if (mobile()) { hs.style.removeProperty('--h'); return; }
  hs.style.setProperty('--h', `${innerHeight + Math.max(0, track.scrollWidth - innerWidth)}px`);
}
sizeH(); addEventListener('resize', sizeH); addEventListener('load', sizeH);
// project index: filters dim the rows that do not match
const ix = document.querySelector('[data-ix]');
document.querySelectorAll('[data-filter]').forEach((b) => b.addEventListener('click', () => {
  document.querySelectorAll('[data-filter]').forEach((x) => x.classList.toggle('is-on', x === b));
  const f = b.dataset.filter;
  let shown = 0;
  const items = ix ? [...ix.querySelectorAll('.ix__item')] : [];
  const before = new Map(items.map((it) => [it, it.getBoundingClientRect().top]));
  items.forEach((it, i) => {
    const hit = f === 'All' || it.dataset.tags.split(',').includes(f);
    const soon = it.classList.contains('is-soon');
    it.classList.toggle('is-off', !hit);
    // matching cases rise to the top, then matching "soon", then the rest, each in original order
    it.style.order = String(f === 'All' ? i : (hit ? (soon ? 100 : 0) : 200) + i);
    if (hit && !soon) shown++;
  });
  // FLIP: glide every row from its old place to the new one
  items.forEach((it) => {
    const d = before.get(it) - it.getBoundingClientRect().top;
    if (!d) return;
    it.style.transition = 'none';
    it.style.transform = `translateY(${d}px)`;
    requestAnimationFrame(() => requestAnimationFrame(() => {
      it.style.transition = 'transform .8s cubic-bezier(.2,.8,.2,1), opacity .5s';
      it.style.transform = '';
    }));
  });
  const empty = document.querySelector('[data-empty]');
  if (empty) { empty.hidden = shown > 0; empty.querySelector('[data-empty-cat]').textContent = f; }
  onScroll();
}));

// project index: a creative floats after the cursor and flips while hovering
const fl = document.querySelector('.ix__float');
if (fl && matchMedia('(hover: hover)').matches) {
  const im = fl.querySelector('img');
  let x = innerWidth / 2, y = innerHeight / 2, cx = x, cy = y, t = null, set = [], k = 0, live = false;
  addEventListener('pointermove', (e) => { x = e.clientX; y = e.clientY; }, { passive: true });
  const loop = () => { cx += (x - cx) * 0.14; cy += (y - cy) * 0.14; fl.style.transform = `translate3d(${cx}px,${cy}px,0)`; if (live || fl.classList.contains('is-on')) requestAnimationFrame(loop); else loopOn = false; };
  let loopOn = false;
  const start = () => { if (!loopOn) { loopOn = true; requestAnimationFrame(loop); } };
  document.querySelectorAll('.ix__row[data-imgs]').forEach((r) => {
    r.addEventListener('mouseenter', () => {
      set = JSON.parse(r.dataset.imgs); k = 0; im.src = set[0];
      set.forEach((src) => { const i = new Image(); i.src = src; });
      live = true; fl.classList.add('is-on'); start();
      clearInterval(t); t = setInterval(() => { k = (k + 1) % set.length; im.src = set[k]; }, 650);
    });
    r.addEventListener('mouseleave', () => { live = false; fl.classList.remove('is-on'); clearInterval(t); });
  });
}

// visuals page filter
document.querySelectorAll('[data-vfilter]').forEach((b) => b.addEventListener('click', () => {
  document.querySelectorAll('[data-vfilter]').forEach((x) => x.classList.toggle('is-on', x === b));
  const f = b.dataset.vfilter;
  document.querySelectorAll('.vis').forEach((v) => v.classList.toggle('is-hidden', f !== 'all' && v.dataset.project !== f));
}));

// ribbon light field behind the hero and the glass stack
const rcv = document.querySelector('[data-ribbon]');
const rib = rcv ? ribbon(rcv) : null;
let ribOn = true;
function ribFade() {
  if (!rcv) return;
  const st = document.querySelector('[data-stack]');
  const b = st ? st.getBoundingClientRect().bottom : innerHeight;
  const past = clamp(scrollY / (innerHeight * 0.9));
  const op = clamp((b - innerHeight * 0.35) / (innerHeight * 0.65)) * (1 - past * 0.65);
  rcv.style.opacity = op.toFixed(3);
  if (op <= 0.001 && ribOn) { ribOn = false; rib?.pause(); }
  else if (op > 0.001 && !ribOn) { ribOn = true; rib?.play(); }
}

// glass sheen follows the pointer across a panel
document.querySelectorAll('.panel__card').forEach((c) => c.addEventListener('pointermove', (e) => {
  const r = c.getBoundingClientRect();
  c.style.setProperty('--gx', `${((e.clientX - r.left) / r.width * 100).toFixed(1)}%`);
  c.style.setProperty('--gy', `${((e.clientY - r.top) / r.height * 100).toFixed(1)}%`);
}, { passive: true }));

// scroll-driven
const echo = document.querySelector('[data-echo]');
const panels = [...document.querySelectorAll('[data-panel]')];
const stack = document.querySelector('[data-stack]');
const par = document.querySelector('[data-parallax] .case__wallrow');
const herobg = document.querySelector('[data-herobg]');
function onScroll() {
  const sy = scrollY, vh = innerHeight;
  if (herobg) herobg.style.setProperty('--hy', `${Math.min(sy, vh) * 0.25}px`);
  ribFade();
  if (echo) {
    const p = clamp(sy / (vh * 0.45));
    echo.style.setProperty('--echo', p.toFixed(3));
    echo.style.setProperty('--echo-o', p > 0.02 ? '1' : '0');
  }
  if (mark) mark.style.transform = mobile() ? '' : `translateY(${sy * -0.18}px)`;
  if (stack) {
    const m = mobile();
    const navh = m ? 58 : 0;
    panels.forEach((pn, i) => {
      const stickyTop = navh + i * (m ? 10 : 16);
      const r = pn.getBoundingClientRect();
      const p = i === 0 && !m ? ease(clamp(sy / (vh * 0.9))) : ease(clamp(1 - (r.top - stickyTop) / (vh * 0.8)));
      const card = pn.firstElementChild;
      if (m) {
        card.style.setProperty('--inx', `${10 + (1 - p) * innerWidth * (i === 0 ? 0 : 0.08)}px`);
      } else {
        const inx = i === 0 ? (1 - p) * innerWidth * 0.09 : (1 - p) * innerWidth * 0.025;
        card.style.setProperty('--inx', `${inx}px`);
        card.style.setProperty('--prr', `${8 + (1 - p) * 6}px`);
        card.style.setProperty('--ps', (1.06 - p * 0.06).toFixed(3));
      }
    });
  }
  if (hs && track && !mobile()) {
    const r = hs.getBoundingClientRect();
    const p = clamp(-r.top / Math.max(1, r.height - vh));
    track.style.transform = `translate3d(${-p * Math.max(0, track.scrollWidth - innerWidth)}px,0,0)`;
  }
  if (mobile()) {
    document.querySelectorAll('.card__frame img').forEach((img) => {
      const r = img.parentElement.getBoundingClientRect();
      if (r.bottom < 0 || r.top > vh) return;
      const k = clamp((r.top + r.height / 2 - vh / 2) / vh, -1, 1);
      img.style.setProperty('--par', `${(k * -14).toFixed(1)}px`);
    });
  }
  if (par) { const r = par.parentElement.getBoundingClientRect(); par.style.setProperty('--py', `${(r.top / vh) * -40}px`); }
}
lenis?.on('scroll', onScroll);
addEventListener('scroll', onScroll, { passive: true });
addEventListener('resize', onScroll);
onScroll();

// reveal on view
const io = new IntersectionObserver((es) => es.forEach((e) => { if (e.isIntersecting) { e.target.classList.add('is-in'); io.unobserve(e.target); } }), { rootMargin: '0px 0px -6% 0px' });
document.querySelectorAll('.reveal').forEach((el) => io.observe(el));

// drag-to-scroll stories
document.querySelectorAll('[data-drag]').forEach((el) => {
  let down = false, sx = 0, sl = 0, moved = false;
  el.addEventListener('pointerdown', (e) => { if (e.pointerType !== 'mouse') return; down = true; moved = false; sx = e.clientX; sl = el.scrollLeft; el.classList.add('is-drag'); });
  addEventListener('pointermove', (e) => { if (!down) return; const d = e.clientX - sx; if (Math.abs(d) > 4) moved = true; el.scrollLeft = sl - d; });
  addEventListener('pointerup', () => { down = false; el.classList.remove('is-drag'); });
  el.addEventListener('click', (e) => { if (moved) { e.stopPropagation(); e.preventDefault(); } }, true);
  el.addEventListener('pointerdown', () => { window.__dragMoved = false; });
  addEventListener('pointermove', () => { if (down && moved) window.__dragMoved = true; });
});

// lightbox gallery: swipe / arrows through one block, zoom in for detail
const lb = document.querySelector('[data-lightbox]');
if (lb) {
  const img = lb.querySelector('img');
  const vid = lb.querySelector('.lightbox__video');
  const count = lb.querySelector('[data-lb-count]');
  let set = [], at = 0;
  // zoom state
  let z = 1, ox = 0, oy = 0;
  const applyZ = () => { img.style.transform = z > 1 ? `translate(${ox}px,${oy}px) scale(${z})` : ''; lb.classList.toggle('is-zoom', z > 1); };
  const clampPan = () => {
    const r = img.getBoundingClientRect(); const bw = r.width / z, bh = r.height / z;
    const mx = Math.max(0, (bw * z - innerWidth) / 2), my = Math.max(0, (bh * z - innerHeight) / 2);
    ox = Math.max(-mx, Math.min(mx, ox)); oy = Math.max(-my, Math.min(my, oy));
  };
  // never zoom past the photo's real pixels, so it stays sharp
  const zmax = () => Math.max(1.4, Math.min(4, (img.naturalWidth || 1) / Math.max(1, img.clientWidth)));
  const resetZ = () => { z = 1; ox = 0; oy = 0; img.style.transition = ''; applyZ(); };
  const zoomAt = (cx, cy, k) => {
    const r = img.getBoundingClientRect(); const icx = r.left + r.width / 2, icy = r.top + r.height / 2;
    const nz = Math.max(1, Math.min(zmax(), k));
    ox = (ox - (cx - icx)) * (nz / z) + (cx - icx) * (nz > z ? 1 : 1) - (cx - icx) * (nz / z) + (icx - innerWidth / 2) * 0;
    ox = (cx - innerWidth / 2) * (1 - nz) / 1;  oy = (cy - innerHeight / 2) * (1 - nz) / 1;
    z = nz; if (z === 1) { ox = 0; oy = 0; } clampPan(); applyZ();
  };
  const show = (n) => {
    resetZ();
    at = (n + set.length) % set.length;
    const el = set[at];
    const isV = !!el.dataset.video;
    if (vid) { vid.pause(); vid.hidden = !isV; }
    img.hidden = isV;
    if (isV) { vid.src = el.dataset.video; vid.currentTime = 0; vid.muted = false; vid.play().catch(() => {}); }
    else { img.classList.remove('is-in'); void img.offsetWidth; img.src = el.dataset.full || el.currentSrc || el.src; img.classList.add('is-in'); }
    count.textContent = `${at + 1} / ${set.length}`;
    lb.classList.toggle('is-single', set.length < 2);
  };
  const open = (el) => {
    const scope = el.closest('.block, .case__wall, .ch__it') || document;
    set = [...scope.querySelectorAll('[data-zoom], [data-video]')];
    lb.hidden = false; lenis?.stop(); show(set.indexOf(el));
  };
  const close = () => { lb.hidden = true; vid?.pause(); resetZ(); lenis?.start(); };
  let dragMoved = false;
  document.querySelectorAll('[data-zoom], [data-video]').forEach((el) => el.addEventListener('click', () => { if (!window.__dragMoved) open(el); }));
  lb.querySelector('[data-lb-prev]').addEventListener('click', (e) => { e.stopPropagation(); show(at - 1); });
  lb.querySelector('[data-lb-next]').addEventListener('click', (e) => { e.stopPropagation(); show(at + 1); });
  lb.querySelector('[data-lb-close]').addEventListener('click', (e) => { e.stopPropagation(); close(); });
  // desktop: click toggles 2.5x zoom at the cursor, moving the mouse pans
  img.addEventListener('click', (e) => {
    e.stopPropagation();
    if (matchMedia('(hover: none)').matches) return;
    if (z > 1) resetZ(); else { img.style.transition = 'transform .45s cubic-bezier(.2,.8,.2,1)'; zoomAt(e.clientX, e.clientY, Math.min(2.5, zmax())); }
  });
  lb.addEventListener('mousemove', (e) => {
    if (z <= 1) return;
    img.style.transition = 'transform .12s linear';
    ox = (innerWidth / 2 - e.clientX) * (z - 1); oy = (innerHeight / 2 - e.clientY) * (z - 1); clampPan(); applyZ();
  });
  lb.addEventListener('wheel', (e) => { if (lb.hidden) return; e.preventDefault(); img.style.transition = 'transform .15s'; zoomAt(e.clientX, e.clientY, z * (e.deltaY < 0 ? 1.15 : 1 / 1.15)); }, { passive: false });
  vid?.addEventListener('click', (e) => e.stopPropagation());
  lb.addEventListener('click', () => { if (z > 1) resetZ(); else close(); });
  addEventListener('keydown', (e) => {
    if (lb.hidden) return;
    if (e.key === 'Escape') (z > 1 ? resetZ() : close());
    if (e.key === 'ArrowRight') show(at + 1);
    if (e.key === 'ArrowLeft') show(at - 1);
  });
  // touch: swipe to change, double tap to zoom, pinch to zoom, drag to pan when zoomed
  let tx = 0, ty = 0, sox = 0, soy = 0, pinch = 0, pz = 1, lastTap = 0, moved = false;
  const dist = (t) => Math.hypot(t[0].clientX - t[1].clientX, t[0].clientY - t[1].clientY);
  lb.addEventListener('touchstart', (e) => {
    moved = false;
    if (e.touches.length === 2) { pinch = dist(e.touches); pz = z; return; }
    tx = e.touches[0].clientX; ty = e.touches[0].clientY; sox = ox; soy = oy;
  }, { passive: true });
  lb.addEventListener('touchmove', (e) => {
    if (img.hidden) return;
    if (e.touches.length === 2 && pinch) { e.preventDefault(); img.style.transition = 'none'; z = Math.max(1, Math.min(zmax(), pz * dist(e.touches) / pinch)); if (z === 1) { ox = oy = 0; } clampPan(); applyZ(); moved = true; return; }
    if (z > 1 && e.touches.length === 1) { e.preventDefault(); img.style.transition = 'none'; ox = sox + (e.touches[0].clientX - tx); oy = soy + (e.touches[0].clientY - ty); clampPan(); applyZ(); moved = true; }
  }, { passive: false });
  lb.addEventListener('touchend', (e) => {
    if (pinch && e.touches.length < 2) { pinch = 0; return; }
    if (z > 1 || moved) return;
    const dx = e.changedTouches[0].clientX - tx, dy = e.changedTouches[0].clientY - ty;
    if (Math.abs(dx) > 40 && Math.abs(dx) > Math.abs(dy)) { show(at + (dx < 0 ? 1 : -1)); return; }
    if (dy > 90) { close(); return; }
    const now = Date.now();
    if (!img.hidden && now - lastTap < 300 && Math.abs(dx) < 10) { img.style.transition = 'transform .35s'; zoomAt(e.changedTouches[0].clientX, e.changedTouches[0].clientY, Math.min(2.5, zmax())); }
    lastTap = now;
  }, { passive: true });
}

// desktop: horizontal rows of visuals scroll sideways with the page (pinned while you scroll)
const pins = [];
function setupPins() {
  const desk = matchMedia('(min-width: 861px)').matches;
  document.querySelectorAll('.case [data-drag]').forEach((row) => {
    let rec = pins.find((p) => p.row === row);
    if (!desk) { if (rec) { row.style.transform = ''; rec.pin.style.height = ''; rec.pin.classList.remove('is-on'); } return; }
    if (!rec) {
      // pin the whole section (title + row) when it fits on screen, otherwise just the row
      const sec = row.closest('.ch__it, .block');
      const target = sec && sec.offsetHeight < innerHeight - 120 ? sec : row;
      const pin = document.createElement('div'); pin.className = 'hpin';
      const st = document.createElement('div'); st.className = 'hpin__sticky';
      target.parentNode.insertBefore(pin, target); pin.appendChild(st); st.appendChild(target);
      rec = { pin, row, st }; pins.push(rec);
    }
    const { pin, st } = rec;
    pin.classList.add('is-on'); row.style.transform = '';
    const last = row.lastElementChild; if (!last) return;
    rec.extra = Math.max(0, last.offsetLeft + last.offsetWidth - row.clientWidth + 2);
    if (rec.extra < 40) { pin.classList.remove('is-on'); pin.style.height = ''; return; }
    st.style.top = `${Math.max(70, (innerHeight - st.offsetHeight) / 2)}px`;
    pin.style.height = `${st.offsetHeight + rec.extra}px`;
  });
  onPins();
}
function onPins() {
  pins.forEach(({ pin, row, st, extra }) => {
    if (!pin.classList.contains('is-on') || !extra) { row.style.transform = ''; return; }
    const top = parseFloat(st.style.top) || 0;
    const p = Math.min(1, Math.max(0, (top - pin.getBoundingClientRect().top) / extra));
    row.style.transform = `translate3d(${-p * extra}px,0,0)`;
  });
}
addEventListener('load', setupPins);
// lazy images change row widths after they load: re-measure
let pinT = 0; const rePin = () => { clearTimeout(pinT); pinT = setTimeout(setupPins, 120); };
document.querySelectorAll('.case [data-drag] img, .case [data-drag] video').forEach((m) => { m.addEventListener('load', rePin); m.addEventListener('loadedmetadata', rePin); });
if ('ResizeObserver' in window) { const ro = new ResizeObserver(rePin); document.querySelectorAll('.case [data-drag]').forEach((r) => ro.observe(r)); }
addEventListener('resize', setupPins);
setupPins();
lenis?.on('scroll', onPins);
addEventListener('scroll', onPins, { passive: true });

// video cards: silent preview on hover (desktop)
if (matchMedia('(hover: hover)').matches) {
  document.querySelectorAll('[data-video] video').forEach((v) => {
    const f = v.parentElement;
    f.addEventListener('mouseenter', () => v.play().catch(() => {}));
    f.addEventListener('mouseleave', () => { v.pause(); });
  });
}
