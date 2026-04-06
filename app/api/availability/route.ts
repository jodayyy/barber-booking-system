import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'

function getDayOfWeek(dateStr: string): number {
  const [y, m, d] = dateStr.split('-').map(Number)
  return new Date(y, m - 1, d).getDay()
}

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const raw = searchParams.get('dates')
  if (!raw) return NextResponse.json({})

  const dates = raw.split(',').filter((d) => /^\d{4}-\d{2}-\d{2}$/.test(d))
  if (dates.length === 0) return NextResponse.json({})

  const [{ data: overrides }, { data: schedule }] = await Promise.all([
    supabaseAdmin
      .from('date_overrides')
      .select('date, is_closed, start_time, end_time')
      .in('date', dates),
    supabaseAdmin
      .from('weekly_schedule')
      .select('day_of_week, is_closed, start_time, end_time'),
  ])

  const overrideMap = Object.fromEntries(
    (overrides ?? []).map((o) => [o.date, o])
  )
  const scheduleMap = Object.fromEntries(
    (schedule ?? []).map((s) => [s.day_of_week, s])
  )

  const result: Record<string, boolean> = {}
  for (const date of dates) {
    const override = overrideMap[date]
    if (override) {
      result[date] = !override.is_closed && !!override.start_time && !!override.end_time
    } else {
      const day = scheduleMap[getDayOfWeek(date)]
      result[date] = !!day && !day.is_closed && !!day.start_time && !!day.end_time
    }
  }

  return NextResponse.json(result)
}
