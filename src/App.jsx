import React, { useEffect, useState } from 'react'
import { StoreProvider, useStore } from './store.jsx'
import Sidebar from './components/Sidebar.jsx'
import WallCanvas from './components/WallCanvas.jsx'
import OpeningEditor from './components/OpeningEditor.jsx'
import PhotoCropEditor from './components/PhotoCropEditor.jsx'

function Shell() {
  const { state, dispatch, undo, redo, canUndo, canRedo } = useStore()
  // Transient UI state (not persisted)
  const [ui, setUi] = useState({
    calibrating: false, // reference-line mode
    openingStyleId: null, // style whose opening we're drawing
    cropPlacedId: null, // placed frame whose photo we're cropping
    selectedPlacedId: null,
    showGrid: false, // Figma-style reference grid
    showDims: false, // blueprint dimension annotations
  })
  const patchUi = (p) => setUi((u) => ({ ...u, ...p }))

  const toggleUnits = () =>
    dispatch({ type: 'set', payload: { units: state.units === 'in' ? 'cm' : 'in' } })

  // Keyboard: Cmd/Ctrl+Z undo, Cmd/Ctrl+Shift+Z or Ctrl+Y redo.
  useEffect(() => {
    const onKey = (e) => {
      const tag = e.target.tagName
      if (tag === 'INPUT' || tag === 'TEXTAREA') return // don't hijack text editing
      const mod = e.metaKey || e.ctrlKey
      if (!mod) return
      const k = e.key.toLowerCase()
      if (k === 'z' && !e.shiftKey) {
        e.preventDefault()
        undo()
      } else if ((k === 'z' && e.shiftKey) || k === 'y') {
        e.preventDefault()
        redo()
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [undo, redo])

  return (
    <div className="app">
      <header className="topbar">
        <h1>🖼️ Gallery Wall Planner</h1>
        <div className="topbar-actions">
          <button className="ghost" onClick={undo} disabled={!canUndo} title="Undo (Cmd/Ctrl+Z)">
            ↶ Undo
          </button>
          <button className="ghost" onClick={redo} disabled={!canRedo} title="Redo (Cmd/Ctrl+Shift+Z)">
            ↷ Redo
          </button>
          <button className="unit-toggle" onClick={toggleUnits}>
            Units: <strong>{state.units}</strong> (tap to switch)
          </button>
          <button
            className="danger"
            onClick={() => {
              if (confirm('Reset everything? This clears the wall, frames and photos.'))
                dispatch({ type: 'reset' })
            }}
          >
            Reset
          </button>
        </div>
      </header>

      <div className="body">
        <Sidebar ui={ui} patchUi={patchUi} />
        <main className="canvas-wrap">
          <WallCanvas ui={ui} patchUi={patchUi} />
        </main>
      </div>

      {ui.openingStyleId && (
        <OpeningEditor
          styleId={ui.openingStyleId}
          onClose={() => patchUi({ openingStyleId: null })}
        />
      )}
      {ui.cropPlacedId && (
        <PhotoCropEditor
          placedId={ui.cropPlacedId}
          onClose={() => patchUi({ cropPlacedId: null })}
        />
      )}
    </div>
  )
}

export default function App() {
  return (
    <StoreProvider>
      <Shell />
    </StoreProvider>
  )
}
