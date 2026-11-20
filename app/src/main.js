// Neon Coast Cover Studio — the editor.
// Loads photos (samples + the user's own uploads), lets them pick a panel,
// drag it to reposition the photo, zoom, fill every panel, choose a layout,
// a colour grade and an export size, edit the caption, and export a PNG.
// Everything runs offline; a photo never leaves the device.

import { SIZES, LAYOUTS, GRADES, panelRects } from './presets.js';
import { drawCover } from './engine.js';

const SAMPLES = [
  { id: 'pier', label: 'Pier', src: './samples/pier.jpg' },
  { id: 'boulevard', label: 'Boulevard', src: './samples/boulevard.jpg' },
];

const state = {
  layout: 'grid',
  grade: 'sunset',
  size: 'square',
  title: 'Sunset Heist',
  subtitle: 'Vice Nights',
  photos: [], // {id, label, img}
  selectedPhoto: null,
  selectedPanel: 0,
  panels: [], // per panel: {img, zoom, panX, panY}
};

const $ = (id) => document.getElementById(id);
const canvas = $('cover');
const ctx = canvas.getContext('2d');

function layoutPanelCount() {
  return LAYOUTS[state.layout].panels.length;
}

function ensurePanels() {
  const n = layoutPanelCount();
  while (state.panels.length < n) state.panels.push({ img: null, zoom: 1, panX: 0.5, panY: 0.5 });
  state.panels.length = n;
  if (state.selectedPanel >= n) state.selectedPanel = 0;
}

// Fit the preview canvas to the chosen export aspect (720 px on its long side).
function sizePreview() {
  const { w, h } = SIZES[state.size];
  const long = 720;
  if (w >= h) {
    canvas.width = long;
    canvas.height = Math.round((long * h) / w);
  } else {
    canvas.height = long;
    canvas.width = Math.round((long * w) / h);
  }
}

function render() {
  ensurePanels();
  sizePreview();
  drawCover(ctx, canvas.width, canvas.height, {
    layout: state.layout,
    grade: state.grade,
    title: state.title,
    subtitle: state.subtitle,
    panels: state.panels,
    size: state.size,
  });
  // The selection outline is editor chrome: show it in the editor, never on
  // a cover shot (the cover must look exactly as the app exports it).
  if (!document.body.classList.contains('shot-cover')) highlightSelected();
}

// Outline the selected panel on the preview.
function highlightSelected() {
  const rects = panelRects(state.layout, canvas.width, canvas.height);
  const r = rects[state.selectedPanel];
  if (!r) return;
  ctx.save();
  ctx.strokeStyle = '#37e0ff';
  ctx.lineWidth = 3;
  ctx.setLineDash([10, 6]);
  ctx.strokeRect(r.x + 1.5, r.y + 1.5, r.w - 3, r.h - 3);
  ctx.restore();
}

// --- photos ----------------------------------------------------------------

function addPhoto(id, label, img) {
  const photo = { id, label, img };
  state.photos.push(photo);
  if (!state.selectedPhoto) state.selectedPhoto = photo;
  const thumb = document.createElement('button');
  thumb.type = 'button';
  thumb.className = 'thumb';
  thumb.title = label;
  const t = document.createElement('img');
  t.src = img.src;
  t.alt = label;
  thumb.appendChild(t);
  thumb.addEventListener('click', () => {
    state.selectedPhoto = photo;
    document.querySelectorAll('.thumb').forEach((el) => el.classList.remove('on'));
    thumb.classList.add('on');
    putPhotoInSelectedPanel();
  });
  $('thumbs').appendChild(thumb);
  return photo;
}

function loadImage(src) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = reject;
    img.src = src;
  });
}

async function loadSamples() {
  for (const s of SAMPLES) {
    try {
      const img = await loadImage(s.src);
      addPhoto(s.id, s.label, img);
    } catch {
      // A missing sample just means one fewer thumbnail; the app still works.
    }
  }
  // Start with the first sample in every panel so the preview is never empty.
  if (state.photos.length) {
    state.selectedPhoto = state.photos[0];
    state.panels.forEach((p) => {
      p.img = state.photos[0].img;
    });
  }
  render();
}

function putPhotoInSelectedPanel() {
  if (!state.selectedPhoto) return;
  ensurePanels();
  state.panels[state.selectedPanel].img = state.selectedPhoto.img;
  state.panels[state.selectedPanel].zoom = 1;
  state.panels[state.selectedPanel].panX = 0.5;
  state.panels[state.selectedPanel].panY = 0.5;
  render();
}

$('photo').addEventListener('change', async (ev) => {
  for (const file of ev.target.files) {
    if (!file.type.startsWith('image/')) continue;
    const url = URL.createObjectURL(file);
    try {
      const img = await loadImage(url);
      addPhoto('up' + Date.now() + Math.random().toString(36).slice(2), file.name, img);
    } catch {
      URL.revokeObjectURL(url);
    }
  }
  ev.target.value = '';
  render();
});

$('fillAll').addEventListener('click', () => {
  if (!state.selectedPhoto) return;
  ensurePanels();
  state.panels.forEach((p) => {
    p.img = state.selectedPhoto.img;
    p.zoom = 1;
    p.panX = 0.5;
    p.panY = 0.5;
  });
  render();
});

