import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'
import { getSessionFromRequest } from '@/lib/session'

export async function GET(request: NextRequest) {
  if (!await getSessionFromRequest(request)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { data, error } = await supabaseAdmin
    .from('settings')
    .select('key, value')

  if (error) {
    return NextResponse.json({ error: 'Failed to fetch settings' }, { status: 500 })
  }

  const settings = Object.fromEntries(data.map((r) => [r.key, r.value]))
  return NextResponse.json(settings)
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

  const allowed = ['slot_interval', 'booking_window']
  const updates = body as Record<string, unknown>

  for (const key of Object.keys(updates)) {
    if (!allowed.includes(key)) {
      return NextResponse.json({ error: `Unknown setting: ${key}` }, { status: 400 })
    }
    if (typeof updates[key] !== 'string') {
      return NextResponse.json({ error: `Invalid value for: ${key}` }, { status: 400 })
    }
  }

  const interval = updates.slot_interval !== undefined ? parseInt(updates.slot_interval as string, 10) : NaN
  if (updates.slot_interval !== undefined && (isNaN(interval) || interval < 5 || interval > 120)) {
    return NextResponse.json({ error: 'slot_interval must be between 5 and 120' }, { status: 400 })
  }

  const bookingWindowDays = updates.booking_window !== undefined ? parseInt(updates.booking_window as string, 10) : NaN
  if (updates.booking_window !== undefined && (isNaN(bookingWindowDays) || bookingWindowDays < 1 || bookingWindowDays > 60)) {
    return NextResponse.json({ error: 'booking_window must be between 1 and 60' }, { status: 400 })
  }

  const upserts = Object.entries(updates).map(([key, value]) => ({ key, value }))

  const { error } = await supabaseAdmin
    .from('settings')
    .upsert(upserts, { onConflict: 'key' })

  if (error) {
    return NextResponse.json({ error: 'Failed to update settings' }, { status: 500 })
  }

  return NextResponse.json({ ok: true })
}
