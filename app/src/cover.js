// Neon Coast Cover Studio — cover engine.
// Draws a multi-panel GTA-style poster cover onto a canvas: inked photo panels in a
// switchable layout, a per-panel gradient-map colour grade, a halftone title block
// with bold Anton caption lettering and a Pacifico script subtitle, a badge ribbon,
// film grain and a vignette. All art is the app's own; no Rockstar marks anywhere.

/** The five switchable panel layouts. `panels` is how many photo panels each has. */
export const LAYOUTS = [
  { id: 'grid9', name: '9-Panel Grid', panels: 9 },
  { id: 'hero3', name: 'Hero + 3', panels: 4 },
  { id: 'grid4', name: '4-Panel Grid', panels: 4 },
  { id: 'fullbleed', name: 'Full-Bleed', panels: 1 },
  { id: 'tilted', name: 'Tilted Snapshots', panels: 3 },
];

/**
 * Colour grades. Each grade is a gradient map (shadow → mid → light) blended over
 * the photo, plus a sky wash, a grain strength and a vignette strength.
 * Colours are [r, g, b] triples.
 */
export const GRADES = [
  {
    id: 'sunset', name: 'Vice City Sunset',
    shadow: [38, 16, 62], mid: [214, 74, 110], light: [255, 196, 110],
    wash: ['rgba(255,122,26,0.20)', 'rgba(255,46,136,0.10)'],
    strength: 0.55, grain: 0.06, vignette: 0.30, ink: '#14081f', band: '#170b26',
  },
  {
    id: 'neon', name: 'Neon Night',
    shadow: [8, 12, 40], mid: [190, 40, 150], light: [120, 240, 225],
    wash: ['rgba(255,46,136,0.22)', 'rgba(25,227,194,0.12)'],
    strength: 0.6, grain: 0.07, vignette: 0.34, ink: '#05081a', band: '#0a0d26',
  },
  {
    id: 'golden', name: 'Golden Hour',
    shadow: [52, 28, 10], mid: [226, 138, 44], light: [255, 226, 150],
    wash: ['rgba(255,170,40,0.20)', 'rgba(255,120,40,0.08)'],
    strength: 0.5, grain: 0.05, vignette: 0.26, ink: '#1c0f04', band: '#241304',
  },
  {
    id: 'noir', name: 'Palm Noir',
    shadow: [6, 8, 12], mid: [96, 96, 110], light: [235, 232, 225],
    wash: ['rgba(120,140,200,0.10)', 'rgba(0,0,0,0.10)'],
    strength: 0.62, grain: 0.09, vignette: 0.42, ink: '#000000', band: '#0a0a0c',
  },
  {
    id: 'haze', name: 'Heat Haze',
    shadow: [64, 40, 52], mid: [232, 130, 110], light: [255, 240, 210],
    wash: ['rgba(255,150,110,0.16)', 'rgba(255,210,160,0.10)'],
    strength: 0.42, grain: 0.04, vignette: 0.22, ink: '#22101a', band: '#2a1420',
  },
];

/** Invented cover titles (never a Rockstar title or mark). */
export const TITLES = [
  { caption: 'Neon Shore', subtitle: 'a night on the coast' },
  { caption: 'Night Shift', subtitle: 'the city never sleeps' },
  { caption: 'Pier Pressure', subtitle: 'sunset on the boardwalk' },
  { caption: 'Palm Royale', subtitle: 'golden hour, no curfew' },
  { caption: 'Hot Pursuit', subtitle: 'every light is green' },
];

/** Fraction of the cover height the title block takes (grid layouts). */
export const TITLE_FRACTION = 0.17;

