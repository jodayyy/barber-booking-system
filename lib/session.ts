import { cookies } from 'next/headers'
import { NextRequest } from 'next/server'

const SESSION_COOKIE = 'admin_session'

async function getKey(): Promise<CryptoKey> {
  const encoder = new TextEncoder()
  return globalThis.crypto.subtle.importKey(
    'raw',
    encoder.encode(process.env.SESSION_SECRET!),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign', 'verify'],
  )
}

export function generateSessionToken(): string {
  const bytes = new Uint8Array(32)
  globalThis.crypto.getRandomValues(bytes)
  return Array.from(bytes, (b) => b.toString(16).padStart(2, '0')).join('')
}

export async function signToken(token: string): Promise<string> {
  const key = await getKey()
  const encoder = new TextEncoder()
  const sig = await globalThis.crypto.subtle.sign('HMAC', key, encoder.encode(token))
  const sigHex = Array.from(new Uint8Array(sig), (b) => b.toString(16).padStart(2, '0')).join('')
  return `${token}.${sigHex}`
}

export async function verifyToken(signed: string): Promise<string | null> {
  const dot = signed.lastIndexOf('.')
  if (dot === -1) return null
  const token = signed.slice(0, dot)
  const expected = await signToken(token)
  if (signed.length !== expected.length) return null
  let diff = 0
  for (let i = 0; i < signed.length; i++) {
    diff |= signed.charCodeAt(i) ^ expected.charCodeAt(i)
  }
  return diff === 0 ? token : null
}

export async function getSession(): Promise<string | null> {
  const store = await cookies()
  const raw = store.get(SESSION_COOKIE)?.value
  if (!raw) return null
  return verifyToken(raw)
}

export async function setSessionCookie(token: string, rememberMe = false): Promise<void> {
  const signed = await signToken(token)
  const store = await cookies()
  store.set(SESSION_COOKIE, signed, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/',
    ...(rememberMe ? { maxAge: 60 * 60 * 24 * 30 } : {}), // 30 days if remembered, else session cookie
  })
}

export async function clearSessionCookie(): Promise<void> {
  const store = await cookies()
  store.delete(SESSION_COOKIE)
}

export async function getSessionFromRequest(request: NextRequest): Promise<string | null> {
  const raw = request.cookies.get(SESSION_COOKIE)?.value
  if (!raw) return null
  return verifyToken(raw)
}
