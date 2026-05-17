import { useState, useEffect, useRef } from 'react'
import { TAG_COLORS } from '../../types'

function hslToHex(h: number, s: number, l: number): string {
  s /= 100; l /= 100
  const k = (n: number) => (n + h / 30) % 12
  const a = s * Math.min(l, 1 - l)
  const f = (n: number) => l - a * Math.max(-1, Math.min(k(n) - 3, Math.min(9 - k(n), 1)))
  return '#' + [f(0), f(8), f(4)].map(x => Math.round(255 * x).toString(16).padStart(2, '0')).join('')
}

function hexToHsl(hex: string): [number, number, number] {
  const r = parseInt(hex.slice(1, 3), 16) / 255
  const g = parseInt(hex.slice(3, 5), 16) / 255
  const b = parseInt(hex.slice(5, 7), 16) / 255
  const max = Math.max(r, g, b), min = Math.min(r, g, b)
  let h = 0, s = 0
  const l = (max + min) / 2
  if (max !== min) {
    const d = max - min
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min)
    if (max === r) h = ((g - b) / d + (g < b ? 6 : 0)) / 6
    else if (max === g) h = ((b - r) / d + 2) / 6
    else h = ((r - g) / d + 4) / 6
  }
  return [Math.round(h * 360), Math.round(s * 100), Math.round(l * 100)]
}

interface TagEditorModalProps {
  open: boolean
  mode: 'create' | 'edit'
  initialName?: string
  initialColor?: string
  onSave: (name: string, color: string) => void
  onClose: () => void
}

export function TagEditorModal({
  open,
  mode,
  initialName = '',
  initialColor = TAG_COLORS[5].hex,
  onSave,
  onClose,
}: TagEditorModalProps) {
  const [name, setName] = useState(initialName)
  const [color, setColor] = useState(initialColor)
  const [hue, setHue] = useState(220)
  const [sat, setSat] = useState(70)
  const [lit, setLit] = useState(55)
  const nameRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (open) {
      setName(initialName)
      setColor(initialColor)
      if (/^#[0-9a-fA-F]{6}$/.test(initialColor)) {
        const [h, s, l] = hexToHsl(initialColor)
        setHue(h); setSat(s); setLit(l)
      }
      setTimeout(() => nameRef.current?.focus(), 50)
    }
  }, [open, initialName, initialColor])

  useEffect(() => {
    if (!open) return
    function onKey(e: KeyboardEvent) { if (e.key === 'Escape') onClose() }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [open, onClose])

  function setFromSliders(h: number, s: number, l: number) {
    setHue(h); setSat(s); setLit(l)
    setColor(hslToHex(h, s, l))
  }

  function selectPreset(hex: string) {
    setColor(hex)
    const [h, s, l] = hexToHsl(hex)
    setHue(h); setSat(s); setLit(l)
  }

  function handleSave() {
    const trimmed = name.trim()
    if (!trimmed) return
    onSave(trimmed, color)
    onClose()
  }

  if (!open) return null

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-fg/10 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        className="bg-panel border border-border rounded-2xl shadow-2xl w-[300px] mx-4 p-5 animate-pop"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Title */}
        <h2 className="text-sm font-semibold text-fg mb-4">
          {mode === 'create' ? 'New Tag' : 'Edit Tag'}
        </h2>

        {/* Name */}
        <p className="text-[10px] font-semibold tracking-widest uppercase text-muted mb-1.5">Name</p>
        <input
          ref={nameRef}
          value={name}
          onChange={(e) => setName(e.target.value)}
          onKeyDown={(e) => { if (e.key === 'Enter') handleSave() }}
          placeholder="Tag name"
          className="w-full bg-surface border border-border rounded-lg px-3 py-2 text-sm text-fg placeholder-muted focus:outline-none focus:border-accent transition-colors mb-4"
        />

        {/* Color label + preview */}
        <p className="text-[10px] font-semibold tracking-widest uppercase text-muted mb-2">Color</p>
        <div
          className="w-full h-9 rounded-xl mb-3 transition-colors"
          style={{ backgroundColor: color }}
        />

        {/* Preset swatches */}
        <div className="flex items-center gap-1.5 mb-4">
          {TAG_COLORS.map((c) => {
            const active = color.toLowerCase() === c.hex.toLowerCase()
            return (
              <button
                key={c.id}
                onClick={() => selectPreset(c.hex)}
                className={`w-6 h-6 rounded-full flex-shrink-0 transition-all hover:scale-110 ${active ? 'ring-2 ring-offset-2 ring-fg/50 scale-110' : ''}`}
                style={{ backgroundColor: c.hex }}
                title={c.id}
              />
            )
          })}
        </div>

        {/* Sliders */}
        <div className="space-y-3 mb-5">
          <div>
            <p className="text-[10px] text-muted mb-1.5">Hue</p>
            <input
              type="range" min={0} max={360} value={hue}
              onChange={(e) => setFromSliders(+e.target.value, sat, lit)}
              className="color-slider w-full"
              style={{ background: 'linear-gradient(to right,#f00,#ff0,#0f0,#0ff,#00f,#f0f,#f00)' }}
            />
          </div>
          <div>
            <p className="text-[10px] text-muted mb-1.5">Saturation</p>
            <input
              type="range" min={0} max={100} value={sat}
              onChange={(e) => setFromSliders(hue, +e.target.value, lit)}
              className="color-slider w-full"
              style={{ background: `linear-gradient(to right,hsl(${hue},0%,${lit}%),hsl(${hue},100%,${lit}%))` }}
            />
          </div>
          <div>
            <p className="text-[10px] text-muted mb-1.5">Brightness</p>
            <input
              type="range" min={20} max={80} value={lit}
              onChange={(e) => setFromSliders(hue, sat, +e.target.value)}
              className="color-slider w-full"
              style={{ background: `linear-gradient(to right,hsl(${hue},${sat}%,20%),hsl(${hue},${sat}%,50%),hsl(${hue},${sat}%,80%))` }}
            />
          </div>
        </div>

        {/* Actions */}
        <div className="flex gap-2">
          <button
            onClick={onClose}
            className="flex-1 px-3 py-2 text-xs font-medium border border-border rounded-lg text-fg-2 hover:text-fg hover:bg-fg/4 transition-colors"
          >
            Discard
          </button>
          <button
            onClick={handleSave}
            disabled={!name.trim()}
            className="flex-1 px-3 py-2 text-xs font-medium bg-accent text-white rounded-lg hover:bg-accent/90 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
          >
            {mode === 'create' ? 'Create' : 'Save'}
          </button>
        </div>
      </div>
    </div>
  )
}
