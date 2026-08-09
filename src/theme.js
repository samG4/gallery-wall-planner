// Canvas colours. Konva takes plain strings, not CSS variables, so the palette
// lives here and mirrors the tokens in styles.css. Change both together.
//
// Gallery palette: black, white, warm greys and wood. The one saturated colour is
// the oak accent, reserved for things the user is currently acting on (selection,
// snap centre lines, calibration) so it reads against any wall photo.

export const CANVAS = {
  // wall surface
  wallShadow: 'rgba(28, 26, 24, 0.30)',
  wallStroke: 'rgba(28, 26, 24, 0.16)',

  // working-area outline (photo mode)
  region: '#b5762a',

  // reference grid
  gridMinor: 'rgba(60, 56, 51, 0.16)',
  gridMajor: 'rgba(60, 56, 51, 0.34)',

  // museum eye-line
  eyeLine: '#8a6a3f',
  eyeTag: '#2b2723',
  eyeText: '#f4efe6',

  // snap guides — centres in wood, edges in ink
  guideCenter: '#b5762a',
  guideEdge: '#33302c',

  // calibration reference line
  calib: '#b5762a',

  // selection
  selection: '#b5762a',

  // blueprint dimensions
  dim: '#33302c',
  dimTag: '#1c1a18',
  dimText: '#ffffff',

  // obstacles
  obstacleSolid: 'rgba(60, 56, 51, 0.34)',
  obstacleOpen: 'rgba(60, 56, 51, 0.13)',
  obstacleStroke: 'rgba(40, 37, 33, 0.6)',
  obstacleStrokeSelected: '#b5762a',
  obstacleTag: '#1c1a18',
  obstacleText: '#f5f2ec',

  // frames
  frameShadow: 'rgba(24, 22, 20, 0.5)',
  openingFilled: 'rgba(24, 22, 20, 0.28)',
  openingEmpty: 'rgba(255, 255, 255, 0.82)',
}
