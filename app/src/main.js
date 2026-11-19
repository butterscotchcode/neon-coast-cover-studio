// Wires the Neon Coast editor: photos, layouts, grades, caption, panel
// crop/position and the three PNG exports. The live preview and every export
// are drawn by the same cover engine (./cover.js), so the preview is the
// cover. A `?shot=` query switches to a fixed screenshot scene (./shots.js).
import { drawCoverArt, ensureCoverFonts, exportCoverPNG } from './cover.js';
import { EXPORT_SIZES, GRADE_IDS, GRADES, LAYOUTS, findLayout } from './layouts.js';

const SAMPLE_PHOTOS = [
  { url: 'samples/sunset.jpg', name: 'Sunset Blvd' },
  { url: 'samples/neon.jpg', name: 'Neon Street' },
  { url: 'samples/palms.jpg', name: 'Palm Dusk' },
  { url: 'samples/pier.jpg', name: 'Pier Morning' },
];

const $ = (id) => document.getElementById(id);
const preview = $('preview');
const statusEl = $('status');

const state = {
  layoutId: 'grid9',
  gradeId: 'sunset',
  photos: [],
  panels: [],
  title: 'NEON COAST',
  subtitle: 'a Vice City story',
  badge: 'VICE CITY',
  stars: 4,
  lettering: 'gradient',
  titleScale: 1,
};

let selectedPanel = 0;
let activePhoto = 0;
let previewSize = EXPORT_SIZES[0];
let thumbTimer = 0;

/** Loads an image from a URL, resolving once it can be drawn. */
export function loadImage(url) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error(`could not load ${url}`));
    img.src = url;
  });
}

function setStatus(text) {
  statusEl.textContent = text;
}

/** Rebuilds the panel specs for the current layout, keeping photo choices. */
function resetPanelsForLayout() {
  const layout = findLayout(state.layoutId);
  const previous = state.panels;
  state.panels = layout.panels.map((_, i) => {
    const old = previous[i];
    return {
      photo: old ? old.photo % Math.max(1, state.photos.length) : i % Math.max(1, state.photos.length),
      zoom: old ? old.zoom : 1,
      ox: old ? old.ox : 0,
      oy: old ? old.oy : 0,
    };
  });
  selectedPanel = 0;
}

/** Sizes the preview canvas to the chosen post size and redraws the cover. */
function redraw() {
  preview.width = previewSize.w;
  preview.height = previewSize.h;
  drawCoverArt(preview, state);
  syncPanelControls();
}

function syncPanelControls() {
  const spec = state.panels[selectedPanel];
  const label = $('selectedPanelLabel');
  if (!spec) {
    label.textContent = 'No panel selected';
    return;
  }
  label.textContent = `Panel ${selectedPanel + 1} of ${state.panels.length} — ${photoName(spec.photo)}`;
  $('zoomInput').value = spec.zoom;
  $('offsetXInput').value = spec.ox;
  $('offsetYInput').value = spec.oy;
  $('zoomValue').textContent = `${Math.round(spec.zoom * 100)}%`;
}

function photoName(index) {
  const entry = state.photos[index];
  return entry ? entry.name : 'empty';
}

/** Renders the six layout thumbnails from the live state. */
function renderLayoutThumbnails() {
  clearTimeout(thumbTimer);
  thumbTimer = setTimeout(() => {
    document.querySelectorAll('#layoutPicker canvas').forEach((canvas) => {
      const thumbState = { ...state, layoutId: canvas.dataset.layout, panels: state.panels };
      const thumb = document.createElement('canvas');
      thumb.width = 132;
      thumb.height = 96;
      drawCoverArt(thumb, thumbState);
      const ctx = canvas.getContext('2d');
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      ctx.drawImage(thumb, 0, 0, canvas.width, canvas.height);
    });
  }, 120);
}

