'use client'

import PhoneInput from 'react-phone-number-input'

interface PhoneFieldProps {
  label?: string
  value: string
  onChange: (value: string) => void
  size?: 'md' | 'sm'
  required?: boolean
}

export function PhoneField({ label, value, onChange, size = 'md', required }: PhoneFieldProps) {
  const labelClass =
    size === 'sm'
      ? 'block text-xs font-medium text-zinc-500 mb-1.5'
      : 'block text-sm font-medium text-zinc-700 mb-1.5'

  const containerClass =
    size === 'sm'
      ? 'flex items-center gap-2 w-full px-3 py-2.5 rounded-xl border border-zinc-200 bg-white focus-within:border-zinc-500 transition-colors'
      : 'flex items-center gap-2 w-full px-4 py-3 rounded-xl border border-zinc-200 bg-white focus-within:border-zinc-500 transition-colors'

  const inputClass =
    size === 'sm'
      ? 'flex-1 min-w-0 text-sm text-zinc-900 placeholder:text-zinc-400 focus:outline-none bg-transparent'
      : 'flex-1 min-w-0 text-sm text-zinc-900 placeholder:text-zinc-400 focus:outline-none bg-transparent'

  return (
    <div>
      {label && <label className={labelClass}>{label}{required && ' *'}</label>}
      <div className={containerClass}>
        <PhoneInput
          defaultCountry="MY"
          value={value || ''}
          onChange={(v) => onChange(v ?? '')}
          numberInputProps={{ className: inputClass, required }}
          className="w-full"
        />
      </div>
    </div>
  )
}
