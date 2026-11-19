// Neon Coast Cover Studio — editor wiring.
// Photos (upload or sample), layout and grade pickers, caption editing, per-panel
// click/drag/zoom, undo/redo, shuffle, and one-click PNG export in three post sizes.
// A `?shot=` query sets up a fixed scene for a screenshot instead (./shots.js).
import { drawCover, panelAt, LAYOUTS, GRADES, TITLES, layoutPanels } from './cover.js';
import { runShot } from './shots.js';

const canvas = document.getElementById('cover');
const tray = document.getElementById('tray');
const statusEl = document.getElementById('status');
const captionInput = document.getElementById('caption');
const subtitleInput = document.getElementById('subtitle');
const badgeInput = document.getElementById('badge');
const zoomInput = document.getElementById('zoom');
const zoomValue = document.getElementById('zoomValue');
const panelHint = document.getElementById('panelHint');
const exportSize = document.getElementById('exportSize');

/** The editor state. Photos hold live Image elements (never serialised); the rest is. */
const state = {
  layout: 'grid9',
  grade: 'sunset',
  caption: 'Neon Shore',
  subtitle: 'a night on the coast',
  badge: 'NEON COAST',
  size: '1920x1080',
  photos: [],
  activePhoto: 0,
  selected: 0,
  panels: {},
};

/** Undo/redo stacks hold JSON snapshots of the serialisable part of the state. */
let undoStack = [];
let redoStack = [];

function snapshotState() {
  return JSON.stringify({
    layout: state.layout, grade: state.grade, caption: state.caption,
    subtitle: state.subtitle, badge: state.badge, size: state.size,
    activePhoto: state.activePhoto, selected: state.selected, panels: state.panels,
  });
}

function restoreSnapshot(json) {
  const s = JSON.parse(json);
  state.layout = s.layout;
  state.grade = s.grade;
  state.caption = s.caption;
  state.subtitle = s.subtitle;
  state.badge = s.badge;
  state.size = s.size;
  state.activePhoto = s.activePhoto;
  state.selected = s.selected;
  state.panels = s.panels;
  syncInputs();
}

/** Records the current state for undo before a change. */
export function pushUndo() {
  undoStack.push(snapshotState());
  if (undoStack.length > 60) undoStack.shift();
  redoStack = [];
  updateUndoButtons();
}

function updateUndoButtons() {
  document.getElementById('undo').disabled = undoStack.length === 0;
  document.getElementById('redo').disabled = redoStack.length === 0;
}

/** Default panel spots for a layout: photos spread across the panels, round-robin. */
export function defaultSpots(layoutId, photoCount) {
  const count = layoutPanels(layoutId, 100, 100).length;
  const spots = [];
  for (let i = 0; i < count; i++) {
    spots.push({ photo: photoCount ? i % photoCount : -1, ox: 0, oy: 0, zoom: 1 });
  }
  return spots;
}

/** Makes sure every layout has spots, keeping existing ones when the count matches. */
export function ensureSpots() {
  for (const layout of LAYOUTS) {
    const count = layoutPanels(layout.id, 100, 100).length;
    const cur = state.panels[layout.id];
    if (!cur || cur.length !== count) {
      state.panels[layout.id] = defaultSpots(layout.id, state.photos.length);
    }
  }
}

/** Loads an image from a URL, resolving once it can be drawn. */
export function loadImage(url) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = reject;
    img.src = url;
  });
}

/** Adds a photo to the tray (max 4) and refreshes the spots. Returns its index. */
export function addPhoto(img, name) {
  if (state.photos.length >= 4) {
    statusEl.textContent = 'Four photos at most — remove one first.';
    return -1;
  }
  state.photos.push(img);
  state.activePhoto = state.photos.length - 1;
  // New photos join the rotation: panels that had no photo take one.
  ensureSpots();
  for (const layout of LAYOUTS) {
    const spots = state.panels[layout.id] || [];
    spots.forEach((spot, i) => {
      if (spot.photo < 0) spot.photo = i % state.photos.length;
    });
  }
  renderTray();
  return state.photos.length - 1;
}

