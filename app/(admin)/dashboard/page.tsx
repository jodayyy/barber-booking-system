'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import dynamic from 'next/dynamic'
import { getLocalDateString, formatSlot, formatDateHeading } from '@/lib/utils'
import { PageLayout } from '@/components/PageLayout'
import { Card } from '@/components/Card'
import { Button } from '@/components/Button'
import { Collapsible } from '@/components/Collapsible'
import { ConfirmPanel } from '@/components/ConfirmPanel'
import { Spinner } from '@/components/Spinner'
import { TimePicker } from '@/components/TimePicker'
import { Icon } from '@/components/Icon'

const DAY_SHORT = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']

function readAdminCache(): { shopName: string; bookingWindow: number; isOpen: boolean | null; hoursLabel: string | null } | null {
  try {
    const raw = localStorage.getItem('admin_cache')
    return raw ? JSON.parse(raw) : null
  } catch { return null }
}

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

function getDaysFrom(startStr: string, n: number): { dateStr: string; dayNum: string; dayName: string }[] {
  return Array.from({ length: n }, (_, i) => {
    const d = addDays(startStr, i)
    const [y, m, day] = d.split('-').map(Number)
    const date = new Date(y, m - 1, day)
    return { dateStr: d, dayNum: String(date.getDate()), dayName: DAY_SHORT[date.getDay()] }
  })
}

