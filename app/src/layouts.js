// Layouts for Neon Coast Cover Studio.
// Every layout is a pure function of the cover size (W, H) that returns the
// panel rectangles (fractions resolved to pixels), the title zone, the badge
// ribbon spot and the heat meter spot. Panels are drawn by cover.js; the
// editor only picks a layout id, so adding a layout never touches the UI.

export const LAYOUT_LIST = [
  { id: 'palm-grid', name: 'Palm Grid' },
  { id: 'hero-three', name: 'Hero + Three' },
  { id: 'sunset-sleeve', name: 'Sunset Sleeve' },
  { id: 'vice-duo', name: 'Vice Duo' },
  { id: 'full-bleed', name: 'Full Bleed' },
  { id: 'tilted', name: 'Tilted Snapshots' },
];

export const SLOT_COUNT = {
  'palm-grid': 9,
  'hero-three': 4,
  'sunset-sleeve': 1,
  'vice-duo': 2,
  'full-bleed': 1,
  tilted: 3,
};

function panel(x, y, w, h, extra = {}) {
  return { x, y, w, h, rot: 0, frame: 'edge', ...extra };
}

// The panel area every multi-panel layout shares: a margin around the top
// part of the cover, with the title band kept free at the bottom.
function panelArea(W, H) {
  const m = Math.round(W * 0.014);
  const band = Math.round(H * 0.26);
  return { x: m, y: m, w: W - m * 2, h: H - band - m, band };
}

function titleBelow(W, H) {
  const band = Math.round(H * 0.26);
  return { x: W / 2, y: H - band + band * 0.42, w: W * 0.92, align: 'center' };
}

function badgeTopRight(W, H) {
  return { x: W * 0.985, y: H * 0.045, rot: -0.07 };
}

function heatBottomRight(W, H) {
  return { x: W * 0.985, y: H * 0.965, align: 'right' };
}

// 3 x 3 grid of equal panels, title band underneath.
function layoutPalmGrid(W, H) {
  const a = panelArea(W, H);
  const g = Math.round(W * 0.012);
  const cw = (a.w - g * 2) / 3;
  const ch = (a.h - g * 2) / 3;
  const panels = [];
  for (let r = 0; r < 3; r++) {
    for (let c = 0; c < 3; c++) {
      panels.push(panel(a.x + c * (cw + g), a.y + r * (ch + g), cw, ch));
    }
  }
  return { panels, title: titleBelow(W, H), badge: badgeTopRight(W, H), heat: heatBottomRight(W, H) };
}

// One big hero panel with three small ones stacked beside it (landscape);
// hero on top with three in a row beneath it (portrait).
function layoutHeroThree(W, H) {
  const a = panelArea(W, H);
  const g = Math.round(W * 0.012);
  let panels;
  if (W >= H) {
    const heroW = a.w * 0.62;
    const sideW = a.w - heroW - g;
    const sh = (a.h - g * 2) / 3;
    panels = [
      panel(a.x, a.y, heroW, a.h),
      panel(a.x + heroW + g, a.y, sideW, sh),
      panel(a.x + heroW + g, a.y + sh + g, sideW, sh),
      panel(a.x + heroW + g, a.y + (sh + g) * 2, sideW, sh),
    ];
  } else {
    const heroH = a.h * 0.58;
    const rowH = a.h - heroH - g;
    const sw = (a.w - g * 2) / 3;
    panels = [
      panel(a.x, a.y, a.w, heroH),
      panel(a.x, a.y + heroH + g, sw, rowH),
      panel(a.x + sw + g, a.y + heroH + g, sw, rowH),
      panel(a.x + (sw + g) * 2, a.y + heroH + g, sw, rowH),
    ];
  }
  return { panels, title: titleBelow(W, H), badge: badgeTopRight(W, H), heat: heatBottomRight(W, H) };
}

// One photo fills the whole cover; the title sits on a dark band at the bottom.
function layoutSunsetSleeve(W, H) {
  const panels = [panel(0, 0, W, H, { frame: 'bleed' })];
  return {
    panels,
    title: { x: W / 2, y: H * 0.86, w: W * 0.92, align: 'center', onPhoto: true },
    badge: badgeTopRight(W, H),
    heat: { x: W * 0.985, y: H * 0.965, align: 'right', onPhoto: true },
  };
}

// Two panels, side by side in landscape, stacked in portrait, title below.
function layoutViceDuo(W, H) {
  const a = panelArea(W, H);
  const g = Math.round(W * 0.012);
  let panels;
  if (W >= H) {
    const pw = (a.w - g) / 2;
    panels = [panel(a.x, a.y, pw, a.h), panel(a.x + pw + g, a.y, pw, a.h)];
  } else {
    const ph = (a.h - g) / 2;
    panels = [panel(a.x, a.y, a.w, ph), panel(a.x, a.y + ph + g, a.w, ph)];
  }
  return { panels, title: titleBelow(W, H), badge: badgeTopRight(W, H), heat: heatBottomRight(W, H) };
}

// One photo, edge to edge, title at the lower left.
function layoutFullBleed(W, H) {
  const panels = [panel(0, 0, W, H, { frame: 'bleed' })];
  return {
    panels,
    title: { x: W * 0.055, y: H * 0.87, w: W * 0.88, align: 'left', onPhoto: true },
    badge: badgeTopRight(W, H),
    heat: { x: W * 0.985, y: H * 0.965, align: 'right', onPhoto: true },
  };
}

// Three polaroid prints, tilted and overlapping, title across the top.
function layoutTilted(W, H) {
  const top = Math.round(H * 0.24);
  const areaH = H - top - Math.round(H * 0.06);
  const pw = Math.min(W * 0.40, areaH * 0.62);
  const ph = pw * 1.22;
  const cx = W / 2;
  const cy = top + areaH / 2;
  const d = pw * 0.55;
  const panels = [
    panel(cx - d - pw / 2, cy - ph / 2, pw, ph, { rot: -0.11, frame: 'polaroid' }),
    panel(cx + d - pw / 2, cy - ph / 2, pw, ph, { rot: 0.08, frame: 'polaroid' }),
    panel(cx - pw / 2, cy - ph / 2 + ph * 0.22, pw, ph, { rot: -0.03, frame: 'polaroid' }),
  ];
  return {
    panels,
    title: { x: W / 2, y: H * 0.115, w: W * 0.9, align: 'center' },
    badge: { x: W * 0.985, y: H * 0.03, rot: 0.06 },
    heat: { x: W * 0.03, y: H * 0.965, align: 'left' },
  };
}

const BUILDERS = {
  'palm-grid': layoutPalmGrid,
  'hero-three': layoutHeroThree,
  'sunset-sleeve': layoutSunsetSleeve,
  'vice-duo': layoutViceDuo,
  'full-bleed': layoutFullBleed,
  tilted: layoutTilted,
};

// Resolve a layout id to its geometry for a cover of W x H pixels.
export function layoutGeometry(layoutId, W, H) {
  const build = BUILDERS[layoutId] || BUILDERS['palm-grid'];
  return build(W, H);
}
