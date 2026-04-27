import { supabaseAdmin } from '@/lib/supabase'

export function getDayOfWeek(dateStr: string): number {
  const [y, m, d] = dateStr.split('-').map(Number)
  return new Date(y, m - 1, d).getDay()
}

// Generates every slot between startTime and endTime at the given interval (e.g. every 30 min)
export function generateSlots(startTime: string, endTime: string, intervalMinutes: number): string[] {
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

// Returns open hours for a date — checks date_overrides first, falls back to weekly_schedule; returns null if closed
export async function resolveHours(date: string): Promise<{ startTime: string; endTime: string } | null> {
  const { data: override } = await supabaseAdmin
    .from('date_overrides')
    .select('start_time, end_time, is_closed')
    .eq('date', date)
    .maybeSingle()

  if (override) {
    if (override.is_closed || !override.start_time || !override.end_time) return null
    return {
      startTime: (override.start_time as string).slice(0, 5),
      endTime: (override.end_time as string).slice(0, 5),
    }
  }

  const { data: schedule } = await supabaseAdmin
    .from('weekly_schedule')
    .select('start_time, end_time, is_closed')
    .eq('day_of_week', getDayOfWeek(date))
    .single()

  if (!schedule || schedule.is_closed || !schedule.start_time || !schedule.end_time) return null
  return {
    startTime: (schedule.start_time as string).slice(0, 5),
    endTime: (schedule.end_time as string).slice(0, 5),
  }
}
