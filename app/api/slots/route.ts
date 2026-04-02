import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'

function getDayOfWeek(dateStr: string): number {
  const [y, m, d] = dateStr.split('-').map(Number)
  return new Date(y, m - 1, d).getDay()
}

function generateSlots(startTime: string, endTime: string, intervalMinutes: number): string[] {
  const slots: string[] = []
  const [startH, startM] = startTime.split(':').map(Number)
  const [endH, endM] = endTime.split(':').map(Number)

  let current = startH * 60 + startM
  const end = endH * 60 + endM

  while (current < end) {
    const h = Math.floor(current / 60).toString().padStart(2, '0')
    const m = (current % 60).toString().padStart(2, '0')
    slots.push(`${h}:${m}`)
    current += intervalMinutes
  }

  return slots
}

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const date = searchParams.get('date')

  if (!date || !/^\d{4}-\d{2}-\d{2}$/.test(date)) {
    return NextResponse.json({ error: 'Invalid date' }, { status: 400 })
  }

  const { data: settingsRows, error: settingsError } = await supabaseAdmin
    .from('settings')
    .select('key, value')

  if (settingsError) {
    return NextResponse.json({ error: 'Failed to fetch settings' }, { status: 500 })
  }

  const settings = Object.fromEntries(settingsRows.map((r) => [r.key, r.value]))
  const slotInterval = parseInt(settings.slot_interval ?? '30', 10) || 30
  const bookingWindow = parseInt(settings.booking_window ?? '14', 10) || 14

  // Validate date is within booking window
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
    return NextResponse.json({ error: 'Failed to fetch schedule' }, { status: 500 })
  }

  let startTime: string
  let endTime: string

  if (override) {
    if (override.is_closed) return NextResponse.json({ slots: [] })
    startTime = (override.start_time as string).slice(0, 5)
    endTime = (override.end_time as string).slice(0, 5)
  } else {
    const { data: schedule, error: scheduleError } = await supabaseAdmin
      .from('weekly_schedule')
      .select('start_time, end_time, is_closed')
      .eq('day_of_week', getDayOfWeek(date))
      .single()

    if (scheduleError) {
      return NextResponse.json({ error: 'Failed to fetch schedule' }, { status: 500 })
    }

    if (!schedule || schedule.is_closed) return NextResponse.json({ slots: [] })
    startTime = (schedule.start_time as string).slice(0, 5)
    endTime = (schedule.end_time as string).slice(0, 5)
  }

  const allSlots = generateSlots(startTime, endTime, slotInterval)

  const { data: bookings, error: bookingsError } = await supabaseAdmin
    .from('bookings')
    .select('slot')
    .eq('date', date)
    .eq('status', 'active')

  if (bookingsError) {
    return NextResponse.json({ error: 'Failed to fetch bookings' }, { status: 500 })
  }

  const bookedSet = new Set(bookings.map((b) => (b.slot as string).slice(0, 5)))
  const available = allSlots.filter((slot) => !bookedSet.has(slot))

  return NextResponse.json({ slots: available })
}
