// Auto-layout / collage templates. Work in inches.
// Input frames: [{id, wIn, hIn}]  (unrotated real size)
// Output per id: {xIn, yIn, rot}  where xIn/yIn = top-left of the UNROTATED frame,
// rot = degrees. Frame center is invariant under rotation, so templates place by
// center then convert: xIn = cx - wIn/2, yIn = cy - hIn/2.

const GAP = 3 // inches between frames

// --- usable wall area ----------------------------------------------------
// Obstacles (a TV, a sofa, a light switch) block part of the wall. Find the
// tallest full-width horizontal band that stays clear of all of them, so
// templates centre the arrangement in real free space instead of behind the sofa.
export function usableArea(wallW, wallH, obstacles = [], clearanceIn = 6) {
  const full = { x: 0, y: 0, w: wallW, h: wallH }
  // `obstacles` are already resolved to wall-space rects ({x,y,w,h} in inches)
  // by obstacleRects(), because how much of a sofa lands on this wall depends on
  // where the wall area starts.
  const blockers = obstacles
    .filter((o) => o.w > 0 && o.h > 0)
    .map((o) => ({
      y1: Math.max(0, o.y - clearanceIn),
      y2: Math.min(wallH, o.y + o.h + clearanceIn),
    }))
    .filter((b) => b.y2 > 0 && b.y1 < wallH)
  if (!blockers.length) return full

  // Candidate band edges: wall edges + every blocker edge.
  const cuts = [0, wallH]
  for (const b of blockers) cuts.push(b.y1, b.y2)
  const sorted = [...new Set(cuts)].sort((a, b) => a - b)
  let best = null
  for (let i = 0; i < sorted.length - 1; i++) {
    const y1 = sorted[i]
    const y2 = sorted[i + 1]
    if (y2 - y1 < 1) continue
    const mid = (y1 + y2) / 2
    if (blockers.some((b) => mid > b.y1 && mid < b.y2)) continue // band is blocked
    if (!best || y2 - y1 > best.h) best = { x: 0, y: y1, w: wallW, h: y2 - y1 }
  }
  return best && best.h > 4 ? best : full
}

// Run a template inside a sub-rectangle of the wall and shift the result back
// into wall coordinates.
export function layoutInArea(fn, frames, area, gap, ctx = {}, bounds = null) {
  const local = { ...ctx }
  if (typeof ctx.eyeY === 'number') local.eyeY = ctx.eyeY - area.y
  const pos = fn(frames, area.w, area.h, gap, local)
  const out = {}
  for (const id of Object.keys(pos)) {
    out[id] = { ...pos[id], xIn: pos[id].xIn + area.x, yIn: pos[id].yIn + area.y }
  }
  // A template can produce a block taller than the free band. Never let that
  // push frames off the wall — slide the whole block back inside instead.
  if (bounds) {
    const sizeById = {}
    for (const f of frames) sizeById[f.id] = f
    const rects = Object.keys(out).map((id) => {
      const f = sizeById[id]
      const fp = footprint(f.wIn, f.hIn, out[id].rot || 0)
      const cx = out[id].xIn + f.wIn / 2
      const cy = out[id].yIn + f.hIn / 2
      return { x: cx - fp.w / 2, y: cy - fp.h / 2, w: fp.w, h: fp.h }
    })
    if (rects.length) {
      const x1 = Math.min(...rects.map((r) => r.x))
      const y1 = Math.min(...rects.map((r) => r.y))
      const x2 = Math.max(...rects.map((r) => r.x + r.w))
      const y2 = Math.max(...rects.map((r) => r.y + r.h))
      let dx = 0
      let dy = 0
      if (x2 - x1 <= bounds.w) dx = x1 < 0 ? -x1 : x2 > bounds.w ? bounds.w - x2 : 0
      else dx = -x1 // too wide to fit: at least start at the left edge
      if (y2 - y1 <= bounds.h) dy = y1 < 0 ? -y1 : y2 > bounds.h ? bounds.h - y2 : 0
      else dy = -y1
      if (dx || dy)
        for (const id of Object.keys(out)) {
          out[id] = { ...out[id], xIn: out[id].xIn + dx, yIn: out[id].yIn + dy }
        }
    }
  }
  return out
}

