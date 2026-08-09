// Real-world things in the way. Blocking them out is what stops a layout that
// looks great on screen from ending up half-behind the sofa or over a switch.
// Sizes are typical real-world inches; users can edit them after adding.

export const OBSTACLE_KINDS = [
  { key: 'sofa', label: 'Sofa', wIn: 84, hIn: 33, icon: '🛋️', solid: true },
  { key: 'console', label: 'Console', wIn: 48, hIn: 30, icon: '🗄️', solid: true },
  { key: 'bed', label: 'Bed', wIn: 64, hIn: 44, icon: '🛏️', solid: true },
  { key: 'tv', label: 'TV', wIn: 48, hIn: 28, icon: '📺', solid: true },
  { key: 'window', label: 'Window', wIn: 36, hIn: 48, icon: '🪟', solid: false },
  { key: 'door', label: 'Door', wIn: 32, hIn: 80, icon: '🚪', solid: false },
  { key: 'switch', label: 'Switch', wIn: 3, hIn: 5, icon: '🔌', solid: false },
  { key: 'thermostat', label: 'Thermostat', wIn: 4, hIn: 5, icon: '🌡️', solid: false },
  { key: 'other', label: 'Other', wIn: 24, hIn: 24, icon: '⬛', solid: true },
]

export const obstacleKind = (key) =>
  OBSTACLE_KINDS.find((k) => k.key === key) || OBSTACLE_KINDS[OBSTACLE_KINDS.length - 1]
