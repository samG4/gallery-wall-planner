import React, { useState } from 'react'
import { useStore, uid } from '../store.jsx'
import { readImageFile } from '../utils.js'
import { toInches, unitLabel } from '../units.js'

const empty = { name: '', width: '', height: '', count: '1', image: null, imgW: 0, imgH: 0 }

export default function FrameStyleForm() {
  const { state, dispatch } = useStore()
  const { units } = state
  const [f, setF] = useState(empty)
  const [open, setOpen] = useState(false)

  async function onImg(e) {
    const file = e.target.files?.[0]
    if (!file) return
    const { dataURL, w, h } = await readImageFile(file)
    setF((s) => ({ ...s, image: dataURL, imgW: w, imgH: h }))
  }

  function submit() {
    const width = parseFloat(f.width)
    const height = parseFloat(f.height)
    const count = parseInt(f.count, 10) || 1
    if (!f.image || !width || !height) {
      alert('Need a frame image + width + height.')
      return
    }
    dispatch({
      type: 'addFrameStyle',
      style: {
        id: uid('style'),
        name: f.name || 'Frame',
        image: f.image,
        imgW: f.imgW,
        imgH: f.imgH,
        outerW: toInches(width, units), // stored canonical inches
        outerH: toInches(height, units),
        openingFrac: null, // set later via OpeningEditor
        count,
      },
    })
    setF(empty)
    setOpen(false)
  }

  if (!open)
    return (
      <button className="addnew" onClick={() => setOpen(true)}>
        + Add new frame style
      </button>
    )

  return (
    <div className="frame-form">
      <label className="filebtn small">
        {f.image ? 'Change frame image' : 'Upload frame photo'}
        <input type="file" accept="image/*" onChange={onImg} hidden />
      </label>
      {f.image && <img src={f.image} className="thumb" alt="frame" />}
      <input
        placeholder="Name (e.g. Black 8×10)"
        value={f.name}
        onChange={(e) => setF({ ...f, name: e.target.value })}
      />
      <div className="row">
        <input
          type="number"
          placeholder={`W (${unitLabel(units)})`}
          value={f.width}
          onChange={(e) => setF({ ...f, width: e.target.value })}
        />
        <input
          type="number"
          placeholder={`H (${unitLabel(units)})`}
          value={f.height}
          onChange={(e) => setF({ ...f, height: e.target.value })}
        />
        <input
          type="number"
          placeholder="count"
          value={f.count}
          onChange={(e) => setF({ ...f, count: e.target.value })}
        />
      </div>
      <p className="hint">Enter the frame's OUTER real size. Inner opening is set next.</p>
      <div className="row">
        <button onClick={submit}>Save style</button>
        <button className="linkbtn" onClick={() => { setF(empty); setOpen(false) }}>
          cancel
        </button>
      </div>
    </div>
  )
}