function AdminDashboardPage() {
  const router = useRouter()

  // — Bookings —
  const [selectedDate, setSelectedDate] = useState(today)
  const [bookings, setBookings] = useState<Booking[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [cancelling, setCancelling] = useState<string | null>(null)
  const [deleting, setDeleting] = useState<string | null>(null)
  const [confirmId, setConfirmId] = useState<{ id: string; action: 'cancel' | 'delete' } | null>(null)

  // — Past bookings —
  const [showPast, setShowPast] = useState(false)
  const [pastBookings, setPastBookings] = useState<{ date: string; bookings: Booking[] }[]>([])
  const [pastLoading, setPastLoading] = useState(false)
  const [deletingPast, setDeletingPast] = useState<string | null>(null)
  const [confirmPastId, setConfirmPastId] = useState<string | null>(null)

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

  const [shopName, setShopName] = useState(() => readAdminCache()?.shopName ?? '')
  const [bookingWindow, setBookingWindow] = useState(() => readAdminCache()?.bookingWindow ?? 14)
  const [isOpen, setIsOpen] = useState<boolean | null>(() => readAdminCache()?.isOpen ?? null)
  const [hoursLabel, setHoursLabel] = useState<string | null>(() => readAdminCache()?.hoursLabel ?? null)
  const [dayCounts, setDayCounts] = useState<Record<string, number>>({})
  const [dropdownOpen, setDropdownOpen] = useState(false)
  const dropdownRef = useRef<HTMLDivElement | null>(null)

  const allDates = getDaysFrom(today, bookingWindow)

  const dateScrollRef = useRef<HTMLDivElement | null>(null)
  const [scrollMounted, setScrollMounted] = useState(false)
  const [canScrollLeft, setCanScrollLeft] = useState(false)
  const [canScrollRight, setCanScrollRight] = useState(false)

  const scrollRefCallback = useCallback((el: HTMLDivElement | null) => {
    dateScrollRef.current = el
    setScrollMounted(!!el)
  }, [])

  function updateScrollButtons() {
    const el = dateScrollRef.current
    if (!el) return
    setCanScrollLeft(el.scrollLeft > 0)
    setCanScrollRight(el.scrollLeft + el.clientWidth < el.scrollWidth - 1)
  }

  const days = getUpcoming7Days()

  // Loads bookings for the selected date and updates the count badge on that date button
  const fetchBookings = useCallback(async (date: string) => {
    setLoading(true)
    setError('')
    setBookings([])
    try {
      const res = await fetch(`/api/admin/bookings?date=${date}`)
      if (res.status === 401) { router.push('/login'); return }
      const data = await res.json()
      if (!res.ok) { setError(data.error ?? 'Failed to load bookings'); return }
      setBookings(data)
      setDayCounts((prev) => ({ ...prev, [date]: data.filter((b: Booking) => b.status === 'active').length }))
    } catch {
      setError('Failed to load bookings')
    } finally {
      setLoading(false)
    }
  }, [router])

  // Pre-fetches active booking counts for all dates in the booking window (powers the count badges)
  const fetchDayCounts = useCallback(async (window: number) => {
    const dates = getDaysFrom(today, window).map((d) => d.dateStr)
    const results = await Promise.all(
      dates.map(async (date) => {
        try {
          const res = await fetch(`/api/admin/bookings?date=${date}`)
          if (!res.ok) return [date, 0] as [string, number]
          const data: Booking[] = await res.json()
          return [date, data.filter((b) => b.status === 'active').length] as [string, number]
        } catch {
          return [date, 0] as [string, number]
        }
      })
    )
    setDayCounts((prev) => {
      const next = { ...prev }
      for (const [date, count] of results) next[date] = count
      return next
    })
  }, [])

  useEffect(() => { fetchBookings(selectedDate) }, [selectedDate, fetchBookings])
  useEffect(() => { fetchDayCounts(bookingWindow) }, [fetchDayCounts, bookingWindow])
  useEffect(() => {
    const el = dateScrollRef.current
    if (!el) return
    updateScrollButtons()
    el.addEventListener('scroll', updateScrollButtons)
    return () => el.removeEventListener('scroll', updateScrollButtons)
  }, [scrollMounted])

  useEffect(() => {
    if (!dropdownOpen) return
    function handleClickOutside(e: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setDropdownOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [dropdownOpen])

  // Loads schedule, date overrides, shop settings, and booking window in parallel on mount
  const loadSettings = useCallback(async () => {
    const [scheduleRes, overridesRes, settingsRes, statusRes] = await Promise.all([
      fetch('/api/admin/schedule'),
      fetch('/api/admin/date-overrides'),
      fetch('/api/admin/settings'),
      fetch('/api/customer/status'),
    ])
    if (scheduleRes.status === 401) { router.push('/login'); return }
    if (scheduleRes.ok) setSchedule(await scheduleRes.json())
    let newShopName = ''
    let newBookingWindow = 14
    let newIsOpen: boolean | null = null
    let newHoursLabel: string | null = null
    if (settingsRes.ok) {
      const s = await settingsRes.json()
      if (s.shop_name) { setShopName(s.shop_name); newShopName = s.shop_name }
    }
    if (statusRes.ok) {
      const s = await statusRes.json()
      newBookingWindow = s.bookingWindow ?? 14
      setBookingWindow(newBookingWindow)
      newIsOpen = s.open
      setIsOpen(s.open)
      const fmt = (t: string) => {
        const [h, m] = t.slice(0, 5).split(':').map(Number)
        const suffix = h >= 12 ? 'PM' : 'AM'
        const hour = h % 12 || 12
        return m === 0 ? `${hour} ${suffix}` : `${hour}:${String(m).padStart(2, '0')} ${suffix}`
      }
      newHoursLabel = s.hours ? `${fmt(s.hours.start)} – ${fmt(s.hours.end)}` : null
      setHoursLabel(newHoursLabel)
    }
    try {
      localStorage.setItem('admin_cache', JSON.stringify({ shopName: newShopName, bookingWindow: newBookingWindow, isOpen: newIsOpen, hoursLabel: newHoursLabel }))
    } catch {}
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

  async function fetchPastBookings() {
    setPastLoading(true)
    const dates = [1, 2, 3].map((n) => addDays(today, -n))
    const results = await Promise.all(
      dates.map(async (date) => {
        try {
          const res = await fetch(`/api/admin/bookings?date=${date}`)
          if (!res.ok) return { date, bookings: [] }
          const data: Booking[] = await res.json()
          return { date, bookings: data }
        } catch {
          return { date, bookings: [] }
        }
      })
    )
    setPastBookings(results.filter((r) => r.bookings.length > 0))
    setPastLoading(false)
  }

  async function handleTogglePast() {
    if (showPast) { setShowPast(false); return }
    setShowPast(true)
    await fetchPastBookings()
  }

  async function handleDeletePast(id: string) {
    setDeletingPast(id)
    try {
      const res = await fetch(`/api/admin/bookings/${id}`, { method: 'DELETE' })
      if (res.status === 401) { router.push('/login'); return }
      if (res.ok) {
        setPastBookings((prev) =>
          prev.map((g) => ({ ...g, bookings: g.bookings.filter((b) => b.id !== id) }))
            .filter((g) => g.bookings.length > 0)
        )
      }
    } finally {
      setDeletingPast(null)
      setConfirmPastId(null)
    }
  }

  async function handleCancel(id: string) {
    setCancelling(id)
    try {
      const res = await fetch(`/api/customer/bookings/${id}`, { method: 'DELETE' })
      if (res.status === 401) { router.push('/login'); return }
      if (res.ok) {
        setBookings((prev) =>
          prev.map((b) => (b.id === id ? { ...b, status: 'cancelled' } : b))
        )
        setDayCounts((prev) => ({ ...prev, [selectedDate]: Math.max(0, (prev[selectedDate] ?? 0) - 1) }))
      }
    } finally {
      setCancelling(null)
      setConfirmId(null)
    }
  }

  async function handleDelete(id: string) {
    setDeleting(id)
    try {
      const res = await fetch(`/api/admin/bookings/${id}`, { method: 'DELETE' })
      if (res.status === 401) { router.push('/login'); return }
      if (res.ok) {
        setBookings((prev) => prev.filter((b) => b.id !== id))
        setDayCounts((prev) => ({ ...prev, [selectedDate]: Math.max(0, (prev[selectedDate] ?? 0) - 1) }))
      }
    } finally {
      setDeleting(null)
      setConfirmId(null)
    }
  }

  async function handleLogout() {
    await fetch('/api/admin/logout', { method: 'POST' })
    router.push('/login')
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
      if (res.status === 401) { router.push('/login'); return }
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
      if (res.status === 401) { router.push('/login'); return }
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
      if (res.status === 401) { router.push('/login'); return }
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

  const todayLabel = (() => {
    const d = new Date()
    const wd = d.toLocaleDateString('en-GB', { weekday: 'long' })
    const day = d.getDate()
    const mo = d.toLocaleDateString('en-GB', { month: 'long' })
    return `${wd}, ${day} ${mo}`
  })()

  // Returns whether a date has a manual override and whether it's marked closed (used to colour the dots)
  function getEffectiveHours(dateStr: string): { hasOverride: boolean; isClosed: boolean } {
    const override = overrides[dateStr]
    if (override) return { hasOverride: true, isClosed: override.is_closed }
    const dow = getDayOfWeek(dateStr)
    const def = schedule.find((s) => s.day_of_week === dow)
    return { hasOverride: false, isClosed: !def || def.is_closed }
  }

  return (
    <PageLayout>
      {/* Header */}
      <div className="px-5 pt-8 pb-6">
        <div className="flex items-center justify-between mb-1.5">
          <p className="text-zinc-400 text-sm">{todayLabel}</p>
          <div className="relative" ref={dropdownRef}>
            <button
              onClick={() => setDropdownOpen((v) => !v)}
              className="w-8 h-8 flex items-center justify-center rounded-lg text-zinc-600 hover:text-zinc-900 transition-colors cursor-pointer"
              aria-label="Menu"
            >
              <Icon name="more-vertical" className="w-4 h-4" />
            </button>
            {dropdownOpen && (
              <div className="absolute right-0 top-full mt-1 w-40 bg-white border border-zinc-200 rounded-xl shadow-lg overflow-hidden z-50">
                <Link
                  href="/settings"
                  onClick={() => setDropdownOpen(false)}
                  className="flex items-center gap-2.5 px-4 py-2.5 text-sm text-zinc-700 hover:bg-zinc-50 transition-colors"
                >
                  <Icon name="settings" className="w-4 h-4" />
                  Settings
                </Link>
                <button
                  onClick={handleLogout}
                  className="w-full flex items-center gap-2.5 px-4 py-2.5 text-sm text-red-500 hover:bg-red-50 transition-colors cursor-pointer"
                >
                  <Icon name="logout" className="w-4 h-4" />
                  Logout
                </button>
              </div>
            )}
          </div>
        </div>
        <h1 className="text-[1.6rem] font-bold text-zinc-900 leading-tight mb-3">
          {shopName ? `${shopName} Dashboard` : 'Dashboard'}
        </h1>
        {isOpen === null ? (
          <div className="h-5 flex items-center"><Spinner /></div>
        ) : (
          <div className="flex items-center gap-2 flex-wrap">
            <span className={`w-2 h-2 rounded-full shrink-0 ${isOpen ? 'bg-green-400' : 'bg-red-400'}`} />
            <span className={`text-sm font-semibold ${isOpen ? 'text-green-400' : 'text-red-400'}`}>
              {isOpen ? 'Open' : 'Closed'}
            </span>
            {hoursLabel && <span className="text-sm text-zinc-400">· {hoursLabel}</span>}
          </div>
        )}
      </div>

      <div className="border-t border-zinc-200 sm:border-t-0 flex flex-col sm:gap-4 pb-8">
      {/* Bookings */}
      <Collapsible
        label="Bookings"
        defaultOpen
        action={
          <button
            onClick={handleTogglePast}
            className={`w-7 h-7 flex items-center justify-center rounded-lg border transition-colors cursor-pointer ${
              showPast
                ? 'bg-zinc-900 border-zinc-900 text-white'
                : 'border-zinc-200 text-zinc-400 hover:border-zinc-400'
            }`}
            aria-label="Past bookings"
          >
            <Icon name="clock" className="w-3.5 h-3.5" />
          </button>
        }
      >
        {/* Past bookings panel */}
        <div
          className="grid transition-[grid-template-rows] duration-300 ease-in-out"
          style={{ gridTemplateRows: showPast ? '1fr' : '0fr' }}
        >
          <div className="overflow-hidden">
            <div className="mb-5">
              {pastLoading && (
                <div className="flex justify-center py-4"><Spinner /></div>
              )}
              {!pastLoading && pastBookings.length === 0 && (
                <p className="text-zinc-400 text-sm text-center py-4">No bookings in the past 3 days.</p>
              )}
              {!pastLoading && pastBookings.map(({ date, bookings: group }) => (
                <div key={date} className="mb-4">
                  <p className="text-xs font-semibold text-zinc-400 uppercase tracking-wide mb-2">{formatDateHeading(date)}</p>
                  <ul className="flex flex-col gap-2">
                    {group.map((booking) => (
                      <li key={booking.id}>
                        <Card className={`px-4 py-3 flex items-center justify-between gap-4 ${booking.status === 'cancelled' ? 'border-zinc-100' : ''}`}>
                          <div className="min-w-0">
                            <div className="flex items-center gap-2 mb-0.5">
                              <span className="text-sm font-semibold text-zinc-900 truncate">{booking.name}</span>
                              {booking.status === 'cancelled' && (
                                <span className="text-xs text-zinc-400 font-medium shrink-0">Cancelled</span>
                              )}
                            </div>
                            <p className="text-sm text-zinc-500">{formatSlot(booking.slot.slice(0, 5))}</p>
                          </div>
                          {confirmPastId === booking.id ? (
                            <div className="flex items-center gap-1.5 shrink-0">
                              {deletingPast === booking.id ? (
                                <Spinner className="w-4 h-4" />
                              ) : (
                                <>
                                  <span className="text-xs font-medium text-zinc-500">Delete?</span>
                                  <button
                                    onClick={() => handleDeletePast(booking.id)}
                                    className="px-2.5 py-1 rounded-lg bg-red-500 text-white text-xs font-medium hover:bg-red-600 transition-colors cursor-pointer flex items-center justify-center min-w-[36px]"
                                  >
                                    Yes
                                  </button>
                                  <button
                                    onClick={() => setConfirmPastId(null)}
                                    className="px-2.5 py-1 rounded-lg border border-zinc-200 text-zinc-500 text-xs font-medium hover:border-zinc-400 transition-colors cursor-pointer"
                                  >
                                    No
                                  </button>
                                </>
                              )}
                            </div>
                          ) : (
                            <button
                              onClick={() => setConfirmPastId(booking.id)}
                              className="shrink-0 w-8 h-8 flex items-center justify-center rounded-full border border-red-300 text-red-500 hover:border-red-500 transition-colors cursor-pointer"
                              aria-label="Delete booking"
                            >
                              <Icon name="trash" className="w-4 h-4" />
                            </button>
                          )}
                        </Card>
                      </li>
                    ))}
                  </ul>
                </div>
              ))}
              <div className="border-t border-zinc-100" />
            </div>
          </div>
        </div>

        {/* Date strip */}
        <div className="relative mb-4">
          {canScrollLeft && (
            <button
              onClick={() => dateScrollRef.current?.scrollBy({ left: -180, behavior: 'smooth' })}
              className="absolute left-0 top-1/2 -translate-y-1/2 z-10 w-8 h-8 flex items-center justify-center rounded-full border border-zinc-200 bg-white text-zinc-500 hover:border-zinc-400 cursor-pointer"
              aria-label="Scroll left"
            >
              <Icon name="chevron-left" className="w-4 h-4" />
            </button>
          )}
          <div ref={scrollRefCallback} className="flex gap-1.5 overflow-x-auto pb-1 scrollbar-none">
            {allDates.map(({ dateStr, dayNum, dayName }) => {
              const isSelected = selectedDate === dateStr
              const isToday = dateStr === today
              return (
                <button
                  key={dateStr}
                  onClick={() => setSelectedDate(dateStr)}
                  className={`flex flex-col items-center min-w-[52px] py-2.5 rounded-xl border text-sm transition-colors cursor-pointer ${
                    isSelected
                      ? 'bg-zinc-900 border-zinc-900 text-white'
                      : 'bg-white border-zinc-200 text-zinc-700 hover:border-zinc-400'
                  }`}
                >
                  <span className="text-xs font-medium">{dayName}</span>
                  <span className="text-base font-bold mt-0.5">{dayNum}</span>
                  {(dayCounts[dateStr] ?? 0) > 0 ? (
                    <span className={`text-[10px] font-semibold px-1.5 py-0.5 rounded-full mt-1 leading-none ${
                      isSelected ? 'bg-zinc-700 text-white' : 'bg-zinc-100 text-zinc-600'
                    }`}>
                      {dayCounts[dateStr]}
                    </span>
                  ) : (
                    <span className={`w-1.5 h-1.5 rounded-full mt-1 ${
                      isToday ? (isSelected ? 'bg-zinc-500' : 'bg-zinc-400') : 'opacity-0'
                    }`} />
                  )}
                </button>
              )
            })}
          </div>
          {canScrollRight && (
            <button
              onClick={() => dateScrollRef.current?.scrollBy({ left: 180, behavior: 'smooth' })}
              className="absolute right-0 top-1/2 -translate-y-1/2 z-10 w-8 h-8 flex items-center justify-center rounded-full border border-zinc-200 bg-white text-zinc-500 hover:border-zinc-400 cursor-pointer"
              aria-label="Scroll right"
            >
              <Icon name="chevron-right" className="w-4 h-4" />
            </button>
          )}
        </div>

        {/* Booking list */}
        {loading && (
          <div className="flex justify-center py-8">
            <Spinner />
          </div>
        )}
        {error && (
          <p className="text-red-500 text-sm text-center py-8">{error}</p>
        )}
        {!loading && !error && bookings.length === 0 && (
          <p className="text-zinc-400 text-sm text-center py-8">No bookings for this day.</p>
        )}
        {!loading && bookings.length > 0 && (
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
                      {cancelling === booking.id || deleting === booking.id ? (
                        <Spinner className="w-4 h-4" />
                      ) : (
                        <>
                          <a
                            href={`whatsapp://send?phone=6${booking.phone.replace(/\D/g, '')}`}
                            className="shrink-0 w-8 h-8 flex items-center justify-center rounded-full border border-green-300 text-green-500 hover:border-green-500 transition-colors"
                            aria-label="WhatsApp"
                          >
                            <Icon name="whatsapp" className="w-4 h-4" />
                          </a>
                          <span className="text-xs font-medium text-zinc-500">
                            {confirmId.action === 'cancel' ? 'Cancel?' : 'Delete?'}
                          </span>
                          <button
                            onClick={() => {
                              if (confirmId.action === 'cancel') handleCancel(booking.id)
                              else handleDelete(booking.id)
                            }}
                            className="px-2.5 py-1 rounded-lg bg-red-500 text-white text-xs font-medium hover:bg-red-600 transition-colors cursor-pointer flex items-center justify-center min-w-[36px]"
                          >
                            Yes
                          </button>
                          <button
                            onClick={() => setConfirmId(null)}
                            className="px-2.5 py-1 rounded-lg border border-zinc-200 text-zinc-500 text-xs font-medium hover:border-zinc-400 transition-colors cursor-pointer"
                          >
                            No
                          </button>
                        </>
                      )}
                    </div>
                  ) : (
                    <div className="flex items-center gap-1.5 shrink-0">
                      <a
                        href={`whatsapp://send?phone=6${booking.phone.replace(/\D/g, '')}`}
                        className="shrink-0 w-8 h-8 flex items-center justify-center rounded-full border border-green-300 text-green-500 hover:border-green-500 transition-colors"
                        aria-label="WhatsApp"
                      >
                        <Icon name="whatsapp" className="w-4 h-4" />
                      </a>
                      {booking.status === 'active' && (
                        <button
                          onClick={() => setConfirmId({ id: booking.id, action: 'cancel' })}
                          className="shrink-0 w-8 h-8 flex items-center justify-center rounded-full border border-red-300 text-red-500 hover:border-red-500 transition-colors cursor-pointer"
                          aria-label="Cancel booking"
                        >
                          <Icon name="cancel" className="w-4 h-4" />
                        </button>
                      )}
                      {booking.status === 'cancelled' && (
                        <button
                          onClick={() => setConfirmId({ id: booking.id, action: 'delete' })}
                          className="shrink-0 w-8 h-8 flex items-center justify-center rounded-full border border-red-300 text-red-500 hover:border-red-500 transition-colors cursor-pointer"
                          aria-label="Delete booking"
                        >
                          <Icon name="trash" className="w-4 h-4" />
                        </button>
                      )}
                    </div>
                  )}
                </Card>
              </li>
            ))}
          </ul>
        )}
      </Collapsible>

      {/* Manage Shop Hours */}
      <Collapsible label="Manage Shop Hours">
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
          <div className="bg-white border border-zinc-200 rounded-2xl px-3 py-5 mb-4">
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
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-4">
                <div>
                  <label className="block text-xs font-medium text-zinc-500 mb-1.5">Opens at</label>
                  <TimePicker
                    value={editValues.start_time}
                    onChange={(v) => setEditValues((prev) => prev ? { ...prev, start_time: v } : prev)}
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-zinc-500 mb-1.5">Closes at</label>
                  <TimePicker
                    value={editValues.end_time}
                    onChange={(v) => setEditValues((prev) => prev ? { ...prev, end_time: v } : prev)}
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
      </div>

      <div className="fixed bottom-6 right-6">
        <Link
          href="/"
          className="w-12 h-12 flex items-center justify-center rounded-full bg-zinc-200 text-zinc-500 shadow-sm hover:bg-zinc-300 transition-colors"
          aria-label="View booking page"
        >
          <Icon name="home" className="w-5 h-5" />
        </Link>
      </div>
    </PageLayout>
  )
}

export default dynamic(() => Promise.resolve({ default: AdminDashboardPage }), { ssr: false })
