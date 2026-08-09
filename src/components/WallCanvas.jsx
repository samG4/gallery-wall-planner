import React, { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react'
import {
  Stage,
  Layer,
  Image as KImage,
  Group,
  Rect,
  Line,
  Circle,
  Text,
  Label,
  Tag,
  Transformer,
} from 'react-konva'
import { useStore } from '../store.jsx'
import { useImage, photoPlacement, workArea, frameBoxIn, clamp } from '../utils.js'
import { toInches, fromInches, unitLabel, IN_PER_CM } from '../units.js'
import { buildDimensions } from '../dimensions.js'
import { openingOf, moulding as mouldingOf, mat as matOf } from '../frames.js'
import { obstacleKind, obstacleRect } from '../obstacles.js'
import { snapBox } from '../snap.js'
import { CANVAS } from '../theme.js'

const MIN_ZOOM = 0.25
const MAX_ZOOM = 8

export default function WallCanvas({ ui, patchUi, canvasApi }) {
  const { state, dispatch } = useStore()
  const wrapRef = useRef(null)
  const stageRef = useRef(null)
  const contentRef = useRef(null)
  const [size, setSize] = useState({ w: 800, h: 600 })
  const [view, setView] = useState({ zoom: 1, tx: 0, ty: 0 })
  const [guides, setGuides] = useState([])
  const pinchRef = useRef(null)
  const dragOriginRef = useRef(null)

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
  const inToDisp = useCallback((v) => v * ppi * displayScale, [ppi, displayScale]) // inches -> content px

  // Working wall area: inches-origin (content px) + size. Region-aware for photo mode.
  const area = workArea(state)
  const originX = offX + area.ox * wallDispW
  const originY = offY + area.oy * wallDispH
  const wallWIn = area.wallWIn
  const wallHIn = area.wallHIn
  const hasRegion = state.wallMode === 'photo' && !!state.wallRegion

  const styleById = useMemo(() => {
    const m = {}
    for (const s of state.frameStyles) m[s.id] = s
    return m
  }, [state.frameStyles])

  const selected = ui.selectedIds || []
  const isSelected = (id) => selected.includes(id)

  // Eye-line height inside the working area (measured up from the floor).
  const eyeLineY = useMemo(() => {
    const { eyeLineIn, floorOffsetIn } = state.settings
    const y = wallHIn - (eyeLineIn - floorOffsetIn)
    return y > 0 && y < wallHIn ? y : null
  }, [state.settings, wallHIn])

  // ---------------- zoom / pan ----------------
  const zoomAbout = useCallback((stagePt, nextZoom, base) => {
    const z = clamp(nextZoom, MIN_ZOOM, MAX_ZOOM)
    const lx = (stagePt.x - base.tx) / base.zoom
    const ly = (stagePt.y - base.ty) / base.zoom
    setView({ zoom: z, tx: stagePt.x - lx * z, ty: stagePt.y - ly * z })
  }, [])

  const zoomBy = (k) => {
    const c = { x: size.w / 2, y: size.h / 2 }
    zoomAbout(c, view.zoom * k, view)
  }
  const resetView = () => setView({ zoom: 1, tx: 0, ty: 0 })

  // Scrolling pans; it never changes zoom. A trackpad pinch arrives as a wheel
  // event with ctrlKey set (and Cmd is the keyboard equivalent), so that zooms.
  function onWheel(e) {
    e.evt.preventDefault()
    if (e.evt.ctrlKey || e.evt.metaKey) {
      const p = stageRef.current?.getPointerPosition()
      if (!p) return
      zoomAbout(p, view.zoom * Math.exp(-e.evt.deltaY * 0.01), view)
      return
    }
    setView((v) => ({ ...v, tx: v.tx - e.evt.deltaX, ty: v.ty - e.evt.deltaY }))
  }

  function onTouchMove(e) {
    const t = e.evt.touches
    if (!t || t.length < 2) return
    e.evt.preventDefault()
    const stage = stageRef.current
    const rect = stage.container().getBoundingClientRect()
    const p1 = { x: t[0].clientX - rect.left, y: t[0].clientY - rect.top }
    const p2 = { x: t[1].clientX - rect.left, y: t[1].clientY - rect.top }
    const dist = Math.hypot(p2.x - p1.x, p2.y - p1.y)
    const mid = { x: (p1.x + p2.x) / 2, y: (p1.y + p2.y) / 2 }
    if (!pinchRef.current) {
      // second finger just landed — abandon any drag Konva started with finger one
      contentRef.current?.stopDrag()
      stage.getStage().find('Group').forEach((n) => n.isDragging?.() && n.stopDrag())
      pinchRef.current = { dist, mid, view }
      return
    }
    const base = pinchRef.current
    const z = clamp((base.view.zoom * dist) / base.dist, MIN_ZOOM, MAX_ZOOM)
    const lx = (base.mid.x - base.view.tx) / base.view.zoom
    const ly = (base.mid.y - base.view.ty) / base.view.zoom
    setView({ zoom: z, tx: mid.x - lx * z, ty: mid.y - ly * z })
  }
  const endPinch = () => {
    pinchRef.current = null
  }

  // ---------------- snapping ----------------
  // Boxes (inches) that a dragged item should align to: every other frame plus
  // every obstacle. Selected siblings are excluded so a group drag stays rigid.
  const snapTargets = useCallback(
    (excludeIds) => {
      const out = []
      for (const p of state.placedFrames) {
        if (excludeIds.includes(p.id)) continue
        const s = styleById[p.styleId]
        if (s) out.push(frameBoxIn(p, s))
      }
      for (const o of state.obstacles) {
        if (excludeIds.includes(o.id)) continue
        const r = obstacleRect(o, wallHIn, state.settings.floorOffsetIn)
        if (r) out.push(r)
      }
      return out
    },
    [state.placedFrames, state.obstacles, styleById, wallHIn, state.settings.floorOffsetIn]
  )

  const snapFor = useCallback(
    (box, excludeIds, bypass) => {
      if (!state.settings.snap || bypass) {
        setGuides([])
        return { dx: 0, dy: 0 }
      }
      const tolIn = 7 / (ppi * displayScale * view.zoom || 1) // ~7 screen px
      const res = snapBox(box, snapTargets(excludeIds), {
        wallWIn,
        wallHIn,
        gapIn: state.settings.gapIn,
        eyeLineY: state.settings.showEyeLine ? eyeLineY : null,
        tolIn,
      })
      setGuides(res.guides)
      return res
    },
    [state.settings, snapTargets, wallWIn, wallHIn, eyeLineY, ppi, displayScale, view.zoom]
  )

  // ---------------- frame dragging ----------------
  const onFrameDragStart = (id) => {
    if (!isSelected(id)) patchUi({ selectedIds: [id], selectedObstacleId: null })
    const ids = isSelected(id) ? selected : [id]
    const snapshot = {}
    for (const p of state.placedFrames) if (ids.includes(p.id)) snapshot[p.id] = { xIn: p.xIn, yIn: p.yIn }
    dragOriginRef.current = { leadId: id, ids, snapshot }
  }

  // Called with the lead frame's proposed top-left. Applies snapping, then moves
  // the whole selection by the same delta.
  const onFrameDragMove = (id, xIn, yIn, altKey) => {
    const origin = dragOriginRef.current
    const ids = origin?.ids?.includes(id) ? origin.ids : [id]
    const p = state.placedFrames.find((f) => f.id === id)
    const s = p && styleById[p.styleId]
    if (!s) return
    const probe = frameBoxIn({ ...p, xIn, yIn }, s)
    const { dx, dy } = snapFor(probe, ids, altKey)
    const nx = xIn + dx
    const ny = yIn + dy
    if (ids.length > 1 && origin) {
      const base = origin.snapshot[id]
      const ddx = nx - base.xIn
      const ddy = ny - base.yIn
      const patches = {}
      for (const pid of ids) {
        const b = origin.snapshot[pid]
        if (!b) continue
        patches[pid] = { xIn: b.xIn + ddx, yIn: b.yIn + ddy }
      }
      dispatch({ type: 'updateManyPlaced', patches })
    } else {
      dispatch({ type: 'updatePlaced', id, patch: { xIn: nx, yIn: ny } })
    }
  }

  const onFrameDragEnd = () => {
    dragOriginRef.current = null
    setGuides([])
  }

  // ---------------- selection ----------------
  const selectFrame = (id, additive) => {
    if (additive) {
      const next = isSelected(id) ? selected.filter((x) => x !== id) : [...selected, id]
      patchUi({ selectedIds: next, selectedObstacleId: null })
    } else {
      patchUi({ selectedIds: [id], selectedObstacleId: null })
    }
  }

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

  function contentPointer() {
    return contentRef.current?.getRelativePointerPosition() || null
  }

  function onStageMouseDown(e) {
    if (ui.calibrating) {
      const p = contentPointer()
      if (!p) return
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
      patchUi({ selectedIds: [], selectedObstacleId: null })
  }

  function commitCalibration() {
    const inches = toInches(parseFloat(calLen), state.units)
    if (!calA || !calB || !inches) return
    const dx = calB.x - calA.x
    const dy = calB.y - calA.y
    const contentPx = Math.hypot(dx, dy)
    const naturalPx = contentPx / displayScale
    dispatch({ type: 'set', payload: { pixelsPerInch: naturalPx / inches, wallRegion: null } })
    patchUi({ calibrating: false })
  }

  // ---------------- PNG export ----------------
  useEffect(() => {
    if (!canvasApi) return
    canvasApi.current = {
      exportPNG: (pixelRatio = 2) => {
        const stage = stageRef.current
        if (!stage || !wallDispW) return null
        // Snapshot the wall rectangle at its unzoomed size, ignoring the view transform.
        const prev = { ...view }
        stage.find('Transformer').forEach((t) => t.visible(false))
        const content = contentRef.current
        content.position({ x: 0, y: 0 })
        content.scale({ x: 1, y: 1 })
        content.getLayer().batchDraw()
        const url = stage.toDataURL({
          x: offX,
          y: offY,
          width: wallDispW,
          height: wallDispH,
          pixelRatio,
        })
        content.position({ x: prev.tx, y: prev.ty })
        content.scale({ x: prev.zoom, y: prev.zoom })
        stage.find('Transformer').forEach((t) => t.visible(true))
        content.getLayer().batchDraw()
        return url
      },
    }
  }, [canvasApi, view, offX, offY, wallDispW, wallDispH])

  const showFrames = !!ppi

  return (
    <div className="canvas-inner" ref={wrapRef}>
      {!state.wallMode && (
        <div className="empty-state">
          <div>
            <p className="empty-title">Start with your wall</p>
            <p className="empty-sub">
              Pick a blank size or upload a photo of the wall — then add frames at real size.
            </p>
          </div>
        </div>
      )}

      <Stage
        ref={stageRef}
        width={size.w}
        height={size.h}
        onMouseDown={onStageMouseDown}
        onTouchStart={onStageMouseDown}
        onTouchMove={onTouchMove}
        onTouchEnd={endPinch}
        onTouchCancel={endPinch}
        onWheel={onWheel}
      >
        <Layer>
          <Group
            ref={contentRef}
            x={view.tx}
            y={view.ty}
            scaleX={view.zoom}
            scaleY={view.zoom}
            draggable={!ui.calibrating}
            onDragMove={(e) => {
              if (e.target !== contentRef.current) return
              setView((v) => ({ ...v, tx: e.target.x(), ty: e.target.y() }))
            }}
          >
            {state.wallMode === 'blank' && wallDispW > 0 && (
              <Rect
                x={offX}
                y={offY}
                width={wallDispW}
                height={wallDispH}
                fill={state.wallColor}
                stroke={CANVAS.wallStroke}
                shadowColor={CANVAS.wallShadow}
                shadowBlur={24}
                shadowOpacity={1}
                shadowOffsetY={6}
                name="wall"
              />
            )}
            {state.wallMode === 'photo' && wallImg && (
              <KImage
                image={wallImg}
                x={offX}
                y={offY}
                width={wallDispW}
                height={wallDispH}
                name="wall"
              />
            )}

            {/* selected wall-area outline (photo mode) */}
            {hasRegion && (
              <Rect
                x={originX}
                y={originY}
                width={inToDisp(wallWIn)}
                height={inToDisp(wallHIn)}
                stroke={CANVAS.region}
                strokeWidth={2 / view.zoom}
                dash={[10 / view.zoom, 6 / view.zoom]}
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
                zoom={view.zoom}
              />
            )}

            {/* museum eye-line */}
            {state.settings.showEyeLine && ppi && eyeLineY != null && (
              <Group listening={false}>
                <Line
                  points={[
                    originX,
                    originY + inToDisp(eyeLineY),
                    originX + inToDisp(wallWIn),
                    originY + inToDisp(eyeLineY),
                  ]}
                  stroke={CANVAS.eyeLine}
                  strokeWidth={1.5 / view.zoom}
                  dash={[12 / view.zoom, 8 / view.zoom]}
                />
                <Label x={originX + 4} y={originY + inToDisp(eyeLineY) - 18 / view.zoom} scaleX={1 / view.zoom} scaleY={1 / view.zoom}>
                  <Tag fill={CANVAS.eyeTag} cornerRadius={3} opacity={0.92} />
                  <Text
                    text={`eye-line ${fmtLen(state.settings.eyeLineIn, state.units)}`}
                    fontSize={11}
                    fill={CANVAS.eyeText}
                    padding={3}
                  />
                </Label>
              </Group>
            )}

            {/* obstacles (sofa, TV, switch…) */}
            {ppi &&
              state.obstacles.map((o) => {
                const r = obstacleRect(o, wallHIn, state.settings.floorOffsetIn)
                return (
                  <ObstacleNode
                    key={o.id}
                    obstacle={o}
                    rect={r}
                    wallWIn={wallWIn}
                    wallHIn={wallHIn}
                    offX={originX}
                    offY={originY}
                    inToDisp={inToDisp}
                    ppi={ppi}
                    displayScale={displayScale}
                    zoom={view.zoom}
                    units={state.units}
                    selected={ui.selectedObstacleId === o.id}
                    onSelect={() => patchUi({ selectedObstacleId: o.id, selectedIds: [] })}
                    onDragMove={(xIn, yIn, alt) => {
                      if (!r) return
                      const { dx, dy } = snapFor({ x: xIn, y: yIn, w: r.w, h: r.h }, [o.id], alt)
                      // Dragging sideways moves it along the wall; dragging up or
                      // down changes how high off the floor it sits.
                      const dTop = r.y - (yIn + dy)
                      dispatch({
                        type: 'updateObstacle',
                        id: o.id,
                        patch: {
                          xIn: xIn + dx,
                          topFromFloorIn: o.topFromFloorIn + dTop,
                          bottomFromFloorIn: Math.max(0, (o.bottomFromFloorIn || 0) + dTop),
                        },
                      })
                    }}
                    onDragEnd={() => setGuides([])}
                  />
                )
              })}

            {/* placed frames */}
            {showFrames &&
              state.placedFrames.map((p) => {
                const s = styleById[p.styleId]
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
                    zoom={view.zoom}
                    shadows={state.settings.shadows}
                    selected={isSelected(p.id)}
                    soleSelection={selected.length === 1 && isSelected(p.id)}
                    onSelect={(additive) => selectFrame(p.id, additive)}
                    onDragStart={() => onFrameDragStart(p.id)}
                    onDragMove={(xIn, yIn, alt) => onFrameDragMove(p.id, xIn, yIn, alt)}
                    onDragEnd={onFrameDragEnd}
                    onRotate={(rot) => dispatch({ type: 'updatePlaced', id: p.id, patch: { rot } })}
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
                zoom={view.zoom}
              />
            )}

            {/* snap guides */}
            {guides.map((g, i) => (
              <Line
                key={i}
                points={
                  g.type === 'v'
                    ? [originX + inToDisp(g.at), originY - 24, originX + inToDisp(g.at), originY + inToDisp(wallHIn) + 24]
                    : [originX - 24, originY + inToDisp(g.at), originX + inToDisp(wallWIn) + 24, originY + inToDisp(g.at)]
                }
                stroke={g.kind === 'center' ? CANVAS.guideCenter : CANVAS.guideEdge}
                strokeWidth={1 / view.zoom}
                dash={[6 / view.zoom, 4 / view.zoom]}
                listening={false}
              />
            ))}

            {/* calibration line */}
            {ui.calibrating && calA && (
              <>
                {calB && (
                  <Line
                    points={[calA.x, calA.y, calB.x, calB.y]}
                    stroke={CANVAS.calib}
                    strokeWidth={3 / view.zoom}
                    dash={[8, 4]}
                  />
                )}
                <Circle x={calA.x} y={calA.y} radius={5 / view.zoom} fill={CANVAS.calib} />
                {calB && <Circle x={calB.x} y={calB.y} radius={5 / view.zoom} fill={CANVAS.calib} />}
              </>
            )}
          </Group>
        </Layer>
      </Stage>

      {/* view toolbar */}
      {state.wallMode && (
        <div className="view-toolbar" data-tour="viewtools">
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
            Measure
          </button>
          <button
            className={state.settings.showEyeLine ? 'active' : 'ghost'}
            onClick={() =>
              dispatch({ type: 'setSettings', payload: { showEyeLine: !state.settings.showEyeLine } })
            }
            title={`Eye-line at ${fmtLen(state.settings.eyeLineIn, state.units)} from the floor`}
          >
            Eye-line
          </button>
          <button
            className={state.settings.snap ? 'active' : 'ghost'}
            onClick={() => dispatch({ type: 'setSettings', payload: { snap: !state.settings.snap } })}
            title="Snap to edges, centres and equal gaps (hold Alt to bypass)"
            aria-pressed={state.settings.snap}
          >
            Snap
          </button>
          <span className="tb-sep" />
          <button className="ghost" onClick={() => zoomBy(1 / 1.25)} title="Zoom out">
            −
          </button>
          <button
            className="ghost zoomlabel"
            onClick={resetView}
            title="Reset zoom and position (scroll pans; pinch or Cmd/Ctrl+scroll zooms)"
          >
            {Math.round(view.zoom * 100)}%
          </button>
          <button className="ghost" onClick={() => zoomBy(1.25)} title="Zoom in">
            +
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
              <button
                className="linkbtn"
                onClick={() => {
                  setCalA(null)
                  setCalB(null)
                }}
              >
                redo
              </button>
            </div>
          )}
        </div>
      )}

      {state.wallMode === 'photo' && !ppi && (
        <div className="calib-overlay warn-overlay">
          Set the scale (step 1) so frames render at real size.
        </div>
      )}
    </div>
  )
}

// ---------------------------------------------------------------- frame node

function PlacedFrameNode({
  placed,
  style,
  photo,
  offX,
  offY,
  inToDisp,
  ppi,
  displayScale,
  zoom,
  shadows,
  selected,
  soleSelection,
  onSelect,
  onDragStart,
  onDragMove,
  onDragEnd,
  onRotate,
}) {
  const frameImg = useImage(style.kind === 'image' ? style.image : null)
  const photoImg = useImage(photo?.image)
  const groupRef = useRef(null)
  const trRef = useRef(null)

  const fw = inToDisp(style.outerW)
  const fh = inToDisp(style.outerH)
  // Rotate around center: place origin at frame center, offset by half-size.
  const cx = offX + inToDisp(placed.xIn) + fw / 2
  const cy = offY + inToDisp(placed.yIn) + fh / 2

  // Attach rotate handle to this node when it is the only selection.
  useEffect(() => {
    if (soleSelection && trRef.current && groupRef.current) {
      trRef.current.nodes([groupRef.current])
      trRef.current.getLayer()?.batchDraw()
    }
  }, [soleSelection, fw, fh])

  const toInchesTopLeft = (node) => ({
    xIn: (node.x() - fw / 2 - offX) / (ppi * displayScale),
    yIn: (node.y() - fh / 2 - offY) / (ppi * displayScale),
  })

  const of = openingOf(style)
  let opening = null
  if (of) opening = { x: of.x * fw, y: of.y * fh, w: of.w * fw, h: of.h * fh }

  const place =
    opening && photoImg ? photoPlacement(opening.w, opening.h, photo.w, photo.h, placed.crop) : null

  const m = mouldingOf(style.mouldingKey)
  const matColor = matOf(style.matKey).color
  const mould = style.kind === 'preset' ? inToDisp(style.frameWIn || 0) : 0

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
        onClick={(e) => onSelect(e.evt.shiftKey || e.evt.metaKey || e.evt.ctrlKey)}
        onTap={() => onSelect(false)}
        onDragStart={onDragStart}
        onDragMove={(e) => {
          const p = toInchesTopLeft(e.target)
          onDragMove(p.xIn, p.yIn, e.evt.altKey)
        }}
        onDragEnd={onDragEnd}
        onTransformEnd={(e) => {
          e.target.scaleX(1)
          e.target.scaleY(1)
          onRotate(((e.target.rotation() % 360) + 360) % 360)
        }}
      >
        {/* --- drawn (preset) frame: moulding + mat --- */}
        {style.kind === 'preset' && (
          <>
            <Rect
              width={fw}
              height={fh}
              fill={m.color}
              cornerRadius={Math.min(2, mould / 3)}
              shadowColor={CANVAS.frameShadow}
              shadowBlur={shadows ? 12 : 0}
              shadowOpacity={shadows ? 0.75 : 0}
              shadowOffsetX={shadows ? 2 : 0}
              shadowOffsetY={shadows ? 5 : 0}
            />
            {/* bevel highlight on the moulding */}
            <Rect
              width={fw}
              height={fh}
              stroke={m.edge}
              strokeWidth={Math.max(0.5, mould * 0.18)}
              opacity={0.55}
              listening={false}
            />
            {mould > 0 && (
              <Rect
                x={mould}
                y={mould}
                width={Math.max(0, fw - 2 * mould)}
                height={Math.max(0, fh - 2 * mould)}
                fill={matColor}
                listening={false}
              />
            )}
          </>
        )}

        {/* --- frame photo (image kind) --- */}
        {style.kind !== 'preset' && frameImg && (
          <KImage
            image={frameImg}
            width={fw}
            height={fh}
            shadowColor={CANVAS.frameShadow}
            shadowBlur={shadows ? 12 : 0}
            shadowOpacity={shadows ? 0.75 : 0}
            shadowOffsetX={shadows ? 2 : 0}
            shadowOffsetY={shadows ? 5 : 0}
          />
        )}

        {/* user photo drawn OVER the frame's inner opening, clipped to it */}
        {opening && photoImg && (
          <Group clipX={opening.x} clipY={opening.y} clipWidth={opening.w} clipHeight={opening.h}>
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

        {/* opening outline: subtle inner shadow when filled, dashed hint when empty */}
        {opening && (
          <Rect
            x={opening.x}
            y={opening.y}
            width={opening.w}
            height={opening.h}
            stroke={photoImg ? CANVAS.openingFilled : CANVAS.openingEmpty}
            strokeWidth={photoImg ? 1 : 1}
            dash={photoImg ? undefined : [6, 4]}
            listening={false}
          />
        )}

        {selected && (
          <Rect
            width={fw}
            height={fh}
            stroke={CANVAS.selection}
            strokeWidth={3 / zoom}
            listening={false}
          />
        )}
      </Group>
      {soleSelection && (
        <Transformer
          ref={trRef}
          rotateEnabled={true}
          resizeEnabled={false}
          enabledAnchors={[]}
          rotationSnaps={[0, 45, 90, 135, 180, 225, 270, 315]}
          rotationSnapTolerance={5}
          anchorSize={14}
          borderStroke={CANVAS.selection}
          anchorStroke={CANVAS.selection}
          anchorFill="#fffaf7"
        />
      )}
    </>
  )
}

// ---------------------------------------------------------------- obstacles

function ObstacleNode({
  obstacle,
  rect,
  wallWIn,
  wallHIn,
  offX,
  offY,
  inToDisp,
  ppi,
  displayScale,
  zoom,
  units,
  selected,
  onSelect,
  onDragMove,
  onDragEnd,
}) {
  const k = obstacleKind(obstacle.kind)
  const name = obstacle.label || k.label

  // Out of reach of this wall area: show a tick at the bottom edge saying how far
  // below it sits, rather than pretending it covers wall it doesn't.
  if (!rect) {
    const below = Math.max(0, (obstacle.topFromFloorIn ?? 0))
    const y = offY + inToDisp(wallHIn)
    const x = offX + inToDisp(Math.max(0, Math.min(obstacle.xIn, wallWIn)))
    return (
      <Group listening={false}>
        <Line
          points={[x, y, x + inToDisp(Math.min(obstacle.wIn, wallWIn)), y]}
          stroke={CANVAS.obstacleStroke}
          strokeWidth={2 / zoom}
          dash={[6 / zoom, 5 / zoom]}
        />
        <Label x={x + 4 / zoom} y={y + 4 / zoom} scaleX={1 / zoom} scaleY={1 / zoom}>
          <Tag fill={CANVAS.obstacleTag} cornerRadius={3} opacity={0.85} />
          <Text
            text={`${k.icon} ${name} — top ${fmtLen(below, units)} up, below this area`}
            fontSize={11}
            fill={CANVAS.obstacleText}
            padding={3}
          />
        </Label>
      </Group>
    )
  }

  const w = inToDisp(rect.w)
  const h = inToDisp(rect.h)
  const x = offX + inToDisp(rect.x)
  const y = offY + inToDisp(rect.y)
  const clipped = obstacle.bottomFromFloorIn < obstacle.topFromFloorIn - rect.h - 0.05
  return (
    <Group
      x={x}
      y={y}
      draggable
      onClick={onSelect}
      onTap={onSelect}
      onDragStart={onSelect}
      onDragMove={(e) =>
        onDragMove(
          (e.target.x() - offX) / (ppi * displayScale),
          (e.target.y() - offY) / (ppi * displayScale),
          e.evt.altKey
        )
      }
      onDragEnd={onDragEnd}
    >
      <Rect
        width={w}
        height={h}
        fill={k.solid ? CANVAS.obstacleSolid : CANVAS.obstacleOpen}
        stroke={selected ? CANVAS.obstacleStrokeSelected : CANVAS.obstacleStroke}
        strokeWidth={(selected ? 2.5 : 1.5) / zoom}
        dash={k.solid ? undefined : [8 / zoom, 5 / zoom]}
      />
      <Label x={4 / zoom} y={4 / zoom} scaleX={1 / zoom} scaleY={1 / zoom} listening={false}>
        <Tag fill={CANVAS.obstacleTag} cornerRadius={3} opacity={0.88} />
        <Text
          text={`${k.icon} ${name} · ${fmtLen(obstacle.wIn, units)} wide · top ${fmtLen(
            obstacle.topFromFloorIn,
            units
          )} off the floor${clipped ? ' (continues below)' : ''}`}
          fontSize={11}
          fill={CANVAS.obstacleText}
          padding={3}
        />
      </Label>
    </Group>
  )
}

// Format an inch value in the active unit for labels.
function fmtLen(inches, units) {
  const v = fromInches(inches, units)
  const n = Math.round(v * 10) / 10
  return units === 'cm' ? `${n}cm` : `${n}"`
}

// Figma-style reference grid, drawn only over the wall area.
function GridOverlay({ offX, offY, wallWIn, wallHIn, inToDisp, units, zoom }) {
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
        stroke={major ? CANVAS.gridMajor : CANVAS.gridMinor}
        strokeWidth={1 / zoom}
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
        stroke={major ? CANVAS.gridMajor : CANVAS.gridMinor}
        strokeWidth={1 / zoom}
        listening={false}
      />
    )
  }
  return <Group listening={false}>{lines}</Group>
}