/** Renders the photo tray thumbnails. */
export function renderTray() {
  tray.innerHTML = '';
  if (state.photos.length === 0) {
    const empty = document.createElement('span');
    empty.className = 'empty';
    empty.textContent = 'No photos yet.';
    tray.appendChild(empty);
    return;
  }
  state.photos.forEach((img, i) => {
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'thumb' + (i === state.activePhoto ? ' active' : '');
    btn.title = `Photo ${i + 1} — click to make active`;
    const thumb = document.createElement('img');
    thumb.src = img.src;
    thumb.alt = `Photo ${i + 1}`;
    btn.appendChild(thumb);
    btn.addEventListener('click', () => {
      state.activePhoto = i;
      renderTray();
      redraw();
    });
    const x = document.createElement('button');
    x.type = 'button';
    x.className = 'x';
    x.textContent = '×';
    x.title = 'Remove this photo';
    x.addEventListener('click', (e) => {
      e.stopPropagation();
      pushUndo();
      state.photos.splice(i, 1);
      if (state.activePhoto >= state.photos.length) state.activePhoto = Math.max(0, state.photos.length - 1);
      for (const layout of LAYOUTS) {
        for (const spot of state.panels[layout.id] || []) {
          if (spot.photo === i) spot.photo = -1;
          else if (spot.photo > i) spot.photo -= 1;
        }
      }
      renderTray();
      redraw();
    });
    btn.appendChild(x);
    tray.appendChild(btn);
  });
}

/** Redraws the live preview at the export size, CSS-scaled to fit. */
export function redraw() {
  const [w, h] = state.size.split('x').map(Number);
  if (canvas.width !== w || canvas.height !== h) {
    canvas.width = w;
    canvas.height = h;
  }
  ensureSpots();
  drawCover(canvas, state, { drawSelection: true });
  const spot = (state.panels[state.layout] || [])[state.selected];
  if (spot) {
    zoomInput.value = Math.round((spot.zoom || 1) * 100);
    zoomValue.textContent = `${Math.round((spot.zoom || 1) * 100)}%`;
    panelHint.textContent = `Panel ${state.selected + 1} selected — drag inside it to reposition, use zoom, or fill it with the active photo.`;
  }
}

/** Builds the layout picker buttons. */
function buildLayoutChoices() {
  const host = document.getElementById('layoutChoices');
  for (const layout of LAYOUTS) {
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.textContent = layout.name;
    btn.dataset.layout = layout.id;
    btn.addEventListener('click', () => {
      if (state.layout === layout.id) return;
      pushUndo();
      state.layout = layout.id;
      state.selected = 0;
      ensureSpots();
      syncChoices();
      redraw();
    });
    host.appendChild(btn);
  }
}

/** Builds the grade picker buttons with a colour swatch each. */
function buildGradeChoices() {
  const host = document.getElementById('gradeChoices');
  for (const grade of GRADES) {
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.dataset.grade = grade.id;
    btn.textContent = grade.name;
    const swatch = document.createElement('span');
    swatch.className = 'grade-swatch';
    const [r, g, b] = grade.mid;
    const [r2, g2, b2] = grade.light;
    swatch.style.background = `linear-gradient(90deg, rgb(${r},${g},${b}), rgb(${r2},${g2},${b2}))`;
    btn.appendChild(swatch);
    btn.addEventListener('click', () => {
      if (state.grade === grade.id) return;
      pushUndo();
      state.grade = grade.id;
      syncChoices();
      redraw();
    });
    host.appendChild(btn);
  }
}

/** Marks the active layout and grade buttons. */
function syncChoices() {
  for (const btn of document.querySelectorAll('#layoutChoices button')) {
    btn.classList.toggle('active', btn.dataset.layout === state.layout);
  }
  for (const btn of document.querySelectorAll('#gradeChoices button')) {
    btn.classList.toggle('active', btn.dataset.grade === state.grade);
  }
}

