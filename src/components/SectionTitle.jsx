import React, { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react'

// A panel section heading with its explanation behind an ⓘ tooltip.
// The copy is worth having the first time and clutter every time after.
//
// The tooltip is position:fixed rather than absolute — the panels scroll inside an
// overflow container, which would clip an absolutely positioned bubble.
const GAP = 8
const WIDTH = 260

export default function SectionTitle({ title, info }) {
  const [open, setOpen] = useState(false)
  const [pos, setPos] = useState(null)
  const btnRef = useRef(null)
  const tipRef = useRef(null)

  const place = useCallback(() => {
    const b = btnRef.current?.getBoundingClientRect()
    if (!b) return
    const w = Math.min(WIDTH, window.innerWidth - 20)
    const h = tipRef.current?.offsetHeight || 90
    const below = b.bottom + GAP
    const flip = below + h > window.innerHeight - 8 && b.top - GAP - h > 8
    setPos({
      left: Math.min(Math.max(10, b.left - 4), window.innerWidth - w - 10),
      top: flip ? b.top - GAP - h : below,
      width: w,
      flip,
    })
  }, [])

  useLayoutEffect(() => {
    if (open) place()
  }, [open, place])

  useEffect(() => {
    if (!open) return
    const close = () => setOpen(false)
    const onKey = (e) => e.key === 'Escape' && close()
    const onDown = (e) => {
      if (!tipRef.current?.contains(e.target) && !btnRef.current?.contains(e.target)) close()
    }
    // Scrolling the panel would leave the bubble stranded, so follow the anchor.
    window.addEventListener('keydown', onKey)
    window.addEventListener('mousedown', onDown)
    window.addEventListener('touchstart', onDown)
    window.addEventListener('resize', place)
    window.addEventListener('scroll', place, true)
    return () => {
      window.removeEventListener('keydown', onKey)
      window.removeEventListener('mousedown', onDown)
      window.removeEventListener('touchstart', onDown)
      window.removeEventListener('resize', place)
      window.removeEventListener('scroll', place, true)
    }
  }, [open, place])

  if (!info)
    return (
      <div className="sec-head">
        <strong>{title}</strong>
      </div>
    )

  return (
    <div className="sec-head">
      <button
        type="button"
        ref={btnRef}
        className="infobtn"
        aria-expanded={open}
        aria-label={open ? `Hide what ${title} means` : `What does ${title} mean?`}
        onClick={() => setOpen((o) => !o)}
      >
        i
      </button>
      <strong>{title}</strong>
      {open && (
        <div
          ref={tipRef}
          role="tooltip"
          className={`tooltip${pos?.flip ? ' flip' : ''}`}
          style={pos ? { left: pos.left, top: pos.top, width: pos.width } : { opacity: 0 }}
        >
          {info}
        </div>
      )}
    </div>
  )
}
