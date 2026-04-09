'use client'

import { useState, useRef, useEffect } from 'react'

const ITEM_HEIGHT = 44
const VISIBLE = 5 // rows shown; selected is always the middle (index 2)

const HOURS = Array.from({ length: 12 }, (_, i) => String(i + 1).padStart(2, '0'))
const MINUTES = Array.from({ length: 12 }, (_, i) => String(i * 5).padStart(2, '0'))
const PERIODS = ['AM', 'PM']

// ─── Scroll column ───────────────────────────────────────────────────────────

type ColProps = {
  items: string[]
  selectedIndex: number
  onSelect: (i: number) => void
  wide?: boolean
}

function ScrollCol({ items, selectedIndex, onSelect, wide }: ColProps) {
  const ref = useRef<HTMLDivElement>(null)
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const settling = useRef(false)

  // Set initial scroll position without animation
  useEffect(() => {
    if (ref.current) ref.current.scrollTop = selectedIndex * ITEM_HEIGHT
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  function snapTo(idx: number) {
    if (!ref.current) return
    settling.current = true
    ref.current.scrollTo({ top: idx * ITEM_HEIGHT, behavior: 'smooth' })
    onSelect(idx)
    setTimeout(() => { settling.current = false }, 350)
  }

  function handleScroll() {
    if (settling.current) return
    if (timer.current) clearTimeout(timer.current)
    timer.current = setTimeout(() => {
      if (!ref.current) return
      const idx = Math.max(0, Math.min(items.length - 1, Math.round(ref.current.scrollTop / ITEM_HEIGHT)))
      snapTo(idx)
    }, 80)
  }

  return (
    <div className={`relative ${wide ? 'flex-[1.4]' : 'flex-1'}`} style={{ height: ITEM_HEIGHT * VISIBLE }}>
      {/* Selection band */}
      <div
        className="absolute inset-x-1 bg-zinc-100 rounded-xl pointer-events-none z-10"
        style={{ top: ITEM_HEIGHT * 2, height: ITEM_HEIGHT }}
      />
      {/* Top fade */}
      <div
        className="absolute inset-x-0 top-0 pointer-events-none z-20 bg-gradient-to-b from-white to-transparent"
        style={{ height: ITEM_HEIGHT * 2 }}
      />
      {/* Bottom fade */}
      <div
        className="absolute inset-x-0 bottom-0 pointer-events-none z-20 bg-gradient-to-t from-white to-transparent"
        style={{ height: ITEM_HEIGHT * 2 }}
      />

      <div
        ref={ref}
        onScroll={handleScroll}
        className="scrollbar-none overflow-y-scroll h-full"
        style={{ scrollSnapType: 'y mandatory' }}
      >
        {/* Top padding so first item can reach center */}
        <div style={{ height: ITEM_HEIGHT * 2 }} />

        {items.map((item, i) => (
          <div
            key={item}
            onClick={() => snapTo(i)}
            style={{ height: ITEM_HEIGHT, scrollSnapAlign: 'center' }}
            className={`flex items-center justify-center cursor-pointer select-none transition-all duration-100 ${
              i === selectedIndex
                ? 'text-zinc-900 text-2xl font-semibold'
                : 'text-zinc-300 text-xl font-medium'
            }`}
          >
            {item}
          </div>
        ))}

        {/* Bottom padding */}
        <div style={{ height: ITEM_HEIGHT * 2 }} />
      </div>
    </div>
  )
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

function parseValue(v: string) {
  const [hStr, mStr] = v.split(':')
  let h = parseInt(hStr, 10) || 0
  const m = parseInt(mStr, 10) || 0
  const periodIdx = h >= 12 ? 1 : 0
  h = h % 12
  if (h === 0) h = 12
  const hourIdx = h - 1 // 0-based: HOURS[0]='01' … HOURS[11]='12'
  // Snap to nearest 5-min step
  const minIdx = MINUTES.reduce((best, cur, i) =>
    Math.abs(parseInt(cur) - m) < Math.abs(parseInt(MINUTES[best]) - m) ? i : best, 0)
  return { hourIdx, minIdx, periodIdx }
}

function toValue(hourIdx: number, minIdx: number, periodIdx: number) {
  let h = hourIdx + 1 // 1–12
  if (periodIdx === 1) {
    h = h === 12 ? 12 : h + 12 // PM
  } else {
    h = h === 12 ? 0 : h // AM midnight
  }
  return `${String(h).padStart(2, '0')}:${MINUTES[minIdx]}`
}

// ─── Public component ─────────────────────────────────────────────────────────

type TimePickerProps = {
  value: string // "HH:MM" 24-hour
  onChange: (value: string) => void
  className?: string
}

export function TimePicker({ value, onChange, className }: TimePickerProps) {
  const [open, setOpen] = useState(false)
  const [localH, setLocalH] = useState(0)
  const [localM, setLocalM] = useState(0)
  const [localP, setLocalP] = useState(0)

  function handleOpen() {
    const { hourIdx, minIdx, periodIdx } = parseValue(value)
    setLocalH(hourIdx)
    setLocalM(minIdx)
    setLocalP(periodIdx)
    setOpen(true)
  }

  function handleDone() {
    onChange(toValue(localH, localM, localP))
    setOpen(false)
  }

  // Button display — always shows the committed value
  const { hourIdx, minIdx, periodIdx } = parseValue(value)
  const label = `${HOURS[hourIdx]}:${MINUTES[minIdx]} ${PERIODS[periodIdx]}`

  return (
    <div className={className}>
      <button
        type="button"
        onClick={handleOpen}
        className="w-full px-3 py-2.5 rounded-xl border border-zinc-200 text-zinc-900 text-sm bg-white focus:outline-none focus:border-zinc-500 flex items-center justify-between"
      >
        <span>{label}</span>
        <svg className="w-4 h-4 text-zinc-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <circle cx="12" cy="12" r="9" />
          <path strokeLinecap="round" strokeLinejoin="round" d="M12 7v5l3 3" />
        </svg>
      </button>

      {open && (
        <div
          className="fixed inset-0 z-50 flex items-end justify-center"
          style={{ backgroundColor: 'rgba(0,0,0,0.35)' }}
          onClick={() => setOpen(false)}
        >
          <div
            className="bg-white rounded-t-3xl w-full max-w-sm"
            style={{ paddingBottom: 'max(1.5rem, env(safe-area-inset-bottom))' }}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className="flex items-center justify-between px-5 py-3 border-b border-zinc-100">
              <button
                onClick={() => setOpen(false)}
                className="text-sm text-zinc-400 px-1 py-1 cursor-pointer"
              >
                Cancel
              </button>
              <span className="text-sm font-semibold text-zinc-600">Select time</span>
              <button
                onClick={handleDone}
                className="text-sm font-semibold text-zinc-900 px-1 py-1 cursor-pointer"
              >
                Done
              </button>
            </div>

            {/* Drum-roll columns */}
            <div className="flex items-center gap-1 px-6 pt-2 pb-4">
              <ScrollCol items={HOURS}   selectedIndex={localH} onSelect={setLocalH} />
              <span className="text-zinc-300 font-bold text-xl mb-0.5 shrink-0">:</span>
              <ScrollCol items={MINUTES} selectedIndex={localM} onSelect={setLocalM} />
              <ScrollCol items={PERIODS} selectedIndex={localP} onSelect={setLocalP} wide />
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
