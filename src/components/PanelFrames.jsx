import React, { useState } from 'react'
import { useStore, uid } from '../store.jsx'
import { disp, toInches, unitLabel, smallUnit, stepFor } from '../units.js'
import {
  MOULDINGS,
  MATS,
  moulding as mouldingOf,
  mat as matOf,
  openingOf,
  repriceGeometry,
  styleReady,
  swapOrientation,
} from '../frames.js'
import { workArea, frameBoxIn } from '../utils.js'
import FrameLibrary from './FrameLibrary.jsx'
import FrameStyleForm from './FrameStyleForm.jsx'
import { useToast } from './Toasts.jsx'

// Where to drop a newly added frame. Stacking each one a couple of inches off
// the last put them all on top of each other: on a touch screen only the top
// frame can be grabbed, so the rest looked undraggable. Scan the wall for the
// first spot that clears everything already on it, and only fall back to the
// centre when the wall is genuinely full.
function freeSpot(state, style, gapIn) {
  const { wallWIn, wallHIn } = workArea(state)
  const styleById = {}
  for (const s of state.frameStyles) styleById[s.id] = s
  const taken = state.placedFrames
    .map((p) => (styleById[p.styleId] ? frameBoxIn(p, styleById[p.styleId]) : null))
    .filter(Boolean)

  const w = style.outerW
  const h = style.outerH
  const pad = Math.max(1, gapIn)
  const step = Math.max(2, Math.min(w, h) / 2)
  // Every candidate is scored by how much it covers what's already there, so a
  // full wall degrades to "least covered" instead of dropping the frame on top
  // of another one.
  const cost = (x, y) =>
    taken.reduce((sum, b) => {
      const ox = Math.min(x + w + pad, b.x + b.w) - Math.max(x - pad, b.x)
      const oy = Math.min(y + h + pad, b.y + b.h) - Math.max(y - pad, b.y)
      return sum + (ox > 0 && oy > 0 ? ox * oy : 0)
    }, 0)

  // Candidate positions: a grid across the wall, always including the far edge
  // so a frame that only fits flush right still finds that spot.
  const axis = (max) => {
    const out = []
    for (let v = 1; v < max; v += step) out.push(v)
    out.push(Math.max(1, max))
    return out
  }
  const xs = axis(Math.max(1, wallWIn - w - 1))
  const ys = axis(Math.max(1, wallHIn - h - 1))

  let best = { xIn: xs[0], yIn: ys[0], cost: Infinity }
  for (const y of ys)
    for (const x of xs) {
      const c = cost(x, y)
      if (c === 0) return { xIn: x, yIn: y, crowded: false }
      if (c < best.cost) best = { xIn: x, yIn: y, cost: c }
    }
  return { xIn: best.xIn, yIn: best.yIn, crowded: true }
}

