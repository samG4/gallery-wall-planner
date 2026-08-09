import React, { useState } from 'react'

// A panel section heading with its explanation tucked behind an ⓘ.
// The copy is worth having the first time and clutter every time after, so it
// stays available on hover (title) and on click, but off the page by default.
export default function SectionTitle({ title, info }) {
  const [open, setOpen] = useState(false)
  if (!info) return <div className="sec-head"><strong>{title}</strong></div>
  return (
    <div className="sec-head">
      <button
        type="button"
        className="infobtn"
        aria-expanded={open}
        aria-label={open ? `Hide what ${title} means` : `What does ${title} mean?`}
        title={info}
        onClick={() => setOpen((o) => !o)}
      >
        i
      </button>
      <strong>{title}</strong>
      {open && (
        <p className="infopop" role="note">
          {info}
        </p>
      )}
    </div>
  )
}