// Bounding-box footprint of a frame rotated by `rot` degrees.
export function footprint(wIn, hIn, rot = 0) {
  const r = (rot * Math.PI) / 180
  const c = Math.abs(Math.cos(r))
  const s = Math.abs(Math.sin(r))
  return { w: wIn * c + hIn * s, h: wIn * s + hIn * c }
}

// Convert a center placement to stored top-left form.
const byCenter = (f, cx, cy, rot = 0) => ({
  id: f.id,
  xIn: cx - f.wIn / 2,
  yIn: cy - f.hIn / 2,
  rot,
})

function collect(list) {
  const out = {}
  for (const p of list) out[p.id] = { xIn: p.xIn, yIn: p.yIn, rot: p.rot }
  return out
}

// --- centered single row ---
export function rowLayout(frames, wallW, wallH, gap = GAP) {
  const totalW = frames.reduce((s, f) => s + f.wIn, 0) + (frames.length - 1) * gap
  let x = (wallW - totalW) / 2
  const cy = wallH / 2
  return collect(
    frames.map((f) => {
      const p = byCenter(f, x + f.wIn / 2, cy, 0)
      x += f.wIn + gap
      return p
    })
  )
}

// --- museum eye-line: centers aligned on the eye-line (57in from the floor by
// default; the caller passes ctx.eyeY already converted to wall coordinates) ---
export function eyeLineLayout(frames, wallW, wallH, gap = GAP, ctx = {}) {
  const cy =
    typeof ctx.eyeY === 'number' && ctx.eyeY > 0 && ctx.eyeY < wallH
      ? ctx.eyeY
      : Math.min(wallH / 2, 57)
  const totalW = frames.reduce((s, f) => s + f.wIn, 0) + (frames.length - 1) * gap
  let x = (wallW - totalW) / 2
  return collect(
    frames.map((f) => {
      const p = byCenter(f, x + f.wIn / 2, cy, 0)
      x += f.wIn + gap
      return p
    })
  )
}

// --- vertical centered column ---
export function columnLayout(frames, wallW, wallH, gap = GAP) {
  const totalH = frames.reduce((s, f) => s + f.hIn, 0) + (frames.length - 1) * gap
  let y = (wallH - totalH) / 2
  const cx = wallW / 2
  return collect(
    frames.map((f) => {
      const p = byCenter(f, cx, y + f.hIn / 2, 0)
      y += f.hIn + gap
      return p
    })
  )
}

// helper: lay a set of frames as a centered horizontal row at center-y=cy
function rowAt(frames, wallW, cy, gap) {
  const totalW = frames.reduce((s, f) => s + f.wIn, 0) + (frames.length - 1) * gap
  let x = (wallW - totalW) / 2
  return frames.map((f) => {
    const p = byCenter(f, x + f.wIn / 2, cy, 0)
    x += f.wIn + gap
    return p
  })
}

// --- balanced two rows, block centered vertically ---
export function twoRowsLayout(frames, wallW, wallH, gap = GAP) {
  if (frames.length < 2) return rowLayout(frames, wallW, wallH, gap)
  const half = Math.ceil(frames.length / 2)
  const top = frames.slice(0, half)
  const bot = frames.slice(half)
  const topH = Math.max(...top.map((f) => f.hIn))
  const botH = Math.max(...bot.map((f) => f.hIn))
  const blockH = topH + botH + gap
  const startY = (wallH - blockH) / 2
  const placed = [
    ...rowAt(top, wallW, startY + topH / 2, gap),
    ...rowAt(bot, wallW, startY + topH + gap + botH / 2, gap),
  ]
  return collect(placed)
}

