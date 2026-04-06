import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'

function getDayOfWeek(dateStr: string): number {
  const [y, m, d] = dateStr.split('-').map(Number)
  return new Date(y, m - 1, d).getDay()
}

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

  // Resolve hours: date_overrides > weekly_schedule
  const { data: override, error: overrideError } = await supabaseAdmin
    .from('date_overrides')
    .select('start_time, end_time, is_closed')
    .eq('date', date)
    .maybeSingle()

  if (overrideError) {
    return NextResponse.json({ error: 'Failed to check availability' }, { status: 500 })
  }

  let startTime: string
  let endTime: string

  if (override) {
    if (override.is_closed) {
      return NextResponse.json({ error: 'No availability on this day' }, { status: 409 })
    }
    startTime = (override.start_time as string).slice(0, 5)
    endTime = (override.end_time as string).slice(0, 5)
  } else {
    const { data: schedule, error: scheduleError } = await supabaseAdmin
      .from('weekly_schedule')
      .select('start_time, end_time, is_closed')
      .eq('day_of_week', getDayOfWeek(date))
      .single()

    if (scheduleError) {
      return NextResponse.json({ error: 'Failed to check availability' }, { status: 500 })
    }

    if (!schedule || schedule.is_closed) {
      return NextResponse.json({ error: 'No availability on this day' }, { status: 409 })
    }
    startTime = (schedule.start_time as string).slice(0, 5)
    endTime = (schedule.end_time as string).slice(0, 5)
  }

  // Validate slot aligns with shop hours and interval
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
    })
    .select('id')
    .single()

  if (insertError) {
    return NextResponse.json({ error: 'Failed to create booking' }, { status: 500 })
  }

  return NextResponse.json({ id: booking.id }, { status: 201 })
}
