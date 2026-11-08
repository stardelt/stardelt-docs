import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

function readLogo() {
  const svg = readFileSync(resolve(process.cwd(), 'static/img/logo.svg'), 'utf8');
  const points = [...svg.matchAll(/points="([^"]+)"/g)].map((m) => m[1]);
  const stops = [...svg.matchAll(/stop-color="([^"]+)"/g)].map((m) => m[1]);
  if (points.length < 2 || stops.length < 2) {
    throw new Error('could not read polygons/gradient from static/img/logo.svg');
  }
  return {
    deltaPoints: points[0],
    starPoints: points[1],
    gradientStart: stops[0],
    gradientEnd: stops[1],
  };
}

/** The homepage hero sky: glow, delta outline and star field, without the root svg. */
function readHeroSky() {
  const svg = readFileSync(resolve(process.cwd(), 'static/img/hero-sky.svg'), 'utf8');
  return svg
    .replace(/^[\s\S]*?<svg[^>]*>/, '')
    .replace(/<\/svg>\s*$/, '')
    .replace(/id="glow"/g, 'id="sky-glow"')
    .replace(/url\(#glow\)/g, 'url(#sky-glow)');
}

export function mulberry32(seed) {
  let t = seed >>> 0;
  return function rand() {
    t += 0x6d2b79f5;
    let r = Math.imul(t ^ (t >>> 15), 1 | t);
    r ^= r + Math.imul(r ^ (r >>> 7), 61 | r);
    return ((r ^ (r >>> 14)) >>> 0) / 4294967296;
  };
}

function logoDefs(logo, prefix) {
  return `<defs>
    <linearGradient id="${prefix}-grad" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0%" stop-color="${logo.gradientStart}"/>
      <stop offset="100%" stop-color="${logo.gradientEnd}"/>
    </linearGradient>
  </defs>`;
}

function logoMark(logo, cx, cy, size, prefix) {
  // Original viewBox 0 0 200 200; scale so the 200-unit box becomes `size`.
  const s = size / 200;
  const tx = cx - size / 2;
  const ty = cy - size / 2;
  return `<g transform="translate(${tx.toFixed(3)} ${ty.toFixed(3)}) scale(${s.toFixed(6)})">
  <polygon points="${logo.deltaPoints}" fill="none" stroke="url(#${prefix}-grad)" stroke-width="11" stroke-linejoin="round" stroke-linecap="round"/>
  <polygon points="${logo.starPoints}" fill="url(#${prefix}-grad)"/>
</g>`;
}

function wrap(w, h, defs, body) {
  return `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${w} ${h}" width="${w}" height="${h}">
${defs}
${body}
</svg>`;
}

function graphite(w, h) {
  const logo = readLogo();
  const prefix = 'gr';
  const markH = 0.16 * h;
  const textSize = 0.035 * h;
  const gap = 0.03 * h;
  // Center the mark+text block vertically.
  const blockH = markH + gap + textSize;
  const blockTop = (h - blockH) / 2;
  const markCy = blockTop + markH / 2;
  const textY = blockTop + markH + gap + textSize * 0.8;
  const defs = `${logoDefs(logo, prefix)}
  <radialGradient id="${prefix}-glow" cx="50%" cy="50%" r="50%">
    <stop offset="0%" stop-color="#4f5ff0" stop-opacity="0.22"/>
    <stop offset="100%" stop-color="#4f5ff0" stop-opacity="0"/>
  </radialGradient>`;
  const body = `<rect width="${w}" height="${h}" fill="#18191b"/>
<circle cx="${(w / 2).toFixed(1)}" cy="${markCy.toFixed(1)}" r="${(0.45 * h).toFixed(1)}" fill="url(#${prefix}-glow)"/>
${logoMark(logo, w / 2, markCy, markH, prefix)}
<text x="${(w / 2).toFixed(1)}" y="${textY.toFixed(1)}" text-anchor="middle" font-family="Inter, -apple-system, 'Segoe UI', Helvetica, Arial, sans-serif" font-size="${textSize.toFixed(2)}" font-weight="700" fill="#e8eaed" letter-spacing="-0.02em">stardelt</text>`;
  return wrap(w, h, defs, body);
}

function parsePoints(value) {
  return value
    .trim()
    .split(/\s+/)
    .map((pair) => pair.split(',').map(Number));
}

function constellation(w, h) {
  const logo = readLogo();
  const rand = mulberry32(20261108);
  let stars = '';
  for (let i = 0; i < 220; i++) {
    const x = rand() * w;
    const y = rand() * h;
    const size = (0.004 + rand() * (0.014 - 0.004)) * h;
    const opacity = 0.15 + rand() * (0.7 - 0.15);
    const s = size / 200;
    stars += `<g transform="translate(${x.toFixed(2)} ${y.toFixed(2)}) scale(${s.toFixed(6)}) translate(-100 -128)"><polygon points="${logo.starPoints}" fill="#b8c0ff" opacity="${opacity.toFixed(3)}"/></g>\n`;
  }

  // The stardelt mark — the delta and the four-pointed star — drawn as stars in the right third.
  const delta = parsePoints(logo.deltaPoints);
  const star = parsePoints(logo.starPoints);
  const cx = w * 0.76;
  const cy = h * 0.4;
  const size = h * 0.34;
  const s = size / 200;
  const map = ([x, y]) => [cx + (x - 100) * s, cy + (y - 100) * s];
  const d = delta.map(map);
  const t = star.map(map);
  const center = map([100, 128]);
  const line = (a, b, opacity = 0.45) => `<line x1="${a[0].toFixed(1)}" y1="${a[1].toFixed(1)}" x2="${b[0].toFixed(1)}" y2="${b[1].toFixed(1)}" stroke="#7a8aff" stroke-width="1.2" opacity="${opacity}"/>`;
  let lines = '';
  for (let i = 0; i < 3; i++) lines += line(d[i], d[(i + 1) % 3]);
  for (let i = 0; i < 8; i++) lines += line(t[i], t[(i + 1) % 8]);
  for (const i of [0, 2, 4, 6]) lines += line(center, t[i], 0.28);
  let dots = '';
  for (const p of [...d, ...t]) {
    dots += `<circle cx="${p[0].toFixed(1)}" cy="${p[1].toFixed(1)}" r="${(h * 0.0045).toFixed(2)}" fill="#b8c0ff" opacity="0.95"/>`;
  }
  dots += `<circle cx="${center[0].toFixed(1)}" cy="${center[1].toFixed(1)}" r="${(h * 0.06).toFixed(1)}" fill="url(#co-glow)"/><circle cx="${center[0].toFixed(1)}" cy="${center[1].toFixed(1)}" r="${(h * 0.008).toFixed(2)}" fill="#ffffff"/>`;

  const defs = `<defs>
  <linearGradient id="co-bg" x1="0" y1="0" x2="1" y2="1">
    <stop offset="0%" stop-color="#18191b"/>
    <stop offset="100%" stop-color="#14152a"/>
  </linearGradient>
  <radialGradient id="co-glow">
    <stop offset="0%" stop-color="#7a8aff" stop-opacity="0.5"/>
    <stop offset="100%" stop-color="#7a8aff" stop-opacity="0"/>
  </radialGradient>
</defs>`;
  const body = `<rect width="${w}" height="${h}" fill="url(#co-bg)"/>
${stars}
${lines}
${dots}`;
  return wrap(w, h, defs, body);
}

function deltaGrid(w, h) {
  const logo = readLogo();
  const prefix = 'dg';
  // Small delta outlines: triangle polygon only, stroke 1.5px, #3e4147, side 0.03*H, spacing 0.06*H.
  const side = 0.03 * h;
  const spacing = 0.06 * h;
  const triH = (side * Math.sqrt(3)) / 2;
  let pattern = '';
  const cols = Math.ceil(w / spacing) + 2;
  const rows = Math.ceil(h / (triH * 0.9)) + 2;
  for (let r = 0; r < rows; r++) {
    const y = r * triH * 0.9;
    const offset = r % 2 === 1 ? spacing / 2 : 0;
    for (let c = -1; c < cols; c++) {
      const x = c * spacing + offset;
      // Triangle pointing up, centered at (x,y)
      const p1 = `${x.toFixed(2)},${(y - triH * 2 / 3).toFixed(2)}`;
      const p2 = `${(x + side / 2).toFixed(2)},${(y + triH / 3).toFixed(2)}`;
      const p3 = `${(x - side / 2).toFixed(2)},${(y + triH / 3).toFixed(2)}`;
      pattern += `<polygon points="${p1} ${p2} ${p3}" fill="none" stroke="#3e4147" stroke-width="1.5"/>`;
    }
  }
  const markH = 0.22 * h;
  const blur = 0.08 * h;
  const defs = `${logoDefs(logo, prefix)}
  <radialGradient id="${prefix}-mask-grad" cx="50%" cy="50%" r="50%">
    <stop offset="0%" stop-color="white" stop-opacity="0"/>
    <stop offset="60%" stop-color="white" stop-opacity="0.15"/>
    <stop offset="100%" stop-color="white" stop-opacity="1"/>
  </radialGradient>
  <mask id="${prefix}-mask">
    <rect width="${w}" height="${h}" fill="url(#${prefix}-mask-grad)"/>
  </mask>
  <filter id="${prefix}-glow" x="-50%" y="-50%" width="200%" height="200%">
    <feGaussianBlur in="SourceGraphic" stdDeviation="${blur.toFixed(1)}"/>
  </filter>`;
  // Glow behind logo: render a blurred copy of the mark's gradient shape.
  const glowMark = logoMark(logo, w / 2, h / 2, markH, prefix).replace('<g ', `<g filter="url(#${prefix}-glow)" opacity="0.35" `);
  // Include the raw delta points in defs/pattern context? L already has deltaPoints; verify checks any svg.
  const body = `<rect width="${w}" height="${h}" fill="#18191b"/>
<g mask="url(#${prefix}-mask)">${pattern}</g>
${glowMark}
${logoMark(logo, w / 2, h / 2, markH, prefix)}`;
  return wrap(w, h, defs, body);
}

function silver(w, h) {
  const logo = readLogo();
  const prefix = 'si';
  const markH = 0.16 * h;
  const textSize = 0.035 * h;
  const gap = 0.03 * h;
  const blockH = markH + gap + textSize;
  const blockTop = (h - blockH) / 2;
  const markCy = blockTop + markH / 2;
  const textY = blockTop + markH + gap + textSize * 0.8;
  const outlineSize = 0.9 * h;
  const outlineS = outlineSize / 200;
  const otx = w / 2 - outlineSize / 2;
  const oty = h / 2 - outlineSize / 2;
  const defs = `${logoDefs(logo, prefix)}
  <radialGradient id="${prefix}-hl" cx="20%" cy="20%" r="60%">
    <stop offset="0%" stop-color="#ffffff" stop-opacity="0.7"/>
    <stop offset="100%" stop-color="#ffffff" stop-opacity="0"/>
  </radialGradient>`;
  // Thin delta outline behind logo at 0.9*H, opacity 0.6, #c9ccd3, 2px
  const deltaOutline = `<g transform="translate(${otx.toFixed(3)} ${oty.toFixed(3)}) scale(${outlineS.toFixed(6)})" opacity="0.6">
  <polygon points="${logo.deltaPoints}" fill="none" stroke="#c9ccd3" stroke-width="2"/>
</g>`;
  const body = `<rect width="${w}" height="${h}" fill="#eceef1"/>
<rect width="${w}" height="${h}" fill="url(#${prefix}-hl)"/>
${deltaOutline}
${logoMark(logo, w / 2, markCy, markH, prefix)}
<text x="${(w / 2).toFixed(1)}" y="${textY.toFixed(1)}" text-anchor="middle" font-family="Inter, -apple-system, 'Segoe UI', Helvetica, Arial, sans-serif" font-size="${textSize.toFixed(2)}" font-weight="700" fill="#1f2124" letter-spacing="-0.02em">stardelt</text>`;
  return wrap(w, h, defs, body);
}

function sky(w, h) {
  const logo = readLogo();
  const prefix = 'sk';
  const hero = readHeroSky();
  const markH = 0.16 * h;
  const textSize = 0.035 * h;
  const gap = 0.03 * h;
  const blockH = markH + gap + textSize;
  const blockTop = (h - blockH) / 2;
  const markCy = blockTop + markH / 2;
  const textY = blockTop + markH + gap + textSize * 0.8;
  const defs = logoDefs(logo, prefix);
  const body = `<rect width="${w}" height="${h}" fill="#18191b"/>
<svg x="0" y="0" width="${w}" height="${h}" viewBox="0 0 1600 900" preserveAspectRatio="xMidYMid slice">${hero}</svg>
${logoMark(logo, w / 2, markCy, markH, prefix)}
<text x="${(w / 2).toFixed(1)}" y="${textY.toFixed(1)}" text-anchor="middle" font-family="Inter, -apple-system, 'Segoe UI', Helvetica, Arial, sans-serif" font-size="${textSize.toFixed(2)}" font-weight="700" fill="#e8eaed" letter-spacing="-0.02em">stardelt</text>`;
  return wrap(w, h, defs, body);
}

export const designs = { graphite, constellation, 'delta-grid': deltaGrid, silver, sky };