/** Panel rects for a layout, in canvas pixels. `rot` is a tilt in radians. */
export function layoutPanels(layoutId, W, H) {
  const tb = H * TITLE_FRACTION;
  const areaH = H - tb;
  const gap = Math.max(4, Math.round(W * 0.011));
  const rect = (x, y, w, h, rot = 0) => ({ x, y, w, h, rot });
  switch (layoutId) {
    case 'grid9': {
      const cw = (W - gap * 2) / 3;
      const ch = (areaH - gap * 2) / 3;
      const out = [];
      for (let r = 0; r < 3; r++) {
        for (let c = 0; c < 3; c++) {
          out.push(rect(c * (cw + gap), r * (ch + gap), cw, ch));
        }
      }
      return out;
    }
    case 'hero3': {
      const heroW = W * 0.60;
      const sideX = heroW + gap;
      const sideW = W - sideX;
      const ch = (areaH - gap * 2) / 3;
      return [
        rect(0, 0, heroW, areaH),
        rect(sideX, 0, sideW, ch),
        rect(sideX, ch + gap, sideW, ch),
        rect(sideX, 2 * (ch + gap), sideW, ch),
      ];
    }
    case 'grid4': {
      const cw = (W - gap) / 2;
      const ch = (areaH - gap) / 2;
      return [
        rect(0, 0, cw, ch), rect(cw + gap, 0, cw, ch),
        rect(0, ch + gap, cw, ch), rect(cw + gap, ch + gap, cw, ch),
      ];
    }
    case 'fullbleed':
      return [rect(0, 0, W, H)];
    case 'tilted': {
      const pw = W * 0.30;
      const ph = areaH * 0.66;
      const y = areaH * 0.10;
      return [
        rect(W * 0.05, y + areaH * 0.05, pw, ph, -0.10),
        rect(W * 0.35, y, pw, ph, 0.03),
        rect(W * 0.65, y + areaH * 0.04, pw, ph, 0.09),
      ];
    }
    default:
      return layoutPanels('grid9', W, H);
  }
}

/** Linear interpolation between two [r,g,b] colours. */
export function lerpColor(a, b, t) {
  return [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t, a[2] + (b[2] - a[2]) * t];
}

/** Maps a luminance 0..1 through the grade's shadow → mid → light stops. */
export function gradeColor(grade, t) {
  return t < 0.5 ? lerpColor(grade.shadow, grade.mid, t * 2) : lerpColor(grade.mid, grade.light, (t - 0.5) * 2);
}

/** Cover-fits `img` into a rect, applying a per-panel offset (fractions of the rect) and zoom.
 * The offset is clamped to the slack the zoom leaves, so the photo never exposes
 * the background at a panel's edge. */
export function drawPhotoCover(ctx, img, x, y, w, h, ox, oy, zoom) {
  const iw = img.naturalWidth || img.width;
  const ih = img.naturalHeight || img.height;
  const scale = Math.max(w / iw, h / ih) * (zoom || 1);
  const dw = iw * scale;
  const dh = ih * scale;
  const maxOx = Math.max(0, (dw - w) / 2);
  const maxOy = Math.max(0, (dh - h) / 2);
  const sx = Math.max(-maxOx, Math.min(maxOx, (ox || 0) * w));
  const sy = Math.max(-maxOy, Math.min(maxOy, (oy || 0) * h));
  ctx.drawImage(img, x + (w - dw) / 2 + sx, y + (h - dh) / 2 + sy, dw, dh);
}

/** Cached offscreen canvas used to grade one panel at a time. */
let gradeCanvas = null;

/**
 * Applies the grade's gradient map to a rectangular region of `ctx` in place.
 * The region is read back, each pixel's luminance is mapped through the grade's
 * three stops, and the mapped colour is blended with the original by strength.
 */
export function applyGradeToRegion(ctx, x, y, w, h, grade) {
  const ix = Math.round(x);
  const iy = Math.round(y);
  const iw = Math.max(1, Math.round(w));
  const ih = Math.max(1, Math.round(h));
  let data;
  try {
    data = ctx.getImageData(ix, iy, iw, ih);
  } catch (err) {
    return;
  }
  const px = data.data;
  const s = grade.strength;
  for (let i = 0; i < px.length; i += 4) {
    const lum = (px[i] * 0.299 + px[i + 1] * 0.587 + px[i + 2] * 0.114) / 255;
    const m = gradeColor(grade, lum);
    px[i] = px[i] * (1 - s) + m[0] * s;
    px[i + 1] = px[i + 1] * (1 - s) + m[1] * s;
    px[i + 2] = px[i + 2] * (1 - s) + m[2] * s;
  }
  ctx.putImageData(data, ix, iy);
}

