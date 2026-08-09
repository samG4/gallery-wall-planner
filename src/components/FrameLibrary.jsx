import React, { useState } from 'react'
import { useStore, uid } from '../store.jsx'
import { disp, unitLabel } from '../units.js'
import {
  ART_SIZES,
  MOULDINGS,
  MATS,
  makePresetStyle,
  presetOuter,
  moulding as mouldingOf,
  mat as matOf,
  DEFAULT_MAT_IN,
  DEFAULT_MOULDING_IN,
} from '../frames.js'
import { useToast } from './Toasts.jsx'
import SectionTitle from './SectionTitle.jsx'

// Pick a standard size, a moulding and a mat — get a frame with no photo of a
// frame required. This is the fast path most people want.
export default function FrameLibrary({ onPlace }) {
  const { state, dispatch } = useStore()
  const { units } = state
  const u = unitLabel(units)
  const toast = useToast()
  const [mouldingKey, setMouldingKey] = useState('black')
  const [matKey, setMatKey] = useState('white')
  const [matIn, setMatIn] = useState(DEFAULT_MAT_IN)
  const [frameWIn, setFrameWIn] = useState(DEFAULT_MOULDING_IN)
  const [group, setGroup] = useState('us')

  const sizes = ART_SIZES.filter((s) => s.group === group)

  function addSize(sz) {
    const style = makePresetStyle(uid('style'), {
      artW: sz.w,
      artH: sz.h,
      matIn,
      frameWIn,
      mouldingKey,
      matKey,
      count: 1,
      name: `${sz.label} ${mouldingOf(mouldingKey).label}`,
    })
    dispatch({ type: 'addFrameStyle', style })
    onPlace?.(style)
    toast(`Added ${style.name} — ${fmt(style.outerW)}×${fmt(style.outerH)} ${u} outer.`, 'ok')
  }

  const fmt = (inches) => disp(inches, units)

  return (
    <div className="frame-library" data-tour="frames">
      <SectionTitle
        title="Frame library"
        info="Sizes are the ART size — what the frame holds. The smaller number under each is the outer size once the mat and moulding are added, which is what actually takes up wall. Pick a moulding and mat first; the frame is drawn, no photo needed."
      />
      <div className="lib-controls">
        <div className="row">
          <label className="mini">Moulding</label>
          <div className="swatches">
            {MOULDINGS.map((m) => (
              <button
                key={m.key}
                className={`swatch ${mouldingKey === m.key ? 'on' : ''}`}
                style={{ background: m.color, borderColor: m.edge }}
                title={m.label}
                aria-label={`Moulding ${m.label}`}
                aria-pressed={mouldingKey === m.key}
                onClick={() => setMouldingKey(m.key)}
              />
            ))}
          </div>
        </div>
        <div className="row">
          <label className="mini">Mat</label>
          <div className="swatches">
            {MATS.map((m) => (
              <button
                key={m.key}
                className={`swatch ${matKey === m.key ? 'on' : ''}`}
                style={{ background: m.color }}
                title={m.label}
                aria-label={`Mat ${m.label}`}
                aria-pressed={matKey === m.key}
                onClick={() => setMatKey(m.key)}
              />
            ))}
          </div>
        </div>
        <div className="row">
          <label className="mini">Mat width</label>
          <input
            type="range"
            min="0"
            max="4"
            step="0.25"
            value={matIn}
            onChange={(e) => setMatIn(parseFloat(e.target.value))}
            aria-label="Mat width"
          />
          <span className="mini num">{fmt(matIn)}{u}</span>
        </div>
        <div className="row">
          <label className="mini">Moulding width</label>
          <input
            type="range"
            min="0.25"
            max="3"
            step="0.25"
            value={frameWIn}
            onChange={(e) => setFrameWIn(parseFloat(e.target.value))}
            aria-label="Moulding width"
          />
          <span className="mini num">{fmt(frameWIn)}{u}</span>
        </div>
      </div>

      <div className="seg">
        <button className={group === 'us' ? 'on' : ''} onClick={() => setGroup('us')}>
          Inches
        </button>
        <button className={group === 'iso' ? 'on' : ''} onClick={() => setGroup('iso')}>
          A sizes
        </button>
      </div>

      <div className="size-grid">
        {sizes.map((sz) => {
          const outer = presetOuter({ artW: sz.w, artH: sz.h, matIn, frameWIn })
          return (
            <button
              key={sz.label}
              className="size-chip"
              onClick={() => addSize(sz)}
              title={`Outer ${fmt(outer.outerW)}×${fmt(outer.outerH)} ${u}`}
            >
              <span
                className="size-preview"
                style={{
                  aspectRatio: `${outer.outerW} / ${outer.outerH}`,
                  background: mouldingOf(mouldingKey).color,
                  padding: `${Math.max(2, (frameWIn / outer.outerW) * 60)}px`,
                }}
              >
                <span className="size-mat" style={{ background: matOf(matKey).color }} />
              </span>
              <span className="size-label">{sz.label}</span>
              <span className="size-outer">
                {fmt(outer.outerW)}×{fmt(outer.outerH)}
              </span>
            </button>
          )
        })}
      </div>
    </div>
  )
}
