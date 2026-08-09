// Turn a finished layout into something you can take to the wall with a pencil:
// per-frame offsets, hook/nail coordinates, and a parts list.
//
// All maths in inches. Callers format to the display unit at the edge.

import { frameBoxIn, workArea } from './utils.js'
import { openingOf } from './frames.js'

const TWO_HOOK_MIN_W = 24 // frames wider than this get two hooks

// Where the hooks/nails go for one frame.
// The hanger sits `dropIn` below the top of the frame; wide frames get two hooks
// at the quarter points so the frame can't tilt.
export function hooksFor(box, dropIn) {
  const y = box.y + dropIn
  if (box.w > TWO_HOOK_MIN_W) {
    return [
      { xIn: box.x + box.w / 4, yIn: y },
      { xIn: box.x + (3 * box.w) / 4, yIn: y },
    ]
  }
  return [{ xIn: box.cx, yIn: y }]
}

export function frameSizeLabel(style) {
  const r = (n) => Math.round(n * 100) / 100
  return `${r(style.outerW)}×${r(style.outerH)}`
}

// Full hanging plan for the current document.
export function hangingPlan(state) {
  const { wallWIn, wallHIn } = workArea(state)
  const styleById = {}
  for (const s of state.frameStyles) styleById[s.id] = s
  const dropIn = state.settings?.hangerDropIn ?? 1.75
  const floorOffsetIn = state.settings?.floorOffsetIn ?? 0

  const rows = state.placedFrames
    .map((p) => {
      const s = styleById[p.styleId]
      if (!s) return null
      const box = frameBoxIn(p, s)
      const hooks = hooksFor(box, dropIn).map((h) => ({
        ...h,
        fromFloorIn: floorOffsetIn + (wallHIn - h.yIn),
      }))
      return {
        id: p.id,
        name: s.name,
        rot: Math.round(p.rot || 0),
        sizeLabel: frameSizeLabel(s),
        artLabel:
          s.kind === 'preset'
            ? `${round(s.artW)}×${round(s.artH)} art${s.matIn ? ` + ${round(s.matIn)}" mat` : ''}`
            : openingOf(s)
            ? 'custom opening'
            : '—',
        hasPhoto: !!p.photoId,
        leftIn: box.x,
        topIn: box.y,
        rightIn: wallWIn - (box.x + box.w),
        bottomIn: wallHIn - (box.y + box.h),
        centerXIn: box.cx,
        centerYIn: box.cy,
        centerFromFloorIn: floorOffsetIn + (wallHIn - box.cy),
        boxWIn: box.w,
        boxHIn: box.h,
        hooks,
      }
    })
    .filter(Boolean)
    // reading order: top band first, then left to right
    .sort((a, b) => (Math.abs(a.topIn - b.topIn) > 1 ? a.topIn - b.topIn : a.leftIn - b.leftIn))

  return { rows, wallWIn, wallHIn, dropIn, floorOffsetIn, spread: spreadOf(rows) }
}

// Bounding block of the whole arrangement + how centred it is on the wall.
function spreadOf(rows) {
  if (!rows.length) return null
  const x1 = Math.min(...rows.map((r) => r.leftIn))
  const y1 = Math.min(...rows.map((r) => r.topIn))
  const x2 = Math.max(...rows.map((r) => r.leftIn + r.boxWIn))
  const y2 = Math.max(...rows.map((r) => r.topIn + r.boxHIn))
  return { x: x1, y: y1, w: x2 - x1, h: y2 - y1 }
}

// Parts list: one line per frame style actually placed, with optional cost.
export function shoppingList(state) {
  const lines = state.frameStyles
    .map((s) => {
      const placed = state.placedFrames.filter((p) => p.styleId === s.id).length
      if (!placed) return null
      const unit = typeof s.price === 'number' && !Number.isNaN(s.price) ? s.price : null
      return {
        id: s.id,
        name: s.name,
        sizeLabel: frameSizeLabel(s),
        qty: placed,
        owned: s.count,
        toBuy: Math.max(0, placed - (s.count || 0)),
        unit,
        subtotal: unit == null ? null : unit * placed,
      }
    })
    .filter(Boolean)
  const priced = lines.filter((l) => l.subtotal != null)
  const total = priced.length ? priced.reduce((s, l) => s + l.subtotal, 0) : null
  return { lines, total, partiallyPriced: priced.length > 0 && priced.length < lines.length }
}

const round = (n) => Math.round(n * 100) / 100
