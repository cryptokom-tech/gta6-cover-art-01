// Fixed scenes for screenshots: ?shot=editor shows the studio with sample photos
// loaded; ?shot=cover shows the exported cover alone, full frame, at the export
// size named by `size` (1920x1080, 1080x1080 or 1080x1350). `layout`, `grade`,
// `caption`, `subtitle` and `badge` pick the look. window.__shotReady is set
// once the cover has been painted, so a screenshot script can wait on it.
import { drawCover } from './cover.js';

/** Three cover variants to judge against each other before picking the cover shot. */
export const VARIANTS = {
  a: { layout: 'grid9', grade: 'sunset', caption: 'Neon Shore', subtitle: 'a night on the coast' },
  b: { layout: 'tilted', grade: 'neon', caption: 'Night Shift', subtitle: 'the city never sleeps' },
  c: { layout: 'hero3', grade: 'golden', caption: 'Pier Pressure', subtitle: 'sunset on the boardwalk' },
};

export async function runShot(shot, query, api) {
  const { loadImage, addPhoto, redraw, state, canvas, setState } = api;
  const size = query.get('size') || '1920x1080';
  const [w, h] = size.split('x').map(Number);
  canvas.width = w;
  canvas.height = h;
  state.size = size;

  // A variant preset overrides the query's own layout/grade/caption.
  const variant = VARIANTS[query.get('variant') || ''];
  const next = {
    layout: variant?.layout || query.get('layout') || 'grid9',
    grade: variant?.grade || query.get('grade') || 'sunset',
    caption: variant?.caption || query.get('caption') || 'Neon Shore',
    subtitle: variant?.subtitle || query.get('subtitle') || 'a night on the coast',
    badge: query.get('badge') || 'NEON COAST',
    selected: -1,
  };
  setState(next);

  // Both free sample photos, so every panel has art in it.
  const first = query.get('photo') || 'boulevard';
  const second = first === 'boulevard' ? 'pier' : 'boulevard';
  const img1 = await loadImage(`samples/${first}.jpg`);
  addPhoto(img1, `${first}.jpg`);
  const img2 = await loadImage(`samples/${second}.jpg`);
  addPhoto(img2, `${second}.jpg`);
  state.activePhoto = 0;

  // Vary each grid panel's crop, so the panels read as different framings of
  // the photos instead of the same crop repeated.
  if (['grid9', 'grid4', 'hero3'].includes(state.layout)) {
    const offsets = [
      [0, -0.22], [0.12, 0], [-0.12, 0.10], [0, 0.18], [-0.08, -0.10],
      [0.10, -0.18], [0, 0.05], [-0.14, 0.12], [0.12, -0.05],
    ];
    const spots = state.panels[state.layout] || [];
    spots.forEach((spot, i) => {
      const o = offsets[i % offsets.length];
      spot.ox = o[0];
      spot.oy = o[1];
      spot.zoom = 1.25;
    });
  }

  if (shot === 'cover' || shot === 'variant') {
    document.body.classList.add('shot-cover');
  } else if (shot === 'editor') {
    document.body.classList.add('shot-editor');
  }

  // Draw once at the export size, then signal readiness on the next frames.
  redraw();
  requestAnimationFrame(() => requestAnimationFrame(() => { window.__shotReady = true; }));
}
