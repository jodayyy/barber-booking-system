'use client'

import { useState, useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { getLocalDateString, formatSlot, formatDateHeading } from '@/lib/format'
import { PageLayout } from '@/components/ui/PageLayout'
import { Card } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { Collapsible } from '@/components/ui/Collapsible'
import { ConfirmPanel } from '@/components/ui/ConfirmPanel'

const DAY_SHORT = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']

type Booking = {
  id: string
  name: string
  phone: string
  date: string
  slot: string
  status: 'active' | 'cancelled'
}

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

const today = getLocalDateString(new Date())

function addDays(dateStr: string, n: number): string {
  const [y, m, d] = dateStr.split('-').map(Number)
  const date = new Date(y, m - 1, d)
  date.setDate(date.getDate() + n)
  return getLocalDateString(date)
}

function getDayOfWeek(dateStr: string): number {
  const [y, m, d] = dateStr.split('-').map(Number)
  return new Date(y, m - 1, d).getDay()
}

function getUpcoming7Days(): { dateStr: string; dayNum: string; dayName: string }[] {
  const now = new Date()
  return Array.from({ length: 7 }, (_, i) => {
    const d = new Date(now)
    d.setDate(now.getDate() + i)
    return {
      dateStr: getLocalDateString(d),
      dayNum: String(d.getDate()),
      dayName: DAY_SHORT[d.getDay()],
    }
  })
}

export default function AdminDashboardPage() {
  const router = useRouter()

  // — Bookings —
  const [selectedDate, setSelectedDate] = useState(today)
  const [bookings, setBookings] = useState<Booking[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [cancelling, setCancelling] = useState<string | null>(null)
  const [deleting, setDeleting] = useState<string | null>(null)
  const [confirmId, setConfirmId] = useState<{ id: string; action: 'cancel' | 'delete' } | null>(null)

  // — Shop hours —
  const [schedule, setSchedule] = useState<ScheduleItem[]>([])
  const [overrides, setOverrides] = useState<Record<string, DateOverride>>({})
  const [selectedOverrideDate, setSelectedOverrideDate] = useState<string | null>(null)
  const [editValues, setEditValues] = useState<EditValues | null>(null)
  const [panelSaving, setPanelSaving] = useState(false)
  const [panelSaved, setPanelSaved] = useState(false)
  const [resetting, setResetting] = useState(false)
  const [resetConfirm, setResetConfirm] = useState(false)
  const [resetError, setResetError] = useState('')
  const [resetDone, setResetDone] = useState(false)

  const days = getUpcoming7Days()

  const fetchBookings = useCallback(async (date: string) => {
    setLoading(true)
    setError('')
    try {
      const res = await fetch(`/api/admin/bookings?date=${date}`)
      if (res.status === 401) { router.push('/admin/login'); return }
      const data = await res.json()
      if (!res.ok) { setError(data.error ?? 'Failed to load bookings'); return }
      setBookings(data)
    } catch {
      setError('Failed to load bookings')
    } finally {
      setLoading(false)
    }
  }, [router])

  useEffect(() => { fetchBookings(selectedDate) }, [selectedDate, fetchBookings])

  const loadSettings = useCallback(async () => {
    const [scheduleRes, overridesRes] = await Promise.all([
      fetch('/api/admin/schedule'),
      fetch('/api/admin/date-overrides'),
    ])
    if (scheduleRes.status === 401) { router.push('/admin/login'); return }
    if (scheduleRes.ok) setSchedule(await scheduleRes.json())
    if (overridesRes.ok) {
      const d: Array<{ date: string } & DateOverride> = await overridesRes.json()
      const map: Record<string, DateOverride> = {}
      for (const o of d) map[o.date] = { start_time: o.start_time, end_time: o.end_time, is_closed: o.is_closed }
      setOverrides(map)
    }
  }, [router])

  useEffect(() => { loadSettings() }, [loadSettings])

  useEffect(() => {
    if (!selectedOverrideDate) { setEditValues(null); return }
    setPanelSaved(false)
    const override = overrides[selectedOverrideDate]
    if (override) {
      setEditValues({
        start_time: override.start_time?.slice(0, 5) ?? '10:00',
        end_time: override.end_time?.slice(0, 5) ?? '22:00',
        is_closed: override.is_closed,
      })
      return
    }
    const dow = getDayOfWeek(selectedOverrideDate)
    const def = schedule.find((s) => s.day_of_week === dow)
    setEditValues(def
      ? { start_time: (def.start_time as string).slice(0, 5), end_time: (def.end_time as string).slice(0, 5), is_closed: def.is_closed }
      : { start_time: '10:00', end_time: '22:00', is_closed: false }
    )
  }, [selectedOverrideDate, overrides, schedule])

  async function handleCancel(id: string) {
    setCancelling(id)
    try {
      const res = await fetch(`/api/bookings/${id}`, { method: 'DELETE' })
      if (res.status === 401) { router.push('/admin/login'); return }
      if (res.ok) {
        setBookings((prev) =>
          prev.map((b) => (b.id === id ? { ...b, status: 'cancelled' } : b))
        )
      }
    } finally {
      setCancelling(null)
    }
  }

  async function handleDelete(id: string) {
    setDeleting(id)
    try {
      const res = await fetch(`/api/admin/bookings/${id}`, { method: 'DELETE' })
      if (res.status === 401) { router.push('/admin/login'); return }
      if (res.ok) setBookings((prev) => prev.filter((b) => b.id !== id))
    } finally {
      setDeleting(null)
    }
  }

  async function handleLogout() {
    await fetch('/api/admin/logout', { method: 'POST' })
    router.push('/admin/login')
  }

  async function handleSavePanel() {
    if (!selectedOverrideDate || !editValues) return
    setPanelSaving(true)
    try {
      const res = await fetch('/api/admin/date-overrides', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ date: selectedOverrideDate, ...editValues }),
      })
      if (res.status === 401) { router.push('/admin/login'); return }
      if (res.ok) {
        setOverrides((prev) => ({ ...prev, [selectedOverrideDate]: { ...editValues } }))
        setPanelSaved(true)
        setTimeout(() => setPanelSaved(false), 3000)
      }
    } finally {
      setPanelSaving(false)
    }
  }

  async function handleRevertToDefault() {
    if (!selectedOverrideDate) return
    setPanelSaving(true)
    try {
      const res = await fetch(`/api/admin/date-overrides?date=${selectedOverrideDate}`, { method: 'DELETE' })
      if (res.status === 401) { router.push('/admin/login'); return }
      if (res.ok) {
        setOverrides((prev) => {
          const next = { ...prev }
          delete next[selectedOverrideDate]
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

  const canGoPrev = selectedDate > addDays(today, -7)
  const canGoNext = selectedDate < today
  const activeCount = bookings.filter((b) => b.status === 'active').length

  return (
    <PageLayout>
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold text-zinc-900">Dashboard</h1>
          <p className="text-zinc-500 text-sm mt-0.5">Manage today&apos;s bookings</p>
        </div>
        <div className="flex items-center gap-2">
          <Link
            href="/admin/settings"
            className="w-9 h-9 flex items-center justify-center rounded-xl border border-zinc-200 bg-white text-zinc-500 hover:border-zinc-400 transition-colors"
            aria-label="Settings"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
              <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
            </svg>
          </Link>
          <button
            onClick={handleLogout}
            className="w-9 h-9 flex items-center justify-center rounded-xl border border-zinc-200 bg-white text-zinc-500 hover:border-zinc-400 transition-colors cursor-pointer"
            aria-label="Logout"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
            </svg>
          </button>
        </div>
      </div>

      {/* Date navigation */}
      <div className="flex items-center justify-between mb-6">
        <button
          onClick={() => setSelectedDate((d) => addDays(d, -1))}
          disabled={!canGoPrev}
          className="w-9 h-9 flex items-center justify-center rounded-xl border border-zinc-200 bg-white text-zinc-500 disabled:opacity-30 hover:border-zinc-400 transition-colors cursor-pointer disabled:cursor-default"
          aria-label="Previous day"
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
          </svg>
        </button>

        <div className="text-center">
          <p className="text-sm font-semibold text-zinc-900">{formatDateHeading(selectedDate)}</p>
          {selectedDate === today && (
            <p className="text-xs text-zinc-400 mt-0.5">Today</p>
          )}
        </div>

        <button
          onClick={() => setSelectedDate((d) => addDays(d, 1))}
          disabled={!canGoNext}
          className="w-9 h-9 flex items-center justify-center rounded-xl border border-zinc-200 bg-white text-zinc-500 disabled:opacity-30 hover:border-zinc-400 transition-colors cursor-pointer disabled:cursor-default"
          aria-label="Next day"
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
          </svg>
        </button>
      </div>

      {/* Bookings */}
      {loading && (
        <p className="text-zinc-400 text-sm text-center py-10">Loading…</p>
      )}
      {error && (
        <p className="text-red-500 text-sm text-center py-10">{error}</p>
      )}
      {!loading && !error && bookings.length === 0 && (
        <p className="text-zinc-400 text-sm text-center py-10">No bookings for this day.</p>
      )}
      {!loading && bookings.length > 0 && (
        <>
          <p className="text-xs text-zinc-400 mb-3">
            {activeCount} active · {bookings.length - activeCount} cancelled
          </p>
          <ul className="flex flex-col gap-3">
            {bookings.map((booking) => (
              <li key={booking.id}>
                <Card className={`px-4 py-4 flex items-center justify-between gap-4 ${booking.status === 'cancelled' ? 'border-zinc-100' : ''}`}>
                  <div className="min-w-0">
                    <div className="flex items-center gap-2 mb-0.5">
                      <span className="text-sm font-semibold text-zinc-900 truncate">{booking.name}</span>
                      {booking.status === 'cancelled' && (
                        <span className="text-xs text-zinc-400 font-medium shrink-0">Cancelled</span>
                      )}
                    </div>
                    <p className="text-sm text-zinc-500">{formatSlot(booking.slot.slice(0, 5))}</p>
                    <p className="text-xs text-zinc-400 mt-0.5">{booking.phone}</p>
                  </div>

                  {confirmId?.id === booking.id ? (
                    <div className="flex items-center gap-1.5 shrink-0">
                      <span className="text-xs font-medium text-zinc-500">
                        {confirmId.action === 'cancel' ? 'Cancel?' : 'Delete?'}
                      </span>
                      <button
                        onClick={() => {
                          if (confirmId.action === 'cancel') handleCancel(booking.id)
                          else handleDelete(booking.id)
                          setConfirmId(null)
                        }}
                        disabled={cancelling === booking.id || deleting === booking.id}
                        className="px-2.5 py-1 rounded-lg bg-red-500 text-white text-xs font-medium hover:bg-red-600 transition-colors cursor-pointer disabled:opacity-40"
                      >
                        {cancelling === booking.id || deleting === booking.id ? '…' : 'Yes'}
                      </button>
                      <button
                        onClick={() => setConfirmId(null)}
                        className="px-2.5 py-1 rounded-lg border border-zinc-200 text-zinc-500 text-xs font-medium hover:border-zinc-400 transition-colors cursor-pointer"
                      >
                        No
                      </button>
                    </div>
                  ) : (
                    <>
                      {booking.status === 'active' && (
                        <button
                          onClick={() => setConfirmId({ id: booking.id, action: 'cancel' })}
                          className="shrink-0 w-8 h-8 flex items-center justify-center rounded-full border border-red-300 text-red-500 hover:border-red-500 transition-colors cursor-pointer"
                          aria-label="Cancel booking"
                        >
                          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                            <circle cx="12" cy="12" r="9" />
                            <path strokeLinecap="round" d="M6.5 17.5l11-11" />
                          </svg>
                        </button>
                      )}
                      {booking.status === 'cancelled' && (
                        <button
                          onClick={() => setConfirmId({ id: booking.id, action: 'delete' })}
                          className="shrink-0 w-8 h-8 flex items-center justify-center rounded-full border border-red-300 text-red-500 hover:border-red-500 transition-colors cursor-pointer"
                          aria-label="Delete booking"
                        >
                          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M3 6h18M8 6V4h8v2M19 6l-1 14H6L5 6" />
                          </svg>
                        </button>
                      )}
                    </>
                  )}
                </Card>
              </li>
            ))}
          </ul>
        </>
      )}

      {/* Manage Shop Hours */}
      <Collapsible label="Manage Shop Hours" className="mt-8">
        {/* Date strip */}
        <div className="flex gap-1.5 mb-3">
          {days.map(({ dateStr, dayNum, dayName }) => {
            const { hasOverride, isClosed } = getEffectiveHours(dateStr)
            const isSelected = selectedOverrideDate === dateStr
            return (
              <button
                key={dateStr}
                onClick={() => setSelectedOverrideDate(isSelected ? null : dateStr)}
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
                      ? 'bg-amber-400'
                      : 'bg-green-400'
                }`} />
              </button>
            )
          })}
        </div>

        {/* Edit panel */}
        {selectedOverrideDate && editValues && (
          <div className="bg-white border border-zinc-200 rounded-2xl px-5 py-5 mb-4">
            <div className="flex items-center justify-between mb-4">
              <p className="text-sm font-semibold text-zinc-900">{formatDateHeading(selectedOverrideDate)}</p>
              {overrides[selectedOverrideDate] && (
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
        <div className="border-t border-zinc-100 pt-4">
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
      </Collapsible>
    </PageLayout>
  )
}