/** Draws one photo panel: photo, grade, sky wash, inked border. */
export function drawPanel(ctx, img, panel, grade, spot, selected) {
  const { x, y, w, h, rot } = panel;
  // Grade the photo on an offscreen canvas first, so rotation cannot misalign it.
  if (!gradeCanvas) gradeCanvas = document.createElement('canvas');
  const gw = Math.max(2, Math.round(w));
  const gh = Math.max(2, Math.round(h));
  gradeCanvas.width = gw;
  gradeCanvas.height = gh;
  const gctx = gradeCanvas.getContext('2d');
  if (img) {
    drawPhotoCover(gctx, img, 0, 0, gw, gh, spot.ox, spot.oy, spot.zoom);
  } else {
    const g = gctx.createLinearGradient(0, 0, gw, gh);
    g.addColorStop(0, '#3a2358');
    g.addColorStop(1, '#1c1030');
    gctx.fillStyle = g;
    gctx.fillRect(0, 0, gw, gh);
  }
  applyGradeToRegion(gctx, 0, 0, gw, gh, grade);
  const wash = gctx.createLinearGradient(0, 0, 0, gh);
  wash.addColorStop(0, grade.wash[0]);
  wash.addColorStop(1, grade.wash[1]);
  gctx.fillStyle = wash;
  gctx.fillRect(0, 0, gw, gh);

  ctx.save();
  if (rot) {
    ctx.translate(x + w / 2, y + h / 2);
    ctx.rotate(rot);
    ctx.translate(-w / 2, -h / 2);
  } else {
    ctx.translate(x, y);
  }
  // White snapshot border for tilted panels, none for grid panels.
  const border = rot ? Math.max(6, w * 0.035) : 0;
  if (border) {
    ctx.fillStyle = '#fdf8ef';
    ctx.shadowColor = 'rgba(0,0,0,0.55)';
    ctx.shadowBlur = w * 0.06;
    ctx.shadowOffsetY = w * 0.02;
    ctx.fillRect(-border, -border, w + border * 2, h + border * 2);
    ctx.shadowBlur = 0;
    ctx.shadowOffsetY = 0;
  }
  ctx.drawImage(gradeCanvas, 0, 0, w, h);
  // Inked outline around the panel.
  const bw = Math.max(2, w * 0.008);
  ctx.lineWidth = bw;
  ctx.strokeStyle = grade.ink;
  ctx.strokeRect(0, 0, w, h);
  ctx.lineWidth = Math.max(1, bw * 0.35);
  ctx.strokeStyle = 'rgba(255,255,255,0.85)';
  ctx.strokeRect(bw * 1.6, bw * 1.6, w - bw * 3.2, h - bw * 3.2);
  if (selected) {
    ctx.lineWidth = Math.max(3, w * 0.014);
    ctx.strokeStyle = '#ffc93c';
    ctx.setLineDash([w * 0.03, w * 0.015]);
    ctx.strokeRect(-bw * 2, -bw * 2, w + bw * 4, h + bw * 4);
    ctx.setLineDash([]);
  }
  ctx.restore();
}

/** Halftone dot field inside the title band: dots grow toward the band's edges. */
export function drawHalftone(ctx, x, y, w, h, color) {
  const step = Math.max(10, w * 0.016);
  ctx.fillStyle = color;
  for (let py = y + step / 2; py < y + h; py += step) {
    for (let px = x + step / 2; px < x + w; px += step) {
      const edge = Math.min((py - y) / h, (y + h - py) / h, (px - x) / w, (x + w - px) / w);
      const r = Math.max(0.4, step * 0.30 * (1 - edge * 1.6));
      ctx.beginPath();
      ctx.arc(px, py, r, 0, Math.PI * 2);
      ctx.fill();
    }
  }
}

