import { ButtonHTMLAttributes } from 'react'

type Variant = 'primary' | 'secondary' | 'danger'
type Size = 'md' | 'sm'

const variantClasses: Record<Variant, string> = {
  primary:
    'rounded-xl bg-zinc-900 text-white font-semibold text-sm disabled:opacity-50 transition-opacity cursor-pointer disabled:cursor-default',
  secondary:
    'rounded-xl border border-zinc-200 bg-white text-zinc-700 font-semibold text-sm hover:border-zinc-400 transition-colors cursor-pointer disabled:opacity-50 disabled:cursor-default',
  danger:
    'rounded-xl bg-red-500 text-white font-semibold text-sm hover:bg-red-600 transition-colors cursor-pointer disabled:opacity-50 disabled:cursor-default',
}

const sizeClasses: Record<Variant, Record<Size, string>> = {
  primary:   { md: 'py-3.5 px-4', sm: 'py-3 px-4' },
  secondary: { md: 'py-3.5 px-4', sm: 'py-3 px-4' },
  danger:    { md: 'py-3 px-4',   sm: 'py-2 px-4' },
}

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant
  size?: Size
}

export function Button({ variant = 'primary', size = 'md', className = '', ...props }: ButtonProps) {
  return (
    <button
      className={`${variantClasses[variant]} ${sizeClasses[variant][size]} ${className}`}
      {...props}
    />
  )
}
