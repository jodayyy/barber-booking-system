import { NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'

function getDayOfWeek(dateStr: string): number {
  const [y, m, d] = dateStr.split('-').map(Number)
  return new Date(y, m - 1, d).getDay()
}

function isWithinHours(startTime: string, endTime: string, currentMinutes: number): boolean {
  const [sh, sm] = startTime.slice(0, 5).split(':').map(Number)
  const [eh, em] = endTime.slice(0, 5).split(':').map(Number)
  return currentMinutes >= sh * 60 + sm && currentMinutes < eh * 60 + em
}

export async function GET() {
  const now = new Date()
  const todayStr = now.toISOString().slice(0, 10)
  const currentMinutes = now.getHours() * 60 + now.getMinutes()

  const { data: settingsRows } = await supabaseAdmin
    .from('settings')
    .select('key, value')
  const settings = Object.fromEntries((settingsRows ?? []).map((r) => [r.key, r.value]))
  const bookingWindow = parseInt(settings.booking_window ?? '14', 10) || 14

  const { data: override } = await supabaseAdmin
    .from('date_overrides')
    .select('start_time, end_time, is_closed')
    .eq('date', todayStr)
    .maybeSingle()

  if (override) {
    const open = !override.is_closed &&
      !!override.start_time &&
      !!override.end_time &&
      isWithinHours(override.start_time as string, override.end_time as string, currentMinutes)
    return NextResponse.json({
      open,
      bookingWindow,
      hours: (!override.is_closed && override.start_time && override.end_time)
        ? { start: override.start_time, end: override.end_time }
        : null,
    })
  }

  const { data: schedule } = await supabaseAdmin
    .from('weekly_schedule')
    .select('start_time, end_time, is_closed')
    .eq('day_of_week', getDayOfWeek(todayStr))
    .single()

  const open = !!schedule &&
    !schedule.is_closed &&
    !!schedule.start_time &&
    !!schedule.end_time &&
    isWithinHours(schedule.start_time as string, schedule.end_time as string, currentMinutes)

  return NextResponse.json({
    open,
    bookingWindow,
    hours: (schedule && !schedule.is_closed && schedule.start_time && schedule.end_time)
      ? { start: schedule.start_time, end: schedule.end_time }
      : null,
  })
}
