import { SelectHTMLAttributes } from 'react'

interface SelectFieldProps extends SelectHTMLAttributes<HTMLSelectElement> {
  label: React.ReactNode
  size?: 'md' | 'sm'
}

export function SelectField({ label, size = 'md', children, ...props }: SelectFieldProps) {
  const labelClass =
    size === 'sm'
      ? 'block text-xs font-medium text-zinc-500 mb-1.5'
      : 'block text-sm font-medium text-zinc-700 mb-1.5'

  const selectClass =
    size === 'sm'
      ? 'w-full px-3 py-2.5 rounded-xl border border-zinc-200 text-zinc-900 text-sm focus:outline-none focus:border-zinc-500 bg-white'
      : 'w-full px-4 py-3 rounded-xl border border-zinc-200 text-zinc-900 focus:outline-none focus:border-zinc-500 bg-white'

  return (
    <div>
      <label className={labelClass}>{label}</label>
      <select className={selectClass} {...props}>
        {children}
      </select>
    </div>
  )
}
