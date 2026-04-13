'use client'

import { useState } from 'react'
import { Icon } from '@/components/ui/Icon'

interface CollapsibleProps {
  label: string
  children: React.ReactNode
  defaultOpen?: boolean
  className?: string
}

export function Collapsible({ label, children, defaultOpen = false, className = '' }: CollapsibleProps) {
  const [open, setOpen] = useState(defaultOpen)

  return (
    <div className={`border-b border-zinc-200 sm:border sm:rounded-2xl ${className}`}>
      <button
        onClick={() => setOpen((v) => !v)}
        className="w-full flex items-center justify-between px-4 py-4 text-left cursor-pointer"
      >
        <span className="text-base font-semibold text-zinc-900">{label}</span>
        <Icon name="chevron-down" className={`w-5 h-5 text-zinc-400 transition-transform ${open ? 'rotate-180' : ''}`} />
      </button>
      <div
        className="grid transition-[grid-template-rows] duration-300 ease-in-out"
        style={{ gridTemplateRows: open ? '1fr' : '0fr' }}
      >
        <div className="overflow-hidden">
          <div className="border-t border-zinc-100 px-4 pt-5 pb-5">
            {children}
          </div>
        </div>
      </div>
    </div>
  )
}
