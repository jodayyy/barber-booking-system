import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'

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
  const startTime: string = settings.start_time ?? '09:00'
  const endTime: string = settings.end_time ?? '21:00'
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

  const allSlots = generateSlots(startTime, endTime, slotInterval)

  const { data: bookings, error: bookingsError } = await supabaseAdmin
    .from('bookings')
    .select('slot')
    .eq('date', date)
    .eq('status', 'active')

  if (bookingsError) {
    return NextResponse.json({ error: 'Failed to fetch bookings' }, { status: 500 })
  }

  const { data: blocked, error: blockedError } = await supabaseAdmin
    .from('blocked_slots')
    .select('slot')
    .eq('date', date)

  if (blockedError) {
    return NextResponse.json({ error: 'Failed to fetch blocked slots' }, { status: 500 })
  }

  // Full-day block
  if (blocked.some((b) => b.slot === null)) {
    return NextResponse.json({ slots: [] })
  }

  // Supabase returns TIME as "HH:MM:SS" — normalize to "HH:MM"
  const bookedSet = new Set(bookings.map((b) => (b.slot as string).slice(0, 5)))
  const blockedSet = new Set(blocked.map((b) => (b.slot as string).slice(0, 5)))

  const available = allSlots.filter((slot) => !bookedSet.has(slot) && !blockedSet.has(slot))

  return NextResponse.json({ slots: available })
}
