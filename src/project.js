// Project file I/O + the one-click demo wall.
//
// A project file is just the document JSON (images included as dataURLs), so it
// round-trips through export -> import with nothing lost and no server involved.

import { emptyDoc, migrateDoc, uid, DOC_VERSION } from './store.jsx'
import { makePresetStyle } from './frames.js'
import { LAYOUTS, usableArea, layoutInArea } from './layouts.js'
import { obstacleKind } from './obstacles.js'

export const PROJECT_EXT = 'gwp.json'

export function exportProject(state) {
  return JSON.stringify({ ...state, app: 'gallery-wall-planner', docVersion: DOC_VERSION }, null, 2)
}

export function importProject(text) {
  const parsed = JSON.parse(text)
  if (!parsed || typeof parsed !== 'object') throw new Error('Not a project file')
  if (!('frameStyles' in parsed) && !('placedFrames' in parsed))
    throw new Error('That file is not a Gallery Wall Planner project')
  return migrateDoc(parsed)
}

const BLANK_PPI = 10

// A ready-made wall so a first-time visitor can see the point in one click.
export function demoDoc() {
  const doc = emptyDoc()
  const wIn = 120
  const hIn = 96
  doc.wallMode = 'blank'
  doc.wallColor = '#e8e2d8'
  doc.wallNaturalW = wIn * BLANK_PPI
  doc.wallNaturalH = hIn * BLANK_PPI
  doc.pixelsPerInch = BLANK_PPI

  const styles = [
    makePresetStyle(uid('style'), { artW: 16, artH: 20, matIn: 2.5, mouldingKey: 'black', count: 1, name: '16×20 Black' }),
    makePresetStyle(uid('style'), { artW: 11, artH: 14, matIn: 2, mouldingKey: 'oak', count: 2, name: '11×14 Oak' }),
    makePresetStyle(uid('style'), { artW: 8, artH: 10, matIn: 1.5, mouldingKey: 'white', count: 3, name: '8×10 White' }),
  ]
  doc.frameStyles = styles

  const counts = [1, 2, 3]
  const placed = []
  styles.forEach((s, i) => {
    for (let n = 0; n < counts[i]; n++) {
      placed.push({
        id: uid('placed'),
        styleId: s.id,
        xIn: 10,
        yIn: 10,
        rot: 0,
        photoId: null,
        crop: { scale: 1, ox: 0, oy: 0, rot: 0 },
      })
    }
  })

  const sofa = obstacleKind('sofa')
  doc.obstacles = [
    {
      id: uid('obs'),
      kind: 'sofa',
      label: 'Sofa',
      wIn: sofa.wIn,
      hIn: sofa.hIn,
      xIn: (wIn - sofa.wIn) / 2,
      yIn: hIn - sofa.hIn,
    },
  ]

  // Seed a two-row arrangement in the free band above the sofa.
  const byId = {}
  for (const s of styles) byId[s.id] = s
  const frames = placed.map((p) => ({ id: p.id, wIn: byId[p.styleId].outerW, hIn: byId[p.styleId].outerH }))
  const area = usableArea(wIn, hIn, doc.obstacles, doc.settings.gapIn)
  const pos = layoutInArea(
    LAYOUTS.tworows.fn,
    frames,
    area,
    doc.settings.gapIn,
    { eyeY: hIn - doc.settings.eyeLineIn },
    { w: wIn, h: hIn }
  )
  doc.placedFrames = placed.map((p) => (pos[p.id] ? { ...p, ...pos[p.id] } : p))
  doc.settings = { ...doc.settings, showEyeLine: true }
  return doc
}
