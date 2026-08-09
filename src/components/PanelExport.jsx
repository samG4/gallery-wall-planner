import React, { useRef } from 'react'
import { useStore } from '../store.jsx'
import { download, downloadText } from '../utils.js'
import { exportProject, importProject, PROJECT_EXT } from '../project.js'
import { useToast } from './Toasts.jsx'
import SectionTitle from './SectionTitle.jsx'

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
        <SectionTitle
          title="Take it to the wall"
          info="A printable sheet: a plan drawing with nail crosses, plus every frame's offsets from the wall edges, its centre height above the floor, and where each hook goes. Print it or save it as a PDF."
        />
        <button className="cta" onClick={() => patchUi({ guideOpen: true })}>
          📐 Hanging guide
        </button>
      </div>

      <div className="calib-method">
        <SectionTitle
          title="Share the picture"
          info="Saves just the wall, at twice screen resolution, with the guides and selection handles left out."
        />
        <button onClick={savePNG}>🖼️ Download wall as PNG</button>
      </div>

      <div className="calib-method">
        <SectionTitle
          title="Save &amp; reopen"
          info="Everything lives in this browser, so nothing is uploaded — and nothing survives clearing your site data. A project file (photos included) is how you back it up or move it to another device."
        />
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
        <SectionTitle
          title="Start over"
          info="Clears the wall, frames and photos from this browser. Save a project file first if you might want any of it back."
        />
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
