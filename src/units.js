// Canonical internal unit = inches. The UI has TWO display units per system:
//
//   metric   wall size in metres, everything else in centimetres
//   imperial inches everywhere
//
// A frame is never described in metres — "0.406 m wide" is not how anyone buys
// a frame — so anything frame-sized goes through `smallUnit(units)`.

export const IN_PER_M = 1 / 0.0254
export const IN_PER_CM = 1 / 2.54

const PER_IN = { m: 1 / IN_PER_M, cm: 1 / IN_PER_CM, in: 1 }

export function toInches(value, unit) {
  return value / (PER_IN[unit] ?? 1)
}

export function fromInches(inches, unit) {
  return inches * (PER_IN[unit] ?? 1)
}

// The display unit for anything frame-sized: a frame, a gap, a nail position,
// a distance between two frames. Wall dimensions keep the system's big unit.
export const smallUnit = (unit) => (unit === 'm' ? 'cm' : 'in')

// Metres need finer rounding than inches — 0.1 m is a 4-inch step, which would
// quantise a hanger drop out of existence. 3 dp = millimetres.
const DECIMALS = { m: 3, cm: 1, in: 1 }
export const decimalsFor = (unit) => DECIMALS[unit] ?? 1

// Inches -> a display NUMBER, rounded to that unit's useful precision.
export function disp(inches, unit) {
  const p = 10 ** decimalsFor(unit)
  return Math.round(fromInches(inches, unit) * p) / p
}

// Step for a number input in the active unit.
const STEPS = { m: 0.001, cm: 0.1, in: 0.1 }
export const stepFor = (unit) => STEPS[unit] ?? 0.1

// Round for display
export function fmt(inches, unit) {
  return disp(inches, unit).toString()
}

const LABELS = { m: 'm', cm: 'cm', in: 'in' }
export const unitLabel = (unit) => LABELS[unit] ?? 'in'

// Which system to start in. Only the US, Liberia and Myanmar are not metric;
// everyone else opening this for the first time should see their own units
// rather than have to find the toggle.
export function localeUnits() {
  try {
    const tag = navigator.languages?.[0] || navigator.language
    if (!tag) return 'in'
    const loc = new Intl.Locale(tag)
    const region = (loc.maximize?.().region || loc.region || '').toUpperCase()
    return ['US', 'LR', 'MM'].includes(region) ? 'in' : 'm'
  } catch (e) {
    return 'in'
  }
}