// --- even grid, block centered, cells sized to max footprint ---
export function gridLayout(frames, wallW, wallH, gap = GAP) {
  if (!frames.length) return {}
  const n = frames.length
  const cols = Math.max(1, Math.round(Math.sqrt(n * (wallW / Math.max(1, wallH)))))
  const rows = Math.ceil(n / cols)
  const cellW = Math.max(...frames.map((f) => f.wIn))
  const cellH = Math.max(...frames.map((f) => f.hIn))
  const blockW = cols * cellW + (cols - 1) * gap
  const blockH = rows * cellH + (rows - 1) * gap
  const sx = (wallW - blockW) / 2
  const sy = (wallH - blockH) / 2
  return collect(
    frames.map((f, i) => {
      const c = i % cols
      const r = Math.floor(i / cols)
      const cx = sx + c * (cellW + gap) + cellW / 2
      const cy = sy + r * (cellH + gap) + cellH / 2
      return byCenter(f, cx, cy, 0)
    })
  )
}

// --- masonry: greedily fill K columns by shortest height. Good mixed-size collage. ---
export function masonryLayout(frames, wallW, wallH, gap = GAP) {
  if (!frames.length) return {}
  const cols = Math.max(1, Math.round(Math.sqrt(frames.length * (wallW / Math.max(1, wallH)))))
  const colW = Math.max(...frames.map((f) => f.wIn))
  const heights = new Array(cols).fill(0)
  const items = [] // {f, col, yTop}
  for (const f of frames) {
    let c = 0
    for (let i = 1; i < cols; i++) if (heights[i] < heights[c]) c = i
    items.push({ f, col: c, yTop: heights[c] })
    heights[c] += f.hIn + gap
  }
  const blockW = cols * colW + (cols - 1) * gap
  const blockH = Math.max(...heights) - gap
  const sx = (wallW - blockW) / 2
  const sy = (wallH - blockH) / 2
  return collect(
    items.map(({ f, col, yTop }) =>
      byCenter(f, sx + col * (colW + gap) + colW / 2, sy + yTop + f.hIn / 2, 0)
    )
  )
}

// --- staircase: centers step diagonally up-right, whole run centered ---
export function staircaseLayout(frames, wallW, wallH, gap = GAP) {
  if (!frames.length) return {}
  const stepX = Math.max(...frames.map((f) => f.wIn)) + gap
  const stepY = (Math.max(...frames.map((f) => f.hIn)) + gap) * 0.55
  const runW = (frames.length - 1) * stepX + frames[frames.length - 1].wIn
  const runH = (frames.length - 1) * stepY
  const sx = (wallW - runW) / 2
  const midY = wallH / 2
  const startCy = midY + runH / 2
  return collect(
    frames.map((f, i) => byCenter(f, sx + i * stepX + f.wIn / 2, startCy - i * stepY, 0))
  )
}

// --- centerpiece: largest frame centered; the rest split into rows above & below ---
export function centerpieceLayout(frames, wallW, wallH, gap = GAP) {
  if (frames.length < 3) return rowLayout(frames, wallW, wallH, gap)
  const sorted = [...frames].sort((a, b) => b.wIn * b.hIn - a.wIn * a.hIn)
  const hero = sorted[0]
  const rest = sorted.slice(1)
  const half = Math.ceil(rest.length / 2)
  const top = rest.slice(0, half)
  const bot = rest.slice(half)
  const cy = wallH / 2
  const topH = top.length ? Math.max(...top.map((f) => f.hIn)) : 0
  const botH = bot.length ? Math.max(...bot.map((f) => f.hIn)) : 0
  const placed = [
    byCenter(hero, wallW / 2, cy, 0),
    ...(top.length ? rowAt(top, wallW, cy - hero.hIn / 2 - gap - topH / 2, gap) : []),
    ...(bot.length ? rowAt(bot, wallW, cy + hero.hIn / 2 + gap + botH / 2, gap) : []),
  ]
  return collect(placed)
}

