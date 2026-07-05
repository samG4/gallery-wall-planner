import React, { useEffect, useLayoutEffect, useRef, useState } from 'react'
import { Stage, Layer, Image as KImage, Group, Rect, Line, Circle, Text, Label, Tag, Transformer } from 'react-konva'
import { useStore } from '../store.jsx'
import { useImage, photoPlacement, workArea } from '../utils.js'
import { toInches, fromInches, unitLabel, IN_PER_CM } from '../units.js'
import { buildDimensions } from '../dimensions.js'

export default function WallCanvas({ ui, patchUi }) {
  const { state, dispatch } = useStore()
  const wrapRef = useRef(null)
  const [size, setSize] = useState({ w: 800, h: 600 })

  useLayoutEffect(() => {
    if (!wrapRef.current) return
    const ro = new ResizeObserver((entries) => {
      const r = entries[0].contentRect
      setSize({ w: Math.max(200, r.width), h: Math.max(200, r.height) })
    })
    ro.observe(wrapRef.current)
    return () => ro.disconnect()
  }, [])

  const wallImg = useImage(state.wallImage)

  // Fit wall image "contain" into stage
  let displayScale = 1
  let offX = 0
  let offY = 0
  let wallDispW = 0
  let wallDispH = 0
  if (state.wallNaturalW && state.wallNaturalH) {
    displayScale = Math.min(size.w / state.wallNaturalW, size.h / state.wallNaturalH)
    wallDispW = state.wallNaturalW * displayScale
    wallDispH = state.wallNaturalH * displayScale
    offX = (size.w - wallDispW) / 2
    offY = (size.h - wallDispH) / 2
  }

  const ppi = state.pixelsPerInch
  const inToDisp = (v) => v * ppi * displayScale // inches -> stage px

  // Working wall area: inches-origin (stage px) + size. Region-aware for photo mode.
  const area = workArea(state)
  const originX = offX + area.ox * wallDispW
  const originY = offY + area.oy * wallDispH
  const wallWIn = area.wallWIn
  const wallHIn = area.wallHIn
  const hasRegion = state.wallMode === 'photo' && !!state.wallRegion

  // --- calibration reference line ---
  const [calA, setCalA] = useState(null)
  const [calB, setCalB] = useState(null)
  const [calLen, setCalLen] = useState('')

  useEffect(() => {
    if (!ui.calibrating) {
      setCalA(null)
      setCalB(null)
      setCalLen('')
    }
  }, [ui.calibrating])

  function stagePointer(e) {
    const stage = e.target.getStage()
    return stage.getPointerPosition()
  }

  function onStageMouseDown(e) {
    if (ui.calibrating) {
      const p = stagePointer(e)
      if (!calA) setCalA(p)
      else if (!calB) setCalB(p)
      else {
        setCalA(p)
        setCalB(null)
      }
      return
    }
    // click empty area deselects
    if (e.target === e.target.getStage() || e.target.name?.() === 'wall')
      patchUi({ selectedPlacedId: null })
  }

  function commitCalibration() {
    const inches = toInches(parseFloat(calLen), state.units)
    if (!calA || !calB || !inches) return
    const dx = calB.x - calA.x
    const dy = calB.y - calA.y
    const stagePx = Math.hypot(dx, dy)
    const naturalPx = stagePx / displayScale
    dispatch({ type: 'set', payload: { pixelsPerInch: naturalPx / inches, wallRegion: null } })
    patchUi({ calibrating: false })
  }

  return (
    <div className="canvas-inner" ref={wrapRef}>
      {!state.wallMode && (
        <div className="empty-state">
          <p>Set a wall to begin — blank canvas or a photo →</p>
        </div>
      )}

      <Stage width={size.w} height={size.h} onMouseDown={onStageMouseDown} onTouchStart={onStageMouseDown}>
        <Layer>
          {state.wallMode === 'blank' && wallDispW > 0 && (
            <Rect
              x={offX}
              y={offY}
              width={wallDispW}
              height={wallDispH}
              fill={state.wallColor}
              stroke="#00000022"
              name="wall"
            />
          )}
          {state.wallMode === 'photo' && wallImg && (
            <KImage image={wallImg} x={offX} y={offY} width={wallDispW} height={wallDispH} name="wall" />
          )}

          {/* selected wall-area outline (photo mode) */}
          {hasRegion && (
            <Rect
              x={originX}
              y={originY}
              width={inToDisp(wallWIn)}
              height={inToDisp(wallHIn)}
              stroke="#3b82f6"
              strokeWidth={2}
              dash={[10, 6]}
              listening={false}
            />
          )}

          {/* reference grid */}
          {ui.showGrid && ppi && wallWIn > 0 && (
            <GridOverlay
              offX={originX}
              offY={originY}
              wallWIn={wallWIn}
              wallHIn={wallHIn}
              inToDisp={inToDisp}
              units={state.units}
            />
          )}

          {/* placed frames */}
          {ppi &&
            state.placedFrames.map((p) => {
              const s = state.frameStyles.find((f) => f.id === p.styleId)
              if (!s) return null
              return (
                <PlacedFrameNode
                  key={p.id}
                  placed={p}
                  style={s}
                  photo={state.photos.find((ph) => ph.id === p.photoId)}
                  offX={originX}
                  offY={originY}
                  inToDisp={inToDisp}
                  ppi={ppi}
                  displayScale={displayScale}
                  selected={ui.selectedPlacedId === p.id}
                  onSelect={() => patchUi({ selectedPlacedId: p.id })}
                  onChange={(patch) =>
                    dispatch({ type: 'updatePlaced', id: p.id, patch })
                  }
                />
              )
            })}

          {/* blueprint dimensions */}
          {ui.showDims && ppi && (
            <DimensionsOverlay
              placedFrames={state.placedFrames}
              frameStyles={state.frameStyles}
              wallWIn={wallWIn}
              wallHIn={wallHIn}
              offX={originX}
              offY={originY}
              inToDisp={inToDisp}
              units={state.units}
            />
          )}

          {/* calibration line */}
          {ui.calibrating && calA && (
            <>
              {calB && (
                <Line
                  points={[calA.x, calA.y, calB.x, calB.y]}
                  stroke="#ff3b6b"
                  strokeWidth={3}
                  dash={[8, 4]}
                />
              )}
              <Circle x={calA.x} y={calA.y} radius={5} fill="#ff3b6b" />
              {calB && <Circle x={calB.x} y={calB.y} radius={5} fill="#ff3b6b" />}
            </>
          )}
        </Layer>
      </Stage>

      {/* view toolbar */}
      {state.wallMode && (
        <div className="view-toolbar">
          <button
            className={ui.showGrid ? 'active' : 'ghost'}
            onClick={() => patchUi({ showGrid: !ui.showGrid })}
            title="Reference grid"
          >
            Grid
          </button>
          <button
            className={ui.showDims ? 'active' : 'ghost'}
            onClick={() => patchUi({ showDims: !ui.showDims })}
            title="Blueprint measurements"
          >
            Measurements
          </button>
        </div>
      )}

      {/* calibration prompt overlay */}
      {ui.calibrating && (
        <div className="calib-overlay">
          {!calA && <span>Click the START of a known distance…</span>}
          {calA && !calB && <span>Now click the END…</span>}
          {calA && calB && (
            <div className="row">
              <span>Real length:</span>
              <input
                type="number"
                autoFocus
                placeholder={unitLabel(state.units)}
                value={calLen}
                onChange={(e) => setCalLen(e.target.value)}
              />
              <span>{unitLabel(state.units)}</span>
              <button onClick={commitCalibration}>Set scale</button>
              <button className="linkbtn" onClick={() => { setCalA(null); setCalB(null) }}>
                redo
              </button>
            </div>
          )}
        </div>
      )}

      {/* action bar for selected frame */}
      {ui.selectedPlacedId && (
        <div className="frame-actionbar">
          <SelectedActions ui={ui} patchUi={patchUi} />
        </div>
      )}

      {state.wallMode === 'photo' && !ppi && (
        <div className="calib-overlay warn-overlay">
          Set the scale (sidebar step 1) so frames render at real size.
        </div>
      )}
    </div>
  )
}

