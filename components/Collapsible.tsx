'use client'

import { useState } from 'react'
import { Icon } from '@/components/Icon'

interface CollapsibleProps {
  label: string
  children: React.ReactNode
  defaultOpen?: boolean
  className?: string
  action?: React.ReactNode
}

export function Collapsible({ label, children, defaultOpen = false, className = '', action }: CollapsibleProps) {
  const [open, setOpen] = useState(defaultOpen)

  return (
    <div className={`border-b border-zinc-200 sm:border sm:rounded-2xl ${className}`}>
      <div className="flex items-center px-4">
        <button
          onClick={() => setOpen((v) => !v)}
          className="flex-1 py-4 text-left cursor-pointer"
        >
          <span className="text-base font-semibold text-zinc-900">{label}</span>
        </button>
        <div className="flex items-center gap-2">
          {action}
          <button onClick={() => setOpen((v) => !v)} className="cursor-pointer py-4">
            <Icon name="chevron-down" className={`w-5 h-5 text-zinc-400 transition-transform ${open ? 'rotate-180' : ''}`} />
          </button>
        </div>
      </div>
      <div
        className="grid transition-[grid-template-rows] duration-300 ease-in-out"
        style={{ gridTemplateRows: open ? '1fr' : '0fr' }}
      >
        <div className="overflow-hidden min-h-0">
          <div className="border-t border-zinc-100 px-4 pt-5 pb-5">
            {children}
          </div>
        </div>
      </div>
    </div>
  )
}
