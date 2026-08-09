# Gallery Wall Planner

Browser tool to mock up a gallery wall before hanging real frames. User sets a wall
(uploaded photo OR a blank sized canvas), adds frames (standard sizes from the built-in
library, or a photo of a real frame), drops photos into them, crops/rotates, arranges
(drag, snap, rotate, auto-layout) around real obstacles, then prints a hanging guide with
nail positions. Everything renders at real-world scale so proportions match the physical wall.

## Stack
- React 18 + Vite (JS/JSX, no TypeScript).
- react-konva / konva for the canvas (drag, rotate, clip, layering).
- No backend. State persists to `localStorage` (key `gallery-wall-planner:v2`, migrating
  from `:v1`); images stored as dataURLs. Uploads are downscaled in `readImageFile`
  (max 1600px, JPEG re-encode) to keep the ~5MB quota reachable; `StoreProvider` exposes
  `storageFull` + `docBytes` so the UI can warn instead of losing work silently.
- Undo/redo lives in `store.jsx`: `dispatch` is wrapped to record full-doc snapshots (structural sharing keeps them cheap). Rapid same-gesture actions coalesce into one step (`updatePlaced` per id, `updateManyPlaced` per id-set, `set`/`setSettings` per payload-keys, 600ms window) so a drag = one undo. Exposed as `undo/redo/canUndo/canRedo`; shortcuts in App.jsx. History is NOT persisted across reload.
- PWA: `public/manifest.webmanifest` + `public/sw.js` (network-first HTML, cache-first
  assets), registered from `main.jsx` in production only.
- Run: `npm run dev` (port 5173). Build: `npm run build`.

## Core model (see src/store.jsx)
- `docVersion` = 2. `migrateDoc()` upgrades any older/foreign doc and is used by both
  localStorage load and project-file import.
- `wallMode`: `'photo' | 'blank'`. `wallImage` (dataURL) for photo; `wallColor` for blank.
- `wallNaturalW/H`: wall size in px. `pixelsPerInch`: real scale (px per inch). Blank wall sets these from typed dimensions; photo wall gets `pixelsPerInch` via calibration.
- Photo mode can select a working sub-region: `wallRegion` = `{x,y,w,h}` fractions of the photo + `wallRegionWIn/HIn` (real size). That region becomes the inches-origin `(0,0)` and the `wallWIn×wallHIn` working area. `workArea(state)` (src/utils.js) returns `{wallWIn,wallHIn,ox,oy}` (ox/oy = origin as photo fractions) and is the single source of truth for canvas origin, grid, dims, and auto-layout bounds. Reference-line / wall-width calibration clear `wallRegion`.
- `units`: `'in' | 'm'` toggle (metres, not centimetres — `migrateDoc` upgrades old `'cm'`
  docs). Internal canonical unit is ALWAYS inches; convert only at UI edges (src/units.js).
  **Use `disp(inches, unit)` for any displayed number and `stepFor(unit)` for any number
  input's `step`** — metres need 3 dp where inches need 1, and a hand-rolled
  `Math.round(x * 10) / 10` quantises a hanger drop out of existence in metres. Sliders
  whose range only makes sense in inches (gap, mat, moulding) stay in inches and convert
  only in their readout.
- `settings`: `{snap, gapIn, shadows, hangerDropIn, eyeLineIn, showEyeLine, wallHeightIn, floorOffsetIn}`.
  `floorOffsetIn` = how far the working area's BOTTOM edge sits above the floor; combined
  with `eyeLineIn` it converts between wall-area Y and height-above-floor.
- `frameStyles[]` — two kinds, interchangeable downstream:
  - `kind:'preset'` — DRAWN frame: `{artW,artH,matIn,frameWIn,mouldingKey,matKey}`; `outerW/H`
    are derived (`presetOuter`) and stored so all existing maths keeps working.
  - `kind:'image'` — photo of a real frame: `{image,imgW,imgH,openingFrac}` + typed `outerW/H`.
  - Both: `{id,name,outerW,outerH,count,price}`.
  - **Always use `openingOf(style)` (src/frames.js) to get the art window**, never
    `style.openingFrac` — presets have no `openingFrac`. `styleReady(style)` = has an opening.
