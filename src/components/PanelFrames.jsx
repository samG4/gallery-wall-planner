import React, { useState } from 'react'
import { useStore, uid } from '../store.jsx'
import { fromInches, toInches, unitLabel } from '../units.js'
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
import { workArea } from '../utils.js'
import FrameLibrary from './FrameLibrary.jsx'
import FrameStyleForm from './FrameStyleForm.jsx'
import { useToast } from './Toasts.jsx'

export default function PanelFrames({ ui, patchUi }) {
  const { state, dispatch } = useStore()
  const { units } = state
  const u = unitLabel(units)
  const toast = useToast()
  const [editing, setEditing] = useState(null)
  const [custom, setCustom] = useState(false)

  const fmt = (inches) => Math.round(fromInches(inches, units) * 10) / 10

  function addToWall(style) {
    if (!state.pixelsPerInch) {
      toast('Set up the wall first (step 1) so frames get a real size.', 'warn')
      return
    }
    if (!styleReady(style)) {
      toast('Mark this frame’s inner opening first.', 'warn')
      return
    }
    const { wallWIn, wallHIn } = workArea(state)
    const n = state.placedFrames.length
    const off = (n % 6) * 2
    const id = uid('placed')
    dispatch({
      type: 'addPlaced',
      placed: {
        id,
        styleId: style.id,
        xIn: Math.max(1, wallWIn / 2 - style.outerW / 2 + off),
        yIn: Math.max(1, wallHIn / 2 - style.outerH / 2 + off),
        rot: 0,
        photoId: null,
        crop: { scale: 1, ox: 0, oy: 0, rot: 0 },
      },
    })
    patchUi({ selectedIds: [id], selectedObstacleId: null })
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
                            step="0.5"
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
                            step="0.5"
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
                          step="0.5"
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
                          step="0.5"
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
