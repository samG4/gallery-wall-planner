# Contributing

Thanks for your interest in improving Gallery Wall Planner.

## Setup

```bash
npm install
npm run dev
```

## Ground rules

- **Inches are canonical.** Never store cm — convert only at UI edges (`src/units.js`).
- **Keep it WYSIWYG.** Any new per-frame/per-photo transform must be applied in *both*
  the relevant editor preview and `WallCanvas.jsx`, or the canvas and the editor drift.
- **No backend.** State lives in `localStorage`; images are data URLs.
- Match the surrounding code style — plain JS/JSX, no TypeScript.

See [CLAUDE.md](CLAUDE.md) for the data model, rendering math, and conventions.

## Pull requests

1. Fork and branch from `main`.
2. Keep PRs focused; describe what changed and why.
3. Make sure `npm run build` succeeds before opening the PR.
4. Test in the browser — this is a visual tool, so include a screenshot for UI changes.

## Reporting bugs

Open an issue with steps to reproduce, what you expected, and what happened.
Screenshots or a short screen recording help a lot for canvas/layout bugs.
