import React from 'react'
import { useStore, uid } from '../store.jsx'
import { readImageFile } from '../utils.js'
import { useToast } from './Toasts.jsx'

export default function PanelPhotos({ ui, patchUi }) {
  const { state, dispatch } = useStore()
  const toast = useToast()
  const selected = ui.selectedIds || []

  async function onPhotoUpload(e) {
    const files = Array.from(e.target.files || [])
    for (const file of files) {
      const { dataURL, w, h } = await readImageFile(file)
      dispatch({ type: 'addPhoto', photo: { id: uid('photo'), image: dataURL, w, h } })
    }
    e.target.value = ''
    if (files.length) toast(`Added ${files.length} photo${files.length > 1 ? 's' : ''}.`, 'ok')
  }

  function assignPhoto(photoId) {
    if (!selected.length) {
      toast('Select a frame on the wall first, then tap a photo.', 'warn')
      return
    }
    const patches = {}
    for (const id of selected) patches[id] = { photoId }
    dispatch({ type: 'updateManyPlaced', patches })
  }

  // Fill every empty frame in one go — the "just show me something" button.
  function autoFill() {
    const empties = state.placedFrames.filter((p) => !p.photoId)
    if (!empties.length) return toast('Every frame already has a photo.', 'info')
    if (!state.photos.length) return toast('Upload some photos first.', 'warn')
    const patches = {}
    empties.forEach((p, i) => {
      patches[p.id] = { photoId: state.photos[i % state.photos.length].id }
    })
    dispatch({ type: 'updateManyPlaced', patches })
    toast(`Filled ${empties.length} frame${empties.length > 1 ? 's' : ''}.`, 'ok')
  }

  return (
    <section>
      <h2>3 · Photos</h2>
      <label className="filebtn">
        Upload photos
        <input type="file" accept="image/*" multiple onChange={onPhotoUpload} hidden />
      </label>
      <p className="hint">
        Select a frame on the wall, then tap a photo to drop it inside. Crop it to fit after.
      </p>
      <div className="row">
        <button className="ghost" onClick={autoFill} disabled={!state.photos.length}>
          Fill empty frames
        </button>
        {selected.length > 0 && (
          <span className="mini">
            {selected.length} frame{selected.length > 1 ? 's' : ''} selected
          </span>
        )}
      </div>
      <div className="photo-grid">
        {state.photos.map((p) => (
          <div key={p.id} className="photo-cell">
            <img
              src={p.image}
              alt=""
              onClick={() => assignPhoto(p.id)}
              title="Tap to place in the selected frame"
            />
            <button
              className="x"
              aria-label="Remove photo"
              onClick={() => dispatch({ type: 'removePhoto', id: p.id })}
            >
              ×
            </button>
          </div>
        ))}
      </div>
      {!state.photos.length && <p className="hint">No photos yet — frames show an empty mat.</p>}
    </section>
  )
}
