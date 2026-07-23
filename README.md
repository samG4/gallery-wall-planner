# Gallery Wall Planner

Mock up a gallery wall before you put a single nail in the drywall. Set your wall
(a photo of it, or a blank sized canvas), add frame styles at their real dimensions,
drop in your photos, crop/rotate them, and arrange everything by hand or with
auto-layouts. Everything renders at real-world scale, so the proportions you see
match the physical wall.

Runs entirely in the browser. No backend, no accounts, no uploads — your images
and layout live in `localStorage` on your machine.

## Features

- **Two wall modes** — upload a photo of your actual wall, or start from a blank
  canvas at a size you type in.
- **Real-world scale** — calibrate a photo wall (reference line or known width) so
  every frame is sized to true inches/cm. Blank walls set scale from their dimensions.
- **Frame styles** — add reusable frame styles from a frame image at real outer
  dimensions, with a defined inner opening.
- **Photos in frames** — drop your photos into openings, then pan/zoom/rotate/crop
  them to fit (WYSIWYG with the canvas).
- **Arrange** — drag, rotate, and snap frames; live blueprint dimensions and a
  reference grid overlay.
- **Auto-layouts** — row, eye-line (57in), column, two-rows, grid, masonry,
  staircase, centerpiece, and alternating templates to seed an arrangement.
- **Units** — toggle inches / cm (inches are canonical internally).
- **Undo / redo** — full history with sensible gesture coalescing
  (Cmd/Ctrl+Z, Cmd/Ctrl+Shift+Z or Ctrl+Y).

## Tech stack

- React 18 + [Vite](https://vitejs.dev/) (plain JS/JSX, no TypeScript)
- [react-konva](https://konvajs.org/docs/react/) / Konva for the canvas
- No backend — state persists to `localStorage`; images stored as data URLs

## Getting started

Requires Node 18+.

```bash
git clone https://github.com/samG4/gallery-wall-planner.git
cd gallery-wall-planner
npm install
npm run dev        # http://localhost:5173
```

### Build

```bash
npm run build      # static site -> ./dist
npm run preview    # serve the production build locally
```

## Deploying

Pure static SPA — any static host works (Cloudflare Pages, Netlify, Vercel, GitHub
Pages). Build command `npm run build`, publish directory `dist`. There's no router,
so no rewrite rules are needed. See [DEPLOY.md](DEPLOY.md) for host-by-host steps.

## Project layout

```
src/
  App.jsx                  app shell, keyboard shortcuts
  store.jsx                state, persistence, undo/redo
  utils.js                 rendering math, scale, work-area
  layouts.js               auto-layout templates
  dimensions.js            blueprint measurements
  units.js                 in <-> cm conversion (edges only)
  components/
    Sidebar.jsx            4-step controls
    WallCanvas.jsx         Konva stage, calibration, selection, overlays
    FrameStyleForm.jsx     add/edit frame styles
    OpeningEditor.jsx      define a frame's inner opening
    PhotoCropEditor.jsx    fit a photo into an opening
    WallAreaEditor.jsx     pick a working sub-region on a wall photo
```

See [CLAUDE.md](CLAUDE.md) for a deeper tour of the data model and rendering math.

## Contributing

Issues and PRs welcome — see [CONTRIBUTING.md](CONTRIBUTING.md).

## License

[MIT](LICENSE) © [Samrat Garai](https://samratgarai.com)