/** Copies the state back into the text inputs and size select. */
function syncInputs() {
  captionInput.value = state.caption;
  subtitleInput.value = state.subtitle;
  badgeInput.value = state.badge;
  exportSize.value = state.size;
  syncChoices();
}

/** Renders the cover at full export size and downloads it as a PNG. */
export function exportPng() {
  const [w, h] = state.size.split('x').map(Number);
  const off = document.createElement('canvas');
  off.width = w;
  off.height = h;
  drawCover(off, state, {});
  off.toBlob((blob) => {
    if (!blob) {
      statusEl.textContent = 'Export failed — try again.';
      return;
    }
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = `neon-coast-cover-${w}x${h}.png`;
    a.click();
    setTimeout(() => URL.revokeObjectURL(a.href), 5000);
    statusEl.textContent = `Saved neon-coast-cover-${w}x${h}.png`;
  }, 'image/png');
}

/** Picks a random layout, grade and invented title. */
export function shuffleLook() {
  pushUndo();
  state.layout = LAYOUTS[Math.floor(Math.random() * LAYOUTS.length)].id;
  state.grade = GRADES[Math.floor(Math.random() * GRADES.length)].id;
  const title = TITLES[Math.floor(Math.random() * TITLES.length)];
  state.caption = title.caption;
  state.subtitle = title.subtitle;
  state.selected = 0;
  ensureSpots();
  syncInputs();
  redraw();
}