// A single dimension segment with end ticks + a value badge. Coords in content px.
function DimSeg({ type, x1, y1, x2, y2, text, zoom = 1 }) {
  const t = 5 / zoom // tick half-length
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
  const lx = type === 'h' ? midX : midX + 8 / zoom
  const ly = type === 'h' ? midY - 16 / zoom : midY
  return (
    <Group listening={false}>
      <Line points={[x1, y1, x2, y2]} stroke={CANVAS.dim} strokeWidth={1.2 / zoom} />
      {ticks.map((p, i) => (
        <Line key={i} points={p} stroke={CANVAS.dim} strokeWidth={1.2 / zoom} />
      ))}
      <Label
        x={lx}
        y={ly}
        scaleX={1 / zoom}
        scaleY={1 / zoom}
        offsetX={type === 'h' ? text.length * 3.2 : 0}
      >
        <Tag fill={CANVAS.dimTag} cornerRadius={3} opacity={0.94} />
        <Text text={text} fontSize={11} fill={CANVAS.dimText} padding={3} />
      </Label>
    </Group>
  )
}

// Blueprint dimensions: per-frame offsets/gaps + wall totals. Updates live on drag.
function DimensionsOverlay({
  placedFrames,
  frameStyles,
  wallWIn,
  wallHIn,
  offX,
  offY,
  inToDisp,
  units,
  zoom,
}) {
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
      <DimSeg
        type="h"
        x1={offX}
        y1={offY - 18 / zoom}
        x2={wallRight}
        y2={offY - 18 / zoom}
        text={fmtLen(wallWIn, units)}
        zoom={zoom}
      />
      <DimSeg
        type="v"
        x1={offX - 18 / zoom}
        y1={offY}
        x2={offX - 18 / zoom}
        y2={wallBottom}
        text={fmtLen(wallHIn, units)}
        zoom={zoom}
      />

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
            zoom={zoom}
          />
        ))}
    </Group>
  )
}
