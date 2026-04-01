'use client'

import { useState, useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { getLocalDateString, formatSlot } from '@/lib/format'
import { PageLayout } from '@/components/ui/PageLayout'
import { PageHeader } from '@/components/ui/PageHeader'
import { SectionLabel } from '@/components/ui/SectionLabel'
import { FormField } from '@/components/ui/FormField'
import { Button } from '@/components/ui/Button'

function generateDateRange(days: number): { dateStr: string; label: string; dayName: string }[] {
  const today = new Date()
  return Array.from({ length: days }, (_, i) => {
    const d = new Date(today)
    d.setDate(today.getDate() + i)
    return {
      dateStr: getLocalDateString(d),
      label: String(d.getDate()),
      dayName: d.toLocaleDateString('en-US', { weekday: 'short' }),
    }
  })
}

export default function BookingPage() {
  const router = useRouter()
  const [dates] = useState(() => generateDateRange(14))
  const dateScrollRef = useRef<HTMLDivElement>(null)
  const [canScrollLeft, setCanScrollLeft] = useState(false)
  const [canScrollRight, setCanScrollRight] = useState(true)

  function updateScrollButtons() {
    const el = dateScrollRef.current
    if (!el) return
    setCanScrollLeft(el.scrollLeft > 0)
    setCanScrollRight(el.scrollLeft + el.clientWidth < el.scrollWidth - 1)
  }

  useEffect(() => {
    const el = dateScrollRef.current
    if (!el) return
    updateScrollButtons()
    el.addEventListener('scroll', updateScrollButtons)
    return () => el.removeEventListener('scroll', updateScrollButtons)
  }, [])

  const [selectedDate, setSelectedDate] = useState('')
  const [slots, setSlots] = useState<string[]>([])
  const [slotsLoading, setSlotsLoading] = useState(false)
  const [slotsError, setSlotsError] = useState('')

  const [selectedSlot, setSelectedSlot] = useState('')
  const [name, setName] = useState('')
  const [phone, setPhone] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [submitError, setSubmitError] = useState('')

  useEffect(() => {
    if (!selectedDate) return
    setSlotsLoading(true)
    setSlotsError('')
    setSlots([])
    setSelectedSlot('')

    fetch(`/api/slots?date=${selectedDate}`)
      .then((r) => r.json())
      .then((data) => {
        if (data.error) setSlotsError(data.error)
        else setSlots(data.slots)
      })
      .catch(() => setSlotsError('Failed to load available times'))
      .finally(() => setSlotsLoading(false))
  }, [selectedDate])

  async function handleSubmit(e: { preventDefault(): void }) {
    e.preventDefault()
    if (!selectedDate || !selectedSlot || !name.trim() || !phone.trim()) return

    setSubmitting(true)
    setSubmitError('')

    try {
      const res = await fetch('/api/bookings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          date: selectedDate,
          slot: selectedSlot,
          name: name.trim(),
          phone: phone.trim(),
        }),
      })
      const data = await res.json()
      if (!res.ok) {
        setSubmitError(data.error ?? 'Something went wrong. Please try again.')
        return
      }
      router.push(`/confirmation/${data.id}`)
    } catch {
      setSubmitError('Something went wrong. Please try again.')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <PageLayout>
      <PageHeader
        title="Book a Haircut"
        subtitle="Pick a date and time that works for you."
        className="mb-8"
      />

      {/* Date strip */}
      <section className="mb-8">
        <SectionLabel>Select a date</SectionLabel>
        <div className="relative flex items-center gap-2">
          {canScrollLeft && (
            <button
              onClick={() => dateScrollRef.current?.scrollBy({ left: -180, behavior: 'smooth' })}
              className="flex-shrink-0 w-8 h-8 flex items-center justify-center rounded-full border border-zinc-200 bg-white text-zinc-500 hover:border-zinc-400 cursor-pointer"
              aria-label="Scroll left"
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
              </svg>
            </button>
          )}

          <div ref={dateScrollRef} className="flex gap-2 overflow-x-auto pb-2 scrollbar-none">
            {dates.map(({ dateStr, label, dayName }) => (
              <button
                key={dateStr}
                onClick={() => setSelectedDate(dateStr)}
                className={`flex flex-col items-center min-w-[52px] py-2.5 px-1 rounded-xl border text-sm transition-colors cursor-pointer ${
                  selectedDate === dateStr
                    ? 'bg-zinc-900 border-zinc-900 text-white'
                    : 'bg-white border-zinc-200 text-zinc-700 hover:border-zinc-400'
                }`}
              >
                <span className="text-xs font-medium">{dayName}</span>
                <span className="text-base font-bold mt-0.5">{label}</span>
              </button>
            ))}
          </div>

          {canScrollRight && (
            <button
              onClick={() => dateScrollRef.current?.scrollBy({ left: 180, behavior: 'smooth' })}
              className="flex-shrink-0 w-8 h-8 flex items-center justify-center rounded-full border border-zinc-200 bg-white text-zinc-500 hover:border-zinc-400 cursor-pointer"
              aria-label="Scroll right"
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
              </svg>
            </button>
          )}
        </div>
      </section>

      {/* Slot grid */}
      {selectedDate && (
        <section className="mb-8">
          <SectionLabel>Select a time</SectionLabel>

          {slotsLoading && (
            <p className="text-zinc-400 text-sm">Loading available times…</p>
          )}
          {slotsError && (
            <p className="text-red-500 text-sm">{slotsError}</p>
          )}
          {!slotsLoading && !slotsError && slots.length === 0 && (
            <p className="text-zinc-400 text-sm">No availability for this day.</p>
          )}
          {!slotsLoading && slots.length > 0 && (
            <div className="grid grid-cols-3 gap-2">
              {slots.map((slot) => (
                <button
                  key={slot}
                  onClick={() => setSelectedSlot(slot)}
                  className={`py-2.5 rounded-xl border text-sm font-medium transition-colors cursor-pointer ${
                    selectedSlot === slot
                      ? 'bg-zinc-900 border-zinc-900 text-white'
                      : 'bg-white border-zinc-200 text-zinc-700 hover:border-zinc-400'
                  }`}
                >
                  {formatSlot(slot)}
                </button>
              ))}
            </div>
          )}
        </section>
      )}

      {/* Booking form */}
      {selectedSlot && (
        <section>
          <SectionLabel>Your details</SectionLabel>
          <form onSubmit={handleSubmit} className="flex flex-col gap-4">
            <FormField
              label="Full name"
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Ahmed Al-Rashid"
              required
              maxLength={100}
            />
            <FormField
              label="Phone number"
              type="tel"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              placeholder="+1 555 000 0000"
              required
              maxLength={20}
            />

            {submitError && (
              <p className="text-red-500 text-sm">{submitError}</p>
            )}

            <Button type="submit" disabled={submitting} className="w-full">
              {submitting ? 'Booking…' : 'Confirm Booking'}
            </Button>
          </form>
        </section>
      )}

      {/* Find existing booking */}
      <FindBooking />
    </PageLayout>
  )
}

function FindBooking() {
  const [id, setId] = useState('')

  function handleSubmit(e: { preventDefault(): void }) {
    e.preventDefault()
    const trimmed = id.trim()
    if (trimmed) window.location.href = `/booking/${trimmed}`
  }

  return (
    <section className="mt-10 pt-8 border-t border-zinc-200">
      <SectionLabel>Manage existing booking</SectionLabel>
      <form onSubmit={handleSubmit} className="flex gap-2">
        <input
          type="text"
          value={id}
          onChange={(e) => setId(e.target.value)}
          placeholder="Enter your booking ID"
          className="flex-1 px-4 py-3 rounded-xl border border-zinc-200 text-zinc-900 placeholder:text-zinc-400 focus:outline-none focus:border-zinc-500 bg-white text-sm"
        />
        <button
          type="submit"
          disabled={!id.trim()}
          className="px-5 py-3 rounded-xl bg-zinc-900 text-white font-semibold text-sm disabled:opacity-40 cursor-pointer transition-opacity"
        >
          Go
        </button>
      </form>
    </section>
  )
}
