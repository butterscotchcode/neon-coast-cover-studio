// Editor for Neon Coast Cover Studio.
// Owns the state (photos, slots, layout, grade, caption, size), the preview
// canvas, the panel drag/zoom gestures, undo/redo and the PNG export. The
// cover itself is painted by cover.js, so the preview and the export are
// always the same picture. When the page carries ?shot=cover, shots.js takes
// over and this module does nothing.

import { renderCover, GRADE_LIST } from './cover.js';
import { LAYOUT_LIST, SLOT_COUNT, layoutGeometry } from './layouts.js';

const BUILT_INS = [
  { id: 'sunset', name: 'Sunset Blvd', src: 'samples/sunset.jpg' },
  { id: 'neon', name: 'Neon Street', src: 'samples/neon.jpg' },
  { id: 'palms', name: 'Palm Dusk', src: 'samples/palms.jpg' },
  { id: 'pier', name: 'Pier Morning', src: 'samples/pier.jpg' },
];

const SIZES = [
  { id: '1080x1080', label: '1080 × 1080', w: 1080, h: 1080 },
  { id: '1080x1350', label: '1080 × 1350', w: 1080, h: 1350 },
  { id: '1920x1080', label: '1920 × 1080', w: 1920, h: 1080 },
];

const $ = (id) => document.getElementById(id);

function sizeById(id) {
  return SIZES.find((s) => s.id === id) || SIZES[2];
}

function defaultSlots(layout, photos) {
  const n = SLOT_COUNT[layout] || 1;
  const slots = [];
  for (let i = 0; i < n; i++) {
    slots.push({ photo: photos[i % photos.length].id, zoom: 1, ox: 0, oy: 0 });
  }
  return slots;
}

function freshState(photos) {
  return {
    layout: 'palm-grid',
    grade: 'sunset',
    title: 'NEON COAST',
    subtitle: 'a Vice City story',
    badge: 'VICE CITY',
    heat: 4,
    size: '1920x1080',
    photos: photos.map((p) => ({ id: p.id, name: p.name, src: p.src })),
    slots: defaultSlots('palm-grid', photos),
    selectedPhoto: photos[0].id,
    selectedSlot: 0,
  };
}

class Editor {
  constructor() {
    this.loaded = new Map(); // photo id -> HTMLImageElement
    this.state = null;
    this.undoStack = [];
    this.redoStack = [];
    this.raf = 0;
    this.drag = null;
    this.commitTimer = 0;
  }

  async start() {
    await this.loadFonts();
    await this.loadBuiltIns();
    this.state = freshState(BUILT_INS);
    this.buildThumbs();
    this.buildLayouts();
    this.buildGrades();
    this.buildSizes();
    this.wireControls();
    this.wireCanvas();
    this.render();
    this.renderLayoutMinis();
    this.setStatus('Ready — pick a photo, a layout and a caption, then export.', true);
  }

  async loadFonts() {
    try {
      await Promise.all([
        document.fonts.load('40px Anton'),
        document.fonts.load('40px Pacifico'),
      ]);
      await document.fonts.ready;
    } catch (e) {
      // The canvas falls back to sans-serif; the app still works.
    }
  }

  loadImage(src) {
    return new Promise((resolve, reject) => {
      const img = new Image();
      img.onload = () => resolve(img);
      img.onerror = () => reject(new Error(`could not load ${src}`));
      img.src = src;
    });
  }

  async loadBuiltIns() {
    for (const p of BUILT_INS) {
      try {
        this.loaded.set(p.id, await this.loadImage(p.src));
      } catch (e) {
        // A missing sample leaves an empty slot; the rest still work.
      }
    }
  }

  renderState() {
    const s = this.state;
    return {
      ...s,
      photos: s.photos.map((p) => ({ ...p, img: this.loaded.get(p.id) || null })),
    };
  }

  render() {
    const s = this.state;
    if (!s) return;
    const size = sizeById(s.size);
    renderCover($('preview'), this.renderState(), size.w, size.h);
  }

  scheduleRender() {
    cancelAnimationFrame(this.raf);
    this.raf = requestAnimationFrame(() => this.render());
  }

  snapshot() {
    return JSON.parse(JSON.stringify(this.state));
  }

  commit() {
    this.undoStack.push(this.snapshot());
    if (this.undoStack.length > 50) this.undoStack.shift();
    this.redoStack.length = 0;
    this.syncUndoButtons();
  }

  // Text fields commit once the user pauses typing.
  commitSoon() {
    clearTimeout(this.commitTimer);
    this.commitTimer = setTimeout(() => this.commit(), 400);
  }

  restore(snap) {
    this.state = snap;
    this.syncInputs();
    this.buildThumbs();
    this.buildLayouts();
    this.buildGrades();
    this.buildSizes();
    this.render();
    this.renderLayoutMinis();
    this.syncUndoButtons();
  }

  undo() {
    if (!this.undoStack.length) return;
    this.redoStack.push(this.snapshot());
    this.restore(this.undoStack.pop());
  }

