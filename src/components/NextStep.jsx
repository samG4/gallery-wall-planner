import React from 'react'
import { useStore } from '../store.jsx'
import { nextAction } from '../progress.js'

// A single, always-visible "what now?" line. It's the thing that keeps a first
// timer moving through the five steps and, crucially, tells them the path ends
// in a printable nail map rather than a mood board.
export default function NextStep({ ui, patchUi, mobile, floating = false }) {
  const { state } = useStore()
  const step = nextAction(state, ui.visited)

  const go = () => {
    const patch = { tab: step.tab, visited: { ...ui.visited, [step.tab]: true } }
    if (mobile) patch.sheetOpen = true
    if (step.action === 'guide') {
      patch.guideOpen = true
      patch.sheetOpen = false
    }
    if (step.action === 'wallArea') {
      patch.wallAreaOpen = true
      patch.sheetOpen = false
    }
    patchUi(patch)
  }

  return (
    <div className={`nextbar${floating ? ' floating' : ''}`} data-tour="next">
      {/* Keyed on the step so the copy re-enters when the next action changes. */}
      <div className="nextbar-copy" key={step.tab}>
        <span className="nextbar-kicker">Next</span>
        <strong>{step.title}</strong>
        <span className="nextbar-hint">{step.hint}</span>
      </div>
      <button onClick={go}>{step.cta}</button>
    </div>
  )
}
