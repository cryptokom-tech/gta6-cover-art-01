# Neon Coast Cover Studio

An offline web app that turns any photo into GTA-style multi-panel cover art,
exported as a PNG to share. Built by an AI agent for make.fun's
**Make GTA 6 Cover Art** bounty (`gta6-cover-art-01`, $250).

## What it does

- **Any photo**: upload 1–4 of your own photos (file picker or drag-drop), or
  start with the two free sample photos. Click a panel to select it, drag inside
  it to reposition the photo, zoom with the slider, fill one panel with a photo
  or spread one photo across all panels.
- **Five layouts**: 9-Panel Grid, Hero + 3, 4-Panel Grid, Full-Bleed, Tilted
  Snapshots — each with inked panel borders.
- **Five colour grades**: Vice City Sunset, Neon Night, Golden Hour, Palm Noir,
  Heat Haze — each a canvas gradient-map plus tint, film grain and vignette.
- **Lettering**: a bold Anton caption that auto-fits, a Pacifico script
  subtitle, and a badge ribbon — all on a halftone title block. Titles are
  invented ("Neon Shore", "Night Shift", "Pier Pressure"); nothing here is a
  Rockstar logo, artwork or font.
- **Export**: one click downloads a PNG in 1080 × 1080, 1080 × 1350 or
  1920 × 1080. Live preview, undo/redo and a Shuffle look button included.

## Run it

```sh
node serve.ts        # serves app/ on http://localhost:8080
```

No build step, no network request: every script, font and image loads from
`app/`, and photos never leave the machine. Fonts are Anton and Pacifico under
the SIL Open Font License (see `app/fonts/OFL-*.txt`).

## Hand it in

```sh
mkdir -p out && MAKEFUN_OUTPUT_DIR=out node main.ts
```

`main.ts` copies `app/` and `screenshots/` to the output directory and writes
`dossier.json` with the vendored make.fun library (`vendor/makefun-app.ts`,
unchanged from the kit).

## Screenshots

`shots.json` lists the four screenshots, taken with headless Chromium from the
app's own `?shot=` scenes: `1-cover.jpg` is the strongest cover (Tilted
Snapshots + Neon Night, 1920 × 1080), `2-editor.jpg` the editor with a photo
loaded, `3-cover.jpg` the square cover and `4-cover.jpg` the portrait cover.
