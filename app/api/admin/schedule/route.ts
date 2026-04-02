import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'
import { getSessionFromRequest } from '@/lib/session'

const HARDCODED_DEFAULTS = [
  { day_of_week: 0, start_time: '12:00', end_time: '22:00', is_closed: false },
  { day_of_week: 1, start_time: '10:00', end_time: '22:00', is_closed: false },
  { day_of_week: 2, start_time: '10:00', end_time: '22:00', is_closed: false },
  { day_of_week: 3, start_time: '10:00', end_time: '22:00', is_closed: false },
  { day_of_week: 4, start_time: '10:00', end_time: '22:00', is_closed: false },
  { day_of_week: 5, start_time: '14:00', end_time: '22:00', is_closed: false },
  { day_of_week: 6, start_time: '12:00', end_time: '22:00', is_closed: false },
]

export async function GET(request: NextRequest) {
  if (!await getSessionFromRequest(request)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { data, error } = await supabaseAdmin
    .from('weekly_schedule')
    .select('day_of_week, start_time, end_time, is_closed')
    .order('day_of_week')

  if (error) {
    return NextResponse.json({ error: 'Failed to fetch schedule' }, { status: 500 })
  }

  return NextResponse.json(data)
}

export async function PUT(request: NextRequest) {
  if (!await getSessionFromRequest(request)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  let body: unknown
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'Invalid request body' }, { status: 400 })
  }

  // Reset to hardcoded defaults — also clears all date overrides
  if ((body as Record<string, unknown>).reset === true) {
    const { error: scheduleError } = await supabaseAdmin
      .from('weekly_schedule')
      .upsert(HARDCODED_DEFAULTS, { onConflict: 'day_of_week' })

    if (scheduleError) {
      return NextResponse.json({ error: 'Failed to reset schedule' }, { status: 500 })
    }

    const { error: overridesError } = await supabaseAdmin
      .from('date_overrides')
      .delete()
      .gte('date', '0001-01-01')

    if (overridesError) {
      return NextResponse.json({ error: 'Failed to clear overrides' }, { status: 500 })
    }

    return NextResponse.json({ ok: true })
  }

  // Full schedule update — expect array of 7 items
  if (!Array.isArray(body)) {
    return NextResponse.json({ error: 'Expected array of schedule items' }, { status: 400 })
  }

  const timeRe = /^\d{2}:\d{2}$/

  for (const item of body as Array<Record<string, unknown>>) {
    const dow = item.day_of_week
    if (typeof dow !== 'number' || dow < 0 || dow > 6) {
      return NextResponse.json({ error: 'Invalid day_of_week' }, { status: 400 })
    }
    if (!item.is_closed) {
      if (typeof item.start_time !== 'string' || !timeRe.test(item.start_time)) {
        return NextResponse.json({ error: `Invalid start_time for day ${dow}` }, { status: 400 })
      }
      if (typeof item.end_time !== 'string' || !timeRe.test(item.end_time)) {
        return NextResponse.json({ error: `Invalid end_time for day ${dow}` }, { status: 400 })
      }
      if (item.start_time >= item.end_time) {
        return NextResponse.json({ error: `start_time must be before end_time for day ${dow}` }, { status: 400 })
      }
    }
  }

  const { error } = await supabaseAdmin
    .from('weekly_schedule')
    .upsert(body as object[], { onConflict: 'day_of_week' })

  if (error) {
    return NextResponse.json({ error: 'Failed to update schedule' }, { status: 500 })
  }

  return NextResponse.json({ ok: true })
}
