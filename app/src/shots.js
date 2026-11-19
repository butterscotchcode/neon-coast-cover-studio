// Fixed scenes for screenshots: ?shot=editor shows the full editor with the
// sample photos loaded; ?shot=cover shows only the cover the app drew, at an
// export size, so the screenshot is the PNG the app would write. The query
// may also carry layout, grade, title, subtitle, badge, stars, lettering
// and size (1920x1080, 1080x1080, 1080x1350, or square/portrait/wide).
// window.__shotReady is set once the scene is painted.
import { drawCoverArt, ensureCoverFonts } from './cover.js';
import { EXPORT_SIZES } from './layouts.js';

function parseSize(raw) {
  if (!raw) return { w: 1920, h: 1080 };
  const named = EXPORT_SIZES.find((s) => s.id === raw);
  if (named) return { w: named.w, h: named.h };
  const match = /^(\d+)x(\d+)$/.exec(raw);
  if (match) return { w: Number(match[1]), h: Number(match[2]) };
  return { w: 1920, h: 1080 };
}

export async function runShot(shot, query) {
  const app = window.__app;
  await ensureCoverFonts();
  if (shot === 'cover') {
    document.body.classList.add('shot-cover');
    const size = parseSize(query.get('size'));
    const canvas = document.getElementById('preview');
    canvas.width = size.w;
    canvas.height = size.h;
    drawCoverArt(canvas, app.state);
  } else {
    app.redraw();
  }
  await new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(resolve)));
  window.__shotReady = true;
}