function SelectedActions({ ui, patchUi }) {
  const { state, dispatch } = useStore()
  const p = state.placedFrames.find((x) => x.id === ui.selectedPlacedId)
  if (!p) return null
  const hasPhoto = !!p.photoId
  const rot = Math.round(p.rot || 0)
  const setRot = (deg) =>
    dispatch({ type: 'updatePlaced', id: p.id, patch: { rot: ((deg % 360) + 360) % 360 } })
  return (
    <>
      <div className="rotate-ctl">
        <button className="ghost" onClick={() => setRot(rot - 90)} title="Rotate left 90°">⟲</button>
        <input
          type="range"
          min="0"
          max="359"
          value={rot}
          onChange={(e) => setRot(parseInt(e.target.value, 10))}
          title="Rotate"
        />
        <button className="ghost" onClick={() => setRot(rot + 90)} title="Rotate right 90°">⟳</button>
        <button className="ghost" onClick={() => setRot(0)} title="Reset rotation">{rot}°</button>
      </div>
      <button
        disabled={!hasPhoto}
        onClick={() => patchUi({ cropPlacedId: p.id })}
        title={hasPhoto ? '' : 'Assign a photo first (click one in the sidebar)'}
      >
        Crop photo
      </button>
      {hasPhoto && (
        <button
          className="linkbtn"
          onClick={() => dispatch({ type: 'updatePlaced', id: p.id, patch: { photoId: null } })}
        >
          Clear photo
        </button>
      )}
      <button
        className="danger"
        onClick={() => {
          dispatch({ type: 'removePlaced', id: p.id })
          patchUi({ selectedPlacedId: null })
        }}
      >
        Remove frame
      </button>
    </>
  )
}

