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

function constellation(w, h) {
  const logo = readLogo();
  const prefix = 'co';
  const rand = mulberry32(20261108);
  const stars = [];
  for (let i = 0; i < 220; i++) {
    const x = rand() * w;
    const y = rand() * h;
    const size = (0.004 + rand() * (0.014 - 0.004)) * h;
    const opacity = 0.15 + rand() * (0.7 - 0.15);
    const s = size / 200;
    stars.push(`<g transform="translate(${x.toFixed(2)} ${y.toFixed(2)}) scale(${s.toFixed(6)}) translate(-100 -128)"><polygon points="${logo.starPoints}" fill="#b8c0ff" opacity="${opacity.toFixed(3)}"/></g>`);
  }
  // 6 stars connected by 1px lines forming a delta around the right third.
  const cx = w * 0.78;
  const cy = h * 0.38;
  const r = h * 0.14;
  const pts = [];
  for (let i = 0; i < 6; i++) {
    const a = -Math.PI / 2 + (i * Math.PI) / 3;
    pts.push([cx + r * Math.cos(a), cy + r * Math.sin(a)]);
  }
  const order = [0, 2, 4, 0, 1, 3, 5, 1];
  let lines = '';
  for (let i = 0; i < order.length - 1; i++) {
    const a = pts[order[i]];
    const b = pts[order[i + 1]];
    lines += `<line x1="${a[0].toFixed(1)}" y1="${a[1].toFixed(1)}" x2="${b[0].toFixed(1)}" y2="${b[1].toFixed(1)}" stroke="#7a8aff" stroke-width="1" opacity="0.35"/>`;
  }
  for (const p of pts) {
    lines += `<circle cx="${p[0].toFixed(1)}" cy="${p[1].toFixed(1)}" r="${(h * 0.004).toFixed(2)}" fill="#b8c0ff" opacity="0.8"/>`;
  }
  const markH = 0.07 * h;
  const markCx = w - 0.05 * h - markH / 2;
  const markCy = h - 0.05 * h - markH / 2;
  const defs = `${logoDefs(logo, prefix)}
  <linearGradient id="${prefix}-bg" x1="0" y1="0" x2="1" y2="1">
    <stop offset="0%" stop-color="#18191b"/>
    <stop offset="100%" stop-color="#14152a"/>
  </linearGradient>`;
  const body = `<rect width="${w}" height="${h}" fill="url(#${prefix}-bg)"/>
${stars.join('\n')}
${lines}
${logoMark(logo, markCx, markCy, markH, prefix)}`;
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

export const designs = { graphite, constellation, 'delta-grid': deltaGrid, silver };
