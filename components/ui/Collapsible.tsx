'use client'

import { useState } from 'react'

interface CollapsibleProps {
  label: string
  children: React.ReactNode
  defaultOpen?: boolean
  className?: string
}

export function Collapsible({ label, children, defaultOpen = false, className = '' }: CollapsibleProps) {
  const [open, setOpen] = useState(defaultOpen)

  return (
    <div className={`border border-zinc-200 rounded-2xl ${className}`}>
      <button
        onClick={() => setOpen((v) => !v)}
        className="w-full flex items-center justify-between px-4 py-4 text-left cursor-pointer"
      >
        <span className="text-base font-semibold text-zinc-900">{label}</span>
        <svg
          className={`w-5 h-5 text-zinc-400 transition-transform ${open ? 'rotate-180' : ''}`}
          fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}
        >
          <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
        </svg>
      </button>
      {open && (
        <div className="border-t border-zinc-100 px-4 pt-5 pb-5">
          {children}
        </div>
      )}
    </div>
  )
}
