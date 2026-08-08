import React, { useState } from 'react'
import { useStore, uid } from '../store.jsx'
import { readImageFile } from '../utils.js'
import { toInches, unitLabel } from '../units.js'
import { useToast } from './Toasts.jsx'

const empty = { name: '', width: '', height: '', count: '1', price: '', image: null, imgW: 0, imgH: 0 }

// Custom frame built from a photo of a real frame. The inner opening is marked
// afterwards in the OpeningEditor.
export default function FrameStyleForm({ onDone }) {
  const { state, dispatch } = useStore()
  const { units } = state
  const toast = useToast()
  const [f, setF] = useState(empty)

  async function onImg(e) {
    const file = e.target.files?.[0]
    if (!file) return
    const { dataURL, w, h } = await readImageFile(file, 1200)
    setF((s) => ({ ...s, image: dataURL, imgW: w, imgH: h }))
  }

  function submit() {
    const width = parseFloat(f.width)
    const height = parseFloat(f.height)
    const count = parseInt(f.count, 10) || 1
    if (!f.image || !width || !height) {
      toast('Need a frame photo plus its outer width and height.', 'warn')
      return
    }
    dispatch({
      type: 'addFrameStyle',
      style: {
        id: uid('style'),
        kind: 'image',
        name: f.name || 'Frame',
        image: f.image,
        imgW: f.imgW,
        imgH: f.imgH,
        outerW: toInches(width, units), // stored canonical inches
        outerH: toInches(height, units),
        openingFrac: null, // set next via OpeningEditor
        count,
        price: f.price === '' ? null : parseFloat(f.price),
      },
    })
    setF(empty)
    toast('Frame added — now mark its inner opening.', 'ok')
    onDone?.()
  }

  return (
    <div className="frame-form">
      <label className="filebtn small">
        {f.image ? 'Change frame photo' : 'Upload frame photo'}
        <input type="file" accept="image/*" onChange={onImg} hidden />
      </label>
      {f.image && <img src={f.image} className="thumb" alt="frame" />}
      <input
        placeholder="Name (e.g. Black 8×10)"
        aria-label="Frame name"
        value={f.name}
        onChange={(e) => setF({ ...f, name: e.target.value })}
      />
      <div className="row">
        <input
          type="number"
          placeholder={`W (${unitLabel(units)})`}
          aria-label={`Outer width in ${unitLabel(units)}`}
          value={f.width}
          onChange={(e) => setF({ ...f, width: e.target.value })}
        />
        <input
          type="number"
          placeholder={`H (${unitLabel(units)})`}
          aria-label={`Outer height in ${unitLabel(units)}`}
          value={f.height}
          onChange={(e) => setF({ ...f, height: e.target.value })}
        />
        <input
          type="number"
          placeholder="count"
          aria-label="How many you own"
          value={f.count}
          onChange={(e) => setF({ ...f, count: e.target.value })}
        />
      </div>
      <div className="row">
        <input
          type="number"
          step="0.01"
          placeholder="price each (optional)"
          aria-label="Price per frame"
          value={f.price}
          onChange={(e) => setF({ ...f, price: e.target.value })}
        />
      </div>
      <p className="hint">Enter the frame's OUTER real size. Inner opening is set next.</p>
      <div className="row">
        <button onClick={submit}>Save frame</button>
        <button
          className="linkbtn"
          onClick={() => {
            setF(empty)
            onDone?.()
          }}
        >
          cancel
        </button>
      </div>
    </div>
  )
}
