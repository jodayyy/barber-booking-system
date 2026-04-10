import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'

export async function GET(_request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params

  const [bookingResult, settingsResult] = await Promise.all([
    supabaseAdmin
      .from('bookings')
      .select('id, name, phone, date, slot, status')
      .eq('id', id)
      .maybeSingle(),
    supabaseAdmin
      .from('settings')
      .select('key, value')
      .in('key', ['shop_name', 'shop_phone']),
  ])

  if (bookingResult.error) {
    return NextResponse.json({ error: 'Failed to fetch booking' }, { status: 500 })
  }

  if (!bookingResult.data) {
    return NextResponse.json({ error: 'Booking not found' }, { status: 404 })
  }

  const shop = Object.fromEntries(
    (settingsResult.data ?? []).map((r) => [r.key, r.value])
  )

  return NextResponse.json({ booking: bookingResult.data, shop })
}

export async function DELETE(_request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params

  const { data: booking, error: fetchError } = await supabaseAdmin
    .from('bookings')
    .select('id, status')
    .eq('id', id)
    .maybeSingle()

  if (fetchError) {
    return NextResponse.json({ error: 'Failed to fetch booking' }, { status: 500 })
  }

  if (!booking) {
    return NextResponse.json({ error: 'Booking not found' }, { status: 404 })
  }

  if (booking.status === 'cancelled') {
    return NextResponse.json({ error: 'Booking is already cancelled' }, { status: 409 })
  }

  const { error: updateError } = await supabaseAdmin
    .from('bookings')
    .update({ status: 'cancelled' })
    .eq('id', id)

  if (updateError) {
    return NextResponse.json({ error: 'Failed to cancel booking' }, { status: 500 })
  }

  return NextResponse.json({ ok: true })
}
