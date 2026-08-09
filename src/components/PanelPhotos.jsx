import React from 'react'
import { useStore, uid } from '../store.jsx'
import { readImageFile } from '../utils.js'
import { useToast } from './Toasts.jsx'
import PhotoPicker from './PhotoPicker.jsx'

export default function PanelPhotos({ ui, patchUi = () => {}, mobile }) {
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

  // Tapping a photo works whichever order you did things in: it fills the frames
  // you selected, or — if you selected nothing — the first frame still empty.
  function assignPhoto(photoId) {
    let targets = selected
    if (!targets.length) {
      if (!state.placedFrames.length) {
        return toast('Add a frame to the wall first, then tap a photo.', 'warn')
      }
      const empty = state.placedFrames.find((p) => !p.photoId)
      if (!empty) {
        return toast('Every frame is filled — select one on the wall to swap its photo.', 'info')
      }
      targets = [empty.id]
      patchUi({ selectedIds: targets, selectedObstacleId: null })
    }
    const patches = {}
    for (const id of targets) patches[id] = { photoId }
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
      <PhotoPicker
        mobile={mobile}
        multiple
        onChange={onPhotoUpload}
        label={mobile ? 'Choose photos' : 'Upload photos'}
        cameraLabel="Take a photo"
      />
      <p className="hint">
        Tap a photo to drop it into the selected frame — or into the first empty one if nothing is
        selected. Crop it to fit after.
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
      {!state.photos.length && (
        <p className="hint">
          No photos yet — frames show an empty mat, which is enough to judge the arrangement. This
          step is optional.
        </p>
      )}
    </section>
  )
}
