import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const phone = searchParams.get('phone')?.trim()
  const code = searchParams.get('code')?.trim().toUpperCase()

  if (!phone && !code) {
    return NextResponse.json({ error: 'Provide phone or code' }, { status: 400 })
  }

  if (phone) {
    const { data, error } = await supabaseAdmin
      .from('bookings')
      .select('id')
      .eq('phone', phone)
      .eq('status', 'active')
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle()

    if (error) return NextResponse.json({ error: 'Lookup failed' }, { status: 500 })
    if (!data) return NextResponse.json({ error: 'No active booking found for this phone number' }, { status: 404 })
    return NextResponse.json({ id: data.id })
  }

  const { data, error } = await supabaseAdmin
    .from('bookings')
    .select('id')
    .eq('code', code)
    .maybeSingle()

  if (error) return NextResponse.json({ error: 'Lookup failed' }, { status: 500 })
  if (!data) return NextResponse.json({ error: 'No booking found for this code' }, { status: 404 })
  return NextResponse.json({ id: data.id })
}