/** Wires every control on the page. */
function wireControls() {
  buildLayoutChoices();
  buildGradeChoices();
  syncChoices();
  updateUndoButtons();

  captionInput.addEventListener('input', () => { state.caption = captionInput.value; redraw(); });
  subtitleInput.addEventListener('input', () => { state.subtitle = subtitleInput.value; redraw(); });
  badgeInput.addEventListener('input', () => { state.badge = badgeInput.value; redraw(); });
  exportSize.addEventListener('change', () => { pushUndo(); state.size = exportSize.value; redraw(); });
  document.getElementById('exportPng').addEventListener('click', exportPng);
  document.getElementById('shuffle').addEventListener('click', shuffleLook);

  document.getElementById('undo').addEventListener('click', () => {
    if (!undoStack.length) return;
    redoStack.push(snapshotState());
    restoreSnapshot(undoStack.pop());
    updateUndoButtons();
    redraw();
  });
  document.getElementById('redo').addEventListener('click', () => {
    if (!redoStack.length) return;
    undoStack.push(snapshotState());
    restoreSnapshot(redoStack.pop());
    updateUndoButtons();
    redraw();
  });

  zoomInput.addEventListener('input', () => {
    const spot = (state.panels[state.layout] || [])[state.selected];
    if (!spot) return;
    spot.zoom = Number(zoomInput.value) / 100;
    zoomValue.textContent = `${zoomInput.value}%`;
    redraw();
  });
  zoomInput.addEventListener('change', () => pushUndo());

  document.getElementById('fillPanel').addEventListener('click', () => {
    const spot = (state.panels[state.layout] || [])[state.selected];
    if (!spot || !state.photos.length) return;
    pushUndo();
    spot.photo = state.activePhoto;
    spot.ox = 0;
    spot.oy = 0;
    spot.zoom = 1;
    redraw();
  });
  document.getElementById('fillAll').addEventListener('click', () => {
    if (!state.photos.length) return;
    pushUndo();
    for (const spot of state.panels[state.layout] || []) {
      spot.photo = state.activePhoto;
      spot.ox = 0;
      spot.oy = 0;
      spot.zoom = 1;
    }
    redraw();
  });

  for (const [id, title] of [['titleNeon', 0], ['titleNight', 1], ['titlePier', 2]]) {
    document.getElementById(id).addEventListener('click', () => {
      pushUndo();
      state.caption = TITLES[title].caption;
      state.subtitle = TITLES[title].subtitle;
      syncInputs();
      redraw();
    });
  }

  // Upload: file input and drag-drop onto the dropzone.
  const input = document.getElementById('photoInput');
  const dropzone = document.getElementById('dropzone');
  input.addEventListener('change', async () => {
    for (const file of input.files) {
      if (!file.type.startsWith('image/')) continue;
      const img = await loadImage(URL.createObjectURL(file));
      addPhoto(img, file.name);
    }
    pushUndo();
    input.value = '';
    redraw();
  });
  dropzone.addEventListener('dragover', (e) => { e.preventDefault(); dropzone.classList.add('over'); });
  dropzone.addEventListener('dragleave', () => dropzone.classList.remove('over'));
  dropzone.addEventListener('drop', async (e) => {
    e.preventDefault();
    dropzone.classList.remove('over');
    for (const file of e.dataTransfer.files) {
      if (!file.type.startsWith('image/')) continue;
      const url = URL.createObjectURL(file);
      const img = await loadImage(url);
      addPhoto(img, file.name);
    }
    pushUndo();
    redraw();
  });

  // Sample photos (free to use, made for make.fun with an image model).
  document.getElementById('sampleBoulevard').addEventListener('click', async () => {
    const img = await loadImage('samples/boulevard.jpg');
    addPhoto(img, 'boulevard.jpg');
    pushUndo();
    redraw();
  });
  document.getElementById('samplePier').addEventListener('click', async () => {
    const img = await loadImage('samples/pier.jpg');
    addPhoto(img, 'pier.jpg');
    pushUndo();
    redraw();
  });

  // Panel picking and dragging on the preview canvas.
  let dragging = null;
  canvas.addEventListener('pointerdown', (e) => {
    const rect = canvas.getBoundingClientRect();
    const px = (e.clientX - rect.left) * (canvas.width / rect.width);
    const py = (e.clientY - rect.top) * (canvas.height / rect.height);
    const hit = panelAt(canvas._panels || [], px, py);
    if (hit < 0) return;
    state.selected = hit;
    dragging = { panel: hit, lastX: px, lastY: py, moved: false };
    canvas.setPointerCapture(e.pointerId);
    redraw();
  });
  canvas.addEventListener('pointermove', (e) => {
    if (!dragging) return;
    const rect = canvas.getBoundingClientRect();
    const px = (e.clientX - rect.left) * (canvas.width / rect.width);
    const py = (e.clientY - rect.top) * (canvas.height / rect.height);
    const panel = (canvas._panels || [])[dragging.panel];
    const spot = (state.panels[state.layout] || [])[dragging.panel];
    if (!panel || !spot) return;
    const dx = (px - dragging.lastX) / panel.w;
    const dy = (py - dragging.lastY) / panel.h;
    if (Math.abs(dx) + Math.abs(dy) > 0.001) dragging.moved = true;
    spot.ox = Math.max(-0.5, Math.min(0.5, (spot.ox || 0) + dx));
    spot.oy = Math.max(-0.5, Math.min(0.5, (spot.oy || 0) + dy));
    dragging.lastX = px;
    dragging.lastY = py;
    redraw();
  });
  canvas.addEventListener('pointerup', () => {
    if (dragging && dragging.moved) pushUndo();
    dragging = null;
  });
}

/** Loads the two sample photos so the studio opens with art already in it. */
export async function loadDefaultPhotos() {
  try {
    const boulevard = await loadImage('samples/boulevard.jpg');
    addPhoto(boulevard, 'boulevard.jpg');
    const pier = await loadImage('samples/pier.jpg');
    addPhoto(pier, 'pier.jpg');
  } catch (err) {
    statusEl.textContent = 'Sample photos could not load — upload your own.';
  }
  ensureSpots();
  renderTray();
  redraw();
}

const shot = new URLSearchParams(location.search).get('shot');
wireControls();
if (shot) {
  await document.fonts.load('16px Anton');
  await document.fonts.load('16px Pacifico');
  runShot(shot, new URLSearchParams(location.search), {
    loadImage, addPhoto, redraw, state, canvas,
    setState(next) {
      Object.assign(state, next);
      ensureSpots();
      syncInputs();
      syncChoices();
      redraw();
    },
  });
} else {
  await document.fonts.load('16px Anton');
  await document.fonts.load('16px Pacifico');
  await loadDefaultPhotos();
}
