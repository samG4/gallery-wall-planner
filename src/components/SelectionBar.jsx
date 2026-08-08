import React, { useEffect, useState } from 'react'
import { useStore, uid } from '../store.jsx'
import { fromInches, toInches, unitLabel } from '../units.js'
import { frameBoxIn } from '../utils.js'
import { align, distribute, evenGap } from '../align.js'
import { obstacleKind } from '../obstacles.js'

// Number field that lets you type freely and only commits a valid value.
function NumInput({ valueIn, units, onCommitIn, title, width = 62, step = 0.5 }) {
  const [txt, setTxt] = useState('')
  const [live, setLive] = useState(false)
  useEffect(() => {
    if (!live) setTxt(String(Math.round(fromInches(valueIn, units) * 100) / 100))
  }, [valueIn, units, live])
  return (
    <input
      type="number"
      step={step}
      className="numin"
      style={{ width }}
      title={title}
      aria-label={title}
      value={txt}
      onFocus={() => setLive(true)}
      onBlur={() => setLive(false)}
      onChange={(e) => {
        setTxt(e.target.value)
        const v = parseFloat(e.target.value)
        if (!Number.isNaN(v)) onCommitIn(toInches(v, units))
      }}
    />
  )
}

export default function SelectionBar({ ui, patchUi }) {
  const { state, dispatch } = useStore()
  const units = state.units
  const u = unitLabel(units)
  const selected = ui.selectedIds || []

  // ---------------- obstacle selected ----------------
  const obstacle = state.obstacles.find((o) => o.id === ui.selectedObstacleId)
  if (obstacle) {
    const k = obstacleKind(obstacle.kind)
    const patch = (p) => dispatch({ type: 'updateObstacle', id: obstacle.id, patch: p })
    return (
      <div className="frame-actionbar">
        <span className="bar-title">
          {k.icon} {obstacle.label || k.label}
        </span>
        <span className="bar-group">
          <label>W</label>
          <NumInput valueIn={obstacle.wIn} units={units} onCommitIn={(v) => patch({ wIn: Math.max(1, v) })} title={`Width (${u})`} />
          <label>H</label>
          <NumInput valueIn={obstacle.hIn} units={units} onCommitIn={(v) => patch({ hIn: Math.max(1, v) })} title={`Height (${u})`} />
        </span>
        <span className="bar-group">
          <label>X</label>
          <NumInput valueIn={obstacle.xIn} units={units} onCommitIn={(v) => patch({ xIn: v })} title={`From wall left (${u})`} />
          <label>Y</label>
          <NumInput valueIn={obstacle.yIn} units={units} onCommitIn={(v) => patch({ yIn: v })} title={`From wall top (${u})`} />
        </span>
        <button
          className="danger"
          onClick={() => {
            dispatch({ type: 'removeObstacle', id: obstacle.id })
            patchUi({ selectedObstacleId: null })
          }}
        >
          Remove
        </button>
      </div>
    )
  }

  if (!selected.length) return null

  const items = selected
    .map((id) => {
      const placed = state.placedFrames.find((p) => p.id === id)
      const style = placed && state.frameStyles.find((s) => s.id === placed.styleId)
      return placed && style ? { id, placed, style } : null
    })
    .filter(Boolean)
  if (!items.length) return null

  const multi = items.length > 1
  const one = items[0]
  const box = frameBoxIn(one.placed, one.style)

  const applyPatches = (patches) => {
    if (Object.keys(patches).length) dispatch({ type: 'updateManyPlaced', patches })
  }

  const setRot = (deg) =>
    dispatch({
      type: 'updatePlaced',
      id: one.id,
      patch: { rot: ((deg % 360) + 360) % 360 },
    })

  const duplicate = () => {
    const ids = []
    for (const it of items) {
      const id = uid('placed')
      ids.push(id)
      dispatch({
        type: 'addPlaced',
        placed: { ...it.placed, id, xIn: it.placed.xIn + 2, yIn: it.placed.yIn + 2 },
      })
    }
    patchUi({ selectedIds: ids })
  }

  const remove = () => {
    dispatch({ type: 'removePlaced', ids: selected })
    patchUi({ selectedIds: [] })
  }

  const rot = Math.round(one.placed.rot || 0)

  return (
    <div className="frame-actionbar">
      {multi ? (
        <>
          <span className="bar-title">{items.length} frames</span>
          <span className="bar-group align-group">
            <button className="ghost" title="Align left" onClick={() => applyPatches(align(items, 'left'))}>⇤</button>
            <button className="ghost" title="Align centres (horizontal)" onClick={() => applyPatches(align(items, 'centerX'))}>⇹</button>
            <button className="ghost" title="Align right" onClick={() => applyPatches(align(items, 'right'))}>⇥</button>
            <button className="ghost" title="Align top" onClick={() => applyPatches(align(items, 'top'))}>⤒</button>
            <button className="ghost" title="Align middles (vertical)" onClick={() => applyPatches(align(items, 'centerY'))}>⇳</button>
            <button className="ghost" title="Align bottom" onClick={() => applyPatches(align(items, 'bottom'))}>⤓</button>
          </span>
          <span className="bar-group">
            <button className="ghost" title="Space evenly across" onClick={() => applyPatches(distribute(items, 'h'))}>↔ even</button>
            <button className="ghost" title="Space evenly down" onClick={() => applyPatches(distribute(items, 'v'))}>↕ even</button>
            <button
              className="ghost"
              title={`Set the standard gap (${Math.round(fromInches(state.settings.gapIn, units) * 10) / 10}${u}) horizontally`}
              onClick={() => applyPatches(evenGap(items, 'h', state.settings.gapIn))}
            >
              ↔ gap
            </button>
            <button
              className="ghost"
              title={`Set the standard gap (${Math.round(fromInches(state.settings.gapIn, units) * 10) / 10}${u}) vertically`}
              onClick={() => applyPatches(evenGap(items, 'v', state.settings.gapIn))}
            >
              ↕ gap
            </button>
          </span>
        </>
      ) : (
        <>
          <span className="bar-title">{one.style.name}</span>
          <span className="bar-group">
            <label>X</label>
            <NumInput
              valueIn={box.x}
              units={units}
              title={`Left edge from wall left (${u})`}
              onCommitIn={(v) =>
                dispatch({
                  type: 'updatePlaced',
                  id: one.id,
                  patch: { xIn: one.placed.xIn + (v - box.x) },
                })
              }
            />
            <label>Y</label>
            <NumInput
              valueIn={box.y}
              units={units}
              title={`Top edge from wall top (${u})`}
              onCommitIn={(v) =>
                dispatch({
                  type: 'updatePlaced',
                  id: one.id,
                  patch: { yIn: one.placed.yIn + (v - box.y) },
                })
              }
            />
          </span>
          <span className="bar-group rotate-ctl">
            <button className="ghost" onClick={() => setRot(rot - 90)} title="Rotate left 90°">⟲</button>
            <input
              type="range"
              min="0"
              max="359"
              value={rot}
              onChange={(e) => setRot(parseInt(e.target.value, 10))}
              aria-label="Rotate frame"
            />
            <button className="ghost" onClick={() => setRot(rot + 90)} title="Rotate right 90°">⟳</button>
            <button className="ghost" onClick={() => setRot(0)} title="Reset rotation">{rot}°</button>
          </span>
          <button
            disabled={!one.placed.photoId}
            onClick={() => patchUi({ cropPlacedId: one.id })}
            title={one.placed.photoId ? '' : 'Assign a photo first'}
          >
            Crop
          </button>
          {one.placed.photoId && (
            <button
              className="linkbtn"
              onClick={() => dispatch({ type: 'updatePlaced', id: one.id, patch: { photoId: null } })}
            >
              clear photo
            </button>
          )}
        </>
      )}
      <button className="ghost" onClick={duplicate} title="Duplicate (Cmd/Ctrl+D)">
        Duplicate
      </button>
      <button className="danger" onClick={remove} title="Remove (Delete)">
        Remove
      </button>
    </div>
  )
}
