import React, { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react'

// First-run tour. Each step spotlights a real element (found by its data-tour
// attribute) and explains it. Steps whose target isn't on screen are skipped, so
// the tour survives layout changes and the desktop/mobile split.

const SEEN_KEY = 'gallery-wall-planner:tour'
const PAD = 8

export const tourSeen = () => {
  try {
    return localStorage.getItem(SEEN_KEY) === 'done'
  } catch (e) {
    return true // private mode: don't nag
  }
}
const markSeen = () => {
  try {
    localStorage.setItem(SEEN_KEY, 'done')
  } catch (e) {
    /* ignore */
  }
}

const STEPS = [
  {
    target: '[data-tour="steps"]',
    title: 'Five steps, in order',
    body: 'Wall, frames, photos, arrange, export. Work through them in order and you can’t get lost.',
    prepare: ({ patchUi }) => patchUi({ tab: 'wall', sheetOpen: false }),
  },
  {
    target: '[data-tour="panel"]',
    title: 'Start with the wall',
    body: 'Type a size, or upload a photo and drag a box over the real wall area. Everything after this is drawn at true scale.',
    prepare: ({ patchUi, mobile }) => patchUi({ tab: 'wall', sheetOpen: mobile }),
  },
  {
    target: '[data-tour="canvas"]',
    title: 'This is your wall',
    body: 'Drag a frame to move it, tap to select, shift-click to select more. Scroll to pan; pinch or Cmd/Ctrl+scroll to zoom.',
    prepare: ({ patchUi }) => patchUi({ sheetOpen: false }),
    place: 'center',
  },
  {
    target: '[data-tour="viewtools"]',
    title: 'Guides that keep you honest',
    body: 'Reference grid, live measurements between frames, the eye-line, and snapping to edges, centres and equal gaps.',
    prepare: ({ patchUi }) => patchUi({ sheetOpen: false }),
  },
  {
    target: '[data-tour="frames"]',
    title: 'Frames without the guesswork',
    body: 'Pick a standard size, a moulding and a mat — the frame is drawn at its real outer size. No photo of a frame needed.',
    prepare: ({ patchUi, mobile }) => patchUi({ tab: 'frames', sheetOpen: mobile }),
  },
  {
    target: '[data-tour="export"]',
    title: 'Then take it to the wall',
    body: 'The hanging guide prints every nail position, measured from the wall edges and up from the floor.',
    prepare: ({ patchUi, mobile }) => patchUi({ tab: 'export', sheetOpen: mobile }),
  },
]

export default function Coachmarks({ patchUi, mobile, onClose }) {
  const [i, setI] = useState(0)
  const [rect, setRect] = useState(null)

  const step = STEPS[i]

  // Returns false when the step has nothing to point at.
  const measure = useCallback(() => {
    const el = document.querySelector(STEPS[i]?.target)
    const r = el?.getBoundingClientRect()
    // Keep the last known rect on a miss — the target of the next step is often
    // one render behind, and blanking the card mid-tour reads as a glitch.
    if (!r || r.width < 4 || r.height < 4) return false
    setRect({ top: r.top, left: r.left, width: r.width, height: r.height })
    return true
  }, [i])

  const finish = useCallback(() => {
    markSeen()
    patchUi({ sheetOpen: false })
    onClose()
  }, [onClose, patchUi])

  const next = useCallback(() => {
    if (i >= STEPS.length - 1) finish()
    else setI(i + 1)
  }, [i, finish])

  // Keep the latest handlers in a ref so the tracking effect below depends only
  // on the step index — re-subscribing on every parent render would keep
  // cancelling the measurement before it ran.
  const advanceRef = useRef(next)
  advanceRef.current = next

  // Put the app into the state this step talks about…
  useLayoutEffect(() => {
    STEPS[i]?.prepare?.({ patchUi, mobile })
  }, [i, patchUi, mobile])

  // …then track the target. Polling (rather than a one-shot timer) also keeps the
  // spotlight glued to the element through the sheet animation, scrolling and
  // layout shifts.
  useEffect(() => {
    let misses = 0
    const tick = () => {
      if (measure()) misses = 0
      // Nothing to point at (e.g. the view toolbar before a wall exists) —
      // don't show an orphaned card, just move on.
      else if (++misses === 2 && STEPS[i].place !== 'center') advanceRef.current()
    }
    const id = setInterval(tick, 180)
    tick()
    window.addEventListener('resize', measure)
    return () => {
      clearInterval(id)
      window.removeEventListener('resize', measure)
    }
  }, [measure, i])

  useEffect(() => {
    const onKey = (e) => {
      if (e.key === 'Escape') finish()
      else if (e.key === 'ArrowRight' || e.key === 'Enter') next()
      else if (e.key === 'ArrowLeft') setI((n) => Math.max(0, n - 1))
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [finish, next])

  // A step that points at something still being laid out shows nothing rather
  // than an orphaned card floating in the middle of the screen.
  const centred = step?.place === 'center'
  if (!step || (!rect && !centred)) return null

  // Tooltip goes below the spotlight when there's room, otherwise above; a step
  // with no visible target just centres its card.
  const vw = window.innerWidth
  const vh = window.innerHeight
  const TIP_W = Math.min(330, vw - 24)
  let tipStyle
  if (!rect || centred) {
    tipStyle = { left: (vw - TIP_W) / 2, top: Math.max(70, vh / 2 - 90), width: TIP_W }
  } else {
    const below = rect.top + rect.height + PAD + 12
    const wantAbove = below + 190 > vh
    const top = wantAbove ? Math.max(12, rect.top - PAD - 12 - 190) : below
    const left = Math.min(
      Math.max(12, rect.left + rect.width / 2 - TIP_W / 2),
      vw - TIP_W - 12
    )
    tipStyle = { left, top, width: TIP_W }
  }

  return (
    <div className="coach-layer" role="dialog" aria-modal="true" aria-label="Product tour">
      {rect && !centred ? (
        <div
          className="coach-hole"
          style={{
            top: rect.top - PAD,
            left: rect.left - PAD,
            width: rect.width + PAD * 2,
            height: rect.height + PAD * 2,
          }}
        />
      ) : (
        <div className="coach-dim" />
      )}

      <div className="coach-tip" style={tipStyle}>
        <span className="coach-count">
          {i + 1} of {STEPS.length}
        </span>
        <h4>{step.title}</h4>
        <p>{step.body}</p>
        <div className="coach-actions">
          <button className="linkbtn" onClick={finish}>
            skip
          </button>
          <span className="spacer" />
          {i > 0 && (
            <button className="ghost" onClick={() => setI(i - 1)}>
              Back
            </button>
          )}
          <button onClick={next}>{i === STEPS.length - 1 ? 'Got it' : 'Next'}</button>
        </div>
      </div>
    </div>
  )
}
