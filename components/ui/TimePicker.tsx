type TimePickerProps = {
  value: string // "HH:MM"
  onChange: (value: string) => void
  className?: string
}

const HOURS = Array.from({ length: 24 }, (_, i) => i)
const MINUTES = [0, 15, 30, 45]

const selectClass =
  'flex-1 px-2 py-2.5 rounded-xl border border-zinc-200 text-zinc-900 text-sm focus:outline-none focus:border-zinc-500 bg-white appearance-none text-center cursor-pointer'

export function TimePicker({ value, onChange, className }: TimePickerProps) {
  const [hStr, mStr] = value.split(':')
  const h = parseInt(hStr, 10) || 0
  const rawMin = parseInt(mStr, 10) || 0
  // Snap to nearest 15-min step
  const m = MINUTES.reduce((prev, cur) =>
    Math.abs(cur - rawMin) < Math.abs(prev - rawMin) ? cur : prev
  )

  function handleHour(e: React.ChangeEvent<HTMLSelectElement>) {
    onChange(`${e.target.value.padStart(2, '0')}:${String(m).padStart(2, '0')}`)
  }

  function handleMinute(e: React.ChangeEvent<HTMLSelectElement>) {
    onChange(`${String(h).padStart(2, '0')}:${e.target.value.padStart(2, '0')}`)
  }

  return (
    <div className={`flex items-center gap-1 ${className ?? ''}`}>
      <select value={h} onChange={handleHour} className={selectClass}>
        {HOURS.map((hr) => (
          <option key={hr} value={hr}>
            {String(hr).padStart(2, '0')}
          </option>
        ))}
      </select>
      <span className="text-zinc-400 font-semibold select-none">:</span>
      <select value={m} onChange={handleMinute} className={selectClass}>
        {MINUTES.map((min) => (
          <option key={min} value={min}>
            {String(min).padStart(2, '0')}
          </option>
        ))}
      </select>
    </div>
  )
}
