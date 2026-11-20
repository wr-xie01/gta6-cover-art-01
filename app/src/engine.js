// Neon Coast Cover Studio — the cover renderer.
// Pure canvas, no DOM: the same functions draw the live preview, the export
// and the test renders. A photo is graded once per (photo, grade) and cached.

import { GRADES, panelRects } from './presets.js';

// --- colour grading -------------------------------------------------------

// One cached graded copy per source image + grade name.
const gradeCache = new Map(); // key: image src + '|' + grade name -> canvas

// Map a luminance value (0..1) through a ramp of [t, r, g, b] stops.
function rampColor(ramp, t) {
  if (t <= ramp[0][0]) return ramp[0].slice(1);
  for (let i = 1; i < ramp.length; i++) {
    if (t <= ramp[i][0]) {
      const [t0, r0, g0, b0] = ramp[i - 1];
      const [t1, r1, g1, b1] = ramp[i];
      const f = (t - t0) / (t1 - t0 || 1);
      return [r0 + (r1 - r0) * f, g0 + (g1 - g0) * f, b0 + (b1 - b0) * f];
    }
  }
  return ramp[ramp.length - 1].slice(1);
}

// Grade an image: returns a canvas holding the graded photo at a capped size
// (long side at most 1024 px — plenty for a panel, and fast to redraw).
export function gradedPhoto(img, gradeName) {
  const grade = GRADES[gradeName] ?? GRADES.original;
  const key = (img.currentSrc || img.src || '') + '|' + gradeName;
  const hit = gradeCache.get(key);
  if (hit) return hit;

  const scale = Math.min(1, 1024 / Math.max(img.naturalWidth, img.naturalHeight));
  const w = Math.max(1, Math.round(img.naturalWidth * scale));
  const h = Math.max(1, Math.round(img.naturalHeight * scale));
  const cv = document.createElement('canvas');
  cv.width = w;
  cv.height = h;
  const ctx = cv.getContext('2d');
  ctx.drawImage(img, 0, 0, w, h);

  if (grade.ramp) {
    const data = ctx.getImageData(0, 0, w, h);
    const px = data.data;
    const c = grade.contrast;
    for (let i = 0; i < px.length; i += 4) {
      const lum = (0.2126 * px[i] + 0.7152 * px[i + 1] + 0.0722 * px[i + 2]) / 255;
      const punched = Math.min(1, Math.max(0, (lum - 0.5) * c + 0.5));
      const [r, g, b] = rampColor(grade.ramp, punched);
      px[i] = r;
      px[i + 1] = g;
      px[i + 2] = b;
    }
    ctx.putImageData(data, 0, 0);
  }
  gradeCache.set(key, cv);
  return cv;
}

// --- film grain ------------------------------------------------------------

// One stable noise tile, built once and tiled over the cover. Because the
// tile never changes, dragging a photo never makes the grain shimmer.
let grainTile = null;
function getGrainTile() {
  if (grainTile) return grainTile;
  const s = 128;
  const cv = document.createElement('canvas');
  cv.width = s;
  cv.height = s;
  const ctx = cv.getContext('2d');
  const data = ctx.createImageData(s, s);
  for (let i = 0; i < data.data.length; i += 4) {
    const v = 118 + Math.floor(Math.random() * 20);
    data.data[i] = v;
    data.data[i + 1] = v;
    data.data[i + 2] = v;
    data.data[i + 3] = 255;
  }
  ctx.putImageData(data, 0, 0);
  grainTile = cv;
  return cv;
}

// --- cover drawing ---------------------------------------------------------

// A panel's photo placement: which photo, how far zoomed, where panned.
// pan is in fractions of the panel (0.5 = centred); zoom multiplies the
// cover-fit scale. drawCover clamps the pan so the photo always covers.
export function drawCover(ctx, W, H, state) {
  const { layout, grade, title, subtitle, panels, size } = state;
  const rects = panelRects(layout, W, H);

  // Dark backing so the gaps read as panel borders.
  ctx.fillStyle = '#0b0714';
  ctx.fillRect(0, 0, W, H);

  rects.forEach((r, i) => {
    const place = panels[i];
    if (!place || !place.img) {
      // Empty panel: a dashed placeholder frame.
      ctx.save();
      ctx.strokeStyle = 'rgba(255,255,255,0.55)';
      ctx.lineWidth = Math.max(1, W * 0.002);
      ctx.setLineDash([W * 0.012, W * 0.008]);
      ctx.strokeRect(r.x + 2, r.y + 2, r.w - 4, r.h - 4);
      ctx.setLineDash([]);
      ctx.fillStyle = 'rgba(255,255,255,0.75)';
      ctx.font = `700 ${Math.round(W * 0.022)}px Anton, sans-serif`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText('+ ADD PHOTO', r.x + r.w / 2, r.y + r.h / 2);
      ctx.restore();
      return;
    }
    const src = gradedPhoto(place.img, grade);
    const zoom = place.zoom || 1;
    const panX = place.panX ?? 0.5;
    const panY = place.panY ?? 0.5;
    // Cover-fit scale, then zoom.
    const s = Math.max(r.w / src.width, r.h / src.height) * zoom;
    const dw = src.width * s;
    const dh = src.height * s;
    // Pan in fractions of the overflow; clamp so the photo still covers.
    const ox = (dw - r.w) * panX;
    const oy = (dh - r.h) * panY;
    ctx.save();
    ctx.beginPath();
    ctx.rect(r.x, r.y, r.w, r.h);
    ctx.clip();
    ctx.drawImage(src, r.x - ox, r.y - oy, dw, dh);
    ctx.restore();
  });

  drawCaption(ctx, W, H, title, subtitle, size);
  drawSunMark(ctx, W, H);
  drawVignette(ctx, W, H);
  drawGrain(ctx, W, H);
}

