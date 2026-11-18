// Ribbon glow background: a WebGL2 light field that swirls around the cursor
// and is dragged by its motion. Ported from the Originkit "Ribbon Glow"
// component to plain JS, recoloured to neutral chrome for the dark site.

const LAYERS = 84;
const TWIST = 1.55;
const DRAG = 0.3;

const VERT = `#version 300 es
const vec2 P[3] = vec2[3](vec2(-1.0, -1.0), vec2(3.0, -1.0), vec2(-1.0, 3.0));
void main() { gl_Position = vec4(P[gl_VertexID], 0.0, 1.0); }
`;

const FIELD = `#version 300 es
precision highp float;
uniform vec2 uRes; uniform float uTime; uniform vec3 uC1; uniform vec3 uC2;
uniform float uSize; uniform float uAngle; uniform vec2 uMouse; uniform float uOn;
uniform float uReach; uniform vec2 uVel; uniform float uLayers; uniform float uGain; uniform vec2 uShift;
out vec4 o;
const float TWIST = ${TWIST.toFixed(3)};
const float DRAG = ${DRAG.toFixed(3)};
const vec2 CENTRE = vec2(-0.62, 0.24);
const float TILT = 0.6; const float ZOOM = 1.05; const float THETA = 2.13;
const float SHEAR = 0.963; const float SHRINK = 0.953;
const vec2 WARP_FREQ = vec2(0.42, 2.4); const vec2 WARP_AMP = vec2(0.13, 0.027);
const vec2 ASPECT = vec2(2.1, 0.17); const float OFFSET = 0.36;
const float GLOW = 0.0021; const float SOFT = 0.0019; const float FALLOFF = 0.37;
const float PHASE = 12.0; const float CYCLE = 0.16; const float HUE_TRAVEL = 2.0;
mat2 rot(float a) { float c = cos(a), s = sin(a); return mat2(c, s, -s, c); }
void main() {
  vec2 R = uRes;
  vec2 pos = (gl_FragCoord.xy - 0.5 * R) / R.y;
  vec2 d = pos - uMouse;
  float w = uOn * exp(-dot(d, d) / (uReach * uReach));
  if (w > 1e-4) pos = uMouse + rot(w * TWIST) * d * (1.0 - 0.3 * min(w, 1.0)) - uVel * min(w, 1.0) * DRAG;
  pos -= uShift;
  pos = rot(uAngle) * pos / uSize;
  float t = uTime * 0.49 + PHASE;
  float breath = (-sin(uTime * 0.735) + sin(uTime * 0.49 + 1.0)) * 0.25 + 0.5;
  vec2 u = rot(TILT) * ((pos - CENTRE) * (ZOOM - breath * 0.085));
  mat2 fold = mat2(cos(THETA), sin(THETA), -SHEAR, cos(THETA));
  vec3 col = vec3(0.0);
  for (float i = 1.0; i <= ${LAYERS.toFixed(1)}; i += 1.0) {
    if (i > uLayers) break;
    u.x -= sin(u.y * WARP_FREQ.x + t + i * 0.007) * WARP_AMP.x;
    u.y -= sin(u.x * WARP_FREQ.y - t + i * 0.02) * WARP_AMP.y;
    u = fold * u * SHRINK;
    vec2 q = (u - vec2(OFFSET + breath * 0.1, 0.0)) * ASPECT;
    float g = GLOW / (dot(q, q) + SOFT) * (0.25 + breath * 0.4);
    float r = length(u);
    float k = sin(i * CYCLE + t * 1.2 + r * HUE_TRAVEL) * 0.5 + 0.5;
    col += g * mix(uC1, uC2, k) * (0.62 + 0.5 * k) * exp2(-r * FALLOFF);
  }
  vec3 x = max(col * uGain, 0.0);
  col = (x * (2.51 * x + 0.03)) / (x * (2.43 * x + 0.59) + 0.14);
  col = pow(clamp(col, 0.0, 1.0), vec3(0.85, 0.92, 0.98));
  col *= 1.0 - smoothstep(0.5, 1.6, length(pos)) * 0.07;
  o = vec4(col, 1.0);
}
`;

