// Panel layouts and colour grades for Neon Coast Cover Studio.
// Every layout is described in unit space (0..1 of the cover) so the same
// layout renders at 1080x1080, 1080x1350 and 1920x1080. A panel is a rect
// plus an optional rotation (tilted snapshots) and a frame style. The title
// block is part of the layout: where the big lettering sits and how large it
// may grow, as a fraction of the cover height.

// Gutter between panels, in unit space.
const GUT = 0.014;

// Photo area shared by the banded layouts: panels on top, title band below.
function bandedPanels(cols, rows, photoH) {
  const panels = [];
  const cellW = (1 - GUT * (cols + 1)) / cols;
  const cellH = (photoH - GUT * (rows + 1)) / rows;
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      panels.push({
        x: GUT + c * (cellW + GUT),
        y: GUT + r * (cellH + GUT),
        w: cellW,
        h: cellH,
        rot: 0,
        frame: 'ink',
      });
    }
  }
  return panels;
}

export const LAYOUTS = [
  {
    id: 'grid9',
    name: 'Palm Grid',
    blurb: 'Nine-panel poster grid',
    photoH: 0.74,
    panels: bandedPanels(3, 3, 0.74),
    title: { x: 0.05, y: 0.765, w: 0.9, h: 0.21, align: 'center', size: 0.125 },
    badgeAt: 'right',
  },
  {
    id: 'hero3',
    name: 'Hero + Three',
    blurb: 'One hero shot, three side panels',
    photoH: 0.74,
    panels: (() => {
      const heroW = 0.645;
      const sideX = heroW + GUT;
      const sideW = 1 - sideX - GUT;
      const sideH = (0.74 - GUT * 4) / 3;
      const panels = [{ x: GUT, y: GUT, w: heroW, h: 0.74 - GUT * 2, rot: 0, frame: 'ink' }];
      for (let i = 0; i < 3; i++) {
        panels.push({ x: sideX, y: GUT + i * (sideH + GUT), w: sideW, h: sideH, rot: 0, frame: 'ink' });
      }
      return panels;
    })(),
    title: { x: 0.05, y: 0.765, w: 0.9, h: 0.21, align: 'center', size: 0.125 },
    badgeAt: 'right',
  },
  {
    id: 'sleeve6',
    name: 'Sunset Sleeve',
    blurb: 'Six wide panels, two rows',
    photoH: 0.72,
    panels: bandedPanels(3, 2, 0.72),
    title: { x: 0.05, y: 0.745, w: 0.9, h: 0.23, align: 'center', size: 0.13 },
    badgeAt: 'right',
  },
  {
    id: 'duo',
    name: 'Vice Duo',
    blurb: 'Two tall panels side by side',
    photoH: 0.74,
    panels: [
      { x: GUT, y: GUT, w: (1 - GUT * 3) / 2, h: 0.74 - GUT * 2, rot: 0, frame: 'ink' },
      { x: GUT * 2 + (1 - GUT * 3) / 2, y: GUT, w: (1 - GUT * 3) / 2, h: 0.74 - GUT * 2, rot: 0, frame: 'ink' },
    ],
    title: { x: 0.05, y: 0.765, w: 0.9, h: 0.21, align: 'center', size: 0.125 },
    badgeAt: 'right',
  },
  {
    id: 'fullbleed',
    name: 'Full Bleed',
    blurb: 'One photo, edge to edge',
    photoH: 1,
    panels: [{ x: 0, y: 0, w: 1, h: 1, rot: 0, frame: 'none' }],
    title: { x: 0.05, y: 0.74, w: 0.9, h: 0.22, align: 'left', size: 0.14 },
    badgeAt: 'right',
    scrim: true,
  },
  {
    id: 'tilted',
    name: 'Tilted Snapshots',
    blurb: 'Polaroid frames tossed on the coast',
    photoH: 1,
    panels: [
      { x: 0.06, y: 0.24, w: 0.4, h: 0.5, rot: -6, frame: 'polaroid' },
      { x: 0.52, y: 0.2, w: 0.42, h: 0.52, rot: 4, frame: 'polaroid' },
      { x: 0.28, y: 0.58, w: 0.44, h: 0.34, rot: -2, frame: 'polaroid' },
    ],
    title: { x: 0.05, y: 0.025, w: 0.9, h: 0.15, align: 'center', size: 0.095 },
    badgeAt: 'right',
  },
];

export function findLayout(id) {
  return LAYOUTS.find((l) => l.id === id) ?? LAYOUTS[0];
}

// Colour grades. Each grade carries the backdrop gradient, the wash laid
// over every photo, the title gradient, the subtitle neon colour and the
// badge colour. `photoFilter` is a canvas filter applied while the photo is
// drawn (only the noir grade uses one).
export const GRADES = {
  sunset: {
    name: 'Vice Sunset',
    backdrop: ['#1d0b33', '#7a1e63', '#ff5e78', '#ffb347'],
    washTop: 'rgba(255,150,70,0.10)',
    washBottom: 'rgba(255,40,120,0.30)',
    title: ['#fff6c9', '#ffb347', '#ff4d8d'],
    subtitle: '#8ef6ff',
    badge: '#ff4d8d',
    star: '#ffc93c',
  },
  neon: {
    name: 'Neon Nights',
    backdrop: ['#050514', '#0d2b45', '#123a5c', '#3d0a4d'],
    washTop: 'rgba(0,220,255,0.14)',
    washBottom: 'rgba(255,0,160,0.32)',
    title: ['#e8fbff', '#37e6ff', '#ff2d95'],
    subtitle: '#ff9de2',
    badge: '#00d8ff',
    star: '#37e6ff',
  },
  gold: {
    name: 'Palm Gold',
    backdrop: ['#241203', '#6b3a08', '#c97b1e', '#ffd97a'],
    washTop: 'rgba(255,210,110,0.12)',
    washBottom: 'rgba(190,90,10,0.30)',
    title: ['#fffbe0', '#ffd97a', '#ff8a3d'],
    subtitle: '#ffe9a8',
    badge: '#ffb347',
    star: '#ffe9a8',
  },
  dusk: {
    name: 'Ocean Dusk',
    backdrop: ['#060a24', '#14264d', '#2c4a7a', '#7a5a9e'],
    washTop: 'rgba(90,140,255,0.12)',
    washBottom: 'rgba(60,20,110,0.34)',
    title: ['#eef4ff', '#9db8ff', '#c77dff'],
    subtitle: '#a8e6ff',
    badge: '#7aa2ff',
    star: '#ffd97a',
  },
  noir: {
    name: 'Noir Heat',
    backdrop: ['#0a0a0c', '#1c1c22', '#3a2a30', '#6b3a2e'],
    washTop: 'rgba(255,255,255,0.04)',
    washBottom: 'rgba(255,120,60,0.22)',
    title: ['#ffffff', '#e8e8e8', '#ffb347'],
    subtitle: '#ffb347',
    badge: '#e8e8e8',
    star: '#ffb347',
    photoFilter: 'grayscale(0.92) contrast(1.18) brightness(1.04)',
  },
};

export const GRADE_IDS = Object.keys(GRADES);

export function findGrade(id) {
  return GRADES[id] ?? GRADES.sunset;
}

// The three post sizes the app exports, in the order the export buttons show.
export const EXPORT_SIZES = [
  { id: 'square', label: 'Square 1080 × 1080', w: 1080, h: 1080 },
  { id: 'portrait', label: 'Portrait 1080 × 1350', w: 1080, h: 1350 },
  { id: 'wide', label: 'Wide 1920 × 1080', w: 1920, h: 1080 },
];