  redo() {
    if (!this.redoStack.length) return;
    this.undoStack.push(this.snapshot());
    this.restore(this.redoStack.pop());
  }

  syncUndoButtons() {
    $('undoBtn').disabled = this.undoStack.length === 0;
    $('redoBtn').disabled = this.redoStack.length === 0;
  }

  syncInputs() {
    const s = this.state;
    $('titleInput').value = s.title;
    $('subtitleInput').value = s.subtitle;
    $('badgeInput').value = s.badge;
    $('heatInput').value = String(s.heat);
    $('heatValue').textContent = String(s.heat);
  }

  setStatus(msg, ok = false) {
    const el = $('status');
    el.textContent = msg;
    el.classList.toggle('ok', ok);
  }

  buildThumbs() {
    const s = this.state;
    const box = $('thumbs');
    box.innerHTML = '';
    for (const p of s.photos) {
      const b = document.createElement('button');
      b.type = 'button';
      b.className = 'thumb' + (s.selectedPhoto === p.id ? ' sel' : '');
      const img = document.createElement('img');
      img.src = p.src;
      img.alt = p.name;
      const span = document.createElement('span');
      span.textContent = p.name;
      b.append(img, span);
      b.addEventListener('click', () => {
        s.selectedPhoto = p.id;
        this.buildThumbs();
      });
      box.appendChild(b);
    }
  }

  buildLayouts() {
    const s = this.state;
    const box = $('layouts');
    box.innerHTML = '';
    for (const l of LAYOUT_LIST) {
      const b = document.createElement('button');
      b.type = 'button';
      b.className = 'layout-btn' + (s.layout === l.id ? ' sel' : '');
      const cv = document.createElement('canvas');
      cv.width = 180;
      cv.height = 112;
      const span = document.createElement('span');
      span.textContent = l.name;
      b.append(cv, span);
      b.addEventListener('click', () => {
        if (s.layout === l.id) return;
        this.commit();
        s.layout = l.id;
        s.slots = defaultSlots(l.id, s.photos);
        s.selectedSlot = 0;
        this.buildLayouts();
        this.renderLayoutMinis();
        this.render();
      });
      box.appendChild(b);
    }
  }

  renderLayoutMinis() {
    const s = this.state;
    const btns = $('layouts').querySelectorAll('.layout-btn');
    btns.forEach((b, i) => {
      const cv = b.querySelector('canvas');
      const mini = { ...this.renderState(), layout: LAYOUT_LIST[i].id, slots: defaultSlots(LAYOUT_LIST[i].id, s.photos) };
      renderCover(cv, mini, 180, 112);
    });
  }

  buildGrades() {
    const s = this.state;
    const box = $('grades');
    box.innerHTML = '';
    for (const g of GRADE_LIST) {
      const b = document.createElement('button');
      b.type = 'button';
      b.className = `swatch ${g.id}` + (s.grade === g.id ? ' sel' : '');
      b.title = g.name;
      b.setAttribute('aria-label', g.name);
      b.addEventListener('click', () => {
        if (s.grade === g.id) return;
        this.commit();
        s.grade = g.id;
        this.buildGrades();
        this.render();
      });
      box.appendChild(b);
    }
  }

  buildSizes() {
    const s = this.state;
    const box = $('sizes');
    box.innerHTML = '';
    for (const sz of SIZES) {
      const b = document.createElement('button');
      b.type = 'button';
      b.className = sz.id === s.size ? 'on' : '';
      b.textContent = sz.label;
      b.addEventListener('click', () => {
        if (s.size === sz.id) return;
        this.commit();
        s.size = sz.id;
        this.buildSizes();
        this.render();
      });
      box.appendChild(b);
    }
  }

