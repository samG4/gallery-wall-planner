import React, { useState } from 'react'
import { useStore } from '../store.jsx'
import { readImageFile } from '../utils.js'
import { toInches, fromInches, unitLabel } from '../units.js'
import { useToast } from './Toasts.jsx'
import { demoDoc } from '../project.js'

const BLANK_PPI = 10 // render px per inch for a blank wall

const WALL_PRESETS = [
  { label: 'Above sofa', w: 84, h: 48 },
  { label: 'Above bed', w: 72, h: 54 },
  { label: 'Hallway', w: 120, h: 60 },
  { label: 'Stairwell', w: 96, h: 90 },
  { label: 'Full wall', w: 144, h: 96 },
]

export default function PanelWall({ ui, patchUi }) {
  const { state, dispatch } = useStore()
  const { units } = state
  const toast = useToast()
  const [blankW, setBlankW] = useState(() => String(fromInches(48, units)))
  const [blankH, setBlankH] = useState(() => String(fromInches(36, units)))
  const [wallW, setWallW] = useState('')

  async function onWallUpload(e) {
    const file = e.target.files?.[0]
    if (!file) return
    const { dataURL, w, h } = await readImageFile(file, 2000)
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
    e.target.value = ''
    toast('Wall photo added — now set the wall area so the scale is real.', 'info')
  }

  function makeBlankWall(wOverride, hOverride) {
    const wIn = wOverride ?? toInches(parseFloat(blankW), units)
    const hIn = hOverride ?? toInches(parseFloat(blankH), units)
    if (!wIn || !hIn) return toast('Enter a width and a height first.', 'warn')
    dispatch({
      type: 'set',
      payload: {
        wallMode: 'blank',
        wallImage: null,
        wallNaturalW: wIn * BLANK_PPI,
        wallNaturalH: hIn * BLANK_PPI,
        pixelsPerInch: BLANK_PPI,
        wallRegion: null,
      },
    })
  }

  function calibrateByWallWidth() {
    const v = parseFloat(wallW)
    if (!v || !state.wallNaturalW) return toast('Enter the real wall width first.', 'warn')
    const inches = toInches(v, units)
    dispatch({
      type: 'set',
      payload: { pixelsPerInch: state.wallNaturalW / inches, wallRegion: null },
    })
    toast('Scale set from wall width.', 'ok')
  }

  const scaleReady = !!state.pixelsPerInch
  const setCfg = (payload) => dispatch({ type: 'setSettings', payload })

  return (
    <section>
      <h2>1 · Wall</h2>

      {!state.wallMode && (
        <button
          className="cta"
          onClick={() => {
            dispatch({ type: 'load', payload: demoDoc() })
            toast('Loaded a demo wall — drag frames around, then reset when done.', 'ok')
          }}
        >
          ✨ Try a demo wall
        </button>
      )}

      {/* Blank canvas — no photo needed, scale is exact from dimensions */}
      <div className="calib-method">
        <strong>Blank canvas</strong>
        <p className="hint">No wall photo? Set a size and colour to try arrangements.</p>
        <div className="chips">
          {WALL_PRESETS.map((p) => (
            <button
              key={p.label}
              className="chip"
              onClick={() => {
                setBlankW(String(Math.round(fromInches(p.w, units))))
                setBlankH(String(Math.round(fromInches(p.h, units))))
                makeBlankWall(p.w, p.h)
              }}
            >
              {p.label}
            </button>
          ))}
        </div>
        <div className="row">
          <input
            type="number"
            aria-label={`Wall width in ${unitLabel(units)}`}
            placeholder={`W (${unitLabel(units)})`}
            value={blankW}
            onChange={(e) => setBlankW(e.target.value)}
          />
          <input
            type="number"
            aria-label={`Wall height in ${unitLabel(units)}`}
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
            aria-label="Wall colour"
          />
        </div>
        <button onClick={() => makeBlankWall()}>
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
              <strong>A) Select wall area (recommended)</strong> — drag a box over the wall, enter
              its real size. Sets scale + where frames go, for a realistic mockup.
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
                aria-label={`Total wall width in ${unitLabel(units)}`}
                value={wallW}
                onChange={(e) => setWallW(e.target.value)}
              />
              <button onClick={calibrateByWallWidth}>Set</button>
            </div>
          </div>
        )}
      </div>

      {/* Height references — these drive the eye-line and the hanging guide */}
      <div className="calib-method">
        <strong>Heights</strong>
        <p className="hint">
          Used for the eye-line guide and for nail heights in the hanging guide.
        </p>
        <div className="row">
          <label className="mini">Eye-line</label>
          <input
            type="number"
            value={Math.round(fromInches(state.settings.eyeLineIn, units) * 10) / 10}
            onChange={(e) =>
              setCfg({ eyeLineIn: toInches(parseFloat(e.target.value) || 0, units) })
            }
            aria-label="Eye-line height from floor"
          />
          <span className="mini">{unitLabel(units)} from floor</span>
        </div>
        <div className="row">
          <label className="mini">Area bottom</label>
          <input
            type="number"
            value={Math.round(fromInches(state.settings.floorOffsetIn, units) * 10) / 10}
            onChange={(e) =>
              setCfg({ floorOffsetIn: toInches(parseFloat(e.target.value) || 0, units) })
            }
            aria-label="Height of the working area's bottom edge above the floor"
          />
          <span className="mini">{unitLabel(units)} above floor</span>
        </div>
      </div>
    </section>
  )
}