// --- panel picking + dragging ----------------------------------------------

function panelAt(clientX, clientY) {
  const rect = canvas.getBoundingClientRect();
  const x = ((clientX - rect.left) / rect.width) * canvas.width;
  const y = ((clientY - rect.top) / rect.height) * canvas.height;
  const rects = panelRects(state.layout, canvas.width, canvas.height);
  for (let i = 0; i < rects.length; i++) {
    const r = rects[i];
    if (x >= r.x && x < r.x + r.w && y >= r.y && y < r.y + r.h) return i;
  }
  return -1;
}

let drag = null;
canvas.addEventListener('pointerdown', (ev) => {
  const i = panelAt(ev.clientX, ev.clientY);
  if (i < 0) return;
  state.selectedPanel = i;
  const place = state.panels[i];
  drag = { x: ev.clientX, y: ev.clientY, panX: place.panX, panY: place.panY };
  canvas.setPointerCapture(ev.pointerId);
  render();
});
canvas.addEventListener('pointermove', (ev) => {
  if (!drag) return;
  const rect = canvas.getBoundingClientRect();
  const place = state.panels[state.selectedPanel];
  if (!place || !place.img) return;
  const dx = (ev.clientX - drag.x) / rect.width;
  const dy = (ev.clientY - drag.y) / rect.height;
  // Pan follows the drag; the renderer clamps it so the photo still covers.
  place.panX = Math.min(1, Math.max(0, drag.panX - dx));
  place.panY = Math.min(1, Math.max(0, drag.panY - dy));
  render();
});
canvas.addEventListener('pointerup', () => {
  drag = null;
});

$('zoom').addEventListener('input', (ev) => {
  const place = state.panels[state.selectedPanel];
  if (!place) return;
  place.zoom = Number(ev.target.value);
  render();
});

// --- pickers + caption -----------------------------------------------------

function buildPickers() {
  const mk = (holder, items, current, onPick) => {
    const box = $(holder);
    box.innerHTML = '';
    for (const [key, item] of Object.entries(items)) {
      const b = document.createElement('button');
      b.type = 'button';
      b.className = 'pick' + (key === current ? ' on' : '');
      b.textContent = item.label;
      b.addEventListener('click', () => {
        onPick(key);
        box.querySelectorAll('.pick').forEach((el) => el.classList.remove('on'));
        b.classList.add('on');
      });
      box.appendChild(b);
    }
  };
  mk('layouts', LAYOUTS, state.layout, (k) => {
    state.layout = k;
    render();
  });
  mk('grades', GRADES, state.grade, (k) => {
    state.grade = k;
    render();
  });
  mk('sizes', SIZES, state.size, (k) => {
    state.size = k;
    render();
  });
}

$('title').addEventListener('input', (ev) => {
  state.title = ev.target.value;
  render();
});
$('subtitle').addEventListener('input', (ev) => {
  state.subtitle = ev.target.value;
  render();
});

// --- export ----------------------------------------------------------------

$('export').addEventListener('click', () => {
  const { w, h } = SIZES[state.size];
  const off = document.createElement('canvas');
  off.width = w;
  off.height = h;
  drawCover(off.getContext('2d'), w, h, {
    layout: state.layout,
    grade: state.grade,
    title: state.title,
    subtitle: state.subtitle,
    panels: state.panels,
    size: state.size,
  });
  off.toBlob((blob) => {
    if (!blob) return;
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    const slug = (state.title || 'cover').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') || 'cover';
    a.download = `neon-coast-${slug}-${state.size}.png`;
    a.click();
    setTimeout(() => URL.revokeObjectURL(a.href), 5000);
  }, 'image/png');
});

// --- ?shot= support (drives the screenshots) -------------------------------

function applyShotParams() {
  const q = new URLSearchParams(location.search);
  if (q.get('photo')) {
    const want = q.get('photo');
    const found = state.photos.find((p) => p.id === want);
    if (found) state.selectedPhoto = found;
  }
  if (q.get('layout') && LAYOUTS[q.get('layout')]) state.layout = q.get('layout');
  if (q.get('grade') && GRADES[q.get('grade')]) state.grade = q.get('grade');
  if (q.get('size') && SIZES[q.get('size')]) state.size = q.get('size');
  if (q.get('caption') !== null) {
    state.title = q.get('caption') || '';
    $('title').value = state.title;
  }
  if (q.get('subtitle') !== null) {
    state.subtitle = q.get('subtitle') || '';
    $('subtitle').value = state.subtitle;
  }
  // Put the selected photo in every panel for a cover shot.
  if (state.selectedPhoto) {
    state.panels.forEach((p) => {
      p.img = state.selectedPhoto.img;
    });
  }
  if (q.get('shot') === 'cover') {
    document.body.classList.add('shot-cover');
  }
}

// --- boot ------------------------------------------------------------------

buildPickers();
$('title').value = state.title;
$('subtitle').value = state.subtitle;
ensurePanels();
loadSamples().then(() => {
  applyShotParams();
  render();
});
