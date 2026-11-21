// Cover renderer for Neon Coast Cover Studio.
// renderCover(canvas, state, W, H) paints one finished cover: the background
// grade, the layout's panels (each a photo, cropped and positioned), the
// title block, the badge ribbon and the heat meter. Everything is drawn on a
// 2D canvas, so the editor preview and the exported PNG are the same picture.

import { layoutGeometry } from './layouts.js';

export const GRADES = {
  sunset: {
    name: 'Sunset',
    bgTop: '#3b115f', bgBottom: '#ff7a3d',
    tint: '#ff5e8a', tintAlpha: 0.10,
    titleFrom: '#fff3b0', titleTo: '#ff9a3d',
    subtitle: '#8ef1ff', badgeBg: '#ff2e88', heat: '#ffd94d',
  },
  neon: {
    name: 'Neon Night',
    bgTop: '#070a24', bgBottom: '#131a4d',
    tint: '#22d3ee', tintAlpha: 0.08,
    titleFrom: '#a5f3fc', titleTo: '#ff2e88',
    subtitle: '#ff7ad9', badgeBg: '#0ea5e9', heat: '#22d3ee',
  },
  dusk: {
    name: 'Palm Dusk',
    bgTop: '#0b3b4a', bgBottom: '#ff7ab8',
    tint: '#2dd4bf', tintAlpha: 0.08,
    titleFrom: '#fef9c3', titleTo: '#f472b6',
    subtitle: '#a7f3d0', badgeBg: '#0d9488', heat: '#fde68a',
  },
  gold: {
    name: 'Golden Hour',
    bgTop: '#4a1d05', bgBottom: '#f59e0b',
    tint: '#fbbf24', tintAlpha: 0.10,
    titleFrom: '#fffbeb', titleTo: '#f59e0b',
    subtitle: '#fde68a', badgeBg: '#b45309', heat: '#fef3c7',
  },
  noir: {
    name: 'Noir',
    bgTop: '#0f0a1e', bgBottom: '#312e81',
    tint: '#8b5cf6', tintAlpha: 0.10,
    titleFrom: '#e9d5ff', titleTo: '#c084fc',
    subtitle: '#f0abfc', badgeBg: '#6d28d9', heat: '#ddd6fe',
  },
};

export const GRADE_LIST = Object.entries(GRADES).map(([id, g]) => ({ id, name: g.name }));

