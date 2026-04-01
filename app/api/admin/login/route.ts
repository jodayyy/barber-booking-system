import { NextRequest, NextResponse } from 'next/server'
import bcrypt from 'bcryptjs'
import { supabaseAdmin } from '@/lib/supabase'
import { generateSessionToken, setSessionCookie } from '@/lib/session'

export async function POST(request: NextRequest) {
  let body: unknown
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'Invalid request body' }, { status: 400 })
  }

  const { username, password } = body as Record<string, unknown>

  if (typeof username !== 'string' || typeof password !== 'string') {
    return NextResponse.json({ error: 'Invalid input' }, { status: 400 })
  }

  const { data: owner, error } = await supabaseAdmin
    .from('owner')
    .select('password_hash')
    .eq('username', username)
    .maybeSingle()

  if (error) {
    return NextResponse.json({ error: 'Server error' }, { status: 500 })
  }

  // Use a dummy compare when owner not found to avoid timing attacks
  const hashToCompare = owner?.password_hash ?? '$2b$10$invalidhashfortimingprotection000000000000000000000000'
  const valid = await bcrypt.compare(password, hashToCompare)

  if (!valid || !owner) {
    return NextResponse.json({ error: 'Invalid credentials' }, { status: 401 })
  }

  const token = generateSessionToken()
  await setSessionCookie(token)

  return NextResponse.json({ ok: true })
}
