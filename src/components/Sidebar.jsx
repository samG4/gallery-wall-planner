import React from 'react'
import PanelWall from './PanelWall.jsx'
import PanelFrames from './PanelFrames.jsx'
import PanelPhotos from './PanelPhotos.jsx'
import PanelArrange from './PanelArrange.jsx'
import PanelExport from './PanelExport.jsx'

export const TABS = [
  { key: 'wall', label: 'Wall', icon: '🧱' },
  { key: 'frames', label: 'Frames', icon: '🖼️' },
  { key: 'photos', label: 'Photos', icon: '📷' },
  { key: 'arrange', label: 'Arrange', icon: '🧩' },
  { key: 'export', label: 'Export', icon: '📐' },
]

const PANELS = {
  wall: PanelWall,
  frames: PanelFrames,
  photos: PanelPhotos,
  arrange: PanelArrange,
  export: PanelExport,
}

export default function Sidebar({ ui, patchUi, canvasApi, showTabs = true }) {
  const Panel = PANELS[ui.tab] || PanelWall
  return (
    <aside className="sidebar">
      {showTabs && (
        <nav className="tabstrip" role="tablist" aria-label="Planner steps">
          {TABS.map((t) => (
            <button
              key={t.key}
              role="tab"
              aria-selected={ui.tab === t.key}
              className={ui.tab === t.key ? 'on' : ''}
              onClick={() => patchUi({ tab: t.key })}
            >
              <span aria-hidden="true">{t.icon}</span>
              {t.label}
            </button>
          ))}
        </nav>
      )}

      <div className="sidebar-scroll">
        <Panel ui={ui} patchUi={patchUi} canvasApi={canvasApi} />
      </div>

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
