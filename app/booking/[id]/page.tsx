'use client'

import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { formatDate, formatSlot } from '@/lib/format'
import { PageLayout } from '@/components/ui/PageLayout'
import { Card } from '@/components/ui/Card'
import { BookingDetailRow } from '@/components/ui/BookingDetailRow'
import { Button } from '@/components/ui/Button'
import { ConfirmPanel } from '@/components/ui/ConfirmPanel'

function buildWhatsAppLink(customerName: string, date: string, slot: string, id: string, shopPhone: string, shopName: string): string {
  const bookingUrl = `${window.location.origin}/booking/${id}`
  const message = [
    `Hi ${shopName || 'barbershop'}, I booked a haircut appointment.`,
    '',
    `Name: ${customerName}`,
    `Date: ${formatDate(date)}`,
    `Time: ${formatSlot(slot)}`,
    `Booking: ${bookingUrl}`,
  ].join('\n')
  return `https://wa.me/${shopPhone}?text=${encodeURIComponent(message)}`
}

type Booking = {
  id: string
  name: string
  phone: string
  date: string
  slot: string
  status: string
}

type Shop = {
  shop_name?: string
  shop_phone?: string
}

export default function BookingPage() {
  const { id } = useParams<{ id: string }>()
  const router = useRouter()

  const [booking, setBooking] = useState<Booking | null>(null)
  const [shop, setShop] = useState<Shop>({})
  const [loading, setLoading] = useState(true)
  const [notFound, setNotFound] = useState(false)

  const [cancelling, setCancelling] = useState(false)
  const [cancelled, setCancelled] = useState(false)
  const [cancelError, setCancelError] = useState('')
  const [confirmOpen, setConfirmOpen] = useState(false)

  useEffect(() => {
    fetch(`/api/bookings/${id}`)
      .then((r) => r.json())
      .then((data) => {
        if (data.error || !data.booking) {
          setNotFound(true)
        } else {
          setBooking(data.booking)
          setShop(data.shop ?? {})
          if (data.booking.status === 'cancelled') setCancelled(true)
        }
      })
      .catch(() => setNotFound(true))
      .finally(() => setLoading(false))
  }, [id])

  async function handleCancel() {
    setCancelling(true)
    setCancelError('')
    try {
      const res = await fetch(`/api/bookings/${id}`, { method: 'DELETE' })
      const data = await res.json()
      if (!res.ok) {
        setCancelError(data.error ?? 'Failed to cancel booking.')
        return
      }
      setCancelled(true)
      setConfirmOpen(false)
    } catch {
      setCancelError('Something went wrong. Please try again.')
    } finally {
      setCancelling(false)
    }
  }

  if (loading) {
    return (
      <PageLayout centered>
        <p className="text-zinc-400 text-sm text-center">Loading…</p>
      </PageLayout>
    )
  }

  if (notFound || !booking) {
    return (
      <PageLayout centered>
        <div className="text-center">
          <p className="text-zinc-900 font-semibold text-lg mb-1">Booking not found</p>
          <p className="text-zinc-500 text-sm mb-6">This link may be invalid or expired.</p>
          <a href="/" className="text-sm text-zinc-600 underline underline-offset-2">
            Book a new appointment
          </a>
        </div>
      </PageLayout>
    )
  }

  const waLink = buildWhatsAppLink(booking.name, booking.date, booking.slot, booking.id, shop.shop_phone ?? '', shop.shop_name ?? '')

  return (
    <PageLayout>
      <div className="px-4 pt-6">
        <button
          onClick={() => router.push('/')}
          className="flex items-center gap-1.5 text-sm text-zinc-500 hover:text-zinc-800 mb-6 cursor-pointer"
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
          </svg>
          Back
        </button>

        {/* Status indicator */}
        <div className="flex flex-col items-center text-center mb-8">
          <div className={`w-16 h-16 rounded-full flex items-center justify-center mb-4 ${cancelled ? 'bg-zinc-200' : 'bg-zinc-900'}`}>
            {cancelled ? (
              <svg className="w-8 h-8 text-zinc-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
              </svg>
            ) : (
              <svg className="w-8 h-8 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
              </svg>
            )}
          </div>
          <h1 className="text-2xl font-bold text-zinc-900">
            {cancelled ? 'Appointment cancelled' : "You're booked!"}
          </h1>
          <p className="text-zinc-500 text-sm mt-1">
            {cancelled ? 'This appointment has been cancelled.' : 'See you soon.'}
          </p>
        </div>
      </div>

      <div className="bg-white border-y border-zinc-200 sm:border sm:rounded-2xl sm:mx-4 divide-y divide-zinc-100 mb-0">
        <BookingDetailRow label="Name" value={booking.name} />
        <BookingDetailRow label="Date" value={formatDate(booking.date)} />
        <BookingDetailRow label="Time" value={formatSlot(booking.slot)} />
        <BookingDetailRow
          label="Status"
          value={cancelled ? 'Cancelled' : 'Confirmed'}
          valueClassName={`text-sm font-medium ${cancelled ? 'text-red-500' : 'text-green-600'}`}
        />
      </div>

      <div className="px-4 pt-5 pb-8 flex flex-col gap-3">
        {!cancelled && (
          <>
            <a
              href={waLink}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center justify-center gap-2.5 w-full py-3.5 rounded-xl bg-[#25D366] text-white font-semibold text-sm"
            >
              <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" />
              </svg>
              Notify barber via WhatsApp
            </a>

            {!confirmOpen ? (
              <Button variant="secondary" onClick={() => setConfirmOpen(true)} className="w-full">
                Cancel appointment
              </Button>
            ) : (
              <Card className="p-5">
                <ConfirmPanel
                  title="Cancel this appointment?"
                  description="This cannot be undone."
                  confirmLabel={cancelling ? 'Cancelling…' : 'Yes, cancel'}
                  cancelLabel="Keep it"
                  onConfirm={handleCancel}
                  onCancel={() => { setConfirmOpen(false); setCancelError('') }}
                  disabled={cancelling}
                  error={cancelError}
                />
              </Card>
            )}
          </>
        )}

        {cancelled && (
          <a
            href="/"
            className="block w-full py-3.5 px-4 rounded-xl bg-zinc-900 text-white font-semibold text-sm text-center"
          >
            Book a new appointment
          </a>
        )}
      </div>
    </PageLayout>
  )
}