function buildLayoutPicker() {
  const picker = $('layoutPicker');
  for (const layout of LAYOUTS) {
    const button = document.createElement('button');
    button.type = 'button';
    button.className = 'layout-btn';
    button.dataset.layout = layout.id;
    button.title = layout.blurb;
    const thumb = document.createElement('canvas');
    thumb.width = 132;
    thumb.height = 96;
    thumb.dataset.layout = layout.id;
    const name = document.createElement('span');
    name.textContent = layout.name;
    button.append(thumb, name);
    button.addEventListener('click', () => {
      state.layoutId = layout.id;
      resetPanelsForLayout();
      document.querySelectorAll('.layout-btn').forEach((b) => b.classList.toggle('active', b === button));
      redraw();
      renderLayoutThumbnails();
    });
    picker.append(button);
  }
  picker.querySelector(`.layout-btn[data-layout="${state.layoutId}"]`)?.classList.add('active');
}

function buildGradePicker() {
  const picker = $('gradePicker');
  for (const id of GRADE_IDS) {
    const grade = GRADES[id];
    const button = document.createElement('button');
    button.type = 'button';
    button.className = 'grade-btn';
    button.dataset.grade = id;
    button.style.background = `linear-gradient(135deg, ${grade.backdrop[1]}, ${grade.backdrop[3]})`;
    button.innerHTML = `<span>${grade.name}</span>`;
    button.addEventListener('click', () => {
      state.gradeId = id;
      document.querySelectorAll('.grade-btn').forEach((b) => b.classList.toggle('active', b === button));
      redraw();
      renderLayoutThumbnails();
    });
    picker.append(button);
  }
  picker.querySelector(`.grade-btn[data-grade="${state.gradeId}"]`)?.classList.add('active');
}

function buildSizePicker() {
  const picker = $('sizePicker');
  for (const size of EXPORT_SIZES) {
    const button = document.createElement('button');
    button.type = 'button';
    button.className = 'size-btn';
    button.textContent = size.label;
    button.addEventListener('click', () => {
      previewSize = size;
      document.querySelectorAll('.size-btn').forEach((b) => b.classList.toggle('active', b === button));
      redraw();
    });
    picker.append(button);
  }
  picker.querySelector('.size-btn').classList.add('active');
}

/** Rebuilds the photo strip: one thumbnail per loaded photo. */
function renderPhotoStrip() {
  const strip = $('photoStrip');
  strip.innerHTML = '';
  state.photos.forEach((entry, i) => {
    const button = document.createElement('button');
    button.type = 'button';
    button.className = 'photo-thumb';
    if (i === activePhoto) button.classList.add('active');
    button.title = entry.name;
    const img = document.createElement('img');
    img.src = entry.thumb;
    img.alt = entry.name;
    const label = document.createElement('span');
    label.textContent = entry.name;
    button.append(img, label);
    button.addEventListener('click', () => {
      activePhoto = i;
      renderPhotoStrip();
    });
    button.addEventListener('dblclick', () => {
      assignPhotoToSelectedPanel(i);
    });
    strip.append(button);
  });
}

/** Puts one photo into the selected panel and redraws. */
function assignPhotoToSelectedPanel(photoIndex) {
  const spec = state.panels[selectedPanel];
  if (!spec) return;
  spec.photo = photoIndex;
  activePhoto = photoIndex;
  redraw();
  renderPhotoStrip();
  setStatus(`Panel ${selectedPanel + 1} now shows ${photoName(photoIndex)}.`);
}

/** Fills every panel with the same photo. */
function fillAllPanelsWithPhoto(photoIndex) {
  state.panels.forEach((spec) => { spec.photo = photoIndex; });
  redraw();
  setStatus(`All ${state.panels.length} panels now show ${photoName(photoIndex)}.`);
}

function addPhoto(img, name, thumb) {
  state.photos.push({ img, name, thumb });
  resetPanelsForLayout();
  renderPhotoStrip();
  redraw();
}

function downloadBlob(blob, filename) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.append(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 5000);
}

