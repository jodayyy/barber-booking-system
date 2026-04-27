'use client'

import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { formatDate, formatSlot } from '@/lib/utils'
import { PageLayout } from '@/components/PageLayout'
import { Card } from '@/components/Card'
import { BookingDetailRow } from '@/components/BookingDetailRow'
import { Button } from '@/components/Button'
import { ConfirmPanel } from '@/components/ConfirmPanel'
import { Spinner } from '@/components/Spinner'
import { Icon } from '@/components/Icon'

// Builds a deep-link that opens WhatsApp with a pre-filled message containing the booking details
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
  const digits = shopPhone.replace(/\D/g, '')
  return `whatsapp://send?phone=6${digits}&text=${encodeURIComponent(message)}`
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

  // Fetches booking details and shop info (name, phone) together from the API
  useEffect(() => {
    fetch(`/api/customer/bookings/${id}`)
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
      const res = await fetch(`/api/customer/bookings/${id}`, { method: 'DELETE' })
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

  const waLink = booking
    ? buildWhatsAppLink(booking.name, booking.date, booking.slot, booking.id, shop.shop_phone ?? '', shop.shop_name ?? '')
    : ''

  return (
    <PageLayout>
      <div className="px-4 pt-6">
        <button
          onClick={() => router.push('/')}
          className="flex items-center gap-1.5 text-sm text-zinc-500 hover:text-zinc-800 mb-6 cursor-pointer"
        >
          <Icon name="chevron-left" className="w-4 h-4" />
          Back
        </button>

        {loading && (
          <div className="flex justify-center py-16">
            <Spinner />
          </div>
        )}

        {!loading && (notFound || !booking) && (
          <div className="text-center pt-16">
            <p className="text-zinc-900 font-semibold text-lg mb-1">Booking not found</p>
            <p className="text-zinc-500 text-sm mb-6">This link may be invalid or expired.</p>
            <a href="/" className="text-sm text-zinc-600 underline underline-offset-2">
              Book a new appointment
            </a>
          </div>
        )}
      </div>

      {!loading && booking && (
        <>
          {/* Status indicator */}
          <div className="px-4 flex flex-col items-center text-center mb-8">
            <div className={`w-16 h-16 rounded-full flex items-center justify-center mb-4 ${cancelled ? 'bg-zinc-200' : 'bg-zinc-900'}`}>
              {cancelled ? (
                <Icon name="x" className="w-8 h-8 text-zinc-400" />
              ) : (
                <Icon name="check" className="w-8 h-8 text-white" />
              )}
            </div>
            <h1 className="text-2xl font-bold text-zinc-900">
              {cancelled ? 'Appointment cancelled' : "You're booked!"}
            </h1>
            <p className="text-zinc-500 text-sm mt-1">
              {cancelled ? 'This appointment has been cancelled.' : 'See you soon.'}
            </p>
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
                  <Icon name="whatsapp" className="w-5 h-5" />
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
        </>
      )}
    </PageLayout>
  )
}
