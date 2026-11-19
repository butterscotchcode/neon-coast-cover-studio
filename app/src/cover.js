// The cover engine: draws a whole GTA-style poster cover onto any 2D canvas
// at any size, from one state object. The same function paints the live
// preview in the editor and the exported PNGs, so what you see is what you
// get. No network, no libraries: plain canvas, two OFL fonts, grain made
// from a noise tile drawn once.
import { findGrade, findLayout } from './layouts.js';

let fontsReady = false;

/** Loads the two display fonts and waits until the browser can draw them. */
export async function ensureCoverFonts() {
  if (fontsReady) return;
  try {
    await Promise.all([
      document.fonts.load('100px Anton'),
      document.fonts.load('40px Pacifico'),
      document.fonts.ready,
    ]);
  } catch {
    // A missing font still leaves a usable bold fallback; never block export.
  }
  fontsReady = true;
}

let grainTile = null;

/** A small tile of random grey noise, tiled over the cover for film grain. */
function getGrainTile() {
  if (grainTile) return grainTile;
  const tile = document.createElement('canvas');
  tile.width = 160;
  tile.height = 160;
  const tctx = tile.getContext('2d');
  const data = tctx.createImageData(160, 160);
  for (let i = 0; i < data.data.length; i += 4) {
    const v = 110 + Math.floor(Math.random() * 90);
    data.data[i] = v;
    data.data[i + 1] = v;
    data.data[i + 2] = v;
    data.data[i + 3] = 255;
  }
  tctx.putImageData(data, 0, 0);
  grainTile = tile;
  return tile;
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

/** Draws one photo into one panel rect, cover-fit, with zoom and pan. */
function paintPanelPhoto(ctx, panel, photo, grade, px, py, pw, ph) {
  const { zoom, ox, oy } = panel;
  ctx.save();
  ctx.beginPath();
  ctx.rect(px, py, pw, ph);
  ctx.clip();
  if (photo) {
    const base = Math.max(pw / photo.naturalWidth, ph / photo.naturalHeight);
    const scale = base * zoom;
    const dw = photo.naturalWidth * scale;
    const dh = photo.naturalHeight * scale;
    const dx = px + (pw - dw) / 2 + ox * pw;
    const dy = py + (ph - dh) / 2 + oy * ph;
    if (grade.photoFilter) ctx.filter = grade.photoFilter;
    ctx.drawImage(photo, dx, dy, dw, dh);
    ctx.filter = 'none';
    // Colour grade wash: warm top, hot bottom, blended over the photo.
    const wash = ctx.createLinearGradient(0, py, 0, py + ph);
    wash.addColorStop(0, grade.washTop);
    wash.addColorStop(1, grade.washBottom);
    ctx.globalCompositeOperation = 'overlay';
    ctx.fillStyle = wash;
    ctx.fillRect(px, py, pw, ph);
    ctx.globalCompositeOperation = 'source-over';
  } else {
    const empty = ctx.createLinearGradient(px, py, px + pw, py + ph);
    empty.addColorStop(0, '#2a1638');
    empty.addColorStop(1, '#120a1e');
    ctx.fillStyle = empty;
    ctx.fillRect(px, py, pw, ph);
    ctx.strokeStyle = 'rgba(255,255,255,0.35)';
    ctx.setLineDash([10, 8]);
    ctx.lineWidth = Math.max(2, pw * 0.008);
    ctx.strokeRect(px + 6, py + 6, pw - 12, ph - 12);
    ctx.setLineDash([]);
    ctx.fillStyle = 'rgba(255,255,255,0.75)';
    ctx.font = `bold ${Math.max(14, pw * 0.07)}px Anton, sans-serif`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('ADD A PHOTO', px + pw / 2, py + ph / 2);
  }
  ctx.restore();
}

/** The inked poster frame around a panel: shadow, white inner line, dark edge. */
function paintInkFrame(ctx, px, py, pw, ph, w) {
  const r = Math.max(4, w * 0.007);
  ctx.save();
  ctx.shadowColor = 'rgba(0,0,0,0.45)';
  ctx.shadowBlur = w * 0.012;
  ctx.shadowOffsetY = w * 0.004;
  roundRectPath(ctx, px, py, pw, ph, r);
  ctx.fillStyle = 'rgba(0,0,0,0.01)';
  ctx.fill();
  ctx.restore();
  roundRectPath(ctx, px, py, pw, ph, r);
  ctx.strokeStyle = 'rgba(255,255,255,0.92)';
  ctx.lineWidth = Math.max(2, w * 0.004);
  ctx.stroke();
  roundRectPath(ctx, px + 3, py + 3, pw - 6, ph - 6, Math.max(2, r - 3));
  ctx.strokeStyle = 'rgba(10,0,20,0.5)';
  ctx.lineWidth = Math.max(1, w * 0.0015);
  ctx.stroke();
}

/** A polaroid-style snapshot frame: white border, fat foot, soft shadow. */
function paintPolaroidFrame(ctx, panel, photo, grade, px, py, pw, ph, w) {
  const side = pw * 0.045;
  const foot = ph * 0.16;
  ctx.save();
  ctx.shadowColor = 'rgba(0,0,0,0.55)';
  ctx.shadowBlur = w * 0.02;
  ctx.shadowOffsetY = w * 0.008;
  ctx.fillStyle = '#f7f2e8';
  ctx.fillRect(px - side, py - side, pw + side * 2, ph + side + foot);
  ctx.restore();
  paintPanelPhoto(ctx, panel, photo, grade, px, py, pw, ph);
  ctx.strokeStyle = 'rgba(20,10,30,0.25)';
  ctx.lineWidth = Math.max(1, w * 0.0012);
  ctx.strokeRect(px, py, pw, ph);
}

/** Greedy word wrap for the big title, at most two lines. */
function wrapTitleLines(ctx, text, maxW) {
  const words = text.split(/\s+/).filter(Boolean);
  const lines = [];
  let line = '';
  for (const word of words) {
    const trial = line ? `${line} ${word}` : word;
    if (ctx.measureText(trial).width <= maxW || !line) {
      line = trial;
    } else {
      lines.push(line);
      line = word;
    }
  }
  if (line) lines.push(line);
  return lines;
}

function fitTitle(ctx, text, maxW, startSize) {
  let size = startSize;
  let lines = [];
  while (size > 12) {
    ctx.font = `${size}px Anton, sans-serif`;
    ctx.letterSpacing = `${Math.max(0, Math.round(size * 0.015))}px`;
    lines = wrapTitleLines(ctx, text, maxW);
    const widest = Math.max(...lines.map((l) => ctx.measureText(l).width));
    if (lines.length <= 2 && widest <= maxW) break;
    size -= 2;
  }
  return { lines, size };
}

/** The big lettering block: neon script subtitle over a gradient display title. */
function paintTitleBlock(ctx, W, H, state, layout, grade) {
  const t = layout.title;
  const bx = t.x * W;
  const by = t.y * H;
  const bw = t.w * W;
  const bh = t.h * H;
  const align = t.align;
  ctx.textAlign = align === 'left' ? 'left' : 'center';
  ctx.textBaseline = 'alphabetic';
  const cx = align === 'left' ? bx : bx + bw / 2;

  const subtitle = (state.subtitle || '').trim();
  const titleText = (state.title || '').trim().toUpperCase() || 'NEON COAST';
  const startSize = t.size * H * (state.titleScale || 1);

  // Subtitle in neon script, sitting just above the title.
  let subH = 0;
  if (subtitle) {
    let subSize = Math.min(H * 0.042, bh * 0.2);
    ctx.font = `${subSize}px Pacifico, cursive`;
    while (ctx.measureText(subtitle).width > bw && subSize > 10) {
      subSize -= 1;
      ctx.font = `${subSize}px Pacifico, cursive`;
    }
    ctx.fillStyle = grade.subtitle;
    ctx.shadowColor = grade.subtitle;
    ctx.shadowBlur = subSize * 0.45;
    ctx.fillText(subtitle, cx, by + subSize * 1.05);
    ctx.shadowBlur = 0;
    subH = subSize * 1.25;
  }

  // Title: gradient fill, white outline, hard drop shadow.
  const { lines, size } = fitTitle(ctx, titleText, bw, startSize);
  const grad = ctx.createLinearGradient(0, by + subH, 0, by + subH + size * lines.length);
  grade.title.forEach((stop, i) => grad.addColorStop(i / (grade.title.length - 1), stop));
  const lineH = size * 0.94;
  const firstBase = by + subH + size * 0.95;
  ctx.save();
  ctx.shadowColor = 'rgba(5,0,15,0.65)';
  ctx.shadowBlur = size * 0.08;
  ctx.shadowOffsetY = size * 0.05;
  lines.forEach((line, i) => {
    const y = firstBase + i * lineH;
    ctx.font = `${size}px Anton, sans-serif`;
    ctx.letterSpacing = `${Math.max(0, Math.round(size * 0.015))}px`;
    if (state.lettering === 'neon') {
      ctx.lineWidth = Math.max(2, size * 0.03);
      ctx.strokeStyle = grade.subtitle;
      ctx.strokeText(line, cx, y);
      ctx.fillStyle = '#ffffff';
      ctx.shadowColor = grade.subtitle;
      ctx.shadowBlur = size * 0.45;
      ctx.fillText(line, cx, y);
    } else if (state.lettering === 'solid') {
      ctx.lineWidth = Math.max(2, size * 0.035);
      ctx.strokeStyle = 'rgba(10,0,20,0.7)';
      ctx.strokeText(line, cx, y);
      ctx.fillStyle = '#ffffff';
      ctx.fillText(line, cx, y);
    } else {
      ctx.lineWidth = Math.max(2, size * 0.05);
      ctx.lineJoin = 'round';
      ctx.strokeStyle = '#ffffff';
      ctx.strokeText(line, cx, y);
      ctx.fillStyle = grad;
      ctx.fillText(line, cx, y);
    }
  });
  ctx.restore();
  ctx.letterSpacing = '0px';

  // Heat meter: five stars at the foot of the title band — or, when the
  // title sits at the top (tilted layout), at the foot of the cover instead
  // so it never collides with the lettering. Lit stars first, dim ones after.
  const stars = Math.max(0, Math.min(5, state.stars ?? 4));
  const starSize = Math.max(14, H * 0.028);
  const topTitle = layout.title.y < 0.3;
  // Top-title layouts put the meter at the bottom-left, clear of the frames.
  const sy = topTitle ? H * 0.965 : by + bh - starSize * 0.7;
  ctx.font = `${Math.round(starSize * 0.72)}px Anton, sans-serif`;
  const labelW = ctx.measureText('HEAT ').width;
  ctx.font = `bold ${starSize}px sans-serif`;
  const litW = ctx.measureText('★'.repeat(stars)).width;
  const dimW = ctx.measureText('★'.repeat(5 - stars)).width;
  const totalW = labelW + 6 + litW + dimW;
  const lx = topTitle ? bx + 4 : bx + bw - 4 - totalW;
  ctx.textAlign = 'left';
  ctx.textBaseline = 'middle';
  ctx.font = `${Math.round(starSize * 0.72)}px Anton, sans-serif`;
  ctx.fillStyle = 'rgba(255,255,255,0.85)';
  ctx.fillText('HEAT ', lx, sy);
  ctx.font = `bold ${starSize}px sans-serif`;
  ctx.fillStyle = grade.star;
  ctx.shadowColor = grade.star;
  ctx.shadowBlur = starSize * 0.3;
  ctx.fillText('★'.repeat(stars), lx + labelW + 6, sy);
  ctx.shadowBlur = 0;
  ctx.fillStyle = 'rgba(255,255,255,0.4)';
  ctx.fillText('★'.repeat(5 - stars), lx + labelW + 6 + litW, sy);
}

/** A tilted badge ribbon in the top corner, with the badge words on it. */
function paintBadgeRibbon(ctx, W, H, state, grade) {
  const badge = (state.badge || '').trim().toUpperCase();
  if (!badge) return;
  const h = Math.max(20, H * 0.042);
  ctx.font = `${Math.round(h * 0.52)}px Anton, sans-serif`;
  const textW = ctx.measureText(badge).width;
  const bw = textW + h * 1.6;
  const bx = W - bw - W * 0.02;
  const by = H * 0.018;
  ctx.save();
  ctx.translate(bx + bw / 2, by + h / 2);
  ctx.rotate(-0.09);
  ctx.fillStyle = grade.badge;
  ctx.shadowColor = 'rgba(0,0,0,0.5)';
  ctx.shadowBlur = h * 0.3;
  ctx.shadowOffsetY = h * 0.08;
  ctx.fillRect(-bw / 2, -h / 2, bw, h);
  ctx.shadowBlur = 0;
  ctx.fillStyle = 'rgba(0,0,0,0.35)';
  ctx.beginPath();
  ctx.moveTo(bw / 2, -h / 2);
  ctx.lineTo(bw / 2 + h * 0.45, 0);
  ctx.lineTo(bw / 2, h / 2);
  ctx.closePath();
  ctx.fill();
  ctx.fillStyle = '#ffffff';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(badge, 0, h * 0.03);
  ctx.restore();
}

/** Film grain tiled over the whole cover, plus a dark vignette at the edges. */
function paintGrainAndVignette(ctx, W, H) {
  const tile = getGrainTile();
  const pattern = ctx.createPattern(tile, 'repeat');
  ctx.save();
  ctx.globalCompositeOperation = 'overlay';
  ctx.globalAlpha = 0.55;
  ctx.fillStyle = pattern;
  ctx.fillRect(0, 0, W, H);
  ctx.restore();
  const vig = ctx.createRadialGradient(
    W / 2, H / 2, Math.min(W, H) * 0.42,
    W / 2, H / 2, Math.max(W, H) * 0.78,
  );
  vig.addColorStop(0, 'rgba(8,0,18,0)');
  vig.addColorStop(1, 'rgba(8,0,18,0.42)');
  ctx.fillStyle = vig;
  ctx.fillRect(0, 0, W, H);
}

/**
 * Draws the full cover onto a canvas's 2D context at the canvas's own size.
 * `state` holds layoutId, gradeId, photos, panels, title, subtitle, badge,
 * stars, lettering and titleScale.
 */
export function drawCoverArt(canvas, state) {
  const ctx = canvas.getContext('2d');
  const W = canvas.width;
  const H = canvas.height;
  const layout = findLayout(state.layoutId);
  const grade = findGrade(state.gradeId);

  // Backdrop: the grade's sunset gradient, top to bottom.
  const bg = ctx.createLinearGradient(0, 0, 0, H);
  grade.backdrop.forEach((stop, i) => bg.addColorStop(i / (grade.backdrop.length - 1), stop));
  ctx.fillStyle = bg;
  ctx.fillRect(0, 0, W, H);
  // A soft sun glow high on the cover.
  const glow = ctx.createRadialGradient(W * 0.72, H * 0.16, 0, W * 0.72, H * 0.16, W * 0.55);
  glow.addColorStop(0, 'rgba(255,190,120,0.28)');
  glow.addColorStop(1, 'rgba(255,190,120,0)');
  ctx.fillStyle = glow;
  ctx.fillRect(0, 0, W, H);

  // Scrim under the title for the full-bleed layout.
  if (layout.scrim) {
    const scrim = ctx.createLinearGradient(0, H * 0.55, 0, H);
    scrim.addColorStop(0, 'rgba(8,0,18,0)');
    scrim.addColorStop(1, 'rgba(8,0,18,0.72)');
    ctx.fillStyle = scrim;
    ctx.fillRect(0, 0, W, H);
  }

  // Panels.
  layout.panels.forEach((panel, i) => {
    const spec = state.panels[i] || { photo: 0, zoom: 1, ox: 0, oy: 0 };
    const photo = state.photos[spec.photo] ? state.photos[spec.photo].img : null;
    const px = panel.x * W;
    const py = panel.y * H;
    const pw = panel.w * W;
    const ph = panel.h * H;
    if (panel.rot) {
      ctx.save();
      ctx.translate(px + pw / 2, py + ph / 2);
      ctx.rotate((panel.rot * Math.PI) / 180);
      ctx.translate(-pw / 2, -ph / 2);
      if (panel.frame === 'polaroid') {
        paintPolaroidFrame(ctx, spec, photo, grade, 0, 0, pw, ph, W);
      } else {
        paintPanelPhoto(ctx, spec, photo, grade, 0, 0, pw, ph, W);
        paintInkFrame(ctx, 0, 0, pw, ph, W);
      }
      ctx.restore();
    } else if (panel.frame === 'polaroid') {
      paintPolaroidFrame(ctx, spec, photo, grade, px, py, pw, ph, W);
    } else if (panel.frame === 'none') {
      paintPanelPhoto(ctx, spec, photo, grade, px, py, pw, ph, W);
    } else {
      paintPanelPhoto(ctx, spec, photo, grade, px, py, pw, ph, W);
      paintInkFrame(ctx, px, py, pw, ph, W);
    }
  });

  // Dark band behind the title where the layout bands it.
  if (!layout.scrim && layout.id !== 'tilted') {
    const t = layout.title;
    const band = ctx.createLinearGradient(0, t.y * H - H * 0.02, 0, H);
    band.addColorStop(0, 'rgba(10,0,22,0)');
    band.addColorStop(0.35, 'rgba(10,0,22,0.42)');
    band.addColorStop(1, 'rgba(10,0,22,0.55)');
    ctx.fillStyle = band;
    ctx.fillRect(0, t.y * H - H * 0.02, W, H - t.y * H + H * 0.02);
  }

  paintTitleBlock(ctx, W, H, state, layout, grade);
  paintBadgeRibbon(ctx, W, H, state, grade);
  paintGrainAndVignette(ctx, W, H);
}

/** Renders the cover offscreen at an exact export size and returns the canvas. */
export function renderCoverToCanvas(state, w, h) {
  const canvas = document.createElement('canvas');
  canvas.width = w;
  canvas.height = h;
  drawCoverArt(canvas, state);
  return canvas;
}

/** Renders the cover at an exact size and resolves to a PNG blob. */
export function exportCoverPNG(state, w, h) {
  return new Promise((resolve, reject) => {
    const canvas = renderCoverToCanvas(state, w, h);
    canvas.toBlob((blob) => {
      if (blob) resolve(blob);
      else reject(new Error('PNG export failed'));
    }, 'image/png');
  });
}
