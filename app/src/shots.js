// Screenshot scenes for Neon Coast Cover Studio.
// When the page opens with ?shot=cover, this module takes over the page:
// it hides the editor, loads the four built-in scenes and the fonts, paints
// one exported cover full-frame on #shotCanvas and marks the document ready.
// Headless Chrome then screenshots exactly the cover the app exports, at the
// export size. Without the parameter this module does nothing.

import { renderCover } from './cover.js';
import { SLOT_COUNT } from './layouts.js';

const SAMPLES = [
  { id: 'sunset', src: 'samples/sunset.jpg' },
  { id: 'neon', src: 'samples/neon.jpg' },
  { id: 'palms', src: 'samples/palms.jpg' },
  { id: 'pier', src: 'samples/pier.jpg' },
];

function loadImage(src) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error(`could not load ${src}`));
    img.src = src;
  });
}

function parseSize(text) {
  const m = /^(\d+)x(\d+)$/.exec(text || '');
  if (!m) return { w: 1920, h: 1080 };
  return { w: Number(m[1]), h: Number(m[2]) };
}

async function shootCover() {
  const q = new URLSearchParams(location.search);
  const layout = q.get('layout') || 'palm-grid';
  const size = parseSize(q.get('size') || '1920x1080');
  const photos = [];
  for (const s of SAMPLES) {
    try {
      photos.push({ id: s.id, name: s.id, src: s.src, img: await loadImage(s.src) });
    } catch (e) {
      photos.push({ id: s.id, name: s.id, src: s.src, img: null });
    }
  }
  try {
    await Promise.all([
      document.fonts.load('40px Anton'),
      document.fonts.load('40px Pacifico'),
    ]);
    await document.fonts.ready;
  } catch (e) {
    // Fall back to sans-serif; the shot still renders.
  }
  const n = SLOT_COUNT[layout] || 1;
  const slots = [];
  for (let i = 0; i < n; i++) {
    slots.push({ photo: photos[i % photos.length].id, zoom: 1, ox: 0, oy: 0 });
  }
  const state = {
    layout,
    grade: q.get('grade') || 'sunset',
    title: q.get('title') || 'NEON COAST',
    subtitle: q.get('subtitle') || 'a Vice City story',
    badge: q.get('badge') || 'VICE CITY',
    heat: Number(q.get('heat') || '4'),
    photos,
    slots,
  };
  document.body.classList.add('shot');
  const canvas = document.getElementById('shotCanvas');
  renderCover(canvas, state, size.w, size.h);
  document.title = 'shot-ready';
}

if (new URLSearchParams(location.search).get('shot') === 'cover') {
  shootCover();
}
