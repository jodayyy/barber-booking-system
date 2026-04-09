const TIMEZONE = process.env.SHOP_TIMEZONE ?? 'Asia/Kuching'

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
  const h = parseInt(get(timeParts, 'hour'), 10) % 24 // guard against "24" at midnight
  const m = parseInt(get(timeParts, 'minute'), 10)

  return { dateStr, currentMinutes: h * 60 + m }
}

export function addDays(dateStr: string, days: number): string {
  const [y, mo, d] = dateStr.split('-').map(Number)
  const dt = new Date(y, mo - 1, d + days)
  return `${dt.getFullYear()}-${String(dt.getMonth() + 1).padStart(2, '0')}-${String(dt.getDate()).padStart(2, '0')}`
}
