// Canonical internal unit = inches. UI toggles display unit: inches or metres.

export const IN_PER_M = 1 / 0.0254

export function toInches(value, unit) {
  return unit === 'm' ? value * IN_PER_M : value
}

export function fromInches(inches, unit) {
  return unit === 'm' ? inches / IN_PER_M : inches
}

// Metres need finer rounding than inches — 0.1 m is a 4-inch step, which would
// quantise a hanger drop out of existence. 3 dp = millimetres.
const DECIMALS = { m: 3, in: 1 }
export const decimalsFor = (unit) => DECIMALS[unit] ?? 1

// Inches -> a display NUMBER, rounded to that unit's useful precision.
export function disp(inches, unit) {
  const p = 10 ** decimalsFor(unit)
  return Math.round(fromInches(inches, unit) * p) / p
}

// Step for a number input in the active unit.
export const stepFor = (unit) => (unit === 'm' ? 0.001 : 0.1)

// Round for display
export function fmt(inches, unit) {
  return disp(inches, unit).toString()
}

export const unitLabel = (unit) => (unit === 'm' ? 'm' : 'in')
