import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'
import { getSessionFromRequest } from '@/lib/session'

export async function GET(request: NextRequest) {
  if (!await getSessionFromRequest(request)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { data, error } = await supabaseAdmin
    .from('blocked_slots')
    .select('id, date, slot')
    .order('date', { ascending: true })

  if (error) {
    return NextResponse.json({ error: 'Failed to fetch blocked slots' }, { status: 500 })
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

  const { date, slot } = body as Record<string, unknown>

  if (typeof date !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(date)) {
    return NextResponse.json({ error: 'Invalid or missing date' }, { status: 400 })
  }

  if (slot !== undefined && slot !== null) {
    if (typeof slot !== 'string' || !/^\d{2}:\d{2}$/.test(slot)) {
      return NextResponse.json({ error: 'Invalid slot format' }, { status: 400 })
    }
  }

  const { error } = await supabaseAdmin
    .from('blocked_slots')
    .insert({ date, slot: slot ?? null })

  if (error) {
    return NextResponse.json({ error: 'Failed to block slot' }, { status: 500 })
  }

  return NextResponse.json({ ok: true }, { status: 201 })
}

export async function DELETE(request: NextRequest) {
  if (!await getSessionFromRequest(request)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  let body: unknown
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'Invalid request body' }, { status: 400 })
  }

  const { date, slot } = body as Record<string, unknown>

  if (typeof date !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(date)) {
    return NextResponse.json({ error: 'Invalid or missing date' }, { status: 400 })
  }

  let query = supabaseAdmin.from('blocked_slots').delete().eq('date', date)

  if (slot === null || slot === undefined) {
    query = query.is('slot', null)
  } else {
    if (typeof slot !== 'string' || !/^\d{2}:\d{2}$/.test(slot)) {
      return NextResponse.json({ error: 'Invalid slot format' }, { status: 400 })
    }
    query = query.eq('slot', slot)
  }

  const { error } = await query

  if (error) {
    return NextResponse.json({ error: 'Failed to unblock slot' }, { status: 500 })
  }

  return NextResponse.json({ ok: true })
}
