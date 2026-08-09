// Things that get in the way of a gallery wall.
//
// A sofa is not a rectangle stuck to the wall — it stands on the floor in front
// of it, and the only thing that matters when you're hanging pictures is how high
// its top sits. So every obstacle is described the way you'd measure it in the
// room: a width, and a vertical span given as heights ABOVE THE FLOOR.
//
//   sofa            0 → 33in   (floor to the top of the back)
//   window         30 → 78in   (sill to head)
//   light switch   46 → 51in
//
// How much of that lands on the wall area you're planning is then derived — see
// obstacleRect(). Furniture whose top is below your working area correctly ends up
// blocking nothing at all.

export const OBSTACLE_KINDS = [
  // floor-standing furniture — the top edge is the number that matters
  { key: 'sofa', label: 'Sofa', icon: '🛋️', wIn: 84, bottomFromFloorIn: 0, topFromFloorIn: 33, solid: true, measure: 'top of the back' },
  { key: 'bed', label: 'Bed', icon: '🛏️', wIn: 64, bottomFromFloorIn: 0, topFromFloorIn: 48, solid: true, measure: 'top of the headboard' },
  { key: 'console', label: 'Console', icon: '🗄️', wIn: 48, bottomFromFloorIn: 0, topFromFloorIn: 30, solid: true, measure: 'table top' },
  { key: 'desk', label: 'Desk', icon: '🪑', wIn: 60, bottomFromFloorIn: 0, topFromFloorIn: 30, solid: true, measure: 'desk top' },
  { key: 'dresser', label: 'Dresser', icon: '🧰', wIn: 60, bottomFromFloorIn: 0, topFromFloorIn: 36, solid: true, measure: 'top surface' },
  { key: 'radiator', label: 'Radiator', icon: '♨️', wIn: 36, bottomFromFloorIn: 0, topFromFloorIn: 24, solid: true, measure: 'top' },
  // fixed to the wall
  { key: 'tv', label: 'TV', icon: '📺', wIn: 48, bottomFromFloorIn: 40, topFromFloorIn: 68, solid: true, measure: 'screen' },
  { key: 'window', label: 'Window', icon: '🪟', wIn: 36, bottomFromFloorIn: 30, topFromFloorIn: 78, solid: false, measure: 'sill to head' },
  { key: 'door', label: 'Door', icon: '🚪', wIn: 32, bottomFromFloorIn: 0, topFromFloorIn: 80, solid: false, measure: 'frame' },
  { key: 'switch', label: 'Switch', icon: '🔌', wIn: 3, bottomFromFloorIn: 46, topFromFloorIn: 51, solid: false, measure: 'plate' },
  { key: 'thermostat', label: 'Thermostat', icon: '🌡️', wIn: 4, bottomFromFloorIn: 48, topFromFloorIn: 53, solid: false, measure: 'unit' },
  { key: 'other', label: 'Other', icon: '⬛', wIn: 24, bottomFromFloorIn: 0, topFromFloorIn: 24, solid: true, measure: 'height' },
]

export const obstacleKind = (key) =>
  OBSTACLE_KINDS.find((k) => k.key === key) || OBSTACLE_KINDS[OBSTACLE_KINDS.length - 1]

// How much of an obstacle actually falls inside the working wall area.
// Returns a rect in wall coordinates (y measured down from the top of the area),
// or null when the obstacle sits entirely below or above it.
export function obstacleRect(o, wallHIn, floorOffsetIn = 0) {
  if (!(wallHIn > 0)) return null
  const areaBottom = floorOffsetIn // height above floor of the area's bottom edge
  const areaTop = floorOffsetIn + wallHIn
  const top = Math.min(o.topFromFloorIn, areaTop)
  const bottom = Math.max(o.bottomFromFloorIn ?? 0, areaBottom)
  if (top - bottom < 0.05) return null
  return { x: o.xIn, w: o.wIn, y: areaTop - top, h: top - bottom }
}

// Obstacles that reach the working area, as plain rects for layout / snapping.
export function obstacleRects(obstacles, wallHIn, floorOffsetIn = 0) {
  return obstacles
    .map((o) => {
      const r = obstacleRect(o, wallHIn, floorOffsetIn)
      return r ? { id: o.id, ...r } : null
    })
    .filter(Boolean)
}

// A default obstacle placed against the bottom of the wall, centred.
export function makeObstacle(id, kindKey, wallWIn) {
  const k = obstacleKind(kindKey)
  const wIn = Math.min(k.wIn, Math.max(4, wallWIn || k.wIn))
  return {
    id,
    kind: k.key,
    label: k.label,
    xIn: Math.max(0, ((wallWIn || wIn) - wIn) / 2),
    wIn,
    bottomFromFloorIn: k.bottomFromFloorIn,
    topFromFloorIn: k.topFromFloorIn,
  }
}
