import { footprint } from './layouts.js'

// Axis-aligned bounding box (inches) of a placed frame, accounting for rotation.
function bbox(placed, style) {
  const cx = placed.xIn + style.outerW / 2
  const cy = placed.yIn + style.outerH / 2
  const fp = footprint(style.outerW, style.outerH, placed.rot || 0)
  return { x: cx - fp.w / 2, y: cy - fp.h / 2, w: fp.w, h: fp.h }
}

const EPS = 0.05

// Build blueprint dimension annotations (all in inches).
// For each frame: ONE horizontal measure (gap to nearest left neighbour, else offset
// from wall left) and ONE vertical measure (nearest top neighbour, else wall top).
// Returns segments: {type:'h'|'v', x1,y1,x2,y2, value} where x/y are inches.
export function buildDimensions(placedFrames, styleById, wallW, wallH) {
  const boxes = placedFrames
    .map((p) => {
      const s = styleById[p.styleId]
      return s ? { id: p.id, ...bbox(p, s) } : null
    })
    .filter(Boolean)

  const out = []

  for (const b of boxes) {
    const midX = b.x + b.w / 2
    const midY = b.y + b.h / 2

    // ---- horizontal: nearest frame to the LEFT that overlaps vertically ----
    let leftRef = 0
    for (const o of boxes) {
      if (o.id === b.id) continue
      const vOverlap = o.y < b.y + b.h - EPS && o.y + o.h > b.y + EPS
      const isLeft = o.x + o.w <= b.x + EPS
      if (vOverlap && isLeft) leftRef = Math.max(leftRef, o.x + o.w)
    }
    out.push({ type: 'h', x1: leftRef, y1: midY, x2: b.x, y2: midY, value: b.x - leftRef })

    // ---- vertical: nearest frame ABOVE that overlaps horizontally ----
    let topRef = 0
    for (const o of boxes) {
      if (o.id === b.id) continue
      const hOverlap = o.x < b.x + b.w - EPS && o.x + o.w > b.x + EPS
      const isAbove = o.y + o.h <= b.y + EPS
      if (hOverlap && isAbove) topRef = Math.max(topRef, o.y + o.h)
    }
    out.push({ type: 'v', x1: midX, y1: topRef, x2: midX, y2: b.y, value: b.y - topRef })
  }

  return { dims: out, boxes }
}
