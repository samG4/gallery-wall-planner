import React, { useMemo } from 'react'
import { useStore } from '../store.jsx'
import { disp, unitLabel } from '../units.js'
import { hangingPlan, shoppingList } from '../hanging.js'
import { downloadText } from '../utils.js'
import { obstacleKind, obstacleRect } from '../obstacles.js'

export default function HangingGuide({ onClose }) {
  const { state } = useStore()
  const units = state.units
  const u = unitLabel(units)
  const f = (inches) => disp(inches, units)

  const plan = useMemo(() => hangingPlan(state), [state])
  const list = useMemo(() => shoppingList(state), [state])
  const { rows, wallWIn, wallHIn, dropIn, floorOffsetIn, spread } = plan

  const styleById = {}
  for (const s of state.frameStyles) styleById[s.id] = s

  // Mini plan drawing: fixed width, wall aspect preserved.
  const SVG_W = 560
  const k = wallWIn > 0 ? SVG_W / wallWIn : 1
  const SVG_H = Math.max(80, wallHIn * k)

  const asText = () => {
    const lines = []
    lines.push(`Gallery wall — hanging guide`)
    lines.push(`Wall area: ${f(wallWIn)} × ${f(wallHIn)} ${u}`)
    lines.push(`Hanger drop used: ${f(dropIn)} ${u} below each frame's top edge`)
    if (spread) lines.push(`Arrangement block: ${f(spread.w)} × ${f(spread.h)} ${u}`)
    lines.push('')
    lines.push(
      ['#', 'Frame', 'Size', `From left`, `From top`, `Centre from floor`, `Nail(s) x / height`].join(
        ' | '
      )
    )
    rows.forEach((r, i) => {
      lines.push(
        [
          i + 1,
          r.name,
          `${f(r.boxWIn)}×${f(r.boxHIn)}${u}`,
          `${f(r.leftIn)}${u}`,
          `${f(r.topIn)}${u}`,
          `${f(r.centerFromFloorIn)}${u}`,
          r.hooks.map((h) => `${f(h.xIn)} / ${f(h.fromFloorIn)}`).join('  +  '),
        ].join(' | ')
      )
    })
    if (list.lines.length) {
      lines.push('')
      lines.push('Frames needed')
      for (const l of list.lines) {
        lines.push(
          `- ${l.qty}× ${l.name} (${l.sizeLabel}in)` +
            (l.toBuy > 0 ? ` — ${l.toBuy} to buy` : '') +
            (l.subtotal != null ? ` — ${l.subtotal.toFixed(2)}` : '')
        )
      }
      if (list.total != null) lines.push(`Total: ${list.total.toFixed(2)}`)
    }
    return lines.join('\n')
  }

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal modal-wide" onClick={(e) => e.stopPropagation()}>
        <div className="modal-head">
          <h3>Hanging guide</h3>
          <p className="hint">
            Measurements to take to the wall. Nail heights assume the hanger sits{' '}
            <strong>{f(dropIn)} {u}</strong> below the top of the frame — measure yours and change it
            in Settings if it differs.
          </p>
        </div>

        <div className="modal-body guide-body">
          <div className="print-sheet">
            <h2 className="print-only">Gallery wall — hanging guide</h2>

            <div className="guide-summary">
              <div>
                <span className="k">Wall area</span>
                <strong>
                  {f(wallWIn)} × {f(wallHIn)} {u}
                </strong>
              </div>
              {spread && (
                <div>
                  <span className="k">Arrangement block</span>
                  <strong>
                    {f(spread.w)} × {f(spread.h)} {u}
                  </strong>
                </div>
              )}
              <div>
                <span className="k">Frames</span>
                <strong>{rows.length}</strong>
              </div>
              <div>
                <span className="k">Hanger drop</span>
                <strong>
                  {f(dropIn)} {u}
                </strong>
              </div>
              {floorOffsetIn > 0 && (
                <div>
                  <span className="k">Area bottom above floor</span>
                  <strong>
                    {f(floorOffsetIn)} {u}
                  </strong>
                </div>
              )}
            </div>

            {wallWIn > 0 && (
              <svg
                className="guide-svg"
                viewBox={`0 0 ${SVG_W} ${SVG_H}`}
                width="100%"
                role="img"
                aria-label="Plan of the wall with nail positions"
              >
                <rect x="0" y="0" width={SVG_W} height={SVG_H} fill="#fffdfb" stroke="#d8c7bc" />
                {state.obstacles.map((o) => {
                  const r = obstacleRect(o, wallHIn, floorOffsetIn)
                  if (!r) return null
                  return (
                    <g key={o.id}>
                      <rect
                        x={r.x * k}
                        y={r.y * k}
                        width={r.w * k}
                        height={r.h * k}
                        fill="#f1e9e3"
                        stroke="#c9b6aa"
                        strokeDasharray="4 3"
                      />
                      <text x={r.x * k + 4} y={r.y * k + 14} fontSize="10" fill="#8b7c78">
                        {o.label || obstacleKind(o.kind).label}
                      </text>
                    </g>
                  )
                })}
                {rows.map((r, i) => (
                  <g key={r.id}>
                    <rect
                      x={r.leftIn * k}
                      y={r.topIn * k}
                      width={r.boxWIn * k}
                      height={r.boxHIn * k}
                      fill="#ffffff"
                      stroke="#3f3436"
                    />
                    <text
                      x={(r.leftIn + r.boxWIn / 2) * k}
                      y={(r.topIn + r.boxHIn / 2) * k + 4}
                      fontSize="11"
                      textAnchor="middle"
                      fill="#3f3436"
                    >
                      {i + 1}
                    </text>
                    {r.hooks.map((h, j) => (
                      <g key={j}>
                        <line
                          x1={h.xIn * k - 4}
                          y1={h.yIn * k}
                          x2={h.xIn * k + 4}
                          y2={h.yIn * k}
                          stroke="#e0655f"
                          strokeWidth="1.5"
                        />
                        <line
                          x1={h.xIn * k}
                          y1={h.yIn * k - 4}
                          x2={h.xIn * k}
                          y2={h.yIn * k + 4}
                          stroke="#e0655f"
                          strokeWidth="1.5"
                        />
                      </g>
                    ))}
                  </g>
                ))}
              </svg>
            )}

            {rows.length === 0 ? (
              <p className="hint">No frames on the wall yet.</p>
            ) : (
              <table className="guide-table">
                <thead>
                  <tr>
                    <th>#</th>
                    <th>Frame</th>
                    <th>Outer size ({u})</th>
                    <th>From left</th>
                    <th>From top</th>
                    <th>Centre above floor</th>
                    <th>Nail — from left / above floor</th>
                  </tr>
                </thead>
                <tbody>
                  {rows.map((r, i) => (
                    <tr key={r.id}>
                      <td>{i + 1}</td>
                      <td>
                        {r.name}
                        {r.rot ? ` (${r.rot}°)` : ''}
                      </td>
                      <td>
                        {f(r.boxWIn)} × {f(r.boxHIn)}
                      </td>
                      <td>{f(r.leftIn)}</td>
                      <td>{f(r.topIn)}</td>
                      <td>{f(r.centerFromFloorIn)}</td>
                      <td>
                        {r.hooks
                          .map((h) => `${f(h.xIn)} / ${f(h.fromFloorIn)}`)
                          .join('   +   ')}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}

            {list.lines.length > 0 && (
              <>
                <h4 className="guide-h4">Frames needed</h4>
                <table className="guide-table">
                  <thead>
                    <tr>
                      <th>Frame</th>
                      <th>Outer ({u})</th>
                      <th>On wall</th>
                      <th>Owned</th>
                      <th>To buy</th>
                      <th>Unit</th>
                      <th>Subtotal</th>
                    </tr>
                  </thead>
                  <tbody>
                    {list.lines.map((l) => (
                      <tr key={l.id}>
                        <td>{l.name}</td>
                        <td>{l.sizeLabel}</td>
                        <td>{l.qty}</td>
                        <td>{l.owned}</td>
                        <td>{l.toBuy || '—'}</td>
                        <td>{l.unit == null ? '—' : l.unit.toFixed(2)}</td>
                        <td>{l.subtotal == null ? '—' : l.subtotal.toFixed(2)}</td>
                      </tr>
                    ))}
                    {list.total != null && (
                      <tr className="total-row">
                        <td colSpan={6}>Total{list.partiallyPriced ? ' (priced items only)' : ''}</td>
                        <td>{list.total.toFixed(2)}</td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </>
            )}

            <p className="guide-foot">
              Mark the nail crosses, check them with a level, then hang. Measurements are from the
              wall area you defined in the planner.
            </p>
          </div>
        </div>

        <div className="modal-foot">
          <button onClick={() => window.print()}>Print / Save as PDF</button>
          <button
            className="ghost"
            onClick={() => downloadText('hanging-guide.txt', asText(), 'text/plain')}
          >
            Download .txt
          </button>
          <span className="spacer" />
          <button className="linkbtn" onClick={onClose}>
            close
          </button>
        </div>
      </div>
    </div>
  )
}
