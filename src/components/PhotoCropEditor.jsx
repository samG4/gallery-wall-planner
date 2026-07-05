import React, { useRef, useState } from 'react'
import { useStore } from '../store.jsx'
import { photoPlacement } from '../utils.js'

// Pan + zoom a photo to fit inside a frame's opening. WYSIWYG with the wall canvas.
export default function PhotoCropEditor({ placedId, onClose }) {
  const { state, dispatch } = useStore()
  const placed = state.placedFrames.find((p) => p.id === placedId)
  const style = placed && state.frameStyles.find((s) => s.id === placed.styleId)
  const photo = placed && state.photos.find((p) => p.id === placed.photoId)
  const [crop, setCrop] = useState(placed?.crop || { scale: 1, ox: 0, oy: 0, rot: 0 })
  const dragRef = useRef(null)

  if (!placed || !style || !photo) return null
  if (!style.openingFrac) {
    return (
      <div className="modal-backdrop" onClick={onClose}>
        <div className="modal" onClick={(e) => e.stopPropagation()}>
          <p>Set this frame's inner opening first.</p>
          <button onClick={onClose}>OK</button>
        </div>
      </div>
    )
  }

  // Real opening aspect (physically correct) drives the crop box shape.
  const of = style.openingFrac
  const aspect = (of.w * style.outerW) / (of.h * style.outerH)
  let boxW = Math.min(560, window.innerWidth - 100)
  let boxH = boxW / aspect
  const maxH = window.innerHeight - 320
  if (boxH > maxH) {
    boxH = maxH
    boxW = boxH * aspect
  }

  const place = photoPlacement(boxW, boxH, photo.w, photo.h, crop)

  function down(e) {
    const c = e.touches ? e.touches[0] : e
    dragRef.current = { x: c.clientX, y: c.clientY, ox: crop.ox, oy: crop.oy }
  }
  function move(e) {
    if (!dragRef.current) return
    const c = e.touches ? e.touches[0] : e
    const dx = c.clientX - dragRef.current.x
    const dy = c.clientY - dragRef.current.y
    setCrop((cr) => ({
      ...cr,
      ox: dragRef.current.ox + dx / boxW,
      oy: dragRef.current.oy + dy / boxH,
    }))
  }
  function up() {
    dragRef.current = null
  }

  const rotBy = (d) =>
    setCrop((cr) => ({ ...cr, rot: ((((cr.rot || 0) + d) % 360) + 360) % 360 }))

  function save() {
    dispatch({ type: 'updatePlaced', id: placedId, patch: { crop } })
    onClose()
  }

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal" onClick={(e) => e.stopPropagation()}>
        <div className="modal-head">
          <h3>Crop to fit — {style.name}</h3>
          <p className="hint">Drag to reposition, sliders to zoom and rotate.</p>
        </div>
        <div className="modal-body">
          <div
            className="crop-box"
            style={{ width: boxW, height: boxH }}
            onMouseDown={down}
            onMouseMove={move}
            onMouseUp={up}
            onMouseLeave={up}
            onTouchStart={down}
            onTouchMove={move}
            onTouchEnd={up}
          >
            <img
              src={photo.image}
              draggable={false}
              style={{
                position: 'absolute',
                left: place.cx,
                top: place.cy,
                width: place.w,
                height: place.h,
                transform: `translate(-50%, -50%) rotate(${place.rot}deg)`,
                userSelect: 'none',
              }}
              alt=""
            />
          </div>
        </div>
        <div className="modal-foot">
          <div className="ctl-col">
            <div className="row zoom-row">
              <span>Zoom</span>
              <input
                type="range"
                min="1"
                max="4"
                step="0.01"
                value={crop.scale}
                onChange={(e) => setCrop((cr) => ({ ...cr, scale: parseFloat(e.target.value) }))}
              />
            </div>
            <div className="row zoom-row">
              <span>Rotate</span>
              <button className="ghost" onClick={() => rotBy(-90)} title="Rotate left 90°">⟲</button>
              <input
                type="range"
                min="0"
                max="359"
                step="1"
                value={Math.round(crop.rot || 0)}
                onChange={(e) => setCrop((cr) => ({ ...cr, rot: parseInt(e.target.value, 10) }))}
              />
              <button className="ghost" onClick={() => rotBy(90)} title="Rotate right 90°">⟳</button>
              <button className="ghost" onClick={() => setCrop((cr) => ({ ...cr, rot: 0 }))}>
                {Math.round(crop.rot || 0)}°
              </button>
            </div>
          </div>
          <span className="spacer" />
          <button
            className="linkbtn"
            onClick={() => setCrop({ scale: 1, ox: 0, oy: 0, rot: 0 })}
          >
            reset
          </button>
          <button className="linkbtn" onClick={onClose}>
            cancel
          </button>
          <button onClick={save}>Save crop</button>
        </div>
      </div>
    </div>
  )
}