/** Fits the caption to the width and returns the font size used. */
export function fitCaptionFont(ctx, text, maxWidth, startSize, family) {
  let size = startSize;
  ctx.font = `${size}px ${family}`;
  while (size > 10 && ctx.measureText(text).width > maxWidth) {
    size -= 2;
    ctx.font = `${size}px ${family}`;
  }
  return size;
}

/** The title block: halftone band, gradient Anton caption, Pacifico subtitle. */
export function drawTitleBlock(ctx, W, H, grade, caption, subtitle) {
  const tb = H * TITLE_FRACTION;
  const y = H - tb;
  ctx.fillStyle = grade.band;
  ctx.fillRect(0, y, W, tb);
  drawHalftone(ctx, 0, y, W, tb, 'rgba(255,46,136,0.28)');
  ctx.fillStyle = grade.ink;
  ctx.fillRect(0, y, W, Math.max(2, H * 0.004));
  const text = (caption || '').trim().toUpperCase() || 'NEON SHORE';
  const grad = ctx.createLinearGradient(0, y, 0, H);
  grad.addColorStop(0, '#ffc93c');
  grad.addColorStop(0.55, '#ff7a1a');
  grad.addColorStop(1, '#ff2e88');
  const size = fitCaptionFont(ctx, text, W * 0.92, tb * 0.52, 'Anton, sans-serif');
  ctx.font = `${size}px Anton, sans-serif`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.lineJoin = 'round';
  ctx.lineWidth = Math.max(2, size * 0.10);
  ctx.strokeStyle = '#12061c';
  ctx.strokeText(text, W / 2, y + tb * 0.40);
  ctx.fillStyle = grad;
  ctx.fillText(text, W / 2, y + tb * 0.40);
  const sub = (subtitle || '').trim();
  if (sub) {
    const subSize = Math.max(10, tb * 0.20);
    ctx.font = `${subSize}px Pacifico, cursive`;
    ctx.fillStyle = '#19e3c2';
    ctx.fillText(sub, W / 2, y + tb * 0.80);
  }
}

/** Small rotated badge ribbon in the top corner. */
export function drawBadge(ctx, W, H, grade, badge) {
  const text = (badge || '').trim().toUpperCase();
  if (!text) return;
  const size = Math.max(12, W * 0.021);
  ctx.save();
  ctx.font = `${size}px Anton, sans-serif`;
  const tw = ctx.measureText(text).width;
  const bw = tw + size * 1.6;
  const bh = size * 1.9;
  ctx.translate(W - bw * 0.55, bh * 0.9);
  ctx.rotate(-0.10);
  ctx.fillStyle = '#ff2e88';
  ctx.shadowColor = 'rgba(0,0,0,0.5)';
  ctx.shadowBlur = size * 0.4;
  ctx.shadowOffsetY = size * 0.12;
  ctx.fillRect(-bw / 2, -bh / 2, bw, bh);
  ctx.shadowBlur = 0;
  ctx.shadowOffsetY = 0;
  ctx.fillStyle = '#ffffff';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(text, 0, size * 0.06);
  ctx.restore();
}

/** Cached film-grain tile, generated once. */
let grainTile = null;

/** Tiles a random monochrome grain pattern over the whole canvas. */
export function drawGrain(ctx, W, H, amount) {
  if (!grainTile) {
    grainTile = document.createElement('canvas');
    grainTile.width = 140;
    grainTile.height = 140;
    const g = grainTile.getContext('2d');
    const img = g.createImageData(140, 140);
    for (let i = 0; i < img.data.length; i += 4) {
      const v = Math.floor(Math.random() * 255);
      img.data[i] = v;
      img.data[i + 1] = v;
      img.data[i + 2] = v;
      img.data[i + 3] = 255;
    }
    g.putImageData(img, 0, 0);
  }
  ctx.save();
  ctx.globalAlpha = amount;
  const pattern = ctx.createPattern(grainTile, 'repeat');
  ctx.fillStyle = pattern;
  ctx.fillRect(0, 0, W, H);
  ctx.restore();
}

