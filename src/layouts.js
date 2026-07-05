// Auto-layout / collage templates. Work in inches.
// Input frames: [{id, wIn, hIn}]  (unrotated real size)
// Output per id: {xIn, yIn, rot}  where xIn/yIn = top-left of the UNROTATED frame,
// rot = degrees. Frame center is invariant under rotation, so templates place by
// center then convert: xIn = cx - wIn/2, yIn = cy - hIn/2.

const GAP = 3 // inches between frames

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

// --- museum eye-line: centers aligned on 57in (or wall mid if short) ---
export function eyeLineLayout(frames, wallW, wallH, gap = GAP) {
  const cy = Math.min(wallH / 2, 57)
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

export const LAYOUTS = {
  row: { label: 'Single Row', fn: rowLayout },
  eyeline: { label: 'Eye-line', fn: eyeLineLayout },
  column: { label: 'Column', fn: columnLayout },
  tworows: { label: 'Two Rows', fn: twoRowsLayout },
  grid: { label: 'Grid', fn: gridLayout },
  masonry: { label: 'Masonry', fn: masonryLayout },
  staircase: { label: 'Staircase', fn: staircaseLayout },
  centerpiece: { label: 'Centerpiece', fn: centerpieceLayout },
  alternating: { label: 'Alt. Salon (90°)', fn: alternatingLayout },
}
