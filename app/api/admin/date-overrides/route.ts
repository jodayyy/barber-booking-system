import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'
import { getSessionFromRequest } from '@/lib/session'

export async function GET(request: NextRequest) {
  if (!await getSessionFromRequest(request)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { data, error } = await supabaseAdmin
    .from('date_overrides')
    .select('date, start_time, end_time, is_closed')
    .order('date')

  if (error) {
    return NextResponse.json({ error: 'Failed to fetch overrides' }, { status: 500 })
  }

  return NextResponse.json(data)
}

export async function POST(request: NextRequest) {
  if (!await getSessionFromRequest(request)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  let body: unknown
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'Invalid request body' }, { status: 400 })
  }

  const { date, start_time, end_time, is_closed } = body as Record<string, unknown>

  if (typeof date !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(date)) {
    return NextResponse.json({ error: 'Invalid date' }, { status: 400 })
  }

  if (!is_closed) {
    const timeRe = /^\d{2}:\d{2}$/
    if (typeof start_time !== 'string' || !timeRe.test(start_time)) {
      return NextResponse.json({ error: 'Invalid start_time' }, { status: 400 })
    }
    if (typeof end_time !== 'string' || !timeRe.test(end_time)) {
      return NextResponse.json({ error: 'Invalid end_time' }, { status: 400 })
    }
    if (start_time >= end_time) {
      return NextResponse.json({ error: 'start_time must be before end_time' }, { status: 400 })
    }
  }

  const { error } = await supabaseAdmin
    .from('date_overrides')
    .upsert(
      {
        date,
        start_time: is_closed ? null : start_time,
        end_time: is_closed ? null : end_time,
        is_closed: Boolean(is_closed),
      },
      { onConflict: 'date' },
    )

  if (error) {
    return NextResponse.json({ error: 'Failed to save override' }, { status: 500 })
  }

  return NextResponse.json({ ok: true }, { status: 201 })
}

export async function DELETE(request: NextRequest) {
  if (!await getSessionFromRequest(request)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { searchParams } = new URL(request.url)
  const date = searchParams.get('date')

  if (!date || !/^\d{4}-\d{2}-\d{2}$/.test(date)) {
    return NextResponse.json({ error: 'Invalid date' }, { status: 400 })
  }

  const { error } = await supabaseAdmin
    .from('date_overrides')
    .delete()
    .eq('date', date)

  if (error) {
    return NextResponse.json({ error: 'Failed to remove override' }, { status: 500 })
  }

  return NextResponse.json({ ok: true })
}
