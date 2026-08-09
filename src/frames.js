// Frame catalogue + geometry.
//
// Two kinds of frame style:
//   kind:'image'  — a photo of a real frame; the inner opening is drawn by hand
//                   (openingFrac = fractions of the frame image).
//   kind:'preset' — a frame we DRAW: art size + mat border + moulding width.
//                   Outer size is derived, so no photo of a frame is needed.
//
// Everything is inches (canonical). Nothing here touches cm.

export const MOULDINGS = [
  { key: 'black', label: 'Black', color: '#1a1b1f', edge: '#3d4046', inner: '#0d0e11' },
  { key: 'white', label: 'White', color: '#f3f1ec', edge: '#ffffff', inner: '#cdc8bf' },
  { key: 'grey', label: 'Grey', color: '#8d8a85', edge: '#aeaba5', inner: '#6c6963' },
  { key: 'oak', label: 'Oak', color: '#c79c67', edge: '#e3c294', inner: '#a67d4c' },
  { key: 'ash', label: 'Ash', color: '#ddc9a8', edge: '#f0e2c9', inner: '#b8a17e' },
  { key: 'walnut', label: 'Walnut', color: '#5c3a24', edge: '#7f5336', inner: '#3d2415' },
  { key: 'gold', label: 'Gold', color: '#c2a03c', edge: '#eddb92', inner: '#8f7220' },
  { key: 'silver', label: 'Silver', color: '#b4b8be', edge: '#e6e9ed', inner: '#8c9198' },
]

export const MATS = [
  { key: 'white', label: 'White', color: '#f8f6f1' },
  { key: 'ivory', label: 'Ivory', color: '#efe7d6' },
  { key: 'grey', label: 'Grey', color: '#cfd0cd' },
  { key: 'charcoal', label: 'Charcoal', color: '#3a3c40' },
  { key: 'black', label: 'Black', color: '#15161a' },
]

export const moulding = (key) => MOULDINGS.find((m) => m.key === key) || MOULDINGS[0]
export const mat = (key) => MATS.find((m) => m.key === key) || MATS[0]

// Common print / art sizes. `w`/`h` are the ART size in inches (what the frame holds),
// which is how frames are sold — the outer size then depends on mat + moulding.
export const ART_SIZES = [
  { label: '4×6', w: 4, h: 6, group: 'us' },
  { label: '5×7', w: 5, h: 7, group: 'us' },
  { label: '6×8', w: 6, h: 8, group: 'us' },
  { label: '8×8', w: 8, h: 8, group: 'us' },
  { label: '8×10', w: 8, h: 10, group: 'us' },
  { label: '9×12', w: 9, h: 12, group: 'us' },
  { label: '10×10', w: 10, h: 10, group: 'us' },
  { label: '11×14', w: 11, h: 14, group: 'us' },
  { label: '12×12', w: 12, h: 12, group: 'us' },
  { label: '12×16', w: 12, h: 16, group: 'us' },
  { label: '12×18', w: 12, h: 18, group: 'us' },
  { label: '16×16', w: 16, h: 16, group: 'us' },
  { label: '16×20', w: 16, h: 20, group: 'us' },
  { label: '18×24', w: 18, h: 24, group: 'us' },
  { label: '20×24', w: 20, h: 24, group: 'us' },
  { label: '20×28', w: 20, h: 28, group: 'us' },
  { label: '24×30', w: 24, h: 30, group: 'us' },
  { label: '24×36', w: 24, h: 36, group: 'us' },
  { label: '30×40', w: 30, h: 40, group: 'us' },
  { label: 'A5', w: 5.83, h: 8.27, group: 'iso' },
  { label: 'A4', w: 8.27, h: 11.69, group: 'iso' },
  { label: 'A3', w: 11.69, h: 16.54, group: 'iso' },
  { label: 'A2', w: 16.54, h: 23.39, group: 'iso' },
  { label: 'A1', w: 23.39, h: 33.11, group: 'iso' },
]

export const DEFAULT_MOULDING_IN = 0.75
export const DEFAULT_MAT_IN = 2

// Outer size of a preset frame = art + mat border + moulding, both sides.
export function presetOuter({ artW, artH, matIn = 0, frameWIn = DEFAULT_MOULDING_IN }) {
  const pad = 2 * (matIn + frameWIn)
  return { outerW: artW + pad, outerH: artH + pad }
}

// Build a drawn ("preset") frame style. No frame photo required.
export function makePresetStyle(id, opts) {
  const {
    artW,
    artH,
    matIn = DEFAULT_MAT_IN,
    frameWIn = DEFAULT_MOULDING_IN,
    mouldingKey = 'black',
    matKey = 'white',
    count = 1,
    name,
    price = null,
  } = opts
  const { outerW, outerH } = presetOuter({ artW, artH, matIn, frameWIn })
  return {
    id,
    kind: 'preset',
    name: name || `${trimNum(artW)}×${trimNum(artH)} ${moulding(mouldingKey).label}`,
    artW,
    artH,
    matIn,
    frameWIn,
    mouldingKey,
    matKey,
    outerW,
    outerH,
    count,
    price,
    // image-kind fields stay null so the two shapes are interchangeable downstream
    image: null,
    imgW: 0,
    imgH: 0,
    openingFrac: null,
  }
}

// Recompute derived outer size after an art/mat/moulding change.
export function repriceGeometry(style, patch) {
  const next = { ...style, ...patch }
  if (next.kind !== 'preset') return patch
  const { outerW, outerH } = presetOuter(next)
  return { ...patch, outerW, outerH }
}

// Where the visible ARTWORK sits, as fractions of the frame's outer box.
// Works for both kinds, so callers never branch on `kind`.
export function openingOf(style) {
  if (!style) return null
  if (style.kind === 'preset') {
    const inset = (style.matIn || 0) + (style.frameWIn || 0)
    const fx = inset / style.outerW
    const fy = inset / style.outerH
    if (fx >= 0.5 || fy >= 0.5) return null // degenerate: mat swallowed the art
    return { x: fx, y: fy, w: 1 - 2 * fx, h: 1 - 2 * fy }
  }
  return style.openingFrac || null
}

// A preset frame is always ready to place; an image frame needs its opening drawn.
export const styleReady = (style) => !!openingOf(style)

export function swapOrientation(style) {
  if (style.kind === 'preset') {
    return repriceGeometry(style, { artW: style.artH, artH: style.artW })
  }
  return { outerW: style.outerH, outerH: style.outerW }
}

export function trimNum(n) {
  const r = Math.round(n * 100) / 100
  return Number.isInteger(r) ? String(r) : String(r)
}