async function exportOne(size) {
  setStatus(`Rendering ${size.label}…`);
  await ensureCoverFonts();
  const blob = await exportCoverPNG(state, size.w, size.h);
  const slug = state.title.trim().toLowerCase().replace(/[^a-z0-9]+/g, '-') || 'neon-coast';
  downloadBlob(blob, `${slug}-${size.w}x${size.h}.png`);
  setStatus(`Saved ${slug}-${size.w}x${size.h}.png — ${size.label}.`);
  return blob;
}

async function exportAllThree() {
  for (const size of EXPORT_SIZES) {
    await exportOne(size);
    await new Promise((r) => setTimeout(r, 250));
  }
  setStatus('All three sizes exported. Share your cover.');
}

/** Hit-tests the preview canvas and returns the panel index under a point. */
function panelAtPoint(clientX, clientY) {
  const rect = preview.getBoundingClientRect();
  const x = ((clientX - rect.left) / rect.width) * preview.width;
  const y = ((clientY - rect.top) / rect.height) * preview.height;
  const layout = findLayout(state.layoutId);
  for (let i = layout.panels.length - 1; i >= 0; i--) {
    const p = layout.panels[i];
    if (x >= p.x * preview.width && x <= (p.x + p.w) * preview.width
      && y >= p.y * preview.height && y <= (p.y + p.h) * preview.height) return i;
  }
  return -1;
}

function wirePreviewPointer() {
  let dragging = false;
  let lastX = 0;
  let lastY = 0;
  preview.addEventListener('pointerdown', (e) => {
    const hit = panelAtPoint(e.clientX, e.clientY);
    if (hit < 0) return;
    selectedPanel = hit;
    dragging = true;
    lastX = e.clientX;
    lastY = e.clientY;
    preview.setPointerCapture(e.pointerId);
    syncPanelControls();
  });
  preview.addEventListener('pointermove', (e) => {
    if (!dragging) return;
    const spec = state.panels[selectedPanel];
    if (!spec) return;
    const rect = preview.getBoundingClientRect();
    const panel = findLayout(state.layoutId).panels[selectedPanel];
    spec.ox = Math.max(-0.4, Math.min(0.4, spec.ox + (e.clientX - lastX) / rect.width / panel.w));
    spec.oy = Math.max(-0.4, Math.min(0.4, spec.oy + (e.clientY - lastY) / rect.height / panel.h));
    lastX = e.clientX;
    lastY = e.clientY;
    redraw();
  });
  preview.addEventListener('pointerup', () => { dragging = false; });
  preview.addEventListener('wheel', (e) => {
    e.preventDefault();
    const spec = state.panels[selectedPanel];
    if (!spec) return;
    spec.zoom = Math.max(1, Math.min(2.5, spec.zoom * (e.deltaY < 0 ? 1.08 : 0.93)));
    redraw();
  }, { passive: false });
}

