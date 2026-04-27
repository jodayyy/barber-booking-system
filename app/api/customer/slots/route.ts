import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'
import { getLocalNow, addDays } from '@/lib/utils'
import { resolveHours, generateSlots } from '@/lib/schedule'

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

  const { dateStr: todayStr, currentMinutes } = getLocalNow()
  const maxDateStr = addDays(todayStr, bookingWindow)

  if (date < todayStr || date > maxDateStr) {
    return NextResponse.json({ error: 'Date out of booking window' }, { status: 400 })
  }

  const hours = await resolveHours(date)
  if (!hours) return NextResponse.json({ slots: [] })

  const allSlots = generateSlots(hours.startTime, hours.endTime, slotInterval)

  const { data: bookings, error: bookingsError } = await supabaseAdmin
    .from('bookings')
    .select('slot')
    .eq('date', date)
    .eq('status', 'active')

  if (bookingsError) {
    return NextResponse.json({ error: 'Failed to fetch bookings' }, { status: 500 })
  }

  const bookedSet = new Set(bookings.map((b) => (b.slot as string).slice(0, 5)))

  // Hide slots within the next 60 minutes on today's date (not enough time to arrive)
  const isToday = date === todayStr
  const cutoffMinutes = currentMinutes + 60

  const available: string[] = []
  const booked: string[] = []

  for (const slot of allSlots) {
    if (isToday) {
      const [h, m] = slot.split(':').map(Number)
      if (h * 60 + m <= cutoffMinutes) continue
    }
    if (bookedSet.has(slot)) booked.push(slot)
    else available.push(slot)
  }

  return NextResponse.json({ slots: available, bookedSlots: booked })
}
