import { workArea } from './utils.js'

// The five tabs are a path, not a menu. This module is the single place that
// answers "how far along is this project?" and "what should I do next?" — the
// tab strip ticks steps off with it and the Next bar acts on it.
//
// `visited` is the transient set of tabs the user has already opened (ui.visited).
// A step you've already been to is never nudged again, so the bar runs out of
// things to say instead of nagging.

export function hasWall(state) {
  return !!state.pixelsPerInch && workArea(state).wallWIn > 0
}

// Per-tab completion. photos/arrange are optional — they tick when used, and
// never block the path to the hanging guide.
export function stepsDone(state, visited = {}) {
  return {
    wall: hasWall(state),
    frames: state.placedFrames.length > 0,
    // Arranging leaves no single trace — an auto-layout looks like any other
    // set of positions — so opening the tab counts as having done it.
    arrange: state.obstacles.length > 0 || !!visited.arrange,
    photos: state.placedFrames.some((p) => p.photoId),
    export: false, // the destination, never "done"
  }
}

// What to do next, in one sentence plus the button that does it.
// `action: 'guide'` opens the hanging guide rather than just switching tab.
export function nextAction(state, visited = {}) {
  // A photo with no scale is the one dead end in the app: nothing can be drawn
  // until the area is marked, so it gets its own step rather than the generic
  // "choose a wall" nudge.
  if (state.wallMode === 'photo' && !hasWall(state)) {
    return {
      tab: 'wall',
      action: 'wallArea',
      title: 'Set the wall area',
      hint: 'Drag a box over the wall and type its real size.',
      cta: 'Select area',
    }
  }
  if (!hasWall(state)) {
    return {
      tab: 'wall',
      title: 'Set your wall size',
      hint: 'Pick a preset. Everything after is drawn to real scale.',
      cta: 'Choose a wall',
    }
  }
  if (!state.placedFrames.length) {
    return {
      tab: 'frames',
      title: 'Add some frames',
      hint: 'Standard sizes, drawn at their real outer size.',
      cta: 'Open frames',
    }
  }
  if (!state.placedFrames.some((p) => p.photoId) && !visited.photos) {
    return {
      tab: 'photos',
      title: 'Add your photos',
      hint: 'Upload images, then drag one onto each frame.',
      cta: 'Open photos',
    }
  }
  if (state.placedFrames.length > 1 && !visited.arrange) {
    return {
      tab: 'arrange',
      title: 'Lay them out',
      hint: 'One click arranges everything around your sofa or TV.',
      cta: 'Auto-arrange',
    }
  }
  return {
    tab: 'export',
    action: 'guide',
    title: 'Print the hanging guide',
    hint: 'Every nail position, measured from the wall edges and the floor.',
    cta: 'Open guide',
  }
}