const FINISH = `#version 300 es
precision highp float;
uniform sampler2D uField; uniform vec2 uRes; uniform float uTime; uniform vec3 uBg;
out vec4 o;
float ign(vec2 p, float f) { p += 5.588238 * mod(f, 64.0); return fract(52.9829189 * fract(0.06711056 * p.x + 0.00583715 * p.y)); }
void main() {
  vec2 frag = gl_FragCoord.xy;
  vec3 L = max(texture(uField, frag / uRes).rgb, 0.0);
  vec3 col = uBg + L * (1.0 - uBg);
  col += (ign(frag, floor(uTime * 24.0)) - 0.5) / 255.0;
  o = vec4(clamp(col, 0.0, 1.0), 1.0);
}
`;

const hex = (h) => [1, 3, 5].map((i) => parseInt(h.slice(i, i + 2), 16) / 255);
const clamp = (v, a, b) => Math.min(b, Math.max(a, v));

export function ribbon(canvas, opts = {}) {
  const o = {
    bg: '#0b0b0b', c1: '#f4efe6', c2: '#7d8794',
    speed: 1.1, size: 1.1, gain: 0.3, follow: 0.3, angle: -Math.PI, hover: 1.3, reach: 360, ...opts,
  };
  const gl = canvas.getContext('webgl2', { antialias: false, alpha: false, depth: false, stencil: false, powerPreference: 'high-performance' });
  if (!gl) { canvas.remove(); return null; }

  const compile = (type, src) => { const s = gl.createShader(type); gl.shaderSource(s, src); gl.compileShader(s); if (!gl.getShaderParameter(s, gl.COMPILE_STATUS)) { console.error(gl.getShaderInfoLog(s)); return null; } return s; };
  const program = (frag) => { const p = gl.createProgram(); const v = compile(gl.VERTEX_SHADER, VERT), f = compile(gl.FRAGMENT_SHADER, frag); if (!v || !f) return null; gl.attachShader(p, v); gl.attachShader(p, f); gl.linkProgram(p); return gl.getProgramParameter(p, gl.LINK_STATUS) ? p : null; };
  const field = program(FIELD), finish = program(FINISH);
  if (!field || !finish) { canvas.remove(); return null; }
  const loc = (p, names) => Object.fromEntries(names.map((n) => [n, gl.getUniformLocation(p, n)]));
  const uf = loc(field, ['uRes', 'uTime', 'uC1', 'uC2', 'uSize', 'uAngle', 'uMouse', 'uOn', 'uReach', 'uVel', 'uLayers', 'uGain', 'uShift']);
  const un = loc(finish, ['uField', 'uRes', 'uTime', 'uBg']);
  gl.bindVertexArray(gl.createVertexArray());

  // half-resolution render target (half float when the GPU allows it)
  const fbo = gl.createFramebuffer();
  let tex = null, tw = 0, th = 0, half = !!gl.getExtension('EXT_color_buffer_float');
  const resizeTarget = (w, h) => {
    if (w === tw && h === th && tex) return;
    for (let a = 0; a < 2; a++) {
      if (tex) gl.deleteTexture(tex);
      tex = gl.createTexture();
      gl.bindTexture(gl.TEXTURE_2D, tex);
      [gl.TEXTURE_MIN_FILTER, gl.TEXTURE_MAG_FILTER].forEach((p) => gl.texParameteri(gl.TEXTURE_2D, p, gl.LINEAR));
      [gl.TEXTURE_WRAP_S, gl.TEXTURE_WRAP_T].forEach((p) => gl.texParameteri(gl.TEXTURE_2D, p, gl.CLAMP_TO_EDGE));
      gl.texImage2D(gl.TEXTURE_2D, 0, half ? gl.RGBA16F : gl.RGBA8, w, h, 0, gl.RGBA, half ? gl.HALF_FLOAT : gl.UNSIGNED_BYTE, null);
      gl.bindFramebuffer(gl.FRAMEBUFFER, fbo);
      gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, tex, 0);
      const ok = gl.checkFramebufferStatus(gl.FRAMEBUFFER) === gl.FRAMEBUFFER_COMPLETE;
      gl.bindFramebuffer(gl.FRAMEBUFFER, null);
      if (ok || !half) break;
      half = false;
    }
    tw = w; th = h;
  };

  // pointer, in CSS px relative to the canvas
  const ptr = { x: 0, y: 0, inside: false };
  const read = (e) => { const r = canvas.getBoundingClientRect(); ptr.x = e.clientX - r.left; ptr.y = e.clientY - r.top; ptr.inside = ptr.y >= 0 && ptr.y <= r.height; };
  addEventListener('pointermove', read, { passive: true });
  addEventListener('pointerdown', read, { passive: true });
  document.addEventListener('pointerout', (e) => { if (!e.relatedTarget) ptr.inside = false; });

  const touch = matchMedia('(hover: none)').matches;
  const small = matchMedia('(max-width: 860px)').matches;
  const still = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const c1 = hex(o.c1), c2 = hex(o.c2), bg = hex(o.bg);
  let sx = 0, sy = 0, mx = 0, my = 0, vx = 0, vy = 0, on = 0, last = -1, clock = 0, raf = 0, running = false;

  const frame = (now) => {
    raf = running ? requestAnimationFrame(frame) : 0;
    const dt = last < 0 ? 0 : clamp((now - last) / 1000, 0, 0.05);
    last = now;
    clock = (clock + dt * o.speed) % 3600;
    const dpr = Math.min(devicePixelRatio || 1, small ? 1 : 1.5);
    const cw = canvas.clientWidth || 1200, ch = canvas.clientHeight || 800;
    const bw = Math.round(cw * dpr), bh = Math.round(ch * dpr);
    if (canvas.width !== bw || canvas.height !== bh) { canvas.width = bw; canvas.height = bh; }
    const div = small ? 3 : 2;
    resizeTarget(Math.max(1, Math.round(bw / div)), Math.max(1, Math.round(bh / div)));

    const present = ptr.inside && !touch ? 1 : 0;
    if (present && on < 0.02) { mx = ptr.x; my = ptr.y; }
    on += (present - on) * (1 - Math.exp(-dt * 5));
    const k = 1 - Math.exp(-dt * 16);
    const nx = mx + (ptr.x - mx) * k, ny = my + (ptr.y - my) * k;
    if (dt > 0) { const kv = 1 - Math.exp(-dt * 8); vx += ((nx - mx) / dt - vx) * kv; vy += ((ny - my) / dt - vy) * kv; }
    mx = nx; my = ny;
    const vLen = Math.hypot(vx, vy) / ch, vCap = vLen > 3 ? 3 / vLen : 1;
    // the whole field drifts toward the cursor (or wanders on its own on touch)
    const tx = present ? ((mx - cw / 2) / ch) * o.follow : Math.sin(clock * 0.23) * 0.28;
    const ty = present ? ((ch / 2 - my) / ch) * o.follow : Math.cos(clock * 0.17) * 0.16;
    const ks = 1 - Math.exp(-dt * 1.6);
    sx += (tx - sx) * ks; sy += (ty - sy) * ks;
    const ang = o.angle + (scrollY / ch) * 0.2;

    gl.bindFramebuffer(gl.FRAMEBUFFER, fbo);
    gl.viewport(0, 0, tw, th);
    gl.useProgram(field);
    gl.uniform2f(uf.uRes, tw, th);
    gl.uniform1f(uf.uTime, clock);
    gl.uniform3f(uf.uC1, ...c1); gl.uniform3f(uf.uC2, ...c2);
    gl.uniform1f(uf.uSize, o.size); gl.uniform1f(uf.uAngle, ang);
    gl.uniform2f(uf.uMouse, (mx - cw / 2) / ch, (ch / 2 - my) / ch);
    gl.uniform1f(uf.uOn, on * o.hover);
    gl.uniform1f(uf.uReach, o.reach / ch);
    gl.uniform2f(uf.uVel, (vx / ch) * vCap, (-vy / ch) * vCap);
    gl.uniform1f(uf.uLayers, small ? 56 : LAYERS);
    gl.uniform1f(uf.uGain, o.gain);
    gl.uniform2f(uf.uShift, sx, sy);
    gl.drawArrays(gl.TRIANGLES, 0, 3);

    gl.bindFramebuffer(gl.FRAMEBUFFER, null);
    gl.viewport(0, 0, bw, bh);
    gl.useProgram(finish);
    gl.activeTexture(gl.TEXTURE0);
    gl.bindTexture(gl.TEXTURE_2D, tex);
    gl.uniform1i(un.uField, 0);
    gl.uniform2f(un.uRes, bw, bh);
    gl.uniform1f(un.uTime, clock);
    gl.uniform3f(un.uBg, ...bg);
    gl.drawArrays(gl.TRIANGLES, 0, 3);
  };

  const api = {
    play() { if (running || still) return; running = true; last = -1; raf = requestAnimationFrame(frame); },
    pause() { running = false; if (raf) cancelAnimationFrame(raf); raf = 0; },
  };
  frame(performance.now());
  api.play();
  document.addEventListener('visibilitychange', () => (document.hidden ? api.pause() : api.play()));
  return api;
}
