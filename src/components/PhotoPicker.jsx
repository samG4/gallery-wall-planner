import React from 'react'

// Every place the user hands us an image. On a phone the camera is the fastest
// route to a wall photo, but Android browsers hand a plain file input straight
// to the gallery picker — so mobile gets an explicit "take a photo" button with
// `capture`, and the library stays as its own button next to it.
//
// `capture` is a no-op on desktop (it just opens the normal file dialog), so the
// camera button is mobile-only rather than always on.
export default function PhotoPicker({
  onChange,
  label,
  cameraLabel = 'Take a photo',
  mobile = false,
  multiple = false,
  className = 'filebtn',
  title,
}) {
  const input = (extra) => (
    <input type="file" accept="image/*" multiple={multiple} onChange={onChange} hidden {...extra} />
  )

  if (!mobile)
    return (
      <label className={className} title={title}>
        {label}
        {input()}
      </label>
    )

  return (
    <div className="row picker-row">
      <label className={className} title={title}>
        📷 {cameraLabel}
        {input({ capture: 'environment' })}
      </label>
      <label className={className} title={title}>
        {label}
        {input()}
      </label>
    </div>
  )
}
