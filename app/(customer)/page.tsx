'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import dynamic from 'next/dynamic'
import { getLocalDateString, formatSlot } from '@/lib/utils'
import { PageLayout } from '@/components/PageLayout'
import { Collapsible } from '@/components/Collapsible'
import { SectionLabel } from '@/components/SectionLabel'
import { FormField } from '@/components/FormField'
import { Button } from '@/components/Button'
import { Spinner } from '@/components/Spinner'
import { Icon } from '@/components/Icon'


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

// Reads the last-known shop status from localStorage so the header renders instantly on refresh
function readStatusCache(): { open: boolean; shopName: string | null; shopPhone: string | null; hoursLabel: string | null; bookingWindow: number } | null {
  try {
    const raw = localStorage.getItem('shop_status')
    return raw ? JSON.parse(raw) : null
  } catch { return null }
}

function BookingPage() {
  const router = useRouter()
  const [dates, setDates] = useState<{ dateStr: string; label: string; dayName: string }[]>(
    () => generateDateRange(readStatusCache()?.bookingWindow ?? 14)
  )
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

  useEffect(() => {
    const el = dateScrollRef.current
    if (!el) return
    updateScrollButtons()
    el.addEventListener('scroll', updateScrollButtons)
    return () => el.removeEventListener('scroll', updateScrollButtons)
  }, [scrollMounted, dates])

  const [isOpen, setIsOpen] = useState<boolean | null>(() => readStatusCache()?.open ?? null)
  const [hoursLabel, setHoursLabel] = useState<string | null>(() => readStatusCache()?.hoursLabel ?? null)
  const [shopName, setShopName] = useState<string | null>(() => readStatusCache()?.shopName ?? null)
  const [shopPhone, setShopPhone] = useState<string | null>(() => readStatusCache()?.shopPhone ?? null)

  // On mount: fetch fresh shop status in background and update cache if anything changed
  useEffect(() => {
    fetch('/api/customer/status')
      .then((r) => r.json())
      .then((d) => {
        const fmt = (t: string) => {
          const [h, m] = t.slice(0, 5).split(':').map(Number)
          const suffix = h >= 12 ? 'PM' : 'AM'
          const hour = h % 12 || 12
          return m === 0 ? `${hour} ${suffix}` : `${hour}:${String(m).padStart(2, '0')} ${suffix}`
        }
        const hl = d.hours ? `${fmt(d.hours.start)} – ${fmt(d.hours.end)}` : null
        const bookingWindow = d.bookingWindow ?? 14

        setIsOpen(d.open)
        setDates(generateDateRange(bookingWindow))
        setShopName(d.shopName ?? null)
        setShopPhone(d.shopPhone ?? null)
        setHoursLabel(hl)

        try {
          localStorage.setItem('shop_status', JSON.stringify({
            open: d.open,
            shopName: d.shopName ?? null,
            shopPhone: d.shopPhone ?? null,
            hoursLabel: hl,
            bookingWindow,
          }))
        } catch {}
      })
      .catch(() => {})
  }, [])

  const [availability, setAvailability] = useState<Record<string, boolean>>({})

  // Batch-fetches availability for all dates at once — powers the green/red dots on the date strip
  useEffect(() => {
    if (dates.length === 0) return
    fetch(`/api/customer/availability?dates=${dates.map((d) => d.dateStr).join(',')}`)
      .then((r) => r.json())
      .then(setAvailability)
      .catch(() => {})
  }, [dates])

  const [selectedDate, setSelectedDate] = useState('')
  const [slots, setSlots] = useState<string[]>([])
  const [slotsLoading, setSlotsLoading] = useState(false)
  const [slotsError, setSlotsError] = useState('')
  const [bookedSlots, setBookedSlots] = useState<string[]>([])
  const [selectedSlot, setSelectedSlot] = useState('')
  const [bookedSlotClicked, setBookedSlotClicked] = useState('')
  const [name, setName] = useState('')
  const [phone, setPhone] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [submitError, setSubmitError] = useState('')

  const [managePhone, setManagePhone] = useState('')
  const [manageError, setManageError] = useState('')
  const [manageLooking, setManageLooking] = useState(false)

  // Fetches available and already-booked slots whenever the selected date changes
  useEffect(() => {
    if (!selectedDate) return
    setSlotsLoading(true)
    setSlotsError('')
    setSlots([])
    setBookedSlots([])
    setSelectedSlot('')
    setBookedSlotClicked('')

    fetch(`/api/customer/slots?date=${selectedDate}`)
      .then((r) => r.json())
      .then((data) => {
        if (data.error) setSlotsError(data.error)
        else {
          setSlots(data.slots)
          setBookedSlots(data.bookedSlots ?? [])
        }
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
      const res = await fetch('/api/customer/bookings', {
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
      router.push(`/booking/${data.id}`)
    } catch {
      setSubmitError('Something went wrong. Please try again.')
    } finally {
      setSubmitting(false)
    }
  }

  // Looks up the most recent active booking by phone number and redirects to its detail page
  async function handleManageLookup(param: 'phone' | 'code', value: string) {
    setManageError('')
    setManageLooking(true)
    try {
      const res = await fetch(`/api/customer/bookings/lookup?${param}=${encodeURIComponent(value.trim())}`)
      const data = await res.json()
      if (!res.ok) { setManageError(data.error ?? 'Not found'); return }
      window.location.href = `/booking/${data.id}`
    } catch {
      setManageError('Something went wrong. Please try again.')
    } finally {
      setManageLooking(false)
    }
  }

  const todayLabel = (() => {
    const d = new Date()
    const wd = d.toLocaleDateString('en-GB', { weekday: 'long' })
    const day = d.getDate()
    const mo = d.toLocaleDateString('en-GB', { month: 'long' })
    return `${wd}, ${day} ${mo}`
  })()

  return (
    <PageLayout>
      <div className="px-5 pt-8 pb-6">
        <div className="h-8 flex items-center mb-1.5">
          <p className="text-zinc-400 text-sm">{todayLabel}</p>
        </div>
        <h1 className="text-[1.6rem] font-bold text-zinc-900 leading-tight mb-3">
          {shopName ? `Welcome to ${shopName}` : 'Welcome'}
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

      <div className="border-t border-zinc-200 sm:border-t-0 flex flex-col sm:gap-3 pb-24">
      <Collapsible label="Book an Appointment">
        <div className="flex flex-col gap-8">
          {/* Date strip */}
          <section>
            <SectionLabel>Select a date</SectionLabel>
            <div className="relative">
              {canScrollLeft && (
                <button
                  onClick={() => dateScrollRef.current?.scrollBy({ left: -180, behavior: 'smooth' })}
                  className="absolute left-0 top-1/2 -translate-y-1/2 z-10 w-8 h-8 flex items-center justify-center rounded-full border border-zinc-200 bg-white text-zinc-500 hover:border-zinc-400 cursor-pointer"
                  aria-label="Scroll left"
                >
                  <Icon name="chevron-left" className="w-4 h-4" />
                </button>
              )}
              <div ref={scrollRefCallback} className="flex gap-2 overflow-x-auto pb-2 scrollbar-none">
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
                    {dateStr in availability && (
                      <span className={`mt-1 w-1.5 h-1.5 rounded-full ${availability[dateStr] ? 'bg-green-400' : 'bg-red-400'}`} />
                    )}
                  </button>
                ))}
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
          </section>

          {/* Slot grid */}
          {selectedDate && (
            <section>
              <SectionLabel>Select a time</SectionLabel>
              {slotsLoading && (
                <div className="flex justify-center py-4">
                  <Spinner />
                </div>
              )}
              {slotsError && (
                <p className="text-red-500 text-sm">{slotsError}</p>
              )}
              {!slotsLoading && !slotsError && slots.length === 0 && bookedSlots.length === 0 && (
                <p className="text-zinc-400 text-sm">No availability for this day.</p>
              )}
              {!slotsLoading && (slots.length > 0 || bookedSlots.length > 0) && (
                <>
                  <div className="grid grid-cols-3 gap-2">
                    {[...slots, ...bookedSlots]
                      .sort()
                      .map((slot) => {
                        const isBooked = bookedSlots.includes(slot)
                        const isSelected = selectedSlot === slot
                        return (
                          <button
                            key={slot}
                            onClick={() => {
                              if (isBooked) {
                                setBookedSlotClicked(slot)
                              } else {
                                setSelectedSlot(slot)
                                setBookedSlotClicked('')
                              }
                            }}
                            className={`py-2.5 rounded-xl border text-sm font-medium transition-colors cursor-pointer ${
                              isSelected
                                ? 'bg-zinc-900 border-zinc-900 text-white'
                                : isBooked
                                ? 'bg-white border-red-300 text-red-400'
                                : 'bg-white border-green-300 text-zinc-700 hover:border-green-400'
                            }`}
                          >
                            {formatSlot(slot)}
                          </button>
                        )
                      })}
                  </div>
                  {bookedSlotClicked && (
                    <p className="text-red-500 text-sm mt-2">
                      {formatSlot(bookedSlotClicked)} is already booked. Please choose another time.
                    </p>
                  )}
                </>
              )}
            </section>
          )}

          {/* Booking form */}
          {selectedSlot && (
            <section>
              <SectionLabel>Your details</SectionLabel>
              <form onSubmit={handleSubmit} className="flex flex-col gap-4">
                <FormField
                  label="Name"
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Joecone"
                  required
                  maxLength={100}
                />
                <FormField
                  label="Phone Number"
                  type="tel"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="01X-XXX XXXX"
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
        </div>
      </Collapsible>

      <Collapsible label="Manage Booking">
        <div className="flex flex-col gap-4">
          <form onSubmit={(e) => { e.preventDefault(); handleManageLookup('phone', managePhone) }} className="flex gap-2">
            <input
              type="tel"
              value={managePhone}
              onChange={(e) => setManagePhone(e.target.value)}
              placeholder="01X-XXX XXXX"
              maxLength={20}
              className="flex-1 px-4 py-3 rounded-xl border border-zinc-200 text-zinc-900 placeholder:text-zinc-400 focus:outline-none focus:border-zinc-500 bg-white text-sm"
            />
            <button
              type="submit"
              disabled={manageLooking || !managePhone.trim()}
              className="px-5 py-3 rounded-xl bg-zinc-900 text-white font-semibold text-sm disabled:opacity-40 cursor-pointer transition-opacity"
            >
              Find
            </button>
          </form>

          {manageError && <p className="text-red-500 text-sm">{manageError}</p>}
        </div>
      </Collapsible>
      </div>

      <div className="fixed bottom-6 right-6 flex flex-col gap-2">
        {shopPhone && (
          <a
            href={`whatsapp://send?phone=6${shopPhone?.replace(/\D/g, '')}`}
            target="_blank"
            rel="noopener noreferrer"
            className="w-12 h-12 flex items-center justify-center rounded-full bg-[#25D366] text-white shadow-lg hover:bg-[#1ebe5d] transition-colors"
            aria-label="Contact on WhatsApp"
          >
            <Icon name="whatsapp" className="w-5 h-5" />
          </a>
        )}
        <a
          href="https://maps.app.goo.gl/EvuqEoACapokfbts5"
          target="_blank"
          rel="noopener noreferrer"
          className="w-12 h-12 flex items-center justify-center rounded-full bg-zinc-900 text-white shadow-lg hover:bg-zinc-700 transition-colors"
          aria-label="View shop location"
        >
          <Icon name="map-pin" className="w-5 h-5" />
        </a>
        <a
          href="/dashboard"
          className="w-12 h-12 flex items-center justify-center rounded-full bg-zinc-200 text-zinc-500 shadow-sm hover:bg-zinc-300 transition-colors"
          aria-label="Admin"
        >
          <Icon name="lock" className="w-5 h-5" />
        </a>
      </div>
    </PageLayout>
  )
}

export default dynamic(() => Promise.resolve({ default: BookingPage }), { ssr: false })