function PlacedFrameNode({
  placed,
  style,
  photo,
  offX,
  offY,
  inToDisp,
  ppi,
  displayScale,
  selected,
  onSelect,
  onChange,
}) {
  const frameImg = useImage(style.image)
  const photoImg = useImage(photo?.image)
  const groupRef = useRef(null)
  const trRef = useRef(null)

  const fw = inToDisp(style.outerW)
  const fh = inToDisp(style.outerH)
  // Rotate around center: place origin at frame center, offset by half-size.
  const cx = offX + inToDisp(placed.xIn) + fw / 2
  const cy = offY + inToDisp(placed.yIn) + fh / 2

  // Attach rotate handle to this node when selected.
  useEffect(() => {
    if (selected && trRef.current && groupRef.current) {
      trRef.current.nodes([groupRef.current])
      trRef.current.getLayer()?.batchDraw()
    }
  }, [selected, fw, fh])

  const commit = (node) => {
    node.scaleX(1)
    node.scaleY(1)
    // node.x()/y() is the CENTER (origin offset to center). Back out top-left.
    const topLeftPx = node.x() - fw / 2
    const topPx = node.y() - fh / 2
    onChange({
      xIn: (topLeftPx - offX) / (ppi * displayScale),
      yIn: (topPx - offY) / (ppi * displayScale),
      rot: ((node.rotation() % 360) + 360) % 360,
    })
  }

  const of = style.openingFrac
  let opening = null
  if (of) {
    opening = { x: of.x * fw, y: of.y * fh, w: of.w * fw, h: of.h * fh }
  }

  const place =
    opening && photoImg
      ? photoPlacement(opening.w, opening.h, photo.w, photo.h, placed.crop)
      : null

  return (
    <>
    <Group
      ref={groupRef}
      x={cx}
      y={cy}
      offsetX={fw / 2}
      offsetY={fh / 2}
      rotation={placed.rot || 0}
      draggable
      onClick={onSelect}
      onTap={onSelect}
      onDragStart={onSelect}
      onDragMove={(e) => commit(e.target)}
      onDragEnd={(e) => commit(e.target)}
      onTransformEnd={(e) => commit(e.target)}
    >
      {/* frame photo first (full, solid) */}
      {frameImg && <KImage image={frameImg} width={fw} height={fh} listening={true} />}

      {/* user photo drawn OVER the frame's inner opening, clipped to it */}
      {opening && photoImg && (
        <Group
          clipX={opening.x}
          clipY={opening.y}
          clipWidth={opening.w}
          clipHeight={opening.h}
        >
          <KImage
            image={photoImg}
            x={opening.x + place.cx}
            y={opening.y + place.cy}
            offsetX={place.w / 2}
            offsetY={place.h / 2}
            rotation={place.rot}
            width={place.w}
            height={place.h}
          />
        </Group>
      )}

      {/* empty-opening hint */}
      {opening && !photoImg && (
        <Rect
          x={opening.x}
          y={opening.y}
          width={opening.w}
          height={opening.h}
          stroke="#ffffff"
          dash={[6, 4]}
          opacity={0.6}
        />
      )}

      {selected && (
        <Rect width={fw} height={fh} stroke="#3b82f6" strokeWidth={3} listening={false} />
      )}
    </Group>
    {selected && (
      <Transformer
        ref={trRef}
        rotateEnabled={true}
        resizeEnabled={false}
        enabledAnchors={[]}
        rotationSnaps={[0, 45, 90, 135, 180, 225, 270, 315]}
        rotationSnapTolerance={5}
        anchorSize={10}
        borderStroke="#3b82f6"
      />
    )}
    </>
  )
}

