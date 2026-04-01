'use client'

import { useState, useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { getLocalDateString, formatSlot } from '@/lib/format'
import { PageLayout } from '@/components/ui/PageLayout'
import { Card } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'

function formatDateHeading(dateStr: string): string {
  const [y, m, d] = dateStr.split('-').map(Number)
  return new Date(y, m - 1, d).toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })
}

type Booking = {
  id: string
  name: string
  phone: string
  date: string
  slot: string
  status: 'active' | 'cancelled'
}

const today = getLocalDateString(new Date())

function addDays(dateStr: string, n: number): string {
  const [y, m, d] = dateStr.split('-').map(Number)
  const date = new Date(y, m - 1, d)
  date.setDate(date.getDate() + n)
  return getLocalDateString(date)
}

export default function AdminDashboardPage() {
  const router = useRouter()
  const [selectedDate, setSelectedDate] = useState(today)
  const [bookings, setBookings] = useState<Booking[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [cancelling, setCancelling] = useState<string | null>(null)

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

  async function handleLogout() {
    await fetch('/api/admin/logout', { method: 'POST' })
    router.push('/admin/login')
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
            className="px-3 py-2 rounded-xl border border-zinc-200 bg-white text-zinc-700 text-sm font-medium hover:border-zinc-400 transition-colors"
          >
            Settings
          </Link>
          <Button variant="ghost" onClick={handleLogout}>Logout</Button>
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
                <Card
                  className={`px-4 py-4 flex items-center justify-between gap-4 ${
                    booking.status === 'cancelled' ? 'border-zinc-100 opacity-50' : ''
                  }`}
                >
                  <div className="min-w-0">
                    <div className="flex items-center gap-2 mb-0.5">
                      <span className="text-sm font-semibold text-zinc-900 truncate">
                        {booking.name}
                      </span>
                      {booking.status === 'cancelled' && (
                        <span className="text-xs text-zinc-400 font-medium shrink-0">Cancelled</span>
                      )}
                    </div>
                    <p className="text-sm text-zinc-500">{formatSlot(booking.slot.slice(0, 5))}</p>
                    <p className="text-xs text-zinc-400 mt-0.5">{booking.phone}</p>
                  </div>

                  {booking.status === 'active' && (
                    <Button
                      variant="ghost-destructive"
                      onClick={() => handleCancel(booking.id)}
                      disabled={cancelling === booking.id}
                      className="shrink-0"
                    >
                      {cancelling === booking.id ? 'Cancelling…' : 'Cancel'}
                    </Button>
                  )}
                </Card>
              </li>
            ))}
          </ul>
        </>
      )}
    </PageLayout>
  )
}
