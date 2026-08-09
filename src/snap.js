// Smart snapping. Everything is inches.
//
// Given a proposed axis-aligned box and the boxes already on the wall, find the
// nearest alignment and return the correction (dx, dy) plus the guide lines to draw.
// Candidates, in the order designers expect them:
//   • frame edges (left/right/top/bottom) and centres
//   • the wall's edges and centre lines
//   • the museum eye-line
//   • a gap exactly equal to the project's standard gap

const EDGE = 'edge'
const CENTER = 'center'
const GAP = 'gap'

function push(list, at, anchor, kind) {
  list.push({ at, anchor, kind })
}

// anchors are offsets from box.x (or box.y) that we try to land on a candidate.
export function snapBox(box, others, opts = {}) {
  const { wallWIn = 0, wallHIn = 0, tolIn = 0.5, gapIn = 3, eyeLineY = null } = opts

  const vs = [] // candidate x positions
  const hs = [] // candidate y positions

  if (wallWIn > 0) {
    push(vs, 0, EDGE, EDGE)
    push(vs, wallWIn, EDGE, EDGE)
    push(vs, wallWIn / 2, CENTER, CENTER)
  }
  if (wallHIn > 0) {
    push(hs, 0, EDGE, EDGE)
    push(hs, wallHIn, EDGE, EDGE)
    push(hs, wallHIn / 2, CENTER, CENTER)
  }
  if (eyeLineY != null) push(hs, eyeLineY, CENTER, CENTER)

  for (const o of others) {
    push(vs, o.x, EDGE, EDGE)
    push(vs, o.x + o.w, EDGE, EDGE)
    push(vs, o.x + o.w / 2, CENTER, CENTER)
    push(vs, o.x + o.w + gapIn, EDGE, GAP) // our left edge one gap to its right
    push(vs, o.x - gapIn, EDGE, GAP) // our right edge one gap to its left
    push(hs, o.y, EDGE, EDGE)
    push(hs, o.y + o.h, EDGE, EDGE)
    push(hs, o.y + o.h / 2, CENTER, CENTER)
    push(hs, o.y + o.h + gapIn, EDGE, GAP)
    push(hs, o.y - gapIn, EDGE, GAP)
  }

  const best = (candidates, anchors) => {
    let win = null
    for (const c of candidates) {
      for (const a of anchors) {
        // centre candidates only attract our centre; edge candidates attract edges
        if (c.anchor === CENTER && a.kind !== CENTER) continue
        if (c.anchor === EDGE && a.kind === CENTER) continue
        const d = c.at - a.at
        if (Math.abs(d) > tolIn) continue
        if (!win || Math.abs(d) < Math.abs(win.d)) win = { d, at: c.at, kind: c.kind }
      }
    }
    return win
  }

  const vWin = best(vs, [
    { at: box.x, kind: EDGE },
    { at: box.x + box.w, kind: EDGE },
    { at: box.x + box.w / 2, kind: CENTER },
  ])
  const hWin = best(hs, [
    { at: box.y, kind: EDGE },
    { at: box.y + box.h, kind: EDGE },
    { at: box.y + box.h / 2, kind: CENTER },
  ])

  const guides = []
  if (vWin) guides.push({ type: 'v', at: vWin.at, kind: vWin.kind })
  if (hWin) guides.push({ type: 'h', at: hWin.at, kind: hWin.kind })

  return { dx: vWin ? vWin.d : 0, dy: hWin ? hWin.d : 0, guides }
}