/** Darkens the cover's corners with a radial vignette. */
export function drawVignette(ctx, W, H, strength) {
  const r = Math.hypot(W, H) / 2;
  const g = ctx.createRadialGradient(W / 2, H / 2, r * 0.45, W / 2, H / 2, r);
  g.addColorStop(0, 'rgba(0,0,0,0)');
  g.addColorStop(1, `rgba(0,0,0,${strength})`);
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, W, H);
}

/**
 * Draws the whole cover onto `canvas` at its own size.
 * `state` carries layout, grade id, caption, subtitle, badge, photos (HTMLImage
 * elements), per-layout panel spots, and the selected panel index (or -1).
 * `opts.drawSelection` draws the gold selection outline (preview only).
 * Returns the panel rects in canvas pixels, for click hit-testing.
 */
export function drawCover(canvas, state, opts = {}) {
  const ctx = canvas.getContext('2d');
  const W = canvas.width;
  const H = canvas.height;
  const grade = GRADES.find((g) => g.id === state.grade) || GRADES[0];
  const panels = layoutPanels(state.layout, W, H);
  const spots = state.panels[state.layout] || [];
  const photos = state.photos || [];

  // Backdrop: deep grade colour, so gaps and the tilted layout read as poster.
  const bg = ctx.createLinearGradient(0, 0, W, H);
  bg.addColorStop(0, grade.band);
  bg.addColorStop(1, grade.ink);
  ctx.fillStyle = bg;
  ctx.fillRect(0, 0, W, H);

  // Tilted layout: the first photo washes the whole backdrop first.
  if (state.layout === 'tilted' && photos[0]) {
    ctx.save();
    ctx.globalAlpha = 0.5;
    drawPhotoCover(ctx, photos[0], 0, 0, W, H, 0, 0, 1.15);
    ctx.restore();
    applyGradeToRegion(ctx, 0, 0, W, H, { ...grade, strength: grade.strength * 0.6 });
  }

  panels.forEach((panel, i) => {
    const spot = spots[i] || { photo: -1, ox: 0, oy: 0, zoom: 1 };
    const img = spot.photo >= 0 && photos[spot.photo] ? photos[spot.photo] : null;
    drawPanel(ctx, img, panel, grade, spot, opts.drawSelection && state.selected === i);
  });

  if (state.layout === 'fullbleed') {
    // A dark foot gradient keeps the caption readable over the photo.
    const foot = ctx.createLinearGradient(0, H * 0.55, 0, H);
    foot.addColorStop(0, 'rgba(0,0,0,0)');
    foot.addColorStop(1, 'rgba(0,0,0,0.55)');
    ctx.fillStyle = foot;
    ctx.fillRect(0, H * 0.55, 0 + W, H * 0.45);
  }

  drawTitleBlock(ctx, W, H, grade, state.caption, state.subtitle);
  drawBadge(ctx, W, H, grade, state.badge);
  drawGrain(ctx, W, H, grade.grain);
  drawVignette(ctx, W, H, grade.vignette);

  canvas._panels = panels;
  return panels;
}

/** Finds the panel index under a point in canvas pixels (rotated panels count). */
export function panelAt(panels, px, py) {
  for (let i = panels.length - 1; i >= 0; i--) {
    const p = panels[i];
    const cx = p.x + p.w / 2;
    const cy = p.y + p.h / 2;
    const dx = px - cx;
    const dy = py - cy;
    const cos = Math.cos(-(p.rot || 0));
    const sin = Math.sin(-(p.rot || 0));
    const lx = dx * cos - dy * sin;
    const ly = dx * sin + dy * cos;
    if (Math.abs(lx) <= p.w / 2 && Math.abs(ly) <= p.h / 2) return i;
  }
  return -1;
}