// Deterministic pseudo-random dots for the print grain, seeded per cover.
function mulberry32(seed) {
  let a = seed >>> 0;
  return function () {
    a |= 0; a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function roundRectPath(ctx, x, y, w, h, r) {
  const rr = Math.max(0, Math.min(r, w / 2, h / 2));
  ctx.beginPath();
  ctx.moveTo(x + rr, y);
  ctx.arcTo(x + w, y, x + w, y + h, rr);
  ctx.arcTo(x + w, y + h, x, y + h, rr);
  ctx.arcTo(x, y + h, x, y, rr);
  ctx.arcTo(x, y, x + w, y, rr);
  ctx.closePath();
}

// Draw one photo into a rectangle, cover-fit, with zoom and pan offsets.
// ox/oy are fractions of the rect (-0.5 .. 0.5).
export function drawPhotoCover(ctx, img, rect, zoom, ox, oy) {
  if (!img || !img.naturalWidth) return;
  const iw = img.naturalWidth;
  const ih = img.naturalHeight;
  const scale = Math.max(rect.w / iw, rect.h / ih) * (zoom || 1);
  const dw = iw * scale;
  const dh = ih * scale;
  const dx = rect.x + (rect.w - dw) / 2 + (ox || 0) * rect.w;
  const dy = rect.y + (rect.h - dh) / 2 + (oy || 0) * rect.h;
  ctx.drawImage(img, dx, dy, dw, dh);
}

function gradeTint(ctx, rect, grade) {
  ctx.save();
  ctx.globalCompositeOperation = 'overlay';
  ctx.globalAlpha = grade.tintAlpha + 0.06;
  ctx.fillStyle = grade.tint;
  ctx.fillRect(rect.x, rect.y, rect.w, rect.h);
  ctx.restore();
  const g = ctx.createLinearGradient(0, rect.y, 0, rect.y + rect.h);
  g.addColorStop(0, 'rgba(0,0,0,0)');
  g.addColorStop(1, 'rgba(20,4,32,0.28)');
  ctx.fillStyle = g;
  ctx.fillRect(rect.x, rect.y, rect.w, rect.h);
}

// One panel: photo, grade tint, white frame (or polaroid print).
function drawPanel(ctx, img, rect, slot, grade, W) {
  const border = Math.max(3, Math.round(W * 0.0035));
  ctx.save();
  ctx.translate(rect.x + rect.w / 2, rect.y + rect.h / 2);
  ctx.rotate(rect.rot || 0);
  ctx.translate(-rect.w / 2, -rect.h / 2);
  ctx.shadowColor = 'rgba(0,0,0,0.45)';
  ctx.shadowBlur = Math.round(W * 0.008);
  ctx.shadowOffsetY = Math.round(W * 0.004);

  if (rect.frame === 'polaroid') {
    const side = Math.round(rect.w * 0.045);
    const bottom = Math.round(rect.h * 0.16);
    roundRectPath(ctx, -side, -side, rect.w + side * 2, rect.h + side + bottom, Math.round(W * 0.004));
    ctx.fillStyle = '#fdf6ec';
    ctx.fill();
    ctx.shadowColor = 'transparent';
    ctx.shadowBlur = 0;
    ctx.shadowOffsetY = 0;
    const photo = { x: 0, y: 0, w: rect.w, h: rect.h };
    ctx.save();
    roundRectPath(ctx, photo.x, photo.y, photo.w, photo.h, 2);
    ctx.clip();
    drawPhotoCover(ctx, img, photo, slot.zoom, slot.ox, slot.oy);
    gradeTint(ctx, photo, grade);
    ctx.restore();
  } else if (rect.frame === 'bleed') {
    drawPhotoCover(ctx, img, { x: 0, y: 0, w: rect.w, h: rect.h }, slot.zoom, slot.ox, slot.oy);
    gradeTint(ctx, { x: 0, y: 0, w: rect.w, h: rect.h }, grade);
    ctx.shadowColor = 'transparent';
    ctx.shadowBlur = 0;
    ctx.shadowOffsetY = 0;
  } else {
    roundRectPath(ctx, 0, 0, rect.w, rect.h, Math.round(W * 0.006));
    ctx.fillStyle = '#fff';
    ctx.fill();
    ctx.shadowColor = 'transparent';
    ctx.shadowBlur = 0;
    ctx.shadowOffsetY = 0;
    const photo = { x: border, y: border, w: rect.w - border * 2, h: rect.h - border * 2 };
    ctx.save();
    roundRectPath(ctx, photo.x, photo.y, photo.w, photo.h, Math.round(W * 0.004));
    ctx.clip();
    drawPhotoCover(ctx, img, photo, slot.zoom, slot.ox, slot.oy);
    gradeTint(ctx, photo, grade);
    ctx.restore();
  }
  ctx.restore();
}

function fitFont(ctx, text, family, maxWidth, startSize, weight = '') {
  let size = startSize;
  while (size > 10) {
    ctx.font = `${weight} ${size}px ${family}`;
    if (ctx.measureText(text).width <= maxWidth) break;
    size = Math.floor(size * 0.92);
  }
  return size;
}

function drawTitleBlock(ctx, zone, state, grade, W, H) {
  const title = (state.title || 'NEON COAST').toUpperCase();
  const subtitle = state.subtitle || '';
  if (zone.onPhoto) {
    const bandH = Math.round(H * 0.30);
    const g = ctx.createLinearGradient(0, H - bandH, 0, H);
    g.addColorStop(0, 'rgba(10,3,20,0)');
    g.addColorStop(1, 'rgba(10,3,20,0.72)');
    ctx.fillStyle = g;
    ctx.fillRect(0, H - bandH, W, bandH);
  }
  const maxW = zone.w;
  const titleSize = fitFont(ctx, title, 'Anton, sans-serif', maxW, Math.round(H * 0.115));
  const subSize = Math.round(titleSize * 0.34);
  const titleY = zone.y + titleSize * 0.42;
  const subY = zone.y - titleSize * 0.52;

  ctx.textAlign = zone.align === 'left' ? 'left' : 'center';
  ctx.textBaseline = 'middle';

  if (subtitle) {
    ctx.save();
    ctx.font = `${subSize}px Pacifico, cursive`;
    ctx.fillStyle = grade.subtitle;
    ctx.shadowColor = grade.subtitle;
    ctx.shadowBlur = Math.round(W * 0.012);
    ctx.fillText(subtitle, zone.x, subY);
    ctx.restore();
  }

  const grad = ctx.createLinearGradient(0, titleY - titleSize * 0.55, 0, titleY + titleSize * 0.55);
  grad.addColorStop(0, grade.titleFrom);
  grad.addColorStop(1, grade.titleTo);
  ctx.save();
  try { ctx.letterSpacing = '2px'; } catch (e) { /* older canvas: no tracking */ }
  ctx.font = `${titleSize}px Anton, sans-serif`;
  ctx.lineJoin = 'round';
  ctx.strokeStyle = 'rgba(255,255,255,0.92)';
  ctx.lineWidth = Math.max(2, Math.round(titleSize * 0.045));
  ctx.shadowColor = 'rgba(0,0,0,0.55)';
  ctx.shadowBlur = Math.round(W * 0.01);
  ctx.shadowOffsetY = Math.round(W * 0.004);
  ctx.strokeText(title, zone.x, titleY);
  ctx.fillStyle = grad;
  ctx.fillText(title, zone.x, titleY);
  ctx.restore();
}

function drawBadge(ctx, badge, text, W) {
  if (!text) return;
  // badge.x is the ribbon's RIGHT edge: the whole ribbon stays on the cover.
  ctx.save();
  ctx.font = `${Math.round(W * 0.021)}px Anton, sans-serif`;
  const tw = ctx.measureText(text).width;
  const pad = Math.round(W * 0.016);
  const bw = tw + pad * 2;
  const bh = Math.round(W * 0.038);
  ctx.translate(badge.x - bw / 2, badge.y);
  ctx.rotate(badge.rot || 0);
  ctx.fillStyle = '#ff2e88';
  ctx.shadowColor = 'rgba(0,0,0,0.5)';
  ctx.shadowBlur = Math.round(W * 0.006);
  ctx.shadowOffsetY = Math.round(W * 0.003);
  roundRectPath(ctx, -bw / 2, -bh / 2, bw, bh, 4);
  ctx.fill();
  ctx.shadowColor = 'transparent';
  ctx.fillStyle = '#fff';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(text, 0, 1);
  ctx.restore();
}

function drawHeat(ctx, spot, heat, grade, W) {
  const size = Math.round(W * 0.02);
  ctx.save();
  ctx.font = `${Math.round(size * 0.9)}px Anton, sans-serif`;
  ctx.textAlign = spot.align === 'left' ? 'left' : 'right';
  ctx.textBaseline = 'middle';
  ctx.fillStyle = 'rgba(255,255,255,0.9)';
  const label = 'HEAT';
  const labelW = ctx.measureText(label).width;
  const gap = size * 0.5;
  const starGap = size * 1.25;
  const totalW = labelW + gap + starGap * 5;
  let x0 = spot.align === 'left' ? spot.x : spot.x - totalW;
  const y = spot.y;
  ctx.fillText(label, x0, y);
  ctx.font = `${size}px sans-serif`;
  for (let i = 0; i < 5; i++) {
    const sx = x0 + labelW + gap + starGap * i + size * 0.5;
    ctx.fillStyle = i < heat ? grade.heat : 'rgba(255,255,255,0.32)';
    ctx.fillText('★', sx, y);
  }
  ctx.restore();
}

function drawGrain(ctx, W, H, seedText) {
  let seed = 2166136261;
  for (let i = 0; i < seedText.length; i++) {
    seed ^= seedText.charCodeAt(i);
    seed = Math.imul(seed, 16777619);
  }
  const rnd = mulberry32(seed);
  ctx.save();
  for (let i = 0; i < 1400; i++) {
    const a = 0.02 + rnd() * 0.05;
    ctx.fillStyle = rnd() > 0.5 ? `rgba(255,255,255,${a})` : `rgba(0,0,0,${a})`;
    ctx.fillRect(rnd() * W, rnd() * H, 1 + rnd() * 2, 1 + rnd() * 2);
  }
  ctx.restore();
}

function drawVignette(ctx, W, H) {
  const g = ctx.createRadialGradient(W / 2, H / 2, Math.min(W, H) * 0.42, W / 2, H / 2, Math.max(W, H) * 0.75);
  g.addColorStop(0, 'rgba(0,0,0,0)');
  g.addColorStop(1, 'rgba(0,0,0,0.22)');
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, W, H);
}

function photoById(state, id) {
  return (state.photos || []).find((p) => p.id === id) || null;
}

// Paint one finished cover onto a canvas at W x H. The same function draws
// the editor preview and the exported PNG, so what you see is what you get.
export function renderCover(canvas, state, W, H) {
  canvas.width = W;
  canvas.height = H;
  const ctx = canvas.getContext('2d');
  const grade = GRADES[state.grade] || GRADES.sunset;
  const geo = layoutGeometry(state.layout || 'palm-grid', W, H);

  const bg = ctx.createLinearGradient(0, 0, 0, H);
  bg.addColorStop(0, grade.bgTop);
  bg.addColorStop(1, grade.bgBottom);
  ctx.fillStyle = bg;
  ctx.fillRect(0, 0, W, H);

  const slots = state.slots || [];
  geo.panels.forEach((rect, i) => {
    const slot = slots[i] || { photo: null, zoom: 1, ox: 0, oy: 0 };
    const photo = photoById(state, slot.photo);
    const img = photo ? photo.img : null;
    drawPanel(ctx, img, rect, slot, grade, W);
  });

  drawGrain(ctx, W, H, `${state.layout}|${state.title}|${W}x${H}`);
  drawVignette(ctx, W, H);
  drawTitleBlock(ctx, geo.title, state, grade, W, H);
  drawBadge(ctx, geo.badge, state.badge || '', W);
  drawHeat(ctx, geo.heat, state.heat ?? 4, grade, W);
  return canvas;
}
