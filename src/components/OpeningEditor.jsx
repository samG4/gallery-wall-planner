import React, { useRef, useState } from 'react'
import { useStore } from '../store.jsx'

// Draw the inner opening rectangle on the frame photo. Stored as fractions (0..1)
// of the frame image so it stays correct at any display size.
export default function OpeningEditor({ styleId, onClose }) {
  const { state, dispatch } = useStore()
  const style = state.frameStyles.find((s) => s.id === styleId)
  const boxRef = useRef(null)
  const [drag, setDrag] = useState(null) // {x0,y0,x1,y1} in px within box
  const [rect, setRect] = useState(style.openingFrac || null) // fractions

  if (!style) return null

  // Display size: fit within modal width AND height, keep aspect
  const maxW = Math.min(820, window.innerWidth - 80)
  const maxH = window.innerHeight - 210
  const scale = Math.min(maxW / style.imgW, maxH / style.imgH)
  const dispW = style.imgW * scale
  const dispH = style.imgH * scale

  function pos(e) {
    const r = boxRef.current.getBoundingClientRect()
    const cx = (e.touches ? e.touches[0].clientX : e.clientX) - r.left
    const cy = (e.touches ? e.touches[0].clientY : e.clientY) - r.top
    return {
      x: Math.max(0, Math.min(dispW, cx)),
      y: Math.max(0, Math.min(dispH, cy)),
    }
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
    if (w > 6 && h > 6) {
      setRect({ x: x / dispW, y: y / dispH, w: w / dispW, h: h / dispH })
    }
    setDrag(null)
  }

  // Rect to draw (prefer live drag, else saved)
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
    if (!rect) {
      alert('Draw the inner opening rectangle first.')
      return
    }
    dispatch({ type: 'updateFrameStyle', id: styleId, patch: { openingFrac: rect } })
    onClose()
  }

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal" onClick={(e) => e.stopPropagation()}>
        <div className="modal-head">
          <h3>Mark the inner opening — {style.name}</h3>
          <p className="hint">
            Drag a rectangle over the area INSIDE the frame where a photo would sit.
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
          <img src={style.image} width={dispW} height={dispH} draggable={false} alt="" />
          {drawn && (
            <div
              className="opening-rect"
              style={{
                left: drawn.left,
                top: drawn.top,
                width: drawn.width,
                height: drawn.height,
              }}
            />
          )}
        </div>
        </div>
        <div className="modal-foot">
          <button onClick={save}>Save opening</button>
          <button className="linkbtn" onClick={() => setRect(null)}>
            clear
          </button>
          <span className="spacer" />
          <button className="linkbtn" onClick={onClose}>
            cancel
          </button>
        </div>
      </div>
    </div>
  )
}
