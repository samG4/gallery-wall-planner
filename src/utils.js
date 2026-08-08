import { useEffect, useState } from 'react'
import { footprint } from './layouts.js'

// Uploads are kept in localStorage as dataURLs, so a 12MP phone photo would blow
// the ~5MB quota on its own. Downscale + re-encode on the way in.
const MAX_PX = 1600 // longest edge
const JPEG_Q = 0.84
const KEEP_AS_IS_BYTES = 180 * 1024

function decode(dataURL) {
  return new Promise((resolve, reject) => {
    const img = new Image()
    img.onload = () => resolve(img)
    img.onerror = reject
    img.src = dataURL
  })
}

function readAsDataURL(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve(reader.result)
    reader.onerror = reject
    reader.readAsDataURL(file)
  })
}

// Read a File -> {dataURL, w, h}, downscaled/re-encoded when it's big.
// PNGs stay PNG (frame cut-outs may rely on alpha); everything else becomes JPEG.
export async function readImageFile(file, maxPx = MAX_PX) {
  const raw = await readAsDataURL(file)
  const img = await decode(raw)
  const longest = Math.max(img.naturalWidth, img.naturalHeight)
  const isPng = /^data:image\/png/i.test(raw)
  if (longest <= maxPx && raw.length <= KEEP_AS_IS_BYTES) {
    return { dataURL: raw, w: img.naturalWidth, h: img.naturalHeight }
  }
  const k = Math.min(1, maxPx / longest)
  const w = Math.max(1, Math.round(img.naturalWidth * k))
  const h = Math.max(1, Math.round(img.naturalHeight * k))
  const canvas = document.createElement('canvas')
  canvas.width = w
  canvas.height = h
  const ctx = canvas.getContext('2d')
  ctx.imageSmoothingQuality = 'high'
  ctx.drawImage(img, 0, 0, w, h)
  let out
  try {
    out = isPng ? canvas.toDataURL('image/png') : canvas.toDataURL('image/jpeg', JPEG_Q)
    // A downscaled PNG can still be huge; fall back to JPEG when it is.
    if (isPng && out.length > 900 * 1024) out = canvas.toDataURL('image/jpeg', JPEG_Q)
  } catch (e) {
    out = raw
  }
  return { dataURL: out.length < raw.length ? out : raw, w, h }
}

// Bounding box of a photo rotated by `rot` degrees.
function bbox(w, h, rot) {
  const r = (rot * Math.PI) / 180
  const c = Math.abs(Math.cos(r))
  const s = Math.abs(Math.sin(r))
  return { w: w * c + h * s, h: w * s + h * c }
}

// Compute how a photo sits inside an opening box (cover-fit + user crop transform).
// crop = {scale, ox, oy, rot}. Returns {w,h,cx,cy,rot}: draw size + CENTER position
// (relative to box origin) + rotation. Cover is computed against the rotated
// footprint so the box stays fully covered at 90° turns.
export function photoPlacement(boxW, boxH, photoW, photoH, crop) {
  const rot = crop?.rot ?? 0
  const fp = bbox(photoW, photoH, rot)
  const base = Math.max(boxW / fp.w, boxH / fp.h) // cover (rotation-aware)
  const s = base * (crop?.scale ?? 1)
  const w = photoW * s
  const h = photoH * s
  // ox/oy stored as fractions of box size so they're display-independent
  const cx = boxW / 2 + (crop?.ox ?? 0) * boxW
  const cy = boxH / 2 + (crop?.oy ?? 0) * boxH
  return { w, h, cx, cy, rot }
}

// Axis-aligned bounding box (inches) of a placed frame, rotation included.
// Single source of truth for dimensions, snapping, hanging and align tools.
export function frameBoxIn(placed, style) {
  const cx = placed.xIn + style.outerW / 2
  const cy = placed.yIn + style.outerH / 2
  const fp = footprint(style.outerW, style.outerH, placed.rot || 0)
  return { x: cx - fp.w / 2, y: cy - fp.h / 2, w: fp.w, h: fp.h, cx, cy }
}

// The working wall area in inches + where its origin sits.
// - photo mode with a selected region: region drives size + origin (fractions of photo).
// - blank mode / photo full-calibration: whole wall, origin at photo/canvas top-left.
// Returns {wallWIn, wallHIn, ox, oy} where ox/oy are photo fractions of the inches-origin.
export function workArea(state) {
  const ppi = state.pixelsPerInch
  if (!ppi) return { wallWIn: 0, wallHIn: 0, ox: 0, oy: 0 }
  if (state.wallMode === 'photo' && state.wallRegion) {
    return {
      wallWIn: state.wallRegionWIn,
      wallHIn: state.wallRegionHIn,
      ox: state.wallRegion.x,
      oy: state.wallRegion.y,
    }
  }
  return { wallWIn: state.wallNaturalW / ppi, wallHIn: state.wallNaturalH / ppi, ox: 0, oy: 0 }
}

// Load a dataURL/URL into an HTMLImageElement for konva <Image image={..}>
export function useImage(src) {
  const [img, setImg] = useState(null)
  useEffect(() => {
    if (!src) {
      setImg(null)
      return
    }
    const image = new Image()
    let active = true
    image.onload = () => active && setImg(image)
    image.src = src
    return () => {
      active = false
    }
  }, [src])
  return img
}

// True while the viewport is phone-sized. Drives the mobile shell.
export function useMediaQuery(query) {
  const [match, setMatch] = useState(
    () => typeof window !== 'undefined' && window.matchMedia(query).matches
  )
  useEffect(() => {
    const mq = window.matchMedia(query)
    const on = () => setMatch(mq.matches)
    on()
    mq.addEventListener('change', on)
    return () => mq.removeEventListener('change', on)
  }, [query])
  return match
}

export function download(filename, href) {
  const a = document.createElement('a')
  a.href = href
  a.download = filename
  document.body.appendChild(a)
  a.click()
  a.remove()
}

export function downloadText(filename, text, mime = 'application/json') {
  const blob = new Blob([text], { type: mime })
  const url = URL.createObjectURL(blob)
  download(filename, url)
  setTimeout(() => URL.revokeObjectURL(url), 2000)
}

export const clamp = (v, lo, hi) => Math.max(lo, Math.min(hi, v))
