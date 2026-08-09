import React, { useState } from 'react'
import { useStore } from '../store.jsx'
import { readImageFile, workArea, clamp } from '../utils.js'
import { toInches, unitLabel, disp as dispIn, stepFor } from '../units.js'
import { useToast } from './Toasts.jsx'
import { demoDoc } from '../project.js'
import SectionTitle from './SectionTitle.jsx'

const BLANK_PPI = 10 // render px per inch for a blank wall

// Starting sizes for the AREA you plan to hang in — not the whole room wall.
// `floor` = how high that area's bottom edge sits, so "over a sofa" starts above
// the sofa back rather than at the skirting board.
const WALL_PRESETS = [
  { label: 'Over a sofa', w: 84, h: 48, floor: 36 },
  { label: 'Over a bed', w: 72, h: 54, floor: 40 },
  { label: 'Over a console', w: 60, h: 42, floor: 34 },
  { label: 'Hallway run', w: 120, h: 60, floor: 30 },
  { label: 'Stairwell', w: 96, h: 90, floor: 20 },
  { label: 'Whole wall', w: 144, h: 96, floor: 0 },
]

export default function PanelWall({ ui, patchUi }) {
  const { state, dispatch } = useStore()
  const { units } = state
  const toast = useToast()
  const [blankW, setBlankW] = useState(() => String(dispIn(48, units)))
  const [blankH, setBlankH] = useState(() => String(dispIn(36, units)))
  const [wallW, setWallW] = useState('')
  // On the photo path the blank-wall controls are hidden — but the user has to
  // be able to change their mind, so this re-reveals them.
  const [showBlank, setShowBlank] = useState(false)

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
    toast('Wall photo added. Now select the wall area to set the scale.', 'info')
  }

  function makeBlankWall(wOverride, hOverride, floorIn) {
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
    if (typeof floorIn === 'number') dispatch({ type: 'setSettings', payload: { floorOffsetIn: floorIn } })
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

  // The eye-line is measured from the floor, but it has to land on the working
  // area — otherwise the guide is drawn nowhere and layouts silently ignore it.
  const { wallHIn } = workArea(state)
  const hasWall = wallHIn > 0
  const eyeMinIn = state.settings.floorOffsetIn
  const eyeMaxIn = hasWall ? state.settings.floorOffsetIn + wallHIn : Number.MAX_SAFE_INTEGER
  const disp = (inches) => dispIn(inches, units)

  // One decision at a time: the two ways of making a wall are mutually
  // exclusive, so only the one you're on is on screen.
  const mode = state.wallMode || 'none'
  const isPhoto = mode === 'photo'
  const showBlankControls = !isPhoto || showBlank

  return (
    <section>
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

      <div className="calib-method">
        <SectionTitle
          title="Wall area"
          info="The patch of wall you'll actually hang in, not the whole room wall. Pick a size and start arranging, or upload a photo of the wall and mark the area on it. The presets also set how high off the floor that patch starts."
        />

        {/* Photo path: the only thing that matters is setting the scale. */}
        {isPhoto && (
          <div className="calib">
            <p className="scale-status">
              {state.wallRegion ? (
                <span className="ok">
                  ✓ Wall area set ({disp(state.wallRegionWIn)}×{disp(state.wallRegionHIn)}{' '}
                  {unitLabel(units)})
                </span>
              ) : scaleReady ? (
                <span className="ok">✓ Scale set ({state.pixelsPerInch.toFixed(1)} px/in)</span>
              ) : (
                <span className="warn">⚠ Not set up yet</span>
              )}
            </p>

            <button className="cta" onClick={() => patchUi({ wallAreaOpen: true })}>
              {state.wallRegion ? 'Edit wall area' : 'Select wall area'}
            </button>
            <p className="hint">Drag a box over the wall, then type its real size.</p>

            {/* Two rarer ways to set the scale. Neither is worth a first timer's
                attention, so they don't get any until asked for. */}
            <details className="more">
              <summary>Other ways to set the scale</summary>
              <div className="more-body">
                <p className="hint">Draw a line across something you know the length of:</p>
                <button
                  className={ui.calibrating ? 'active' : ''}
                  onClick={() => patchUi({ calibrating: !ui.calibrating })}
                >
                  {ui.calibrating ? 'Cancel drawing' : 'Draw reference line'}
                </button>

                <p className="hint">Or enter the total wall width:</p>
                <div className="row">
                  <input
                    type="number"
                    step={stepFor(units)}
                    placeholder={`width (${unitLabel(units)})`}
                    aria-label={`Total wall width in ${unitLabel(units)}`}
                    value={wallW}
                    onChange={(e) => setWallW(e.target.value)}
                  />
                  <button onClick={calibrateByWallWidth}>Set</button>
                </div>
              </div>
            </details>
          </div>
        )}

        {/* Blank path: presets first, because one tap beats typing two numbers. */}
        {showBlankControls && (
          <>
            <div className="chips">
              {WALL_PRESETS.map((p) => (
                <button
                  key={p.label}
                  className="chip"
                  title={`${disp(p.w)}×${disp(p.h)} ${unitLabel(units)}, starting ${disp(
                    p.floor
                  )} ${unitLabel(units)} above the floor`}
                  onClick={() => {
                    setBlankW(String(disp(p.w)))
                    setBlankH(String(disp(p.h)))
                    setShowBlank(false)
                    makeBlankWall(p.w, p.h, p.floor)
                  }}
                >
                  {p.label}{' '}
                  <span className="chip-dim">
                    {disp(p.w)}×{disp(p.h)}
                  </span>
                </button>
              ))}
            </div>
            <div className="row">
              <input
                type="number"
                step={stepFor(units)}
                aria-label={`Wall width in ${unitLabel(units)}`}
                placeholder={`W (${unitLabel(units)})`}
                value={blankW}
                onChange={(e) => setBlankW(e.target.value)}
              />
              <input
                type="number"
                step={stepFor(units)}
                aria-label={`Wall height in ${unitLabel(units)}`}
                placeholder={`H (${unitLabel(units)})`}
                value={blankH}
                onChange={(e) => setBlankH(e.target.value)}
              />
            </div>
            <button
              className="cta spaced"
              onClick={() => {
                setShowBlank(false)
                makeBlankWall()
              }}
            >
              {mode === 'blank' ? 'Update blank wall' : 'Use blank wall'}
            </button>
            {/* Colour is a nice-to-have; it only earns a slot once a wall exists. */}
            {mode === 'blank' && (
              <div className="row">
                <label className="mini">Wall colour</label>
                <input
                  type="color"
                  className="colorpick"
                  value={state.wallColor}
                  onChange={(e) =>
                    dispatch({ type: 'set', payload: { wallColor: e.target.value } })
                  }
                  title="Wall colour"
                  aria-label="Wall colour"
                />
              </div>
            )}
          </>
        )}

        {/* The way out of whichever path you're on. */}
        {isPhoto ? (
          <>
            <label
              className="filebtn secondary"
              title="Photograph the wall straight on, then mark a rectangle you know the real size of."
            >
              Replace wall photo
              <input type="file" accept="image/*" onChange={onWallUpload} hidden />
            </label>
            {!showBlank && (
              <button className="linkbtn" onClick={() => setShowBlank(true)}>
                Use a blank wall instead
              </button>
            )}
          </>
        ) : (
          <label
            className="filebtn secondary"
            title="Photograph the wall straight on, then mark a rectangle you know the real size of."
          >
            Or upload a wall photo
            <input type="file" accept="image/*" onChange={onWallUpload} hidden />
          </label>
        )}
      </div>

      {/* Height references — these drive the eye-line and the hanging guide.
          The presets already set both, so a normal user never opens this. */}
      {mode !== 'none' && (
        <div className="calib-method">
          <SectionTitle
            title="Heights"
            info="Everything vertical is measured from the floor. Eye-line is where picture centres sit — galleries use 57in. Bottom edge is how far the bottom of your wall area sits off the floor, which is what turns wall positions into real nail heights."
          />
          <details className="more">
            <summary>Eye-line and floor height (optional)</summary>
            <div className="more-body">
              <div className="row">
                <label className="mini">Eye-line</label>
                <input
                  type="number"
                  step={stepFor(units)}
                  min={disp(eyeMinIn)}
                  max={disp(eyeMaxIn)}
                  value={disp(state.settings.eyeLineIn)}
                  onChange={(e) => {
                    const v = toInches(parseFloat(e.target.value) || 0, units)
                    setCfg({ eyeLineIn: clamp(v, eyeMinIn, eyeMaxIn) })
                  }}
                  aria-label="Eye-line height from floor"
                />
                <span className="mini">{unitLabel(units)} from floor</span>
              </div>
              {hasWall && (
                <p className="hint">
                  Must sit on the wall: {disp(eyeMinIn)}–{disp(eyeMaxIn)} {unitLabel(units)} from
                  the floor.
                </p>
              )}
              <div className="row">
                <label className="mini">Bottom edge</label>
                <input
                  type="number"
                  step={stepFor(units)}
                  min="0"
                  value={disp(state.settings.floorOffsetIn)}
                  onChange={(e) => {
                    const floorOffsetIn = Math.max(
                      0,
                      toInches(parseFloat(e.target.value) || 0, units)
                    )
                    // Moving the wall up or down can strand the eye-line off it; keep it on.
                    const patch = { floorOffsetIn }
                    if (hasWall) {
                      patch.eyeLineIn = clamp(
                        state.settings.eyeLineIn,
                        floorOffsetIn,
                        floorOffsetIn + wallHIn
                      )
                    }
                    setCfg(patch)
                  }}
                  aria-label="Height of the working area's bottom edge above the floor"
                />
                <span className="mini">{unitLabel(units)} up from the floor</span>
              </div>
            </div>
          </details>
        </div>
      )}
    </section>
  )
}
