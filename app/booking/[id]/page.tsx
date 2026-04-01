'use client'

import { useEffect, useState } from 'react'
import { useParams } from 'next/navigation'
import { formatDate, formatSlot } from '@/lib/format'
import { PageLayout } from '@/components/ui/PageLayout'
import { Card } from '@/components/ui/Card'
import { BookingDetailRow } from '@/components/ui/BookingDetailRow'
import { Button } from '@/components/ui/Button'

type Booking = {
  id: string
  name: string
  phone: string
  date: string
  slot: string
  status: string
}

export default function ManageBookingPage() {
  const { id } = useParams<{ id: string }>()

  const [booking, setBooking] = useState<Booking | null>(null)
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

  return (
    <PageLayout>
      <h1 className="text-2xl font-bold text-zinc-900 mb-1">Your booking</h1>
      <p className="text-zinc-500 text-sm mb-8">
        {cancelled ? 'This appointment has been cancelled.' : 'Details for your upcoming appointment.'}
      </p>

      <Card className="divide-y divide-zinc-100 mb-6">
        <BookingDetailRow label="Name" value={booking.name} />
        <BookingDetailRow label="Date" value={formatDate(booking.date)} />
        <BookingDetailRow label="Time" value={formatSlot(booking.slot)} />
        <BookingDetailRow
          label="Status"
          value={cancelled ? 'Cancelled' : 'Confirmed'}
          valueClassName={`text-sm font-medium ${cancelled ? 'text-red-500' : 'text-green-600'}`}
        />
      </Card>

      {!cancelled && (
        <>
          {!confirmOpen ? (
            <Button variant="secondary" onClick={() => setConfirmOpen(true)} className="w-full">
              Cancel appointment
            </Button>
          ) : (
            <Card className="p-5">
              <p className="text-sm font-medium text-zinc-900 mb-1">Cancel this appointment?</p>
              <p className="text-sm text-zinc-500 mb-5">This cannot be undone.</p>
              {cancelError && (
                <p className="text-red-500 text-sm mb-4">{cancelError}</p>
              )}
              <div className="flex gap-3">
                <Button
                  variant="secondary"
                  onClick={() => { setConfirmOpen(false); setCancelError('') }}
                  disabled={cancelling}
                  className="flex-1"
                >
                  Keep it
                </Button>
                <Button
                  variant="danger"
                  onClick={handleCancel}
                  disabled={cancelling}
                  className="flex-1"
                >
                  {cancelling ? 'Cancelling…' : 'Yes, cancel'}
                </Button>
              </div>
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
    </PageLayout>
  )
}