- `photos[]`: `{id,image,w,h}` pool of user images.
- `placedFrames[]`: `{id,styleId,xIn,yIn,rot,photoId,crop}`. `xIn/yIn` = top-left of the UNROTATED frame in inches. `rot` = frame rotation deg. `crop` = `{scale,ox,oy,rot}` for the photo inside the opening (ox/oy are box-size fractions; rot = photo rotation deg).
- `obstacles[]`: `{id,kind,label,xIn,wIn,bottomFromFloorIn,topFromFloorIn}`. Obstacles are
  described the way you measure a room — a width plus a vertical span in heights ABOVE THE
  FLOOR — never as a wall rectangle. How much lands on the working area is derived by
  `obstacleRect(o, wallHIn, floorOffsetIn)` (src/obstacles.js), which returns null when the
  thing sits entirely below or above it. **Always go through `obstacleRect`/`obstacleRects`;
  don't store or read a wall-space y/h.** v2.0 docs stored a rect and are migrated in
  `migrateObstacles()`.

## Rendering math (src/utils.js, WallCanvas.jsx)
- `displayScale` = contain-fit of the wall into the stage. Inches -> content px = `inches * pixelsPerInch * displayScale`.
- Everything is drawn inside one Konva `Group` carrying the view transform
  (`{zoom, tx, ty}`), which is also `draggable` so dragging the background pans. Stroke
  widths and label scales are divided by `zoom` to stay screen-constant. Pointer positions
  for calibration come from `group.getRelativePointerPosition()`.
- Wheel events PAN. Only a ctrl/meta wheel zooms — that is what a trackpad pinch
  sends. Plain-scroll-to-zoom was removed because it hijacks normal scrolling.
- Frames rotate around their CENTER (Konva group offset = half-size); frame center is invariant under rotation, so `xIn = centerX - outerW/2` always.
- Preset frames draw moulding rect -> bevel stroke -> mat rect -> photo. Image frames draw
  the SOLID photo first, then the user photo clipped to the opening ON TOP (the frame
  centre is opaque, so the photo must overlay it).
- `frameBoxIn(placed, style)` is the one rotation-aware bbox helper — used by dimensions,
  snapping, align and hanging. Don't re-derive it.
- `photoPlacement()` does rotation-aware cover-fit of a photo into an opening box; returns center + size + rot.
- PNG export (`canvasApi.current.exportPNG()`) temporarily resets the view transform and
  hides Transformers so the shot is exactly the wall rectangle at 1:1.

## Snapping and alignment
- `snap.js` `snapBox(box, others, opts)` returns `{dx, dy, guides}`. Candidates: frame and
  obstacle edges/centres, wall edges/centre, the eye-line, and "one standard gap away".
  Tolerance is passed in screen px converted to inches, so it feels the same at any zoom.
  Alt bypasses it; `settings.snap` disables it.
- `align.js` handles multi-select align / distribute / equal-gap and returns id->patch maps
  fed to `updateManyPlaced` (one undo step).

## Layouts (src/layouts.js)
Templates take frames (real sizes) + area size, return per-frame `{xIn,yIn,rot}` by placing
CENTERS. Set: row, eyeline, column, twoRows, grid, masonry, salon, pyramid, staircase,
centerpiece, alternating (rotates alt frames 90).
- `usableArea(wallW, wallH, obstacles, clearance)` finds the tallest full-width band clear
  of obstacles; `layoutInArea(fn, frames, area, gap, ctx, bounds)` runs a template inside it,
  translates back to wall coordinates, and clamps the whole block so nothing lands off-wall.
- `ctx.eyeY` carries the eye-line in wall coordinates (translated per-area).
- `footprint()` gives rotated bounding box for packing.