function wireControls() {
  $('photoInput').addEventListener('change', async (e) => {
    const files = [...e.target.files];
    for (const file of files) {
      try {
        const img = await loadImage(URL.createObjectURL(file));
        addPhoto(img, file.name.replace(/\.[^.]+$/, ''), URL.createObjectURL(file));
      } catch {
        setStatus(`Could not read ${file.name}.`);
      }
    }
    if (files.length) setStatus(`${files.length} photo${files.length > 1 ? 's' : ''} added — drag a panel to position it.`);
    e.target.value = '';
  });
  $('usePhotoBtn').addEventListener('click', () => assignPhotoToSelectedPanel(activePhoto));
  $('fillAllBtn').addEventListener('click', () => fillAllPanelsWithPhoto(activePhoto));
  $('titleInput').addEventListener('input', (e) => { state.title = e.target.value; redraw(); });
  $('subtitleInput').addEventListener('input', (e) => { state.subtitle = e.target.value; redraw(); });
  $('badgeInput').addEventListener('input', (e) => { state.badge = e.target.value; redraw(); });
  $('starsInput').addEventListener('input', (e) => {
    state.stars = Number(e.target.value);
    $('starsValue').textContent = `${state.stars} / 5`;
    redraw();
  });
  $('titleSizeInput').addEventListener('input', (e) => {
    state.titleScale = Number(e.target.value);
    redraw();
  });
  document.querySelectorAll('input[name="lettering"]').forEach((radio) => {
    radio.addEventListener('change', () => {
      state.lettering = radio.value;
      redraw();
    });
  });
  $('zoomInput').addEventListener('input', (e) => {
    const spec = state.panels[selectedPanel];
    if (spec) { spec.zoom = Number(e.target.value); redraw(); }
  });
  $('offsetXInput').addEventListener('input', (e) => {
    const spec = state.panels[selectedPanel];
    if (spec) { spec.ox = Number(e.target.value); redraw(); }
  });
  $('offsetYInput').addEventListener('input', (e) => {
    const spec = state.panels[selectedPanel];
    if (spec) { spec.oy = Number(e.target.value); redraw(); }
  });
  $('resetPanelBtn').addEventListener('click', () => {
    const spec = state.panels[selectedPanel];
    if (spec) { spec.zoom = 1; spec.ox = 0; spec.oy = 0; redraw(); }
  });
  $('exportSquare').addEventListener('click', () => exportOne(EXPORT_SIZES[0]));
  $('exportPortrait').addEventListener('click', () => exportOne(EXPORT_SIZES[1]));
  $('exportWide').addEventListener('click', () => exportOne(EXPORT_SIZES[2]));
  $('exportAll').addEventListener('click', exportAllThree);
  wirePreviewPointer();
}

/** Loads the four built-in sample scenes so the app opens with photos in. */
export async function loadSamplePhotos() {
  for (const sample of SAMPLE_PHOTOS) {
    try {
      const img = await loadImage(sample.url);
      state.photos.push({ img, name: sample.name, thumb: sample.url });
    } catch {
      // A missing sample never blocks the editor; uploads still work.
    }
  }
  resetPanelsForLayout();
  renderPhotoStrip();
}

function applyQueryDefaults() {
  const query = new URLSearchParams(location.search);
  if (query.get('layout')) state.layoutId = query.get('layout');
  if (query.get('grade')) state.gradeId = query.get('grade');
  if (query.get('title')) state.title = query.get('title');
  if (query.get('subtitle')) state.subtitle = query.get('subtitle');
  if (query.get('badge')) state.badge = query.get('badge');
  if (query.get('stars')) state.stars = Number(query.get('stars'));
  if (query.get('lettering')) state.lettering = query.get('lettering');
  $('titleInput').value = state.title;
  $('subtitleInput').value = state.subtitle;
  $('badgeInput').value = state.badge;
  $('starsInput').value = state.stars;
  $('starsValue').textContent = `${state.stars} / 5`;
}

// Handles for the screenshot scenes and for automated checks.
window.__app = {
  state,
  redraw,
  loadSamplePhotos,
  exportPNG: async (w, h) => {
    await ensureCoverFonts();
    const blob = await exportCoverPNG(state, w, h);
    return new Promise((resolve) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result);
      reader.readAsDataURL(blob);
    });
  },
};

async function boot() {
  applyQueryDefaults();
  buildLayoutPicker();
  buildGradePicker();
  buildSizePicker();
  wireControls();
  document.querySelector(`.layout-btn[data-layout="${state.layoutId}"]`)?.classList.add('active');
  document.querySelector(`.grade-btn[data-grade="${state.gradeId}"]`)?.classList.add('active');
  await ensureCoverFonts();
  await loadSamplePhotos();
  redraw();
  renderLayoutThumbnails();
  setStatus('4 sample scenes loaded — add your own photos, pick a layout, export.');
  const shot = new URLSearchParams(location.search).get('shot');
  if (shot) {
    const { runShot } = await import('./shots.js');
    await runShot(shot, new URLSearchParams(location.search));
  }
}

boot();
