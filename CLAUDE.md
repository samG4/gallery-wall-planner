# Gallery Wall Planner

Browser tool to mock up a gallery wall before hanging real frames. User sets a wall
(uploaded photo OR a blank sized canvas), adds frame styles at real dimensions, drops
photos into frames, crops/rotates them, and arranges frames (drag, rotate, auto-layout).
Everything renders at real-world scale so proportions match the physical wall.

## Stack
- React 18 + Vite (JS/JSX, no TypeScript).
- react-konva / konva for the canvas (drag, rotate, clip, layering).
- No backend. State persists to `localStorage` (key `gallery-wall-planner:v1`); images stored as dataURLs.
- Undo/redo lives in `store.jsx`: `dispatch` is wrapped to record full-doc snapshots (structural sharing keeps them cheap). Rapid same-gesture actions coalesce into one step (`updatePlaced` per id, `set` per payload-keys, 600ms window) so a drag = one undo. Exposed as `undo/redo/canUndo/canRedo`; shortcuts Cmd/Ctrl+Z, Cmd/Ctrl+Shift+Z (or Ctrl+Y) in App.jsx. History is NOT persisted across reload.
- Run: `npm run dev` (port 5173). Build: `npm run build`.

## Core model (see src/store.jsx)
- `wallMode`: `'photo' | 'blank'`. `wallImage` (dataURL) for photo; `wallColor` for blank.
- `wallNaturalW/H`: wall size in px. `pixelsPerInch`: real scale (px per inch). Blank wall sets these from typed dimensions; photo wall gets `pixelsPerInch` via calibration.
- `units`: `'in' | 'cm'` toggle. Internal canonical unit is ALWAYS inches; convert only at UI edges (src/units.js).
- `frameStyles[]`: `{id,name,image,imgW,imgH,outerW,outerH,openingFrac,count}`. `image` = solid frame photo. `openingFrac` = inner window as fractions (0..1) of the frame image. `outerW/H` in inches.
- `photos[]`: `{id,image,w,h}` pool of user images.
- `placedFrames[]`: `{id,styleId,xIn,yIn,rot,photoId,crop}`. `xIn/yIn` = top-left of the UNROTATED frame in inches. `rot` = frame rotation deg. `crop` = `{scale,ox,oy,rot}` for the photo inside the opening (ox/oy are box-size fractions; rot = photo rotation deg).

## Rendering math (src/utils.js, WallCanvas.jsx)
- `displayScale` = contain-fit of the wall into the stage. Inches -> stage px = `inches * pixelsPerInch * displayScale`.
- Frames rotate around their CENTER (Konva group offset = half-size); frame center is invariant under rotation, so `xIn = centerX - outerW/2` always.
- Frame draws SOLID photo first, then the user photo clipped to `openingFrac`, drawn ON TOP of the opening (frame center is opaque, so photo must overlay it).
- `photoPlacement()` does rotation-aware cover-fit of a photo into an opening box; returns center + size + rot.

## Layouts (src/layouts.js)
Templates take frames (real sizes) + wall size, return per-frame `{xIn,yIn,rot}` by placing CENTERS. Set: row, eyeline (57in line), column, twoRows, grid, masonry, staircase, centerpiece, alternating (rotates alt frames 90). `footprint()` gives rotated bounding box for packing.

## UI (src/components)
- `Sidebar.jsx` — 4 steps: wall setup, frame styles (+ FrameStyleForm), photos, auto-layout. Assign photo = select frame on canvas then click a photo.
- `WallCanvas.jsx` — Konva stage, calibration (reference line / wall width), placed frames, selection + Transformer rotate handle, floating action bar. Top-left view toolbar toggles a Figma-style reference `GridOverlay` and a blueprint `DimensionsOverlay`. Dims recompute live on `onDragMove` (frames dispatch position mid-drag).
- `dimensions.js` — `buildDimensions()` returns per-frame blueprint measures: one horizontal (gap to nearest left neighbour, else offset from wall left) and one vertical (nearest above, else wall top), using rotation-aware bounding boxes; plus wall totals drawn in WallCanvas.
- `OpeningEditor.jsx` — drag inner-opening rectangle on a frame image.
- `PhotoCropEditor.jsx` — pan/zoom/rotate a photo to fit an opening (WYSIWYG with the canvas).

## Conventions
- Keep inches canonical; never store cm.
- New per-frame or per-photo transforms go on `placed.crop` or `placed` and must be applied in BOTH the editor preview and WallCanvas so they stay WYSIWYG.
- Modals: header + scrollable body + sticky footer with actions (no button reachable only by scrolling). Optimize for desktop (~14in) and tablet (8in+).
- After changing hooks in a Konva node, a HMR reload can wedge hook order; do a clean server restart if you see "change in order of Hooks".