// The caption band: a dark scrim across the bottom, the title in Anton with
// a sunset gradient and a white outline, the subtitle in Yellowtail neon.
function drawCaption(ctx, W, H, title, subtitle, size) {
  if (!title && !subtitle) return;
  const bandH = H * 0.24;
  const y0 = H - bandH;
  const grad = ctx.createLinearGradient(0, y0, 0, H);
  grad.addColorStop(0, 'rgba(8,4,18,0)');
  grad.addColorStop(0.45, 'rgba(8,4,18,0.62)');
  grad.addColorStop(1, 'rgba(8,4,18,0.88)');
  ctx.fillStyle = grad;
  ctx.fillRect(0, y0, W, bandH);

  const pad = W * 0.045;
  const titleSize = Math.round(W * (size === 'wide' ? 0.062 : 0.075));
  const subSize = Math.round(W * 0.038);
  let ty = H - pad - (subtitle ? subSize * 1.5 : 0);

  if (title) {
    ctx.save();
    ctx.font = `${titleSize}px Anton, sans-serif`;
    ctx.textAlign = 'left';
    ctx.textBaseline = 'alphabetic';
    const tg = ctx.createLinearGradient(0, ty - titleSize, 0, ty);
    tg.addColorStop(0, '#fff7d6');
    tg.addColorStop(0.55, '#ffd166');
    tg.addColorStop(1, '#ff5e62');
    ctx.lineWidth = Math.max(2, titleSize * 0.09);
    ctx.strokeStyle = 'rgba(255,255,255,0.92)';
    ctx.lineJoin = 'round';
    ctx.strokeText(title.toUpperCase(), pad, ty);
    ctx.fillStyle = tg;
    ctx.fillText(title.toUpperCase(), pad, ty);
    ctx.restore();
  }
  if (subtitle) {
    ctx.save();
    ctx.font = `${subSize}px Yellowtail, cursive`;
    ctx.textAlign = 'left';
    ctx.textBaseline = 'alphabetic';
    ctx.shadowColor = '#ff2e88';
    ctx.shadowBlur = Math.round(W * 0.012);
    ctx.fillStyle = '#ffe9f4';
    ctx.fillText(subtitle, pad, H - pad * 0.7);
    ctx.restore();
  }
}

// The studio's own mark: a small striped sun and the wordmark, top-left.
// Drawn from shapes, no borrowed artwork.
function drawSunMark(ctx, W, H) {
  const r = W * 0.028;
  const cx = W * 0.045 + r;
  const cy = H * 0.045 + r;
  ctx.save();
  const sg = ctx.createLinearGradient(cx, cy - r, cx, cy + r);
  sg.addColorStop(0, '#ffd166');
  sg.addColorStop(1, '#ff5e62');
  ctx.fillStyle = sg;
  ctx.beginPath();
  ctx.arc(cx, cy, r, 0, Math.PI * 2);
  ctx.fill();
  // Retro stripes cut across the lower half of the sun.
  ctx.fillStyle = 'rgba(11,7,20,0.85)';
  for (let i = 0; i < 3; i++) {
    const yy = cy + r * (0.1 + i * 0.28);
    const half = Math.sqrt(Math.max(0, r * r - (yy - cy) * (yy - cy)));
    ctx.fillRect(cx - half, yy, half * 2, r * 0.07);
  }
  // Wordmark beside the sun.
  ctx.font = `700 ${Math.round(W * 0.016)}px Anton, sans-serif`;
  ctx.textAlign = 'left';
  ctx.textBaseline = 'middle';
  ctx.fillStyle = 'rgba(255,255,255,0.9)';
  ctx.shadowColor = 'rgba(0,0,0,0.6)';
  ctx.shadowBlur = Math.round(W * 0.004);
  ctx.fillText('NEON COAST', cx + r * 1.5, cy);
  ctx.restore();
}

function drawVignette(ctx, W, H) {
  const g = ctx.createRadialGradient(
    W / 2, H / 2, Math.min(W, H) * 0.42,
    W / 2, H / 2, Math.max(W, H) * 0.75,
  );
  g.addColorStop(0, 'rgba(0,0,0,0)');
  g.addColorStop(1, 'rgba(0,0,0,0.32)');
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, W, H);
}

function drawGrain(ctx, W, H) {
  const tile = getGrainTile();
  const pat = ctx.createPattern(tile, 'repeat');
  ctx.save();
  ctx.globalAlpha = 0.05;
  ctx.fillStyle = pat;
  ctx.fillRect(0, 0, W, H);
  ctx.restore();
}
