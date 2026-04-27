import { NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'
import { getLocalNow } from '@/lib/utils'
import { resolveHours } from '@/lib/schedule'

function isWithinHours(startTime: string, endTime: string, currentMinutes: number): boolean {
  const [sh, sm] = startTime.split(':').map(Number)
  const [eh, em] = endTime.split(':').map(Number)
  return currentMinutes >= sh * 60 + sm && currentMinutes < eh * 60 + em
}

export async function GET() {
  const { dateStr: todayStr, currentMinutes } = getLocalNow()

  const { data: settingsRows } = await supabaseAdmin
    .from('settings')
    .select('key, value')
  const settings = Object.fromEntries((settingsRows ?? []).map((r) => [r.key, r.value]))
  const bookingWindow = parseInt(settings.booking_window ?? '14', 10) || 14
  const shopName = settings.shop_name ?? null
  const shopPhone = settings.shop_phone ?? null

  const hours = await resolveHours(todayStr)
  const open = !!hours && isWithinHours(hours.startTime, hours.endTime, currentMinutes)

  return NextResponse.json({
    open,
    bookingWindow,
    shopName,
    shopPhone,
    hours: hours ? { start: hours.startTime, end: hours.endTime } : null,
  })
}
