import { useEffect, useState } from 'react'

// Read a File -> {dataURL, w, h}
export function readImageFile(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => {
      const img = new Image()
      img.onload = () =>
        resolve({ dataURL: reader.result, w: img.naturalWidth, h: img.naturalHeight })
      img.onerror = reject
      img.src = reader.result
    }
    reader.onerror = reject
    reader.readAsDataURL(file)
  })
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
