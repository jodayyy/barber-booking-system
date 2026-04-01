import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'

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

  const today = new Date()
  const todayStr = today.toISOString().slice(0, 10)
  const maxDate = new Date(today)
  maxDate.setDate(maxDate.getDate() + bookingWindow)
  const maxDateStr = maxDate.toISOString().slice(0, 10)

  if (date < todayStr || date > maxDateStr) {
    return NextResponse.json({ error: 'Date out of booking window' }, { status: 400 })
  }

  // Validate slot aligns with shop hours and interval
  const startTime: string = settings.start_time ?? '09:00'
  const endTime: string = settings.end_time ?? '21:00'
  const slotInterval = parseInt(settings.slot_interval ?? '30', 10) || 30

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

  // Check blocked slots
  const { data: blockedSlots, error: blockedError } = await supabaseAdmin
    .from('blocked_slots')
    .select('slot')
    .eq('date', date)

  if (blockedError) {
    return NextResponse.json({ error: 'Failed to check availability' }, { status: 500 })
  }

  if (blockedSlots.some((b) => b.slot === null)) {
    return NextResponse.json({ error: 'No availability on this day' }, { status: 409 })
  }

  const blockedSet = new Set(blockedSlots.map((b) => (b.slot as string).slice(0, 5)))
  if (blockedSet.has(slot)) {
    return NextResponse.json({ error: 'This slot is no longer available' }, { status: 409 })
  }

  // Check for double booking
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

  // Create booking
  const { data: booking, error: insertError } = await supabaseAdmin
    .from('bookings')
    .insert({
      name: name.trim(),
      phone: phone.trim(),
      date,
      slot,
      status: 'active',
      whatsapp_sent: false,
    })
    .select('id')
    .single()

  if (insertError) {
    return NextResponse.json({ error: 'Failed to create booking' }, { status: 500 })
  }

  return NextResponse.json({ id: booking.id }, { status: 201 })
}
