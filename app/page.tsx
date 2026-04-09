'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { getLocalDateString, formatSlot } from '@/lib/format'
import { PageLayout } from '@/components/ui/PageLayout'
import { Collapsible } from '@/components/ui/Collapsible'
import { SectionLabel } from '@/components/ui/SectionLabel'
import { FormField } from '@/components/ui/FormField'
import { Button } from '@/components/ui/Button'
import { Spinner } from '@/components/ui/Spinner'

function LookupForm({
  type,
  value,
  onChange,
  placeholder,
  onSubmit,
  disabled,
}: {
  type: string
  value: string
  onChange: (e: React.ChangeEvent<HTMLInputElement>) => void
  placeholder: string
  onSubmit: () => void
  disabled: boolean
}) {
  return (
    <form onSubmit={(e) => { e.preventDefault(); onSubmit() }} className="flex gap-2">
      <input
        type={type}
        value={value}
        onChange={onChange}
        placeholder={placeholder}
        className="flex-1 px-4 py-3 rounded-xl border border-zinc-200 text-zinc-900 placeholder:text-zinc-400 focus:outline-none focus:border-zinc-500 bg-white text-sm"
      />
      <button
        type="submit"
        disabled={disabled || !value.trim()}
        className="px-5 py-3 rounded-xl bg-zinc-900 text-white font-semibold text-sm disabled:opacity-40 cursor-pointer transition-opacity"
      >
        Find
      </button>
    </form>
  )
}

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
  const [dates, setDates] = useState<{ dateStr: string; label: string; dayName: string }[]>([])
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

  const [isOpen, setIsOpen] = useState<boolean | null>(null)
  const [hoursLabel, setHoursLabel] = useState<string | null>(null)
  const [shopName, setShopName] = useState<string | null>(null)

  useEffect(() => {
    fetch('/api/status')
      .then((r) => r.json())
      .then((d) => {
        setIsOpen(d.open)
        setDates(generateDateRange(d.bookingWindow ?? 14))
        setShopName(d.shopName ?? null)
        if (d.hours) {
          const fmt = (t: string) => {
            const [h, m] = t.slice(0, 5).split(':').map(Number)
            const suffix = h >= 12 ? 'PM' : 'AM'
            const hour = h % 12 || 12
            return m === 0 ? `${hour} ${suffix}` : `${hour}:${String(m).padStart(2, '0')} ${suffix}`
          }
          setHoursLabel(`${fmt(d.hours.start)} – ${fmt(d.hours.end)}`)
        }
      })
      .catch(() => {})
  }, [])

  const [availability, setAvailability] = useState<Record<string, boolean>>({})

  useEffect(() => {
    if (dates.length === 0) return
    fetch(`/api/availability?dates=${dates.map((d) => d.dateStr).join(',')}`)
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

  useEffect(() => {
    if (!selectedDate) return
    setSlotsLoading(true)
    setSlotsError('')
    setSlots([])
    setBookedSlots([])
    setSelectedSlot('')
    setBookedSlotClicked('')

    fetch(`/api/slots?date=${selectedDate}`)
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
      router.push(`/booking/${data.id}`)
    } catch {
      setSubmitError('Something went wrong. Please try again.')
    } finally {
      setSubmitting(false)
    }
  }

  async function handleManageLookup(param: 'phone' | 'code', value: string) {
    setManageError('')
    setManageLooking(true)
    try {
      const res = await fetch(`/api/bookings/lookup?${param}=${encodeURIComponent(value.trim())}`)
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
        <p className="text-zinc-400 text-sm mb-1.5">{todayLabel}</p>
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

      <div className="flex flex-col sm:gap-3 pb-24">
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
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
                  </svg>
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
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
                  </svg>
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
                  placeholder="012 345 6789"
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
          <LookupForm
            type="tel"
            value={managePhone}
            onChange={(e) => setManagePhone(e.target.value)}
            placeholder="Phone number"
            onSubmit={() => handleManageLookup('phone', managePhone)}
            disabled={manageLooking}
          />

          {manageError && <p className="text-red-500 text-sm">{manageError}</p>}
        </div>
      </Collapsible>
      </div>

      <div className="fixed bottom-6 right-6 flex flex-col gap-2">
        {process.env.NEXT_PUBLIC_SHOP_WHATSAPP && (
          <a
            href={`https://wa.me/${process.env.NEXT_PUBLIC_SHOP_WHATSAPP}`}
            target="_blank"
            rel="noopener noreferrer"
            className="w-12 h-12 flex items-center justify-center rounded-full bg-[#25D366] text-white shadow-lg hover:bg-[#1ebe5d] transition-colors"
            aria-label="Contact on WhatsApp"
          >
            <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
              <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" />
            </svg>
          </a>
        )}
        {process.env.NEXT_PUBLIC_SHOP_COORDINATES && (
          <a
            href={`https://maps.google.com/maps?q=${process.env.NEXT_PUBLIC_SHOP_COORDINATES}`}
            target="_blank"
            rel="noopener noreferrer"
            className="w-12 h-12 flex items-center justify-center rounded-full bg-zinc-900 text-white shadow-lg hover:bg-zinc-700 transition-colors"
            aria-label="View shop location"
          >
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 2C8.686 2 6 4.686 6 8c0 4.5 6 12 6 12s6-7.5 6-12c0-3.314-2.686-6-6-6z" />
              <circle cx="12" cy="8" r="2" fill="currentColor" stroke="none" />
            </svg>
          </a>
        )}
      </div>
    </PageLayout>
  )
}