export default function PanelFrames({ ui, patchUi, mobile }) {
  const { state, dispatch } = useStore()
  // Frame sizes are cm/in — a frame is never quoted in metres.
  const units = smallUnit(state.units)
  const u = unitLabel(units)
  const toast = useToast()
  const [editing, setEditing] = useState(null)
  const [custom, setCustom] = useState(false)

  const fmt = (inches) => disp(inches, units)

  function addToWall(style) {
    if (!state.pixelsPerInch) {
      toast('Set up the wall first (step 1) so frames get a real size.', 'warn')
      return
    }
    if (!styleReady(style)) {
      toast('Mark this frame’s inner opening first.', 'warn')
      return
    }
    const { crowded, ...spot } = freeSpot(state, style, state.settings.gapIn)
    const id = uid('placed')
    dispatch({
      type: 'addPlaced',
      placed: {
        id,
        styleId: style.id,
        ...spot,
        rot: 0,
        photoId: null,
        crop: { scale: 1, ox: 0, oy: 0, rot: 0 },
      },
    })
    // On mobile the sheet covers the wall, so adding a frame you can't see is
    // just a counter going up. Drop the sheet and let them watch it land.
    // Half, not closed: the wall shows above it and the library is still
    // there, so adding three frames doesn't mean reopening the sheet twice.
    patchUi({ selectedIds: [id], selectedObstacleId: null, ...(mobile ? { sheet: 'half' } : {}) })
    if (crowded) toast('Wall is full, so that one landed on top. Try Arrange.', 'warn')
    else if (mobile) toast('Added to the wall — drag it where you want it.', 'ok')
  }

  return (
    <section>
      <FrameLibrary onPlace={addToWall} />

      <div className="calib-method">
        <button className="addnew" onClick={() => setCustom((c) => !c)}>
          {custom ? '× Close custom frame' : '+ Custom frame from a photo'}
        </button>
        {custom && <FrameStyleForm onDone={() => setCustom(false)} />}
      </div>

      <ul className="style-list">
        {state.frameStyles.map((s) => {
          const placed = state.placedFrames.filter((p) => p.styleId === s.id).length
          const ready = styleReady(s)
          const isOpen = editing === s.id
          return (
            <li key={s.id} className="style-item">
              <StyleThumb style={s} />
              <div className="style-meta">
                <strong>{s.name}</strong>
                <span>
                  {fmt(s.outerW)}×{fmt(s.outerH)} {u} outer · own {s.count}
                </span>
                {!ready && <span className="warn">⚠ set inner opening</span>}
                <div className="style-btns">
                  <button onClick={() => addToWall(s)} disabled={!ready}>
                    Add to wall ({placed}/{s.count})
                  </button>
                  <button
                    className="ghost"
                    title="Swap orientation"
                    onClick={() =>
                      dispatch({ type: 'updateFrameStyle', id: s.id, patch: swapOrientation(s) })
                    }
                  >
                    ⤢
                  </button>
                  <button className="ghost" onClick={() => setEditing(isOpen ? null : s.id)}>
                    {isOpen ? 'done' : 'edit'}
                  </button>
                  {s.kind === 'image' && (
                    <button className="ghost" onClick={() => patchUi({ openingStyleId: s.id })}>
                      {openingOf(s) ? 'opening' : 'set opening'}
                    </button>
                  )}
                  <button
                    className="linkbtn"
                    onClick={() => {
                      dispatch({ type: 'removeFrameStyle', id: s.id })
                      toast(`Removed ${s.name}.`, 'info')
                    }}
                  >
                    delete
                  </button>
                </div>

                {isOpen && (
                  <div className="style-editor">
                    <div className="row">
                      <input
                        value={s.name}
                        aria-label="Frame name"
                        onChange={(e) =>
                          dispatch({ type: 'updateFrameStyle', id: s.id, patch: { name: e.target.value } })
                        }
                      />
                    </div>
                    <div className="row">
                      <label className="mini">Own</label>
                      <input
                        type="number"
                        min="1"
                        value={s.count}
                        aria-label="How many you own"
                        onChange={(e) =>
                          dispatch({
                            type: 'updateFrameStyle',
                            id: s.id,
                            patch: { count: Math.max(1, parseInt(e.target.value, 10) || 1) },
                          })
                        }
                      />
                      <label className="mini">Price</label>
                      <input
                        type="number"
                        min="0"
                        step="0.01"
                        placeholder="—"
                        value={s.price ?? ''}
                        aria-label="Price per frame"
                        onChange={(e) =>
                          dispatch({
                            type: 'updateFrameStyle',
                            id: s.id,
                            patch: { price: e.target.value === '' ? null : parseFloat(e.target.value) },
                          })
                        }
                      />
                    </div>

                    {s.kind === 'preset' ? (
                      <>
                        <div className="row">
                          <label className="mini">Art</label>
                          <input
                            type="number"
                            step={0.5}
                            value={fmt(s.artW)}
                            aria-label={`Art width in ${u}`}
                            onChange={(e) =>
                              dispatch({
                                type: 'updateFrameStyle',
                                id: s.id,
                                patch: repriceGeometry(s, {
                                  artW: toInches(parseFloat(e.target.value) || 1, units),
                                }),
                              })
                            }
                          />
                          <span className="mini">×</span>
                          <input
                            type="number"
                            step={0.5}
                            value={fmt(s.artH)}
                            aria-label={`Art height in ${u}`}
                            onChange={(e) =>
                              dispatch({
                                type: 'updateFrameStyle',
                                id: s.id,
                                patch: repriceGeometry(s, {
                                  artH: toInches(parseFloat(e.target.value) || 1, units),
                                }),
                              })
                            }
                          />
                        </div>
                        <div className="row">
                          <label className="mini">Mat</label>
                          <input
                            type="range"
                            min="0"
                            max="4"
                            step="0.25"
                            value={s.matIn}
                            aria-label="Mat width"
                            onChange={(e) =>
                              dispatch({
                                type: 'updateFrameStyle',
                                id: s.id,
                                patch: repriceGeometry(s, { matIn: parseFloat(e.target.value) }),
                              })
                            }
                          />
                          <span className="mini num">{fmt(s.matIn)}{u}</span>
                        </div>
                        <div className="row">
                          <label className="mini">Moulding</label>
                          <input
                            type="range"
                            min="0.25"
                            max="3"
                            step="0.25"
                            value={s.frameWIn}
                            aria-label="Moulding width"
                            onChange={(e) =>
                              dispatch({
                                type: 'updateFrameStyle',
                                id: s.id,
                                patch: repriceGeometry(s, { frameWIn: parseFloat(e.target.value) }),
                              })
                            }
                          />
                          <span className="mini num">{fmt(s.frameWIn)}{u}</span>
                        </div>
                        <div className="row">
                          <div className="swatches">
                            {MOULDINGS.map((m) => (
                              <button
                                key={m.key}
                                className={`swatch ${s.mouldingKey === m.key ? 'on' : ''}`}
                                style={{ background: m.color, borderColor: m.edge }}
                                title={m.label}
                                aria-label={`Moulding ${m.label}`}
                                onClick={() =>
                                  dispatch({
                                    type: 'updateFrameStyle',
                                    id: s.id,
                                    patch: { mouldingKey: m.key },
                                  })
                                }
                              />
                            ))}
                          </div>
                          <div className="swatches">
                            {MATS.map((m) => (
                              <button
                                key={m.key}
                                className={`swatch ${s.matKey === m.key ? 'on' : ''}`}
                                style={{ background: m.color }}
                                title={`Mat ${m.label}`}
                                aria-label={`Mat ${m.label}`}
                                onClick={() =>
                                  dispatch({
                                    type: 'updateFrameStyle',
                                    id: s.id,
                                    patch: { matKey: m.key },
                                  })
                                }
                              />
                            ))}
                          </div>
                        </div>
                      </>
                    ) : (
                      <div className="row">
                        <label className="mini">Outer</label>
                        <input
                          type="number"
                          step={0.5}
                          value={fmt(s.outerW)}
                          aria-label={`Outer width in ${u}`}
                          onChange={(e) =>
                            dispatch({
                              type: 'updateFrameStyle',
                              id: s.id,
                              patch: { outerW: toInches(parseFloat(e.target.value) || 1, units) },
                            })
                          }
                        />
                        <span className="mini">×</span>
                        <input
                          type="number"
                          step={0.5}
                          value={fmt(s.outerH)}
                          aria-label={`Outer height in ${u}`}
                          onChange={(e) =>
                            dispatch({
                              type: 'updateFrameStyle',
                              id: s.id,
                              patch: { outerH: toInches(parseFloat(e.target.value) || 1, units) },
                            })
                          }
                        />
                      </div>
                    )}
                  </div>
                )}
              </div>
            </li>
          )
        })}
      </ul>
      {!state.frameStyles.length && (
        <p className="hint">Pick a size above to create your first frame.</p>
      )}
    </section>
  )
}

// Little CSS rendering of a style so the list reads at a glance.
export function StyleThumb({ style }) {
  if (style.kind === 'image' && style.image)
    return <img src={style.image} alt={style.name} className="thumb" />
  const m = mouldingOf(style.mouldingKey)
  const mt = matOf(style.matKey)
  const ratio = style.outerW / style.outerH
  const pad = Math.max(2, (style.frameWIn / style.outerW) * 46)
  return (
    <span className="thumb thumb-preset" style={{ background: m.color, borderColor: m.edge }}>
      <span
        style={{
          display: 'block',
          background: mt.color,
          width: '100%',
          height: '100%',
          aspectRatio: `${ratio}`,
          boxShadow: `inset 0 0 0 ${pad}px ${m.color}`,
        }}
      />
    </span>
  )
}
