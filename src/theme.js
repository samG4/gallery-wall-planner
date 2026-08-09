// Canvas colours. Konva takes plain strings, not CSS variables, so the palette
// lives here and mirrors the tokens in styles.css. Change both together.
//
// Premium black & white: neutral greys, pure black, pure white. The wall
// underneath can be anything from a dark photo to a white blank, so every line
// drawn over it gets a white halo under a black stroke and reads on either.

export const CANVAS = {
  // wall surface
  wallShadow: 'rgba(11, 11, 12, 0.28)',
  wallStroke: 'rgba(11, 11, 12, 0.14)',

  // under-stroke for anything drawn over unknown content
  halo: 'rgba(255, 255, 255, 0.9)',

  // working-area outline (photo mode)
  region: '#0b0b0c',

  // reference grid
  gridMinor: 'rgba(11, 11, 12, 0.10)',
  gridMajor: 'rgba(11, 11, 12, 0.24)',

  // museum eye-line
  eyeLine: '#0b0b0c',
  eyeTag: '#0b0b0c',
  eyeText: '#ffffff',

  // snap guides
  guideCenter: '#0b0b0c',
  guideEdge: '#0b0b0c',

  // calibration reference line
  calib: '#0b0b0c',

  // selection
  selection: '#0b0b0c',

  // blueprint dimensions
  dim: '#0b0b0c',
  dimTag: '#0b0b0c',
  dimText: '#ffffff',

  // obstacles
  obstacleSolid: 'rgba(11, 11, 12, 0.30)',
  obstacleOpen: 'rgba(11, 11, 12, 0.10)',
  obstacleStroke: 'rgba(11, 11, 12, 0.55)',
  obstacleStrokeSelected: '#0b0b0c',
  obstacleTag: '#0b0b0c',
  obstacleText: '#ffffff',

  // frames
  frameShadow: 'rgba(11, 11, 12, 0.45)',
  openingFilled: 'rgba(11, 11, 12, 0.26)',
  openingEmpty: 'rgba(255, 255, 255, 0.85)',
}
