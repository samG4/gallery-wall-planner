import React, { createContext, useCallback, useContext, useEffect, useReducer, useRef, useState } from 'react'

const KEY = 'gallery-wall-planner:v1'

const initial = {
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
  // Reusable frame types
  frameStyles: [], // {id,name,image,imgW,imgH,outerW,outerH,openingFrac,count}
  // Uploaded user photos
  photos: [], // {id,image,w,h}
  // Frame instances placed on wall
  placedFrames: [], // {id,styleId,xIn,yIn,photoId,crop:{scale,ox,oy}}
}

let _id = 1
export const uid = (p = 'id') => `${p}_${Date.now().toString(36)}_${_id++}`

function reducer(state, action) {
  switch (action.type) {
    case 'load':
      return { ...initial, ...action.payload }
    case 'set':
      return { ...state, ...action.payload }
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
    case 'removePlaced':
      return {
        ...state,
        placedFrames: state.placedFrames.filter((p) => p.id !== action.id),
      }
    case 'setPlaced':
      return { ...state, placedFrames: action.placedFrames }
    case 'reset':
      return { ...initial }
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
  if (a.type === 'set') return 'set:' + Object.keys(a.payload || {}).join(',')
  return null // never coalesce
}

export function StoreProvider({ children }) {
  const [state, dispatch] = useReducer(reducer, initial, () => {
    try {
      const raw = localStorage.getItem(KEY)
      if (raw) return { ...initial, ...JSON.parse(raw) }
    } catch (e) {
      console.warn('load failed', e)
    }
    return initial
  })

  // Undo/redo history of full doc snapshots. Snapshots share big dataURL strings
  // by reference (reducer does structural sharing), so they're cheap.
  const [hist, setHist] = useState({ past: [], future: [] })
  const lastKeyRef = useRef(null)
  const lastTimeRef = useRef(0)

  useEffect(() => {
    try {
      localStorage.setItem(KEY, JSON.stringify(state))
    } catch (e) {
      // localStorage quota — images can be large
      console.warn('save failed (storage full?)', e)
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
    setHist((h) => {
      if (!h.past.length) return h
      const prev = h.past[h.past.length - 1]
      dispatch({ type: 'load', payload: prev })
      lastKeyRef.current = null
      return { past: h.past.slice(0, -1), future: [state, ...h.future].slice(0, HIST_LIMIT) }
    })
  }, [state])

  const redo = useCallback(() => {
    setHist((h) => {
      if (!h.future.length) return h
      const next = h.future[0]
      dispatch({ type: 'load', payload: next })
      lastKeyRef.current = null
      return { past: [...h.past, state].slice(-HIST_LIMIT), future: h.future.slice(1) }
    })
  }, [state])

  const value = {
    state,
    dispatch: record,
    undo,
    redo,
    canUndo: hist.past.length > 0,
    canRedo: hist.future.length > 0,
  }

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>
}

export function useStore() {
  const ctx = useContext(Ctx)
  if (!ctx) throw new Error('useStore outside provider')
  return ctx
}
