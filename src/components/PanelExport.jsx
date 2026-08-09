import React, { useRef } from 'react'
import { useStore } from '../store.jsx'
import { download, downloadText } from '../utils.js'
import { exportProject, importProject, PROJECT_EXT } from '../project.js'
import { useToast } from './Toasts.jsx'

const QUOTA_BYTES = 5 * 1024 * 1024 // typical localStorage ceiling

export default function PanelExport({ ui, patchUi, canvasApi }) {
  const { state, dispatch, storageFull, docBytes } = useStore()
  const toast = useToast()
  const fileRef = useRef(null)

  const pct = Math.min(100, Math.round((docBytes / QUOTA_BYTES) * 100))

  function savePNG() {
    const url = canvasApi?.current?.exportPNG?.(2)
    if (!url) return toast('Set up the wall first — nothing to export yet.', 'warn')
    download('gallery-wall.png', url)
    toast('Saved gallery-wall.png', 'ok')
  }

  function saveProject() {
    downloadText(`gallery-wall.${PROJECT_EXT}`, exportProject(state))
    toast('Project file saved — reopen it any time, on any device.', 'ok')
  }

  async function loadProject(e) {
    const file = e.target.files?.[0]
    if (!file) return
    try {
      const text = await file.text()
      dispatch({ type: 'load', payload: importProject(text) })
      patchUi({ selectedIds: [], selectedObstacleId: null })
      toast('Project loaded.', 'ok')
    } catch (err) {
      toast(`Could not read that file: ${err.message}`, 'warn')
    }
    e.target.value = ''
  }

  return (
    <section>
      <h2>5 · Export</h2>

      <div className="calib-method">
        <strong>Take it to the wall</strong>
        <p className="hint">
          Exact offsets and nail heights for every frame, ready to print or save as PDF.
        </p>
        <button className="cta" onClick={() => patchUi({ guideOpen: true })}>
          📐 Hanging guide
        </button>
      </div>

      <div className="calib-method">
        <strong>Share the picture</strong>
        <button onClick={savePNG}>🖼️ Download wall as PNG</button>
      </div>

      <div className="calib-method">
        <strong>Save &amp; reopen</strong>
        <p className="hint">
          Everything stays on this device. A project file is the way to back it up or move it to
          another browser.
        </p>
        <div className="row">
          <button onClick={saveProject}>⬇ Save project</button>
          <button className="ghost" onClick={() => fileRef.current?.click()}>
            ⬆ Open project
          </button>
          <input
            ref={fileRef}
            type="file"
            accept=".json,application/json"
            hidden
            onChange={loadProject}
          />
        </div>
        <div className="storage">
          <div className="bar">
            <span style={{ width: `${pct}%` }} className={pct > 80 ? 'hot' : ''} />
          </div>
          <span className="mini">
            {(docBytes / 1024 / 1024).toFixed(2)} MB of browser storage used
          </span>
          {storageFull && (
            <p className="warn">
              ⚠ Storage is full — recent changes are not being saved. Save a project file, then
              remove a few photos.
            </p>
          )}
        </div>
      </div>

      <div className="calib-method">
        <strong>Start over</strong>
        <button
          className="danger"
          onClick={() => {
            if (confirm('Reset everything? This clears the wall, frames and photos.')) {
              dispatch({ type: 'reset' })
              patchUi({ selectedIds: [], selectedObstacleId: null })
            }
          }}
        >
          Reset project
        </button>
      </div>
    </section>
  )
}
