import React from 'react'
import PanelWall from './PanelWall.jsx'
import PanelFrames from './PanelFrames.jsx'
import PanelPhotos from './PanelPhotos.jsx'
import PanelArrange from './PanelArrange.jsx'
import PanelExport from './PanelExport.jsx'
import NextStep from './NextStep.jsx'
import { useStore } from '../store.jsx'
import { stepsDone } from '../progress.js'

export const TABS = [
  { key: 'wall', label: 'Wall', icon: '🧱' },
  { key: 'frames', label: 'Frames', icon: '🖼️' },
  { key: 'photos', label: 'Photos', icon: '📷' },
  { key: 'arrange', label: 'Arrange', icon: '🧩' },
  { key: 'export', label: 'Hang it', icon: '📐' },
]

const PANELS = {
  wall: PanelWall,
  frames: PanelFrames,
  photos: PanelPhotos,
  arrange: PanelArrange,
  export: PanelExport,
}

export default function Sidebar({ ui, patchUi, canvasApi, mobile, showTabs = true }) {
  const { state } = useStore()
  const Panel = PANELS[ui.tab] || PanelWall
  const done = stepsDone(state, ui.visited)

  return (
    <aside className="sidebar">
      {showTabs && (
        <nav className="tabstrip" role="tablist" aria-label="Planner steps" data-tour="steps">
          {TABS.map((t) => (
            <button
              key={t.key}
              role="tab"
              aria-selected={ui.tab === t.key}
              className={ui.tab === t.key ? 'on' : ''}
              data-tour={t.key === 'export' ? 'export' : undefined}
              onClick={() => patchUi({ tab: t.key, visited: { ...ui.visited, [t.key]: true } })}
            >
              <span aria-hidden="true">{t.icon}</span>
              {t.label}
              {done[t.key] && (
                <span className="tab-done" aria-hidden="true">
                  ✓
                </span>
              )}
            </button>
          ))}
        </nav>
      )}

      <div className="sidebar-scroll" data-tour="panel">
        {/* Keyed on the tab so the panel re-enters on every step change. */}
        <div className="panel-anim" key={ui.tab}>
          <Panel ui={ui} patchUi={patchUi} canvasApi={canvasApi} mobile={mobile} />
        </div>
      </div>

      <NextStep ui={ui} patchUi={patchUi} mobile={mobile} />

      {/* Sticky support footer */}
      <div className="support-bar">
        <a href="https://samratgarai.com/support" target="_blank" rel="noopener noreferrer">
          ☕ Support this tool
        </a>
        <span className="support-sub">Free &amp; open source · made by Samrat</span>
      </div>
    </aside>
  )
}