  wireControls() {
    const s = this.state;
    $('addPhotos').addEventListener('click', () => $('fileInput').click());
    $('fileInput').addEventListener('change', (e) => this.addUploads(e.target.files));
    $('putPanel').addEventListener('click', () => {
      this.commit();
      const slot = s.slots[s.selectedSlot];
      if (slot) slot.photo = s.selectedPhoto;
      this.render();
    });
    $('fillAll').addEventListener('click', () => {
      this.commit();
      s.slots.forEach((slot, i) => {
        slot.photo = s.photos[i % s.photos.length].id;
      });
      this.render();
    });
    $('titleInput').addEventListener('input', (e) => {
      s.title = e.target.value;
      this.commitSoon();
      this.scheduleRender();
    });
    $('subtitleInput').addEventListener('input', (e) => {
      s.subtitle = e.target.value;
      this.commitSoon();
      this.scheduleRender();
    });
    $('badgeInput').addEventListener('input', (e) => {
      s.badge = e.target.value;
      this.commitSoon();
      this.scheduleRender();
    });
    $('heatInput').addEventListener('input', (e) => {
      s.heat = Number(e.target.value);
      $('heatValue').textContent = e.target.value;
      this.commitSoon();
      this.scheduleRender();
    });
    $('exportBtn').addEventListener('click', () => this.exportPng());
    $('undoBtn').addEventListener('click', () => this.undo());
    $('redoBtn').addEventListener('click', () => this.redo());
    document.addEventListener('keydown', (e) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'z') {
        e.preventDefault();
        if (e.shiftKey) this.redo();
        else this.undo();
      }
    });
  }

  async addUploads(files) {
    const s = this.state;
    let added = 0;
    for (const file of files || []) {
      if (!file.type.startsWith('image/')) continue;
      const dataUrl = await new Promise((resolve) => {
        const r = new FileReader();
        r.onload = () => resolve(r.result);
        r.readAsDataURL(file);
      });
      const id = `up${Date.now()}_${added}`;
      try {
        const img = await this.loadImage(dataUrl);
        this.loaded.set(id, img);
        s.photos.push({ id, name: file.name.replace(/\.[^.]+$/, '').slice(0, 18) || 'Photo', src: dataUrl });
        added++;
      } catch (e) {
        // Skip unreadable files.
      }
    }
    if (added) {
      this.commit();
      s.selectedPhoto = s.photos[s.photos.length - 1].id;
      this.buildThumbs();
      this.setStatus(`Added ${added} photo${added > 1 ? 's' : ''} — put one in a panel, then export.`, true);
    }
  }

  // Map a pointer event on the preview canvas back to cover coordinates.
  canvasPoint(e) {
    const cv = $('preview');
    const r = cv.getBoundingClientRect();
    return {
      x: (e.clientX - r.left) * (cv.width / r.width),
      y: (e.clientY - r.top) * (cv.height / r.height),
    };
  }

  geometry() {
    const s = this.state;
    const size = sizeById(s.size);
    return layoutGeometry(s.layout, size.w, size.h);
  }

  // Topmost panel under the pointer, honouring each panel's rotation.
  pickPanel(e) {
    const p = this.canvasPoint(e);
    const geo = this.geometry();
    for (let i = geo.panels.length - 1; i >= 0; i--) {
      const r = geo.panels[i];
      const cx = r.x + r.w / 2;
      const cy = r.y + r.h / 2;
      const dx = p.x - cx;
      const dy = p.y - cy;
      const rot = -(r.rot || 0);
      const lx = dx * Math.cos(rot) - dy * Math.sin(rot) + cx;
      const ly = dx * Math.sin(rot) + dy * Math.cos(rot) + cy;
      if (lx >= r.x && lx <= r.x + r.w && ly >= r.y && ly <= r.y + r.h) return i;
    }
    return -1;
  }

  wireCanvas() {
    const cv = $('preview');
    cv.addEventListener('pointerdown', (e) => {
      e.preventDefault();
      cv.setPointerCapture(e.pointerId);
      const idx = this.pickPanel(e);
      if (idx >= 0) {
        this.state.selectedSlot = idx;
        this.drag = { idx, lastX: e.clientX, lastY: e.clientY, moved: false };
      }
    });
    cv.addEventListener('pointermove', (e) => {
      if (!this.drag) return;
      const s = this.state;
      const slot = s.slots[this.drag.idx];
      if (!slot) return;
      const rect = cv.getBoundingClientRect();
      const dx = (e.clientX - this.drag.lastX) * (cv.width / rect.width);
      const dy = (e.clientY - this.drag.lastY) * (cv.height / rect.height);
      if (Math.abs(dx) + Math.abs(dy) > 2) this.drag.moved = true;
      const geo = this.geometry();
      const pr = geo.panels[this.drag.idx];
      slot.ox = Math.max(-0.5, Math.min(0.5, slot.ox + dx / pr.w));
      slot.oy = Math.max(-0.5, Math.min(0.5, slot.oy + dy / pr.h));
      this.drag.lastX = e.clientX;
      this.drag.lastY = e.clientY;
      this.scheduleRender();
    });
    cv.addEventListener('pointerup', () => {
      if (this.drag && this.drag.moved) this.commit();
      this.drag = null;
    });
    cv.addEventListener('wheel', (e) => {
      e.preventDefault();
      const s = this.state;
      const slot = s.slots[s.selectedSlot];
      if (!slot) return;
      const factor = e.deltaY < 0 ? 1.12 : 1 / 1.12;
      slot.zoom = Math.max(1, Math.min(3, slot.zoom * factor));
      this.commitSoon();
      this.scheduleRender();
    }, { passive: false });
  }

  exportPng() {
    const s = this.state;
    const size = sizeById(s.size);
    const off = document.createElement('canvas');
    renderCover(off, this.renderState(), size.w, size.h);
    off.toBlob((blob) => {
      if (!blob) {
        this.setStatus('Export failed — the browser refused the PNG.');
        return;
      }
      const a = document.createElement('a');
      a.href = URL.createObjectURL(blob);
      a.download = `neon-coast-cover-${size.id}.png`;
      a.click();
      setTimeout(() => URL.revokeObjectURL(a.href), 5000);
      this.setStatus(`Exported ${size.label} PNG — check your downloads.`, true);
    }, 'image/png');
  }
}

if (!new URLSearchParams(location.search).has('shot')) {
  const editor = new Editor();
  editor.start();
}
