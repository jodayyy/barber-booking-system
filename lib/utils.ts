// Shop's timezone for all date/time calculations — set SHOP_TIMEZONE in env to override
const TIMEZONE = process.env.SHOP_TIMEZONE ?? 'Asia/Kuching'

// Returns today's date string (YYYY-MM-DD) and current time in minutes (e.g. 14:30 → 870) in the shop's timezone
export function getLocalNow(): { dateStr: string; currentMinutes: number } {
  const now = new Date()

  const dateParts = new Intl.DateTimeFormat('en-CA', {
    timeZone: TIMEZONE,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).formatToParts(now)

  const timeParts = new Intl.DateTimeFormat('en-US', {
    timeZone: TIMEZONE,
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  }).formatToParts(now)

  const get = (parts: Intl.DateTimeFormatPart[], type: string) =>
    parts.find((p) => p.type === type)?.value ?? '0'

  const dateStr = `${get(dateParts, 'year')}-${get(dateParts, 'month')}-${get(dateParts, 'day')}`
  const h = parseInt(get(timeParts, 'hour'), 10) % 24
  const m = parseInt(get(timeParts, 'minute'), 10)

  return { dateStr, currentMinutes: h * 60 + m }
}

// Adds n days to a YYYY-MM-DD string and returns the resulting date string
export function addDays(dateStr: string, days: number): string {
  const [y, mo, d] = dateStr.split('-').map(Number)
  const dt = new Date(y, mo - 1, d + days)
  return `${dt.getFullYear()}-${String(dt.getMonth() + 1).padStart(2, '0')}-${String(dt.getDate()).padStart(2, '0')}`
}

// Converts a JS Date to a YYYY-MM-DD string using the device's local time (used on the client)
export function getLocalDateString(date: Date): string {
  const y = date.getFullYear()
  const m = String(date.getMonth() + 1).padStart(2, '0')
  const d = String(date.getDate()).padStart(2, '0')
  return `${y}-${m}-${d}`
}

// "2025-04-27" → "Sunday, April 27, 2025"
export function formatDate(dateStr: string): string {
  const [y, m, d] = dateStr.split('-').map(Number)
  return new Date(y, m - 1, d).toLocaleDateString('en-US', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  })
}

// "2025-04-27" → "Sunday, April 27" (no year — used in section headings)
export function formatDateHeading(dateStr: string): string {
  const [y, m, d] = dateStr.split('-').map(Number)
  return new Date(y, m - 1, d).toLocaleDateString('en-US', {
    weekday: 'long',
    month: 'long',
    day: 'numeric',
  })
}

// "14:30" → "2:30 PM"
export function formatSlot(slot: string): string {
  const [h, m] = slot.slice(0, 5).split(':').map(Number)
  const period = h >= 12 ? 'PM' : 'AM'
  const hour = h % 12 || 12
  return `${hour}:${m.toString().padStart(2, '0')} ${period}`
}
