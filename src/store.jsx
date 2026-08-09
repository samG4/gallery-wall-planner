import React, { createContext, useCallback, useContext, useEffect, useMemo, useReducer, useRef, useState } from 'react'
import { workArea } from './utils.js'

const KEY = 'gallery-wall-planner:v2'
const KEY_V1 = 'gallery-wall-planner:v1'

export const DOC_VERSION = 2

// Tunables the user can change; they affect layout/snapping/hanging maths.
export const defaultSettings = {
  snap: true, // smart snapping + alignment guides
  gapIn: 3, // preferred gap between frames (auto-layout + gap snapping)
  shadows: true, // drop shadow under frames (realism)
  hangerDropIn: 1.75, // distance from frame top down to the hook/nail
  eyeLineIn: 57, // museum eye-line height from the floor
  showEyeLine: false,
  wallHeightIn: 96, // full wall height (floor -> ceiling) for floor-relative maths
  floorOffsetIn: 0, // distance from the working area's BOTTOM edge down to the floor
}

const initial = {
  docVersion: DOC_VERSION,
  units: 'in',
  // Wall: either an uploaded photo or a blank sized canvas
  wallMode: null, // 'photo' | 'blank'
  wallImage: null, // dataURL (photo mode)
  wallColor: '#eae4da', // fill (blank mode)
  wallNaturalW: 0,
  wallNaturalH: 0,
  pixelsPerInch: null, // px per inch. blank: from typed dims. photo: from calibration.
  // Photo mode: a selected sub-rectangle of the photo used as the working wall area.
  // Fractions (0..1) of the photo + its real size. Origin (0,0 in) = region top-left.
  wallRegion: null, // {x,y,w,h} fractions of the photo, or null
  wallRegionWIn: 0,
  wallRegionHIn: 0,
  // Reusable frame types. kind:'image' = photo of a real frame + drawn opening.
  // kind:'preset' = drawn frame (moulding + mat) sized from an art size.
  frameStyles: [],
  // Uploaded user photos
  photos: [], // {id,image,w,h}
  // Frame instances placed on wall
  placedFrames: [], // {id,styleId,xIn,yIn,rot,photoId,crop:{scale,ox,oy,rot}}
  // Real-world things in the way: TV, sofa, door, window, switch…
  obstacles: [], // {id,kind,label,xIn,yIn,wIn,hIn}
  settings: { ...defaultSettings },
}

export const emptyDoc = () => ({ ...initial, settings: { ...defaultSettings } })

let _id = 1
export const uid = (p = 'id') => `${p}_${Date.now().toString(36)}_${_id++}`

// Bring any older/foreign doc up to the current shape.
export function migrateDoc(raw) {
  if (!raw || typeof raw !== 'object') return emptyDoc()
  const doc = { ...emptyDoc(), ...raw }
  doc.settings = { ...defaultSettings, ...(raw.settings || {}) }
  doc.obstacles = Array.isArray(raw.obstacles) ? raw.obstacles : []
  doc.frameStyles = (raw.frameStyles || []).map((s) => ({
    kind: s.kind || (s.image ? 'image' : 'preset'),
    price: s.price ?? null,
    ...s,
  }))
  doc.placedFrames = (raw.placedFrames || []).map((p) => ({
    rot: 0,
    crop: { scale: 1, ox: 0, oy: 0, rot: 0 },
    ...p,
  }))
  doc.docVersion = DOC_VERSION
  return doc
}

// The eye-line is stored as a height above the floor, but it only means anything
// if it lands on the working area. Resizing the wall or moving the floor offset
// can strand it, so every action that could do either runs through here.
function clampToWall(s) {
  const { wallHIn } = workArea(s)
  if (!(wallHIn > 0)) return s
  const floorOffsetIn = Math.max(0, s.settings.floorOffsetIn || 0)
  const eyeLineIn = Math.min(floorOffsetIn + wallHIn, Math.max(floorOffsetIn, s.settings.eyeLineIn))
  if (eyeLineIn === s.settings.eyeLineIn && floorOffsetIn === s.settings.floorOffsetIn) return s
  return { ...s, settings: { ...s.settings, eyeLineIn, floorOffsetIn } }
}

