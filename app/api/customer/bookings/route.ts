import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'
import { resolveHours } from '@/lib/schedule'

export async function POST(request: NextRequest) {
  let body: unknown
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'Invalid request body' }, { status: 400 })
  }

  const { name, phone, date, slot } = body as Record<string, unknown>

  if (
    typeof name !== 'string' || !name.trim() ||
    typeof phone !== 'string' || !phone.trim() ||
    typeof date !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(date) ||
    typeof slot !== 'string' || !/^\d{2}:\d{2}$/.test(slot)
  ) {
    return NextResponse.json({ error: 'Invalid input' }, { status: 400 })
  }

  const { data: settingsRows, error: settingsError } = await supabaseAdmin
    .from('settings')
    .select('key, value')

  if (settingsError) {
    return NextResponse.json({ error: 'Failed to fetch settings' }, { status: 500 })
  }

  const settings = Object.fromEntries(settingsRows.map((r) => [r.key, r.value]))
  const bookingWindow = parseInt(settings.booking_window ?? '14', 10) || 14
  const slotInterval = parseInt(settings.slot_interval ?? '30', 10) || 30

  const today = new Date()
  const todayStr = today.toISOString().slice(0, 10)
  const maxDate = new Date(today)
  maxDate.setDate(maxDate.getDate() + bookingWindow)
  const maxDateStr = maxDate.toISOString().slice(0, 10)

  if (date < todayStr || date > maxDateStr) {
    return NextResponse.json({ error: 'Date out of booking window' }, { status: 400 })
  }

  const hours = await resolveHours(date)
  if (!hours) {
    return NextResponse.json({ error: 'No availability on this day' }, { status: 409 })
  }

  // Verify the requested slot actually falls within open hours and aligns to the slot interval
  const { startTime, endTime } = hours
  const [sh, sm] = startTime.split(':').map(Number)
  const [eh, em] = endTime.split(':').map(Number)
  const [slh, slm] = slot.split(':').map(Number)
  const slotMinutes = slh * 60 + slm
  const startMinutes = sh * 60 + sm
  const endMinutes = eh * 60 + em

  if (
    slotMinutes < startMinutes ||
    slotMinutes >= endMinutes ||
    (slotMinutes - startMinutes) % slotInterval !== 0
  ) {
    return NextResponse.json({ error: 'Invalid slot' }, { status: 400 })
  }

  // Check for a race condition — another customer may have booked the same slot just now
  const { data: existing, error: existingError } = await supabaseAdmin
    .from('bookings')
    .select('id')
    .eq('date', date)
    .eq('slot', slot)
    .eq('status', 'active')
    .maybeSingle()

  if (existingError) {
    return NextResponse.json({ error: 'Failed to check availability' }, { status: 500 })
  }

  if (existing) {
    return NextResponse.json({ error: 'This slot was just booked. Please choose another time.' }, { status: 409 })
  }

  const { data: booking, error: insertError } = await supabaseAdmin
    .from('bookings')
    .insert({
      name: name.trim(),
      phone: phone.trim(),
      date,
      slot,
      status: 'active',
    })
    .select('id')
    .single()

  if (insertError) {
    return NextResponse.json({ error: 'Failed to create booking' }, { status: 500 })
  }

  return NextResponse.json({ id: booking.id }, { status: 201 })
}
