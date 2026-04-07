import { InputHTMLAttributes } from 'react'

interface FormFieldProps extends InputHTMLAttributes<HTMLInputElement> {
  label: React.ReactNode
  size?: 'md' | 'sm'
  rightElement?: React.ReactNode
}

export function FormField({ label, size = 'md', rightElement, ...props }: FormFieldProps) {
  const labelClass =
    size === 'sm'
      ? 'block text-xs font-medium text-zinc-500 mb-1.5'
      : 'block text-sm font-medium text-zinc-700 mb-1.5'

  const inputClass =
    size === 'sm'
      ? `w-full px-3 py-2.5 rounded-xl border border-zinc-200 text-zinc-900 text-sm focus:outline-none focus:border-zinc-500 bg-white${rightElement ? ' pr-10' : ''}`
      : `w-full px-4 py-3 rounded-xl border border-zinc-200 text-zinc-900 placeholder:text-zinc-400 focus:outline-none focus:border-zinc-500 bg-white${rightElement ? ' pr-10' : ''}`

  return (
    <div>
      <label className={labelClass}>{label}</label>
      <div className="relative">
        <input className={inputClass} {...props} />
        {rightElement && (
          <div className="absolute inset-y-0 right-0 flex items-center pr-3">
            {rightElement}
          </div>
        )}
      </div>
    </div>
  )
}