function reducer(state, action) {
  switch (action.type) {
    case 'load':
      return clampToWall({ ...emptyDoc(), ...action.payload })
    case 'set':
      return clampToWall({ ...state, ...action.payload })
    case 'setSettings':
      return clampToWall({ ...state, settings: { ...state.settings, ...action.payload } })
    case 'addFrameStyle':
      return { ...state, frameStyles: [...state.frameStyles, action.style] }
    case 'updateFrameStyle':
      return {
        ...state,
        frameStyles: state.frameStyles.map((f) =>
          f.id === action.id ? { ...f, ...action.patch } : f
        ),
      }
    case 'removeFrameStyle':
      return {
        ...state,
        frameStyles: state.frameStyles.filter((f) => f.id !== action.id),
        placedFrames: state.placedFrames.filter((p) => p.styleId !== action.id),
      }
    case 'addPhoto':
      return { ...state, photos: [...state.photos, action.photo] }
    case 'removePhoto':
      return {
        ...state,
        photos: state.photos.filter((p) => p.id !== action.id),
        placedFrames: state.placedFrames.map((p) =>
          p.photoId === action.id ? { ...p, photoId: null } : p
        ),
      }
    case 'addPlaced':
      return { ...state, placedFrames: [...state.placedFrames, action.placed] }
    case 'updatePlaced':
      return {
        ...state,
        placedFrames: state.placedFrames.map((p) =>
          p.id === action.id ? { ...p, ...action.patch } : p
        ),
      }
    // Patch several frames at once (group drag, align/distribute) = one undo step.
    case 'updateManyPlaced':
      return {
        ...state,
        placedFrames: state.placedFrames.map((p) =>
          action.patches[p.id] ? { ...p, ...action.patches[p.id] } : p
        ),
      }
    case 'removePlaced':
      return {
        ...state,
        placedFrames: state.placedFrames.filter((p) => !action.ids.includes(p.id)),
      }
    case 'setPlaced':
      return { ...state, placedFrames: action.placedFrames }
    case 'addObstacle':
      return { ...state, obstacles: [...state.obstacles, action.obstacle] }
    case 'updateObstacle':
      return {
        ...state,
        obstacles: state.obstacles.map((o) =>
          o.id === action.id ? { ...o, ...action.patch } : o
        ),
      }
    case 'removeObstacle':
      return { ...state, obstacles: state.obstacles.filter((o) => o.id !== action.id) }
    case 'reset':
      return emptyDoc()
    default:
      return state
  }
}

const Ctx = createContext(null)

const HIST_LIMIT = 60

// Actions that should coalesce into a single undo step during one gesture
// (e.g. a drag fires updatePlaced on every mousemove; a colour slider fires many 'set').
function coalesceKey(a) {
  if (a.type === 'updatePlaced') return 'up:' + a.id
  if (a.type === 'updateManyPlaced') return 'upm:' + Object.keys(a.patches).sort().join(',')
  if (a.type === 'updateObstacle') return 'ob:' + a.id
  if (a.type === 'set') return 'set:' + Object.keys(a.payload || {}).join(',')
  if (a.type === 'setSettings') return 'cfg:' + Object.keys(a.payload || {}).join(',')
  return null // never coalesce
}

function loadInitial() {
  try {
    const raw = localStorage.getItem(KEY)
    if (raw) return migrateDoc(JSON.parse(raw))
    const old = localStorage.getItem(KEY_V1)
    if (old) return migrateDoc(JSON.parse(old))
  } catch (e) {
    console.warn('load failed', e)
  }
  return emptyDoc()
}

export function StoreProvider({ children }) {
  const [state, dispatch] = useReducer(reducer, null, loadInitial)

  // Undo/redo history of full doc snapshots. Snapshots share big dataURL strings
  // by reference (reducer does structural sharing), so they're cheap.
  const [hist, setHist] = useState({ past: [], future: [] })
  const lastKeyRef = useRef(null)
  const lastTimeRef = useRef(0)
  // Set when localStorage rejects a write (usually the 5MB image quota).
  const [storageFull, setStorageFull] = useState(false)
  const [docBytes, setDocBytes] = useState(0)

  useEffect(() => {
    let json
    try {
      json = JSON.stringify(state)
    } catch (e) {
      return
    }
    setDocBytes(json.length)
    try {
      localStorage.setItem(KEY, json)
      setStorageFull(false)
    } catch (e) {
      // localStorage quota — images can be large
      console.warn('save failed (storage full?)', e)
      setStorageFull(true)
    }
  }, [state])

  // Wrapped dispatch: records history before applying (with gesture coalescing).
  const record = useCallback(
    (action) => {
      const key = coalesceKey(action)
      const now = Date.now()
      const coalesce = key !== null && key === lastKeyRef.current && now - lastTimeRef.current < 600
      lastKeyRef.current = key
      lastTimeRef.current = now
      if (!coalesce) {
        setHist((h) => ({ past: [...h.past, state].slice(-HIST_LIMIT), future: [] }))
      }
      dispatch(action)
    },
    [state]
  )

  const undo = useCallback(() => {
    if (!hist.past.length) return
    const prev = hist.past[hist.past.length - 1]
    lastKeyRef.current = null
    setHist((h) => ({ past: h.past.slice(0, -1), future: [state, ...h.future].slice(0, HIST_LIMIT) }))
    dispatch({ type: 'load', payload: prev })
  }, [hist, state])

  const redo = useCallback(() => {
    if (!hist.future.length) return
    const next = hist.future[0]
    lastKeyRef.current = null
    setHist((h) => ({ past: [...h.past, state].slice(-HIST_LIMIT), future: h.future.slice(1) }))
    dispatch({ type: 'load', payload: next })
  }, [hist, state])

  const value = useMemo(
    () => ({
      state,
      dispatch: record,
      undo,
      redo,
      canUndo: hist.past.length > 0,
      canRedo: hist.future.length > 0,
      storageFull,
      docBytes,
    }),
    [state, record, undo, redo, hist, storageFull, docBytes]
  )

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>
}

export function useStore() {
  const ctx = useContext(Ctx)
  if (!ctx) throw new Error('useStore outside provider')
  return ctx
}
