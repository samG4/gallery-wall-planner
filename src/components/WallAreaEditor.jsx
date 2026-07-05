import React, { useRef, useState } from 'react'
import { useStore } from '../store.jsx'
import { toInches, fromInches, unitLabel } from '../units.js'

// Draw a rectangle on the wall photo = the working wall area, then enter its real
// width & height. This sets the scale (px/in) AND the placement bounds, so frames
// sit on the actual wall for a realistic mockup.
export default function WallAreaEditor({ onClose }) {
  const { state, dispatch } = useStore()
  const { units } = state
  const boxRef = useRef(null)
  const [drag, setDrag] = useState(null)
  const [rect, setRect] = useState(state.wallRegion || null) // fractions
  const [wIn, setWIn] = useState(state.wallRegionWIn ? fromInches(state.wallRegionWIn, units).toString() : '')
  const [hIn, setHIn] = useState(state.wallRegionHIn ? fromInches(state.wallRegionHIn, units).toString() : '')
  const [img] = useState(() => {
    const i = new Image()
    i.src = state.wallImage
    return i
  })

  if (!state.wallImage) return null

  // Fit photo within modal width AND height
  const natW = state.wallNaturalW || img.naturalWidth || 1
  const natH = state.wallNaturalH || img.naturalHeight || 1
  const maxW = Math.min(820, window.innerWidth - 80)
  const maxH = window.innerHeight - 240
  const scale = Math.min(maxW / natW, maxH / natH)
  const dispW = natW * scale
  const dispH = natH * scale

  function pos(e) {
    const r = boxRef.current.getBoundingClientRect()
    const cx = (e.touches ? e.touches[0].clientX : e.clientX) - r.left
    const cy = (e.touches ? e.touches[0].clientY : e.clientY) - r.top
    return { x: Math.max(0, Math.min(dispW, cx)), y: Math.max(0, Math.min(dispH, cy)) }
  }
  function down(e) {
    const p = pos(e)
    setDrag({ x0: p.x, y0: p.y, x1: p.x, y1: p.y })
  }
  function move(e) {
    if (!drag) return
    const p = pos(e)
    setDrag((d) => ({ ...d, x1: p.x, y1: p.y }))
  }
  function up() {
    if (!drag) return
    const x = Math.min(drag.x0, drag.x1)
    const y = Math.min(drag.y0, drag.y1)
    const w = Math.abs(drag.x1 - drag.x0)
    const h = Math.abs(drag.y1 - drag.y0)
    if (w > 8 && h > 8) setRect({ x: x / dispW, y: y / dispH, w: w / dispW, h: h / dispH })
    setDrag(null)
  }

  const drawn = drag
    ? {
        left: Math.min(drag.x0, drag.x1),
        top: Math.min(drag.y0, drag.y1),
        width: Math.abs(drag.x1 - drag.x0),
        height: Math.abs(drag.y1 - drag.y0),
      }
    : rect
    ? { left: rect.x * dispW, top: rect.y * dispH, width: rect.w * dispW, height: rect.h * dispH }
    : null

  function save() {
    const W = toInches(parseFloat(wIn), units)
    const H = toInches(parseFloat(hIn), units)
    if (!rect) return alert('Draw a rectangle over the wall area first.')
    if (!W || !H) return alert('Enter the real width and height of that area.')
    const ppi = (rect.w * natW) / W // px per inch from the region width
    dispatch({
      type: 'set',
      payload: {
        wallRegion: rect,
        wallRegionWIn: W,
        wallRegionHIn: H,
        pixelsPerInch: ppi,
      },
    })
    onClose()
  }

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal" onClick={(e) => e.stopPropagation()}>
        <div className="modal-head">
          <h3>Select the wall area</h3>
          <p className="hint">
            Drag a rectangle over the part of the wall you want to use, then enter its real width
            and height. Frames get placed inside this area at true scale.
          </p>
        </div>
        <div className="modal-body">
          <div
            ref={boxRef}
            className="opening-box"
            style={{ width: dispW, height: dispH }}
            onMouseDown={down}
            onMouseMove={move}
            onMouseUp={up}
            onMouseLeave={up}
            onTouchStart={down}
            onTouchMove={move}
            onTouchEnd={up}
          >
            <img src={state.wallImage} width={dispW} height={dispH} draggable={false} alt="" />
            {drawn && (
              <div
                className="opening-rect"
                style={{ left: drawn.left, top: drawn.top, width: drawn.width, height: drawn.height }}
              />
            )}
          </div>
        </div>
        <div className="modal-foot">
          <div className="row" style={{ margin: 0 }}>
            <span>Real size:</span>
            <input
              type="number"
              style={{ width: 90 }}
              placeholder={`W (${unitLabel(units)})`}
              value={wIn}
              onChange={(e) => setWIn(e.target.value)}
            />
            <span>×</span>
            <input
              type="number"
              style={{ width: 90 }}
              placeholder={`H (${unitLabel(units)})`}
              value={hIn}
              onChange={(e) => setHIn(e.target.value)}
            />
          </div>
          <span className="spacer" />
          <button className="linkbtn" onClick={() => setRect(null)}>
            clear
          </button>
          <button className="linkbtn" onClick={onClose}>
            cancel
          </button>
          <button onClick={save}>Set wall area</button>
        </div>
      </div>
    </div>
  )
}
