// Canvas colours. Konva takes plain strings, not CSS variables, so the palette
// lives here and mirrors the tokens in styles.css. Change both together.
//
// Base palette: #FF9D9D coral · #FFC5AA peach · #EEF8CD lime · #BBF1D2 mint.
// The pastels are surfaces; the deepened versions below carry the contrast.

export const CANVAS = {
  // wall surface
  wallShadow: 'rgba(120, 92, 84, 0.22)',
  wallStroke: 'rgba(120, 92, 84, 0.18)',

  // working-area outline (photo mode)
  region: '#e0655f',

  // reference grid
  gridMinor: 'rgba(163, 133, 122, 0.20)',
  gridMajor: 'rgba(163, 133, 122, 0.42)',

  // museum eye-line
  eyeLine: '#4fa97c',
  eyeTag: '#2f6b52',
  eyeText: '#eafaf1',

  // snap guides
  guideCenter: '#e0655f',
  guideEdge: '#4fa97c',

  // calibration reference line
  calib: '#e0655f',

  // selection
  selection: '#e0655f',

  // blueprint dimensions
  dim: '#b4554f',
  dimTag: '#4a3a3c',
  dimText: '#fff6f2',

  // obstacles
  obstacleSolid: 'rgba(122, 100, 94, 0.34)',
  obstacleOpen: 'rgba(122, 100, 94, 0.13)',
  obstacleStroke: 'rgba(96, 76, 71, 0.55)',
  obstacleStrokeSelected: '#e0655f',
  obstacleTag: '#4a3a3c',
  obstacleText: '#fff6f2',

  // frames
  frameShadow: 'rgba(94, 70, 62, 0.42)',
  openingFilled: 'rgba(94, 70, 62, 0.26)',
  openingEmpty: 'rgba(255, 255, 255, 0.8)',
}