## Hanging guide (src/hanging.js, HangingGuide.jsx)
`hangingPlan(state)` returns per-frame offsets from each wall edge, centre height above the
floor, and hook coordinates (`hooksFor`: one hook, or two at the quarter points above 24in
wide, `settings.hangerDropIn` below the frame top). `shoppingList(state)` totals quantities
and optional prices. The modal prints via `@media print` rules in styles.css, which hide the
app chrome and leave only `.print-sheet`. Rotated frames use the bbox top for the hook, which
is an approximation — say so if it ever matters.

## Guided path (src/progress.js, NextStep.jsx)
The five tabs are a path, not a menu. `progress.js` is the only place that answers
"how far along is this?" — `stepsDone(state, visited)` drives the ✓ on each tab, and
`nextAction(state, visited)` returns the one thing to do next (`{tab, title, hint,
cta, action?}`). `action` is `'guide'` (open the hanging guide) or `'wallArea'` (open
the wall-area editor); anything else just switches tab. `NextStep` renders it as a bar
under the panel; on mobile it also
floats above the tab bar while the sheet is down, nothing is selected, and the user
hasn't reached the guide yet. `visited` is transient UI state (`ui.visited`, set on
every tab open) so a step is never nudged twice. **New nudges go in `nextAction`, not
into panels** — the bar is the single voice telling the user where they are.
The `'wallArea'` step also renders on the canvas (`.empty-state.compact` in
WallCanvas), because that is the one step whose action happens on the canvas rather
than in the panel. No other step repeats there: one sentence, one place.

## UI (src/components)
- `Sidebar.jsx` — tab host for the five panels (`PanelWall/Frames/Photos/Arrange/Export`).
  Desktop shows a tab strip; mobile hides it and uses App's bottom tab bar + sheet.
  Both strips carry the `stepsDone` ✓ marks. The Export tab is labelled **Hang it** —
  the printed nail map is the point of the app and the tab bar has to say so.
- `App.jsx` — shell, keyboard shortcuts (undo/redo, Cmd+D duplicate, arrows nudge,
  Delete, Esc), mobile detection via `useMediaQuery('(max-width: 860px)')`, and the
  bottom sheet. UI state (`selectedIds[]`, `selectedObstacleId`, `tab`, modals) is transient.
- `WallCanvas.jsx` — Konva stage, zoom/pan, calibration, placed frames, obstacles,
  selection + Transformer rotate handle, snap guides, grid / dimensions / eye-line overlays.
  Dims recompute live on `onDragMove` (frames dispatch position mid-drag).
- `SelectionBar.jsx` — floating inspector: numeric X/Y, rotation, crop, duplicate, delete;
  align/distribute/equal-gap when several frames are selected; obstacle size/position when
  an obstacle is selected.
- `dimensions.js` — `buildDimensions()` returns per-frame blueprint measures: one horizontal (gap to nearest left neighbour, else offset from wall left) and one vertical (nearest above, else wall top); plus wall totals drawn in WallCanvas.
- `PanelWall.jsx` — branches on wall state and shows ONE of them: no wall (presets +
  size + "Use blank wall", then "Or upload a wall photo"), blank wall (same + colour),
  photo (status, a single **Select wall area** CTA, the two rarer scale routes behind a
  `<details class="more">`, "Replace wall photo", and a way back to a blank wall). The
  blank controls are never on screen next to the photo calibration — they are two
  different answers to one question. Heights sits behind a disclosure and only exists
  once a wall does. **Keep new options behind `.more`** unless a first-timer needs them.
- `WallAreaEditor.jsx` — drag a rectangle on the wall photo to pick the working area + enter its real W×H (sets scale + bounds). Opened via `ui.wallAreaOpen`.
- `OpeningEditor.jsx` — drag inner-opening rectangle on a frame image (image-kind styles only).
- `PhotoCropEditor.jsx` — pan/zoom/rotate a photo to fit an opening (WYSIWYG with the canvas).
- `Toasts.jsx` — `useToast()(message, kind)`. Use it instead of `alert()`; `alert()` and
  `confirm()` are a modal wall on mobile and get swallowed in embedded browsers. For a
  destructive action, ask twice in place (the button becomes "Tap again to…", auto-cancels
  after 8s) — see `PanelExport`'s reset.
