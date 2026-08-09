import React, { useCallback, useEffect, useRef, useState } from 'react'
import { StoreProvider, useStore, uid } from './store.jsx'
import { ToastProvider, useToast } from './components/Toasts.jsx'
import Sidebar, { TABS } from './components/Sidebar.jsx'
import WallCanvas from './components/WallCanvas.jsx'
import SelectionBar from './components/SelectionBar.jsx'
import OpeningEditor from './components/OpeningEditor.jsx'
import PhotoCropEditor from './components/PhotoCropEditor.jsx'
import WallAreaEditor from './components/WallAreaEditor.jsx'
import HangingGuide from './components/HangingGuide.jsx'
import Coachmarks, { tourSeen } from './components/Coachmarks.jsx'
import { useMediaQuery } from './utils.js'

const NUDGE_IN = 0.25
const NUDGE_BIG_IN = 1

function Shell() {
  const { state, dispatch, undo, redo, canUndo, canRedo, storageFull } = useStore()
  const toast = useToast()
  const mobile = useMediaQuery('(max-width: 860px)')
  const canvasApi = useRef(null)

  // Transient UI state (not persisted)
  const [ui, setUi] = useState({
    tab: 'wall',
    sheetOpen: false, // mobile: is the panel sheet up?
    calibrating: false, // reference-line mode
    openingStyleId: null, // style whose opening we're drawing
    cropPlacedId: null, // placed frame whose photo we're cropping
    selectedIds: [], // placed frames
    selectedObstacleId: null,
    showGrid: false, // Figma-style reference grid
    showDims: false, // blueprint dimension annotations
    wallAreaOpen: false, // wall-area selector modal
    guideOpen: false, // hanging guide
    tourOpen: false, // first-run coachmarks
    tourRun: 0, // bumped on each replay so the tour restarts at step 1
  })
  const patchUi = useCallback((p) => setUi((u) => ({ ...u, ...p })), [])

  const toggleUnits = () =>
    dispatch({ type: 'set', payload: { units: state.units === 'in' ? 'cm' : 'in' } })

  // First visit: run the tour once the app has painted.
  useEffect(() => {
    if (tourSeen()) return
    const t = setTimeout(() => patchUi({ tourOpen: true }), 500)
    return () => clearTimeout(t)
  }, [patchUi])

  // Warn once when writes start failing, so work isn't silently lost.
  const warnedRef = useRef(false)
  useEffect(() => {
    if (storageFull && !warnedRef.current) {
      warnedRef.current = true
      toast('Browser storage is full — save a project file from the Export step.', 'warn', 8000)
    }
    if (!storageFull) warnedRef.current = false
  }, [storageFull, toast])

  // Keyboard: undo/redo, nudge, duplicate, delete, deselect.
  useEffect(() => {
    const onKey = (e) => {
      const tag = e.target.tagName
      if (tag === 'INPUT' || tag === 'TEXTAREA' || e.target.isContentEditable) return
      const mod = e.metaKey || e.ctrlKey
      const k = e.key.toLowerCase()

      if (mod && k === 'z' && !e.shiftKey) return e.preventDefault(), undo()
      if (mod && ((k === 'z' && e.shiftKey) || k === 'y')) return e.preventDefault(), redo()

      const ids = ui.selectedIds
      if (mod && k === 'd' && ids.length) {
        e.preventDefault()
        const newIds = []
        for (const id of ids) {
          const p = state.placedFrames.find((x) => x.id === id)
          if (!p) continue
          const nid = uid('placed')
          newIds.push(nid)
          dispatch({ type: 'addPlaced', placed: { ...p, id: nid, xIn: p.xIn + 2, yIn: p.yIn + 2 } })
        }
        patchUi({ selectedIds: newIds })
        return
      }

      if (e.key === 'Escape') return patchUi({ selectedIds: [], selectedObstacleId: null })

      if ((e.key === 'Delete' || e.key === 'Backspace') && (ids.length || ui.selectedObstacleId)) {
        e.preventDefault()
        if (ids.length) dispatch({ type: 'removePlaced', ids })
        if (ui.selectedObstacleId)
          dispatch({ type: 'removeObstacle', id: ui.selectedObstacleId })
        return patchUi({ selectedIds: [], selectedObstacleId: null })
      }

      const arrows = { ArrowLeft: [-1, 0], ArrowRight: [1, 0], ArrowUp: [0, -1], ArrowDown: [0, 1] }
      if (arrows[e.key]) {
        const step = e.shiftKey ? NUDGE_BIG_IN : NUDGE_IN
        const [dx, dy] = arrows[e.key]
        if (ids.length) {
          e.preventDefault()
          const patches = {}
          for (const id of ids) {
            const p = state.placedFrames.find((x) => x.id === id)
            if (p) patches[id] = { xIn: p.xIn + dx * step, yIn: p.yIn + dy * step }
          }
          dispatch({ type: 'updateManyPlaced', patches })
        } else if (ui.selectedObstacleId) {
          e.preventDefault()
          const o = state.obstacles.find((x) => x.id === ui.selectedObstacleId)
          if (o)
            dispatch({
              type: 'updateObstacle',
              id: o.id,
              patch: { xIn: o.xIn + dx * step, yIn: o.yIn + dy * step },
            })
        }
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [undo, redo, ui.selectedIds, ui.selectedObstacleId, state.placedFrames, state.obstacles, dispatch, patchUi])

  const openTab = (key) =>
    patchUi({ tab: key, sheetOpen: !(ui.sheetOpen && ui.tab === key) })

  return (
    <div className={`app${mobile ? ' mobile' : ''}`}>
      <header className="topbar">
        <h1>
          <span aria-hidden="true">🖼️</span> <span className="brand-text">Gallery Wall Planner</span>
        </h1>
        <div className="topbar-actions">
          <button className="ghost" onClick={undo} disabled={!canUndo} title="Undo (Cmd/Ctrl+Z)" aria-label="Undo">
            ↶
          </button>
          <button className="ghost" onClick={redo} disabled={!canRedo} title="Redo (Cmd/Ctrl+Shift+Z)" aria-label="Redo">
            ↷
          </button>
          <button className="unit-toggle" onClick={toggleUnits} title="Switch units">
            {state.units}
          </button>
          <button
            className="ghost"
            onClick={() => setUi((u) => ({ ...u, tourOpen: true, tourRun: u.tourRun + 1 }))}
            title="How this works"
            aria-label="How this works"
          >
            ?
          </button>
        </div>
      </header>

      <div className="body">
        {!mobile && <Sidebar ui={ui} patchUi={patchUi} canvasApi={canvasApi} />}
        <main className="canvas-wrap" data-tour="canvas">
          <WallCanvas ui={ui} patchUi={patchUi} canvasApi={canvasApi} />
          <SelectionBar ui={ui} patchUi={patchUi} />
        </main>
      </div>

      {/* ---------- mobile: bottom sheet + tab bar ---------- */}
      {mobile && (
        <>
          {ui.sheetOpen && (
            <div className="sheet-backdrop" onClick={() => patchUi({ sheetOpen: false })} />
          )}
          <div className={`sheet${ui.sheetOpen ? ' open' : ''}`}>
            <button
              className="sheet-handle"
              aria-label={ui.sheetOpen ? 'Close panel' : 'Open panel'}
              onClick={() => patchUi({ sheetOpen: !ui.sheetOpen })}
            />
            <Sidebar ui={ui} patchUi={patchUi} canvasApi={canvasApi} showTabs={false} />
          </div>
          <nav className="tabbar" role="tablist" aria-label="Planner steps" data-tour="steps">
            {TABS.map((t) => (
              <button
                key={t.key}
                role="tab"
                aria-selected={ui.sheetOpen && ui.tab === t.key}
                className={ui.sheetOpen && ui.tab === t.key ? 'on' : ''}
                data-tour={t.key === 'export' ? 'export' : undefined}
                onClick={() => openTab(t.key)}
              >
                <span aria-hidden="true">{t.icon}</span>
                <span className="tb-label">{t.label}</span>
              </button>
            ))}
          </nav>
        </>
      )}

      {ui.openingStyleId && (
        <OpeningEditor
          styleId={ui.openingStyleId}
          onClose={() => patchUi({ openingStyleId: null })}
        />
      )}
      {ui.cropPlacedId && (
        <PhotoCropEditor placedId={ui.cropPlacedId} onClose={() => patchUi({ cropPlacedId: null })} />
      )}
      {ui.wallAreaOpen && <WallAreaEditor onClose={() => patchUi({ wallAreaOpen: false })} />}
      {ui.guideOpen && <HangingGuide onClose={() => patchUi({ guideOpen: false })} />}
      {ui.tourOpen && (
        <Coachmarks
          key={ui.tourRun}
          patchUi={patchUi}
          mobile={mobile}
          onClose={() => patchUi({ tourOpen: false })}
        />
      )}
    </div>
  )
}

export default function App() {
  return (
    <StoreProvider>
      <ToastProvider>
        <Shell />
      </ToastProvider>
    </StoreProvider>
  )
}