// Format an inch value in the active unit for labels.
function fmtLen(inches, units) {
  const v = fromInches(inches, units)
  const n = Math.round(v * 10) / 10
  return units === 'cm' ? `${n}cm` : `${n}"`
}

// Figma-style reference grid, drawn only over the wall area.
function GridOverlay({ offX, offY, wallWIn, wallHIn, inToDisp, units }) {
  const minorIn = units === 'cm' ? 5 * IN_PER_CM : 6 // 5cm or 6in
  const majorEvery = 2 // every 2nd line is a major line (10cm / 12in)
  const wPx = inToDisp(wallWIn)
  const hPx = inToDisp(wallHIn)
  const lines = []
  const cols = Math.floor(wallWIn / minorIn)
  const rows = Math.floor(wallHIn / minorIn)
  if (cols > 400 || rows > 400) return null // safety
  for (let i = 1; i <= cols; i++) {
    const x = offX + inToDisp(i * minorIn)
    const major = i % majorEvery === 0
    lines.push(
      <Line
        key={`v${i}`}
        points={[x, offY, x, offY + hPx]}
        stroke={major ? 'rgba(90,120,170,0.55)' : 'rgba(90,120,170,0.28)'}
        strokeWidth={1}
        listening={false}
      />
    )
  }
  for (let j = 1; j <= rows; j++) {
    const y = offY + inToDisp(j * minorIn)
    const major = j % majorEvery === 0
    lines.push(
      <Line
        key={`h${j}`}
        points={[offX, y, offX + wPx, y]}
        stroke={major ? 'rgba(90,120,170,0.55)' : 'rgba(90,120,170,0.28)'}
        strokeWidth={1}
        listening={false}
      />
    )
  }
  return <Group listening={false}>{lines}</Group>
}

// A single dimension segment with end ticks + a value badge. Coords in stage px.
function DimSeg({ type, x1, y1, x2, y2, text }) {
  const t = 5 // tick half-length
  const midX = (x1 + x2) / 2
  const midY = (y1 + y2) / 2
  const ticks =
    type === 'h'
      ? [
          [x1, y1 - t, x1, y1 + t],
          [x2, y2 - t, x2, y2 + t],
        ]
      : [
          [x1 - t, y1, x1 + t, y1],
          [x2 - t, y2, x2 + t, y2],
        ]
  const lx = type === 'h' ? midX : midX + 8
  const ly = type === 'h' ? midY - 16 : midY
  return (
    <Group listening={false}>
      <Line points={[x1, y1, x2, y2]} stroke="#e11d48" strokeWidth={1.2} />
      {ticks.map((p, i) => (
        <Line key={i} points={p} stroke="#e11d48" strokeWidth={1.2} />
      ))}
      <Label x={lx} y={ly} offsetX={type === 'h' ? text.length * 3.2 : 0}>
        <Tag fill="#111827" cornerRadius={3} opacity={0.92} />
        <Text text={text} fontSize={11} fill="#fff" padding={3} />
      </Label>
    </Group>
  )
}

// Blueprint dimensions: per-frame offsets/gaps + wall totals. Updates live on drag.
function DimensionsOverlay({ placedFrames, frameStyles, wallWIn, wallHIn, offX, offY, inToDisp, units }) {
  const styleById = {}
  for (const s of frameStyles) styleById[s.id] = s
  const { dims } = buildDimensions(placedFrames, styleById, wallWIn, wallHIn)
  const X = (v) => offX + inToDisp(v)
  const Y = (v) => offY + inToDisp(v)
  const wallRight = X(wallWIn)
  const wallBottom = Y(wallHIn)

  return (
    <Group listening={false}>
      {/* wall totals just outside the top and left edges */}
      <DimSeg type="h" x1={offX} y1={offY - 18} x2={wallRight} y2={offY - 18} text={fmtLen(wallWIn, units)} />
      <DimSeg type="v" x1={offX - 18} y1={offY} x2={offX - 18} y2={wallBottom} text={fmtLen(wallHIn, units)} />

      {dims
        .filter((d) => d.value > 0.1)
        .map((d, i) => (
          <DimSeg
            key={i}
            type={d.type}
            x1={X(d.x1)}
            y1={Y(d.y1)}
            x2={X(d.x2)}
            y2={Y(d.y2)}
            text={fmtLen(d.value, units)}
          />
        ))}
    </Group>
  )
}