// --- alternating salon: staggered rows, every other frame rotated 90° for rhythm ---
export function alternatingLayout(frames, wallW, wallH, gap = GAP) {
  if (!frames.length) return {}
  // decide rotation per frame first, then pack by footprint
  const prepared = frames.map((f, i) => ({ ...f, rot: i % 2 === 1 ? 90 : 0 }))
  const fp = (f) => footprint(f.wIn, f.hIn, f.rot)
  // pack into rows by wall width
  const rows = []
  let cur = []
  let curW = 0
  for (const f of prepared) {
    const w = fp(f).w
    if (curW + w > wallW && cur.length) {
      rows.push(cur)
      cur = []
      curW = 0
    }
    cur.push(f)
    curW += w + gap
  }
  if (cur.length) rows.push(cur)
  const rowHs = rows.map((r) => Math.max(...r.map((f) => fp(f).h)))
  const blockH = rowHs.reduce((s, h) => s + h, 0) + (rows.length - 1) * gap
  let y = (wallH - blockH) / 2
  const placed = []
  rows.forEach((r, ri) => {
    const rowW = r.reduce((s, f) => s + fp(f).w, 0) + (r.length - 1) * gap
    let x = (wallW - rowW) / 2
    const cy = y + rowHs[ri] / 2
    r.forEach((f) => {
      const w = fp(f).w
      placed.push(byCenter(f, x + w / 2, cy, f.rot))
      x += w + gap
    })
    y += rowHs[ri] + gap
  })
  return collect(placed)
}

// --- salon: pack frames into centred rows by width, no rotation. The classic
// "grew over time" gallery wall, and the safest template for mixed sizes. ---
export function salonLayout(frames, wallW, wallH, gap = GAP) {
  if (!frames.length) return {}
  const rows = []
  let cur = []
  let curW = 0
  for (const f of frames) {
    if (curW + f.wIn > wallW && cur.length) {
      rows.push(cur)
      cur = []
      curW = 0
    }
    cur.push(f)
    curW += f.wIn + gap
  }
  if (cur.length) rows.push(cur)
  const rowHs = rows.map((r) => Math.max(...r.map((f) => f.hIn)))
  const blockH = rowHs.reduce((s, h) => s + h, 0) + (rows.length - 1) * gap
  let y = (wallH - blockH) / 2
  const placed = []
  rows.forEach((r, ri) => {
    placed.push(...rowAt(r, wallW, y + rowHs[ri] / 2, gap))
    y += rowHs[ri] + gap
  })
  return collect(placed)
}

// --- pyramid: widest row at the bottom, narrowing upwards. Reads as deliberate
// and works well above a sofa or a console table. ---
export function pyramidLayout(frames, wallW, wallH, gap = GAP) {
  if (!frames.length) return {}
  const sorted = [...frames].sort((a, b) => b.wIn * b.hIn - a.wIn * a.hIn)
  // row sizes: 3,2,1 style — grow the bottom row until everything is placed
  const rows = []
  let remaining = sorted.length
  let n = Math.max(1, Math.round(Math.sqrt(remaining * 1.6)))
  while (remaining > 0) {
    const take = Math.min(n, remaining)
    rows.push(sorted.splice(0, take))
    remaining -= take
    n = Math.max(1, n - 1)
  }
  rows.reverse() // narrowest row on top
  const rowHs = rows.map((r) => Math.max(...r.map((f) => f.hIn)))
  const blockH = rowHs.reduce((s, h) => s + h, 0) + (rows.length - 1) * gap
  let y = (wallH - blockH) / 2
  const placed = []
  rows.forEach((r, ri) => {
    placed.push(...rowAt(r, wallW, y + rowHs[ri] / 2, gap))
    y += rowHs[ri] + gap
  })
  return collect(placed)
}

export const LAYOUTS = {
  row: { label: 'Single Row', fn: rowLayout },
  eyeline: { label: 'Eye-line', fn: eyeLineLayout },
  column: { label: 'Column', fn: columnLayout },
  tworows: { label: 'Two Rows', fn: twoRowsLayout },
  grid: { label: 'Grid', fn: gridLayout },
  masonry: { label: 'Masonry', fn: masonryLayout },
  salon: { label: 'Salon', fn: salonLayout },
  pyramid: { label: 'Pyramid', fn: pyramidLayout },
  staircase: { label: 'Staircase', fn: staircaseLayout },
  centerpiece: { label: 'Centerpiece', fn: centerpieceLayout },
  alternating: { label: 'Alt. Salon (90°)', fn: alternatingLayout },
}
