import React, { useState } from 'react'
import { useStore, uid } from '../store.jsx'
import { readImageFile } from '../utils.js'
import { toInches, fromInches, unitLabel } from '../units.js'
import { workArea } from '../utils.js'
import FrameStyleForm from './FrameStyleForm.jsx'
import { LAYOUTS } from '../layouts.js'

export default function Sidebar({ ui, patchUi }) {
  const { state, dispatch } = useStore()
  const { units } = state

  async function onWallUpload(e) {
    const file = e.target.files?.[0]
    if (!file) return
    const { dataURL, w, h } = await readImageFile(file)
    dispatch({
      type: 'set',
      payload: {
        wallMode: 'photo',
        wallImage: dataURL,
        wallNaturalW: w,
        wallNaturalH: h,
        pixelsPerInch: null,
        wallRegion: null,
        wallRegionWIn: 0,
        wallRegionHIn: 0,
      },
    })
  }

  // --- blank wall: dimensions known -> scale known, no calibration needed ---
  const BLANK_PPI = 10 // render px per inch for a blank wall
  const [blankW, setBlankW] = useState('48')
  const [blankH, setBlankH] = useState('36')
  function makeBlankWall() {
    const wIn = toInches(parseFloat(blankW), units)
    const hIn = toInches(parseFloat(blankH), units)
    if (!wIn || !hIn) return
    dispatch({
      type: 'set',
      payload: {
        wallMode: 'blank',
        wallImage: null,
        wallNaturalW: wIn * BLANK_PPI,
        wallNaturalH: hIn * BLANK_PPI,
        pixelsPerInch: BLANK_PPI,
      },
    })
  }

  async function onPhotoUpload(e) {
    const files = Array.from(e.target.files || [])
    for (const file of files) {
      const { dataURL, w, h } = await readImageFile(file)
      dispatch({ type: 'addPhoto', photo: { id: uid('photo'), image: dataURL, w, h } })
    }
    e.target.value = ''
  }

  // --- wall-size calibration ---
  const [wallW, setWallW] = useState('')
  function calibrateByWallWidth() {
    const v = parseFloat(wallW)
    if (!v || !state.wallNaturalW) return
    const inches = toInches(v, units)
    dispatch({
      type: 'set',
      payload: { pixelsPerInch: state.wallNaturalW / inches, wallRegion: null },
    })
  }

  function addToWall(style) {
    const placedOfStyle = state.placedFrames.filter((p) => p.styleId === style.id).length
    // cascade position so new ones don't stack exactly
    const off = placedOfStyle * 2
    dispatch({
      type: 'addPlaced',
      placed: {
        id: uid('placed'),
        styleId: style.id,
        xIn: 4 + off,
        yIn: 4 + off,
        rot: 0,
        photoId: null,
        crop: { scale: 1, ox: 0, oy: 0, rot: 0 },
      },
    })
  }

  function applyLayout(key) {
    if (!state.pixelsPerInch) {
      alert('Calibrate scale first (upload wall + set a reference).')
      return
    }
    const { wallWIn: wallW, wallHIn: wallH } = workArea(state)
    const frames = state.placedFrames.map((p) => {
      const s = state.frameStyles.find((f) => f.id === p.styleId)
      return { id: p.id, wIn: s.outerW, hIn: s.outerH }
    })
    const pos = LAYOUTS[key].fn(frames, wallW, wallH)
    dispatch({
      type: 'setPlaced',
      placedFrames: state.placedFrames.map((p) =>
        pos[p.id] ? { ...p, xIn: pos[p.id].xIn, yIn: pos[p.id].yIn, rot: pos[p.id].rot ?? 0 } : p
      ),
    })
  }

  function assignPhotoToSelected(photoId) {
    if (!ui.selectedPlacedId) {
      alert('Select a frame on the wall first, then click a photo to place it inside.')
      return
    }
    dispatch({ type: 'updatePlaced', id: ui.selectedPlacedId, patch: { photoId } })
  }

  const scaleReady = !!state.pixelsPerInch

  return (
    <aside className="sidebar">
      {/* 1. WALL */}
      <section>
        <h2>1 · Wall</h2>

        {/* Blank canvas — no photo needed, scale is exact from dimensions */}
        <div className="calib-method">
          <strong>Blank canvas</strong>
          <p className="hint">No wall photo? Set a size and colour to try arrangements.</p>
          <div className="row">
            <input
              type="number"
              placeholder={`W (${unitLabel(units)})`}
              value={blankW}
              onChange={(e) => setBlankW(e.target.value)}
            />
            <input
              type="number"
              placeholder={`H (${unitLabel(units)})`}
              value={blankH}
              onChange={(e) => setBlankH(e.target.value)}
            />
            <input
              type="color"
              className="colorpick"
              value={state.wallColor}
              onChange={(e) => dispatch({ type: 'set', payload: { wallColor: e.target.value } })}
              title="Wall colour"
            />
          </div>
          <button onClick={makeBlankWall}>
            {state.wallMode === 'blank' ? 'Update blank wall' : 'Use blank wall'}
          </button>
        </div>

        {/* Photo wall */}
        <div className="calib-method">
          <strong>Or use a wall photo</strong>
          <label className="filebtn small">
            {state.wallMode === 'photo' ? 'Replace wall photo' : 'Upload wall photo'}
            <input type="file" accept="image/*" onChange={onWallUpload} hidden />
          </label>

          {state.wallMode === 'photo' && (
            <div className="calib">
              <p className="scale-status">
                {state.wallRegion ? (
                  <span className="ok">
                    ✓ Wall area set ({fromInches(state.wallRegionWIn, units).toFixed(0)}×
                    {fromInches(state.wallRegionHIn, units).toFixed(0)} {unitLabel(units)})
                  </span>
                ) : scaleReady ? (
                  <span className="ok">✓ Scale set ({state.pixelsPerInch.toFixed(1)} px/in)</span>
                ) : (
                  <span className="warn">⚠ Not calibrated — set the wall area below</span>
                )}
              </p>

              <p className="hint">
                <strong>A) Select wall area (recommended)</strong> — drag a box over the wall,
                enter its real size. Sets scale + where frames go, for a realistic mockup.
              </p>
              <button onClick={() => patchUi({ wallAreaOpen: true })}>
                {state.wallRegion ? 'Edit wall area' : 'Select wall area'}
              </button>

              <p className="hint">B) Or just calibrate scale — draw a reference line:</p>
              <button
                className={ui.calibrating ? 'active' : ''}
                onClick={() => patchUi({ calibrating: !ui.calibrating })}
              >
                {ui.calibrating ? 'Cancel drawing' : 'Draw reference line'}
              </button>

              <p className="hint">C) Or enter total wall width:</p>
              <div className="row">
                <input
                  type="number"
                  placeholder={`width (${unitLabel(units)})`}
                  value={wallW}
                  onChange={(e) => setWallW(e.target.value)}
                />
                <button onClick={calibrateByWallWidth}>Set</button>
              </div>
            </div>
          )}
        </div>
      </section>

      {/* 2. FRAME STYLES */}
      <section>
        <h2>2 · Frame styles</h2>
        <FrameStyleForm />
        <ul className="style-list">
          {state.frameStyles.map((s) => {
            const placed = state.placedFrames.filter((p) => p.styleId === s.id).length
            const openingSet = !!s.openingFrac
            return (
              <li key={s.id} className="style-item">
                <img src={s.image} alt={s.name} className="thumb" />
                <div className="style-meta">
                  <strong>{s.name}</strong>
                  <span>
                    {fromInches(s.outerW, units).toFixed(1)}×
                    {fromInches(s.outerH, units).toFixed(1)} {unitLabel(units)} · own {s.count}
                  </span>
                  <span className={openingSet ? 'ok' : 'warn'}>
                    {openingSet ? '✓ opening set' : '⚠ set inner opening'}
                  </span>
                  <div className="style-btns">
                    <button onClick={() => patchUi({ openingStyleId: s.id })}>
                      {openingSet ? 'Edit opening' : 'Set opening'}
                    </button>
                    <button
                      disabled={!openingSet || placed >= s.count}
                      title={placed >= s.count ? 'All owned frames placed' : ''}
                      onClick={() => addToWall(s)}
                    >
                      Add to wall ({placed}/{s.count})
                    </button>
                    <button
                      className="linkbtn"
                      onClick={() => dispatch({ type: 'removeFrameStyle', id: s.id })}
                    >
                      delete
                    </button>
                  </div>
                </div>
              </li>
            )
          })}
        </ul>
      </section>

      {/* 3. PHOTOS */}
      <section>
        <h2>3 · Your photos</h2>
        <label className="filebtn">
          Upload photos
          <input type="file" accept="image/*" multiple onChange={onPhotoUpload} hidden />
        </label>
        <p className="hint">
          Select a frame on the wall, then click a photo to drop it inside. Crop it to fit after.
        </p>
        <div className="photo-grid">
          {state.photos.map((p) => (
            <div key={p.id} className="photo-cell">
              <img
                src={p.image}
                alt=""
                onClick={() => assignPhotoToSelected(p.id)}
                title="Click to place in selected frame"
              />
              <button
                className="x"
                onClick={() => dispatch({ type: 'removePhoto', id: p.id })}
              >
                ×
              </button>
            </div>
          ))}
        </div>
      </section>

      {/* 4. LAYOUT */}
      <section>
        <h2>4 · Auto-layout</h2>
        <p className="hint">Seed an arrangement, then drag frames to fine-tune.</p>
        <div className="layout-btns">
          {Object.entries(LAYOUTS).map(([k, v]) => (
            <button key={k} onClick={() => applyLayout(k)} disabled={!scaleReady}>
              {v.label}
            </button>
          ))}
        </div>
      </section>

      {/* Sticky support footer */}
      <div className="support-bar">
        <a
          href="https://samratgarai.com/support"
          target="_blank"
          rel="noopener noreferrer"
        >
          ☕ Support this tool
        </a>
        <span className="support-sub">Free &amp; open source · made by Samrat</span>
      </div>
    </aside>
  )
}
