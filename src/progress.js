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
export function stepsDone(state) {
  return {
    wall: hasWall(state),
    frames: state.placedFrames.length > 0,
    photos: state.placedFrames.some((p) => p.photoId),
    arrange: state.obstacles.length > 0,
    export: false, // the destination, never "done"
  }
}

// What to do next, in one sentence plus the button that does it.
// `action: 'guide'` opens the hanging guide rather than just switching tab.
export function nextAction(state, visited = {}) {
  if (!hasWall(state)) {
    return {
      tab: 'wall',
      title: 'Set your wall area',
      hint: 'Pick a preset size. Everything after this is drawn at true scale.',
      cta: 'Choose a wall',
    }
  }
  if (!state.placedFrames.length) {
    return {
      tab: 'frames',
      title: 'Add some frames',
      hint: 'Standard sizes, drawn at their real outer size — mat and moulding included.',
      cta: 'Open frames',
    }
  }
  if (state.placedFrames.length > 1 && !visited.arrange) {
    return {
      tab: 'arrange',
      title: 'Lay them out',
      hint: 'One click arranges everything around your sofa, TV or light switch.',
      cta: 'Auto-arrange',
    }
  }
  return {
    tab: 'export',
    action: 'guide',
    title: 'Print the hanging guide',
    hint: 'Every nail position, measured from the wall edges and up from the floor.',
    cta: 'Open guide',
  }
}