- The canvas empty state sits over the Konva stage, which sets its own container to
  `position: relative` — it needs `z-index` to stay clickable, and its buttons need
  `pointer-events: auto` because the wrapper turns them off.

## Look and feel (src/styles.css, src/theme.js)
Premium black & white: neutral greys only (no warm tint), pure black as the single
accent, and inversion (black fill / white ink) as the "active" signal. With no colour to
lean on, meaning comes from weight and inversion — destructive buttons are the heaviest
outline on the page, toasts carry a ✓ / ⚠ / ℹ mark.

The canvas sits over content we don't control (a dark wall photo, a white blank), so a
plain black line can vanish. Everything drawn over the wall goes down twice via the
`HaloLine` / `HaloRect` helpers in WallCanvas: a white halo, then the black stroke.
**Use them for any new guide** rather than a bare `<Line>`. Note `HaloRect` takes
`strokeW`, not `width` — Rect already owns `width`.

Konva can't read CSS variables, so canvas colours live in `src/theme.js` as `CANVAS`;
**change both together.**

Motion lives in one block at the end of styles.css, on tokens: `--ease` (one curve for
everything) and `--dur-1/2/3` (feedback / arriving / travelling). Things fade up ~6px or
rise ~10px and settle; nothing loops. Panels and the Next bar re-enter because they're
keyed on the step, not because of a transition. **The canvas itself never animates** — it
is a ruler, and a ruler that slides is a lie. A `prefers-reduced-motion` block flattens
every duration, so never encode meaning in motion alone.

## Onboarding (src/components/Coachmarks.jsx)
First-run tour, replayable from the header `?`. Steps declare a `data-tour` selector, a
`prepare()` that puts the app into the state the step talks about, and copy. The target
is tracked by polling (180ms) rather than a one-shot measure, so the spotlight follows
the mobile sheet animation and layout shifts; a step whose target never appears is
skipped rather than shown floating. The measured rect is stamped with the step it belongs
to and the card only renders once that rect is fresh — otherwise the card jumps ahead
while the spotlight is still on the previous element. Seen-state is its own localStorage key, so
resetting a project doesn't replay the tour. **Anything you want the tour to point at
needs a `data-tour` attribute** — they are the anchors, don't rely on class names.
Three steps only (tab strip, wall panel, Hang it tab), each one plain sentence.
**Every step's target must exist on a virgin first run** — a step pointing at the view
toolbar or frame library left half a second of blank screen, because neither is on the
page before a wall exists. Depth belongs in the Next bar, not in more cards.

## Conventions
- Keep inches canonical; never store cm.
- New per-frame or per-photo transforms go on `placed.crop` or `placed` and must be applied in BOTH the editor preview and WallCanvas so they stay WYSIWYG.
- Anything that reads a frame's opening goes through `openingOf`; anything that reads a
  frame's bbox goes through `frameBoxIn`.
- Panel sections use `<SectionTitle title info>` — the explanation lives behind an ⓘ
  (hover title + click disclosure), not as a standing paragraph. Keep `<p class="hint">`
  only for inline instructions and validation feedback next to the control they concern.
- Multi-frame changes use `updateManyPlaced` so they undo as one step.
- `settings.eyeLineIn` is a height above the floor and MUST land on the working area.
  The reducer's `clampToWall()` enforces that on every `set`/`setSettings`/`load`, so
  resizing the wall can't strand it. Don't bypass it by mutating settings elsewhere.
- Modals: header + scrollable body + sticky footer with actions (no button reachable only by scrolling). Full-screen below 860px.
- Mobile: touch targets ≥38px, respect `env(safe-area-inset-*)`, keep the floating
  selection bar above the tab bar.
- After changing hooks in a Konva node, a HMR reload can wedge hook order; do a clean server restart if you see "change in order of Hooks".
