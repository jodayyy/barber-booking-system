'use client'

import { useState, useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { PageLayout } from '@/components/PageLayout'
import { Button } from '@/components/Button'
import { Collapsible } from '@/components/Collapsible'
import { Spinner } from '@/components/Spinner'
import { TimePicker } from '@/components/TimePicker'
import { Icon } from '@/components/Icon'

const DAY_SHORT = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']
const DAY_NAMES = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday']

type DaySchedule = {
  day_of_week: number
  start_time: string
  end_time: string
  is_closed: boolean
}

export default function AdminSettingsPage() {
  const router = useRouter()
  const [schedule, setSchedule] = useState<DaySchedule[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedDow, setSelectedDow] = useState<number | null>(null)
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [saveError, setSaveError] = useState('')

  const [shopName, setShopName] = useState('')
  const [shopPhone, setShopPhone] = useState('')
  const [ownerSaving, setOwnerSaving] = useState(false)
  const [ownerSaved, setOwnerSaved] = useState(false)
  const [ownerError, setOwnerError] = useState('')

  // Loads the weekly schedule and shop settings in parallel on mount
  const load = useCallback(async () => {
    const [schedRes, settingsRes] = await Promise.all([
      fetch('/api/admin/schedule'),
      fetch('/api/admin/settings'),
    ])
    if (schedRes.status === 401 || settingsRes.status === 401) { router.push('/login'); return }
    if (schedRes.ok) {
      const data: DaySchedule[] = await schedRes.json()
      setSchedule(data.map((d) => ({
        ...d,
        start_time: d.start_time.slice(0, 5),
        end_time: d.end_time.slice(0, 5),
      })))
    }
    if (settingsRes.ok) {
      const data = await settingsRes.json()
      setShopName(data.shop_name ?? '')
      setShopPhone(data.shop_phone ?? '')
    }
    setLoading(false)
  }, [router])

  useEffect(() => { load() }, [load])

  async function handleOwnerSave() {
    setOwnerSaving(true)
    setOwnerError('')
    try {
      const res = await fetch('/api/admin/settings', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ shop_name: shopName, shop_phone: shopPhone }),
      })
      if (res.status === 401) { router.push('/login'); return }
      if (!res.ok) {
        const d = await res.json()
        setOwnerError(d.error ?? 'Failed to save')
        return
      }
      setOwnerSaved(true)
      setTimeout(() => setOwnerSaved(false), 3000)
    } finally {
      setOwnerSaving(false)
    }
  }

  function updateDay(dow: number, patch: Partial<DaySchedule>) {
    setSchedule((prev) => prev.map((d) => d.day_of_week === dow ? { ...d, ...patch } : d))
    setSaved(false)
    setSaveError('')
  }

  async function handleSave() {
    setSaving(true)
    setSaveError('')
    try {
      const res = await fetch('/api/admin/schedule', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(schedule),
      })
      if (res.status === 401) { router.push('/login'); return }
      if (!res.ok) {
        const d = await res.json()
        setSaveError(d.error ?? 'Failed to save')
        return
      }
      setSaved(true)
      setTimeout(() => setSaved(false), 3000)
    } finally {
      setSaving(false)
    }
  }

  const selectedDay = schedule.find((d) => d.day_of_week === selectedDow) ?? null

  return (
    <PageLayout>
      {/* Header */}
      <div className="px-4 pt-6 pb-2">
        <div className="flex items-center gap-3">
          <Link
            href="/dashboard"
            className="w-9 h-9 flex items-center justify-center rounded-xl border border-zinc-200 bg-white text-zinc-500 hover:border-zinc-400 transition-colors"
            aria-label="Back to dashboard"
          >
            <Icon name="chevron-left" className="w-4 h-4" />
          </Link>
          <h1 className="text-2xl font-bold text-zinc-900">Settings</h1>
        </div>
      </div>

      <div className="border-t border-zinc-200 sm:border-t-0 flex flex-col sm:gap-3 pb-8">
      <Collapsible label="Owner's Info">
        {loading ? (
          <div className="flex justify-center py-4">
            <Spinner />
          </div>
        ) : (
          <div className="flex flex-col gap-3">
            <div>
              <label className="block text-xs font-medium text-zinc-500 mb-1.5">Shop Name</label>
              <input
                type="text"
                value={shopName}
                onChange={(e) => { setShopName(e.target.value); setOwnerSaved(false); setOwnerError('') }}
                placeholder="My Barbershop"
                maxLength={100}
                className="w-full px-3 py-2.5 rounded-xl border border-zinc-200 text-zinc-900 text-sm focus:outline-none focus:border-zinc-500 bg-white"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-zinc-500 mb-1.5">WhatsApp Number</label>
              <input
                type="tel"
                value={shopPhone}
                onChange={(e) => { setShopPhone(e.target.value); setOwnerSaved(false); setOwnerError('') }}
                placeholder="601X-XXX XXXX"
                maxLength={30}
                className="w-full px-3 py-2.5 rounded-xl border border-zinc-200 text-zinc-900 text-sm focus:outline-none focus:border-zinc-500 bg-white"
              />
              <p className="mt-1.5 text-xs text-zinc-400">Include country code, no + (e.g. 60123456789)</p>
            </div>
            {ownerError && <p className="text-red-500 text-sm">{ownerError}</p>}
            <Button onClick={handleOwnerSave} disabled={ownerSaving} size="sm" className="w-full">
              {ownerSaving ? 'Saving…' : ownerSaved ? 'Saved!' : 'Save'}
            </Button>
          </div>
        )}
      </Collapsible>

      <Collapsible label="Default Shop Hours">
        {loading ? (
          <div className="flex justify-center py-4">
            <Spinner />
          </div>
        ) : (<>
        {/* Day strip */}
        <div className="flex gap-1.5 mb-3">
          {schedule.map((day) => {
            const isSelected = selectedDow === day.day_of_week
            return (
              <button
                key={day.day_of_week}
                onClick={() => setSelectedDow(isSelected ? null : day.day_of_week)}
                className={`relative flex flex-col items-center flex-1 py-2.5 rounded-xl border text-sm transition-colors cursor-pointer ${
                  isSelected
                    ? 'bg-zinc-900 border-zinc-900 text-white'
                    : 'bg-white border-zinc-200 text-zinc-700 hover:border-zinc-400'
                }`}
              >
                <span className="text-xs font-medium">{DAY_SHORT[day.day_of_week]}</span>
                <span className={`w-1.5 h-1.5 rounded-full mt-1.5 ${
                  day.is_closed ? 'bg-red-400' : (isSelected ? 'bg-green-400' : 'bg-green-400')
                }`} />
              </button>
            )
          })}
        </div>

        {/* Edit panel */}
        {selectedDay && (
          <div className="bg-white border border-zinc-200 rounded-2xl px-3 py-5 mb-4">
            <p className="text-sm font-semibold text-zinc-900 mb-4">{DAY_NAMES[selectedDay.day_of_week]}</p>

            <label className="flex items-center gap-2.5 mb-4 cursor-pointer select-none">
              <input
                type="checkbox"
                checked={selectedDay.is_closed}
                onChange={(e) => updateDay(selectedDay.day_of_week, { is_closed: e.target.checked })}
                className="w-4 h-4 rounded border-zinc-300 cursor-pointer"
              />
              <span className="text-sm text-zinc-700">Closed this day</span>
            </label>

            {!selectedDay.is_closed && (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-4">
                <div>
                  <label className="block text-xs font-medium text-zinc-500 mb-1.5">Opens at</label>
                  <TimePicker
                    value={selectedDay.start_time.slice(0, 5)}
                    onChange={(v) => updateDay(selectedDay.day_of_week, { start_time: v })}
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-zinc-500 mb-1.5">Closes at</label>
                  <TimePicker
                    value={selectedDay.end_time.slice(0, 5)}
                    onChange={(v) => updateDay(selectedDay.day_of_week, { end_time: v })}
                  />
                </div>
              </div>
            )}

            {saveError && <p className="text-red-500 text-sm mb-3">{saveError}</p>}

            <Button onClick={handleSave} disabled={saving} size="sm" className="w-full">
              {saving ? 'Saving…' : saved ? 'Saved!' : 'Save'}
            </Button>
          </div>
        )}
        </>)}
      </Collapsible>
      </div>
    </PageLayout>
  )
}
