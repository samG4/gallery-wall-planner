// Canonical internal unit = inches. UI toggles display unit.

export const IN_PER_CM = 1 / 2.54

export function toInches(value, unit) {
  return unit === 'cm' ? value * IN_PER_CM : value
}

export function fromInches(inches, unit) {
  return unit === 'cm' ? inches / IN_PER_CM : inches
}

// Round for display
export function fmt(inches, unit) {
  const v = fromInches(inches, unit)
  return (Math.round(v * 10) / 10).toString()
}

export const unitLabel = (unit) => (unit === 'cm' ? 'cm' : 'in')
