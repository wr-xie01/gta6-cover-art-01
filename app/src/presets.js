// Neon Coast Cover Studio — presets: export sizes, panel layouts, colour grades.
// All geometry is in fractions of the cover (0..1) so every size renders the same way.

// The three post sizes the app exports.
export const SIZES = {
  square: { label: 'Square 1080 × 1080', w: 1080, h: 1080 },
  portrait: { label: 'Portrait 1080 × 1350', w: 1080, h: 1350 },
  wide: { label: 'Wide 1920 × 1080', w: 1920, h: 1080 },
};

// Panel layouts. Each layout is a list of panels; a panel is {x, y, w, h} in
// fractions of the cover, plus a gap (also a fraction) drawn between panels.
// A layout also names which panel carries the caption band (the "hero" panel).
export const LAYOUTS = {
  grid: {
    label: 'Four-panel grid',
    gap: 0.012,
    panels: [
      { x: 0, y: 0, w: 0.5, h: 0.5 },
      { x: 0.5, y: 0, w: 0.5, h: 0.5 },
      { x: 0, y: 0.5, w: 0.5, h: 0.5 },
      { x: 0.5, y: 0.5, w: 0.5, h: 0.5 },
    ],
  },
  hero: {
    label: 'Hero + three',
    gap: 0.012,
    panels: [
      { x: 0, y: 0, w: 0.62, h: 1 },
      { x: 0.62, y: 0, w: 0.38, h: 0.333 },
      { x: 0.62, y: 0.333, w: 0.38, h: 0.333 },
      { x: 0.62, y: 0.666, w: 0.38, h: 0.334 },
    ],
  },
  bleed: {
    label: 'Full bleed',
    gap: 0,
    panels: [{ x: 0, y: 0, w: 1, h: 1 }],
  },
  nine: {
    label: 'Nine-panel grid',
    gap: 0.01,
    panels: [
      { x: 0, y: 0, w: 1 / 3, h: 1 / 3 },
      { x: 1 / 3, y: 0, w: 1 / 3, h: 1 / 3 },
      { x: 2 / 3, y: 0, w: 1 / 3, h: 1 / 3 },
      { x: 0, y: 1 / 3, w: 1 / 3, h: 1 / 3 },
      { x: 1 / 3, y: 1 / 3, w: 1 / 3, h: 1 / 3 },
      { x: 2 / 3, y: 1 / 3, w: 1 / 3, h: 1 / 3 },
      { x: 0, y: 2 / 3, w: 1 / 3, h: 1 / 3 },
      { x: 1 / 3, y: 2 / 3, w: 1 / 3, h: 1 / 3 },
      { x: 2 / 3, y: 2 / 3, w: 1 / 3, h: 1 / 3 },
    ],
  },
};

// Colour grades. A grade is a luminance ramp: an array of stops [t, r, g, b]
// (t from 0 = black to 1 = white) plus a contrast multiplier. The renderer
// maps each pixel's luminance through the ramp, then applies the contrast.
// "original" is the identity: no ramp, no contrast change.
export const GRADES = {
  original: { label: 'Original', ramp: null, contrast: 1.0 },
  sunset: {
    label: 'Vice Sunset',
    contrast: 1.12,
    ramp: [
      [0.0, 12, 8, 38],
      [0.25, 64, 18, 82],
      [0.5, 178, 52, 110],
      [0.75, 248, 128, 64],
      [1.0, 255, 236, 180],
    ],
  },
  neon: {
    label: 'Neon Nights',
    contrast: 1.15,
    ramp: [
      [0.0, 4, 10, 34],
      [0.25, 16, 44, 110],
      [0.5, 26, 148, 190],
      [0.75, 236, 84, 168],
      [1.0, 255, 250, 240],
    ],
  },
  golden: {
    label: 'Golden Hour',
    contrast: 1.1,
    ramp: [
      [0.0, 26, 14, 6],
      [0.25, 96, 52, 18],
      [0.5, 196, 118, 40],
      [0.75, 250, 190, 96],
      [1.0, 255, 244, 214],
    ],
  },
  noir: {
    label: 'Noir',
    contrast: 1.25,
    ramp: [
      [0.0, 0, 0, 0],
      [0.2, 24, 24, 28],
      [0.5, 128, 128, 132],
      [0.8, 216, 216, 220],
      [1.0, 255, 255, 255],
    ],
  },
};

// Panel rectangles in pixels for a cover of width W and height H.
// Applies the layout's gap: each panel shrinks by half the gap on each side
// (the outer edge keeps the full cover edge, so panels meet the border).
export function panelRects(layoutName, W, H) {
  const layout = LAYOUTS[layoutName] ?? LAYOUTS.grid;
  const g = layout.gap;
  return layout.panels.map((p) => {
    const gx = g * W;
    const gy = g * H;
    const x = p.x * W + (p.x > 0 ? gx / 2 : 0);
    const y = p.y * H + (p.y > 0 ? gy / 2 : 0);
    const w = p.w * W - (p.x > 0 ? gx / 2 : 0) - (p.x + p.w < 1 ? gx / 2 : 0);
    const h = p.h * H - (p.y > 0 ? gy / 2 : 0) - (p.y + p.h < 1 ? gy / 2 : 0);
    return { x, y, w, h };
  });
}
