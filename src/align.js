// Align / distribute for a multi-frame selection. Works on rotation-aware
// bounding boxes and returns deltas, so the caller only ever nudges xIn/yIn.

import { frameBoxIn } from './utils.js'

// items: [{id, placed, style}] -> [{id, box}]
function boxesOf(items) {
  return items.map((it) => ({ id: it.id, box: frameBoxIn(it.placed, it.style) }))
}

function patchesFrom(items, moves) {
  const byId = {}
  for (const it of items) byId[it.id] = it
  const out = {}
  for (const id of Object.keys(moves)) {
    const it = byId[id]
    if (!it) continue
    out[id] = {
      xIn: it.placed.xIn + (moves[id].dx || 0),
      yIn: it.placed.yIn + (moves[id].dy || 0),
    }
  }
  return out
}

export function align(items, mode) {
  if (items.length < 2) return {}
  const bs = boxesOf(items)
  const moves = {}
  if (mode === 'left') {
    const t = Math.min(...bs.map((b) => b.box.x))
    for (const b of bs) moves[b.id] = { dx: t - b.box.x }
  } else if (mode === 'right') {
    const t = Math.max(...bs.map((b) => b.box.x + b.box.w))
    for (const b of bs) moves[b.id] = { dx: t - (b.box.x + b.box.w) }
  } else if (mode === 'centerX') {
    const t = bs.reduce((s, b) => s + b.box.x + b.box.w / 2, 0) / bs.length
    for (const b of bs) moves[b.id] = { dx: t - (b.box.x + b.box.w / 2) }
  } else if (mode === 'top') {
    const t = Math.min(...bs.map((b) => b.box.y))
    for (const b of bs) moves[b.id] = { dy: t - b.box.y }
  } else if (mode === 'bottom') {
    const t = Math.max(...bs.map((b) => b.box.y + b.box.h))
    for (const b of bs) moves[b.id] = { dy: t - (b.box.y + b.box.h) }
  } else if (mode === 'centerY') {
    const t = bs.reduce((s, b) => s + b.box.y + b.box.h / 2, 0) / bs.length
    for (const b of bs) moves[b.id] = { dy: t - (b.box.y + b.box.h / 2) }
  }
  return patchesFrom(items, moves)
}

// Equal gaps between neighbours, outer two frames stay put.
export function distribute(items, axis) {
  if (items.length < 3) return {}
  const bs = boxesOf(items).sort((a, b) =>
    axis === 'h' ? a.box.x - b.box.x : a.box.y - b.box.y
  )
  const span =
    axis === 'h'
      ? bs[bs.length - 1].box.x + bs[bs.length - 1].box.w - bs[0].box.x
      : bs[bs.length - 1].box.y + bs[bs.length - 1].box.h - bs[0].box.y
  const used = bs.reduce((s, b) => s + (axis === 'h' ? b.box.w : b.box.h), 0)
  const gap = (span - used) / (bs.length - 1)
  let cursor = axis === 'h' ? bs[0].box.x : bs[0].box.y
  const moves = {}
  for (const b of bs) {
    const cur = axis === 'h' ? b.box.x : b.box.y
    moves[b.id] = axis === 'h' ? { dx: cursor - cur } : { dy: cursor - cur }
    cursor += (axis === 'h' ? b.box.w : b.box.h) + gap
  }
  return patchesFrom(items, moves)
}

// Force the project's standard gap between neighbours, keeping the block centred.
export function evenGap(items, axis, gapIn) {
  if (items.length < 2) return {}
  const bs = boxesOf(items).sort((a, b) =>
    axis === 'h' ? a.box.x - b.box.x : a.box.y - b.box.y
  )
  const used = bs.reduce((s, b) => s + (axis === 'h' ? b.box.w : b.box.h), 0)
  const total = used + gapIn * (bs.length - 1)
  const centre =
    bs.reduce(
      (s, b) => s + (axis === 'h' ? b.box.x + b.box.w / 2 : b.box.y + b.box.h / 2),
      0
    ) / bs.length
  let cursor = centre - total / 2
  const moves = {}
  for (const b of bs) {
    const cur = axis === 'h' ? b.box.x : b.box.y
    moves[b.id] = axis === 'h' ? { dx: cursor - cur } : { dy: cursor - cur }
    cursor += (axis === 'h' ? b.box.w : b.box.h) + gapIn
  }
  return patchesFrom(items, moves)
}
