'use client'

import { useState, useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { getLocalDateString, formatDateHeading } from '@/lib/format'
import { PageLayout } from '@/components/ui/PageLayout'
import { Button } from '@/components/ui/Button'
import { ConfirmPanel } from '@/components/ui/ConfirmPanel'

const DAY_SHORT = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']

type ScheduleItem = {
  day_of_week: number
  start_time: string
  end_time: string
  is_closed: boolean
}

type DateOverride = {
  start_time: string | null
  end_time: string | null
  is_closed: boolean
}

type EditValues = {
  start_time: string
  end_time: string
  is_closed: boolean
}

function getDayOfWeek(dateStr: string): number {
  const [y, m, d] = dateStr.split('-').map(Number)
  return new Date(y, m - 1, d).getDay()
}

function getUpcoming7Days(): { dateStr: string; dayNum: string; dayName: string }[] {
  const today = new Date()
  return Array.from({ length: 7 }, (_, i) => {
    const d = new Date(today)
    d.setDate(today.getDate() + i)
    return {
      dateStr: getLocalDateString(d),
      dayNum: String(d.getDate()),
      dayName: DAY_SHORT[d.getDay()],
    }
  })
}

export default function AdminSettingsPage() {
  const router = useRouter()
  const days = getUpcoming7Days()

  // Slot interval
  const [slotInterval, setSlotInterval] = useState('30')
  const [slotSaving, setSlotSaving] = useState(false)
  const [slotSaved, setSlotSaved] = useState(false)

  // Weekly schedule (read-only — used to compute defaults for the panel)
  const [schedule, setSchedule] = useState<ScheduleItem[]>([])

  // Date overrides
  const [overrides, setOverrides] = useState<Record<string, DateOverride>>({})

  // Selected date + inline panel
  const [selectedDate, setSelectedDate] = useState<string | null>(null)
  const [editValues, setEditValues] = useState<EditValues | null>(null)
  const [panelSaving, setPanelSaving] = useState(false)
  const [panelSaved, setPanelSaved] = useState(false)

  // Reset to defaults
  const [resetting, setResetting] = useState(false)
  const [resetConfirm, setResetConfirm] = useState(false)
  const [resetError, setResetError] = useState('')
  const [resetDone, setResetDone] = useState(false)

  const [loading, setLoading] = useState(true)

  const load = useCallback(async () => {
    try {
      const [settingsRes, scheduleRes, overridesRes] = await Promise.all([
        fetch('/api/admin/settings'),
        fetch('/api/admin/schedule'),
        fetch('/api/admin/date-overrides'),
      ])

      if (settingsRes.status === 401) { router.push('/admin/login'); return }

      if (settingsRes.ok) {
        const d = await settingsRes.json()
        setSlotInterval(d.slot_interval ?? '30')
      }

      if (scheduleRes.ok) {
        setSchedule(await scheduleRes.json())
      }

      if (overridesRes.ok) {
        const d: Array<{ date: string } & DateOverride> = await overridesRes.json()
        const map: Record<string, DateOverride> = {}
        for (const o of d) map[o.date] = { start_time: o.start_time, end_time: o.end_time, is_closed: o.is_closed }
        setOverrides(map)
      }
    } finally {
      setLoading(false)
    }
  }, [router])

  useEffect(() => { load() }, [load])

  // Sync panel when selectedDate, schedule, or overrides change
  useEffect(() => {
    if (!selectedDate) { setEditValues(null); return }
    setPanelSaved(false)

    const override = overrides[selectedDate]
    if (override) {
      setEditValues({
        start_time: override.start_time?.slice(0, 5) ?? '10:00',
        end_time: override.end_time?.slice(0, 5) ?? '22:00',
        is_closed: override.is_closed,
      })
      return
    }

    const dow = getDayOfWeek(selectedDate)
    const def = schedule.find((s) => s.day_of_week === dow)
    setEditValues(def
      ? { start_time: (def.start_time as string).slice(0, 5), end_time: (def.end_time as string).slice(0, 5), is_closed: def.is_closed }
      : { start_time: '10:00', end_time: '22:00', is_closed: false }
    )
  }, [selectedDate, overrides, schedule])

  async function handleSaveSlot(e: { preventDefault(): void }) {
    e.preventDefault()
    setSlotSaving(true)
    setSlotSaved(false)
    try {
      const res = await fetch('/api/admin/settings', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ slot_interval: slotInterval }),
      })
      if (res.status === 401) { router.push('/admin/login'); return }
      if (res.ok) { setSlotSaved(true); setTimeout(() => setSlotSaved(false), 3000) }
    } finally {
      setSlotSaving(false)
    }
  }

  async function handleSavePanel() {
    if (!selectedDate || !editValues) return
    setPanelSaving(true)
    try {
      const res = await fetch('/api/admin/date-overrides', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ date: selectedDate, ...editValues }),
      })
      if (res.status === 401) { router.push('/admin/login'); return }
      if (res.ok) {
        setOverrides((prev) => ({ ...prev, [selectedDate]: { ...editValues } }))
        setPanelSaved(true)
        setTimeout(() => setPanelSaved(false), 3000)
      }
    } finally {
      setPanelSaving(false)
    }
  }

  async function handleRevertToDefault() {
    if (!selectedDate) return
    setPanelSaving(true)
    try {
      const res = await fetch(`/api/admin/date-overrides?date=${selectedDate}`, { method: 'DELETE' })
      if (res.status === 401) { router.push('/admin/login'); return }
      if (res.ok) {
        setOverrides((prev) => {
          const next = { ...prev }
          delete next[selectedDate]
          return next
        })
      }
    } finally {
      setPanelSaving(false)
    }
  }

  async function handleResetToDefaults() {
    setResetting(true)
    setResetError('')
    try {
      const res = await fetch('/api/admin/schedule', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ reset: true }),
      })
      if (res.status === 401) { router.push('/admin/login'); return }
      if (!res.ok) {
        const d = await res.json()
        setResetError(d.error ?? 'Failed to reset')
        return
      }
      const scheduleRes = await fetch('/api/admin/schedule')
      if (scheduleRes.ok) setSchedule(await scheduleRes.json())
      setOverrides({})
      setResetConfirm(false)
      setResetDone(true)
      setTimeout(() => setResetDone(false), 3000)
    } finally {
      setResetting(false)
    }
  }

  function getEffectiveHours(dateStr: string): { hasOverride: boolean; isClosed: boolean } {
    const override = overrides[dateStr]
    if (override) return { hasOverride: true, isClosed: override.is_closed }
    const dow = getDayOfWeek(dateStr)
    const def = schedule.find((s) => s.day_of_week === dow)
    return { hasOverride: false, isClosed: !def || def.is_closed }
  }

  if (loading) {
    return (
      <PageLayout>
        <p className="text-zinc-400 text-sm text-center py-10">Loading…</p>
      </PageLayout>
    )
  }

  return (
    <PageLayout>
      {/* Header */}
      <div className="flex items-center gap-3 mb-8">
        <Link
          href="/admin/dashboard"
          className="w-9 h-9 flex items-center justify-center rounded-xl border border-zinc-200 bg-white text-zinc-500 hover:border-zinc-400 transition-colors"
          aria-label="Back to dashboard"
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
          </svg>
        </Link>
        <div>
          <h1 className="text-2xl font-bold text-zinc-900">Settings</h1>
          <p className="text-zinc-500 text-sm mt-0.5">Shop hours and availability</p>
        </div>
      </div>

      {/* Slot interval */}
      <form onSubmit={handleSaveSlot} className="flex items-end gap-3 mb-8">
        <div className="flex-1">
          <label className="block text-xs font-medium text-zinc-500 mb-1.5">Slot interval</label>
          <select
            value={slotInterval}
            onChange={(e) => setSlotInterval(e.target.value)}
            className="w-full px-3 py-2.5 rounded-xl border border-zinc-200 text-zinc-900 text-sm focus:outline-none focus:border-zinc-500 bg-white"
          >
            <option value="15">15 min</option>
            <option value="30">30 min</option>
            <option value="45">45 min</option>
            <option value="60">60 min</option>
          </select>
        </div>
        <Button type="submit" size="sm" disabled={slotSaving}>
          {slotSaving ? 'Saving…' : slotSaved ? 'Saved!' : 'Save'}
        </Button>
      </form>

      {/* This week */}
      <p className="text-xs font-medium text-zinc-500 uppercase tracking-wide mb-3">This week</p>

      {/* Date strip */}
      <div className="flex gap-1.5 mb-3">
        {days.map(({ dateStr, dayNum, dayName }) => {
          const { hasOverride, isClosed } = getEffectiveHours(dateStr)
          const isSelected = selectedDate === dateStr

          return (
            <button
              key={dateStr}
              onClick={() => setSelectedDate(isSelected ? null : dateStr)}
              className={`relative flex flex-col items-center flex-1 py-2.5 rounded-xl border text-sm transition-colors cursor-pointer ${
                isSelected
                  ? 'bg-zinc-900 border-zinc-900 text-white'
                  : 'bg-white border-zinc-200 text-zinc-700 hover:border-zinc-400'
              }`}
            >
              <span className="text-xs font-medium">{dayName}</span>
              <span className="text-base font-bold mt-0.5">{dayNum}</span>
              <span className={`w-1.5 h-1.5 rounded-full mt-1 ${
                isClosed
                  ? 'bg-red-400'
                  : hasOverride
                    ? (isSelected ? 'bg-amber-300' : 'bg-amber-400')
                    : 'opacity-0'
              }`} />
            </button>
          )
        })}
      </div>

      {/* Inline panel */}
      {selectedDate && editValues && (
        <div className="bg-white border border-zinc-200 rounded-2xl px-5 py-5 mb-8">
          <div className="flex items-center justify-between mb-4">
            <p className="text-sm font-semibold text-zinc-900">{formatDateHeading(selectedDate)}</p>
            {overrides[selectedDate] && (
              <button
                onClick={handleRevertToDefault}
                disabled={panelSaving}
                className="text-xs text-zinc-400 hover:text-zinc-600 transition-colors cursor-pointer disabled:opacity-50"
              >
                Revert to default
              </button>
            )}
          </div>

          <label className="flex items-center gap-2.5 mb-4 cursor-pointer select-none">
            <input
              type="checkbox"
              checked={editValues.is_closed}
              onChange={(e) => setEditValues((v) => v ? { ...v, is_closed: e.target.checked } : v)}
              className="w-4 h-4 rounded border-zinc-300 cursor-pointer"
            />
            <span className="text-sm text-zinc-700">Closed this day</span>
          </label>

          {!editValues.is_closed && (
            <div className="grid grid-cols-2 gap-3 mb-4">
              <div>
                <label className="block text-xs font-medium text-zinc-500 mb-1.5">Opens at</label>
                <input
                  type="time"
                  value={editValues.start_time}
                  onChange={(e) => setEditValues((v) => v ? { ...v, start_time: e.target.value } : v)}
                  className="w-full px-3 py-2.5 rounded-xl border border-zinc-200 text-zinc-900 text-sm focus:outline-none focus:border-zinc-500 bg-white"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-zinc-500 mb-1.5">Closes at</label>
                <input
                  type="time"
                  value={editValues.end_time}
                  onChange={(e) => setEditValues((v) => v ? { ...v, end_time: e.target.value } : v)}
                  className="w-full px-3 py-2.5 rounded-xl border border-zinc-200 text-zinc-900 text-sm focus:outline-none focus:border-zinc-500 bg-white"
                />
              </div>
            </div>
          )}

          <Button onClick={handleSavePanel} disabled={panelSaving} size="sm" className="w-full">
            {panelSaving ? 'Saving…' : panelSaved ? 'Saved!' : 'Save for this date'}
          </Button>
        </div>
      )}

      {/* Reset to defaults */}
      <div className="border-t border-zinc-100 pt-6">
        {!resetConfirm ? (
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-zinc-900">Reset to defaults</p>
              <p className="text-xs text-zinc-400 mt-0.5">
                {resetDone ? 'Schedule restored.' : 'Restore the original weekly hours for all days'}
              </p>
            </div>
            <Button variant="secondary" size="sm" onClick={() => setResetConfirm(true)}>
              {resetDone ? 'Done!' : 'Reset'}
            </Button>
          </div>
        ) : (
          <ConfirmPanel
            title="Reset weekly hours?"
            description="This will restore the original shop schedule for every day of the week."
            confirmLabel={resetting ? 'Resetting…' : 'Yes, reset'}
            cancelLabel="Cancel"
            onConfirm={handleResetToDefaults}
            onCancel={() => { setResetConfirm(false); setResetError('') }}
            disabled={resetting}
            error={resetError}
            size="sm"
          />
        )}
      </div>
    </PageLayout>
  )
}
