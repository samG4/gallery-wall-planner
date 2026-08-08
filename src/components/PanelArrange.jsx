import React from 'react'
import { useStore, uid } from '../store.jsx'
import { fromInches, toInches, unitLabel } from '../units.js'
import { workArea } from '../utils.js'
import { LAYOUTS, usableArea, layoutInArea } from '../layouts.js'
import { OBSTACLE_KINDS, obstacleKind } from '../obstacles.js'
import { useToast } from './Toasts.jsx'

export default function PanelArrange({ ui, patchUi }) {
  const { state, dispatch } = useStore()
  const { units } = state
  const u = unitLabel(units)
  const toast = useToast()
  const scaleReady = !!state.pixelsPerInch
  const setCfg = (payload) => dispatch({ type: 'setSettings', payload })

  function applyLayout(key) {
    if (!scaleReady) return toast('Set up the wall first so the scale is known.', 'warn')
    if (!state.placedFrames.length) return toast('Add some frames to the wall first.', 'warn')
    const { wallWIn, wallHIn } = workArea(state)
    const styleById = {}
    for (const s of state.frameStyles) styleById[s.id] = s
    const frames = state.placedFrames
      .filter((p) => styleById[p.styleId])
      .map((p) => ({ id: p.id, wIn: styleById[p.styleId].outerW, hIn: styleById[p.styleId].outerH }))
    const area = usableArea(wallWIn, wallHIn, state.obstacles, state.settings.gapIn)
    const pos = layoutInArea(
      LAYOUTS[key].fn,
      frames,
      area,
      state.settings.gapIn,
      { eyeY: wallHIn - (state.settings.eyeLineIn - state.settings.floorOffsetIn) },
      { w: wallWIn, h: wallHIn }
    )
    dispatch({
      type: 'setPlaced',
      placedFrames: state.placedFrames.map((p) =>
        pos[p.id] ? { ...p, xIn: pos[p.id].xIn, yIn: pos[p.id].yIn, rot: pos[p.id].rot ?? 0 } : p
      ),
    })
    const avoided = area.h < wallHIn - 0.5
    toast(
      `${LAYOUTS[key].label} applied${avoided ? ' — kept clear of your obstacles.' : '.'}`,
      'ok'
    )
  }

  function addObstacle(kind) {
    const k = obstacleKind(kind)
    const { wallWIn, wallHIn } = workArea(state)
    const id = uid('obs')
    dispatch({
      type: 'addObstacle',
      obstacle: {
        id,
        kind: k.key,
        label: k.label,
        wIn: Math.min(k.wIn, Math.max(4, wallWIn - 2)),
        hIn: Math.min(k.hIn, Math.max(4, wallHIn - 2)),
        xIn: Math.max(0, wallWIn / 2 - k.wIn / 2),
        yIn: Math.max(0, wallHIn - k.hIn),
      },
    })
    patchUi({ selectedObstacleId: id, selectedIds: [] })
  }

  return (
    <section>
      <h2>4 · Arrange</h2>

      <div className="calib-method">
        <strong>Spacing &amp; helpers</strong>
        <div className="row">
          <label className="mini">Gap</label>
          <input
            type="range"
            min="0.5"
            max="10"
            step="0.5"
            value={Math.round(fromInches(state.settings.gapIn, units) * 2) / 2}
            onChange={(e) => setCfg({ gapIn: toInches(parseFloat(e.target.value), units) })}
            aria-label="Gap between frames"
          />
          <span className="mini num">
            {Math.round(fromInches(state.settings.gapIn, units) * 10) / 10}
            {u}
          </span>
        </div>
        <div className="toggles">
          <label className="tog">
            <input
              type="checkbox"
              checked={state.settings.snap}
              onChange={(e) => setCfg({ snap: e.target.checked })}
            />
            Snapping
          </label>
          <label className="tog">
            <input
              type="checkbox"
              checked={state.settings.shadows}
              onChange={(e) => setCfg({ shadows: e.target.checked })}
            />
            Shadows
          </label>
          <label className="tog">
            <input
              type="checkbox"
              checked={state.settings.showEyeLine}
              onChange={(e) => setCfg({ showEyeLine: e.target.checked })}
            />
            Eye-line
          </label>
        </div>
        <div className="row">
          <label className="mini">Hanger drop</label>
          <input
            type="number"
            step="0.25"
            value={Math.round(fromInches(state.settings.hangerDropIn, units) * 100) / 100}
            onChange={(e) => setCfg({ hangerDropIn: toInches(parseFloat(e.target.value) || 0, units) })}
            aria-label="Distance from frame top down to the hanger"
          />
          <span className="mini">{u} below frame top</span>
        </div>
      </div>

      <div className="calib-method">
        <strong>Obstacles</strong>
        <p className="hint">
          Block out what's already there. Auto-layouts keep clear of them, and they show up in the
          hanging guide.
        </p>
        <div className="chips">
          {OBSTACLE_KINDS.map((k) => (
            <button key={k.key} className="chip" onClick={() => addObstacle(k.key)}>
              {k.icon} {k.label}
            </button>
          ))}
        </div>
        {state.obstacles.length > 0 && (
          <ul className="obstacle-list">
            {state.obstacles.map((o) => (
              <li key={o.id}>
                <button
                  className="linkbtn grow"
                  onClick={() => patchUi({ selectedObstacleId: o.id, selectedIds: [] })}
                >
                  {obstacleKind(o.kind).icon} {o.label} ·{' '}
                  {Math.round(fromInches(o.wIn, units))}×{Math.round(fromInches(o.hIn, units))}
                  {u}
                </button>
                <button
                  className="linkbtn"
                  aria-label={`Remove ${o.label}`}
                  onClick={() => dispatch({ type: 'removeObstacle', id: o.id })}
                >
                  ×
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>

      <div className="calib-method">
        <strong>Auto-layout</strong>
        <p className="hint">Seed an arrangement, then drag frames to fine-tune.</p>
        <div className="layout-btns">
          {Object.entries(LAYOUTS).map(([k, v]) => (
            <button key={k} onClick={() => applyLayout(k)} disabled={!scaleReady}>
              {v.label}
            </button>
          ))}
        </div>
      </div>
    </section>
  )
}
