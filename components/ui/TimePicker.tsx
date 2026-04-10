'use client'

import { useState, useEffect } from 'react'
import Picker from 'react-mobile-picker'

const HOURS = Array.from({ length: 12 }, (_, i) => String(i + 1).padStart(2, '0'))
const MINUTES = Array.from({ length: 12 }, (_, i) => String(i * 5).padStart(2, '0'))
const PERIODS = ['AM', 'PM']

type PickerVal = { hour: string; minute: string; period: string }

function parseValue(v: string): PickerVal {
  const [hStr, mStr] = v.split(':')
  let h = parseInt(hStr, 10) || 0
  const m = parseInt(mStr, 10) || 0
  const period = h >= 12 ? 'PM' : 'AM'
  h = h % 12
  if (h === 0) h = 12
  const minute = MINUTES.reduce((best, cur) =>
    Math.abs(parseInt(cur) - m) < Math.abs(parseInt(best) - m) ? cur : best
  )
  return { hour: String(h).padStart(2, '0'), minute, period }
}

function toValue({ hour, minute, period }: PickerVal): string {
  let h = parseInt(hour, 10)
  if (period === 'PM') h = h === 12 ? 12 : h + 12
  else h = h === 12 ? 0 : h
  return `${String(h).padStart(2, '0')}:${minute}`
}

type TimePickerProps = {
  value: string // "HH:MM" 24-hour
  onChange: (value: string) => void
  className?: string
}

export function TimePicker({ value, onChange, className }: TimePickerProps) {
  const [isMobile, setIsMobile] = useState(false)
  const [open, setOpen] = useState(false)
  const [local, setLocal] = useState<PickerVal>(() => parseValue(value))

  useEffect(() => {
    const check = () => setIsMobile(window.innerWidth < 768)
    check()
    window.addEventListener('resize', check)
    return () => window.removeEventListener('resize', check)
  }, [])

  function handleOpen() {
    setLocal(parseValue(value))
    setOpen(true)
  }

  function handleDone() {
    onChange(toValue(local))
    setOpen(false)
  }

  const { hour, minute, period } = parseValue(value)
  const label = `${hour}:${minute} ${period}`

  // Desktop: native time input
  if (!isMobile) {
    return (
      <input
        type="time"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className={`w-full px-3 py-2.5 rounded-xl border border-zinc-200 text-zinc-900 text-sm bg-white focus:outline-none focus:border-zinc-500 ${className ?? ''}`}
      />
    )
  }

  // Mobile: drum-roll bottom-sheet
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

            {/* Drum-roll picker — touch-action:none prevents iOS from scrolling the page during column drag */}
            <div className="px-4 pt-1 pb-2" style={{ touchAction: 'none' }}>
              <Picker
                value={local}
                onChange={setLocal}
                wheelMode="natural"
                height={210}
                itemHeight={54}
              >
                <Picker.Column name="hour">
                  {HOURS.map((h) => (
                    <Picker.Item key={h} value={h}>
                      {({ selected }) => (
                        <span className={`text-2xl font-medium ${selected ? 'text-zinc-900' : 'text-zinc-300'}`}>
                          {h}
                        </span>
                      )}
                    </Picker.Item>
                  ))}
                </Picker.Column>
                <Picker.Column name="minute">
                  {MINUTES.map((m) => (
                    <Picker.Item key={m} value={m}>
                      {({ selected }) => (
                        <span className={`text-2xl font-medium ${selected ? 'text-zinc-900' : 'text-zinc-300'}`}>
                          {m}
                        </span>
                      )}
                    </Picker.Item>
                  ))}
                </Picker.Column>
                <Picker.Column name="period">
                  {PERIODS.map((p) => (
                    <Picker.Item key={p} value={p}>
                      {({ selected }) => (
                        <span className={`text-xl font-medium ${selected ? 'text-zinc-900' : 'text-zinc-300'}`}>
                          {p}
                        </span>
                      )}
                    </Picker.Item>
                  ))}
                </Picker.Column>
              </Picker>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
