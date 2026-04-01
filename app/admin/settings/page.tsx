'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { formatSlot } from '@/lib/format'
import { PageLayout } from '@/components/ui/PageLayout'
import { Card } from '@/components/ui/Card'
import { FormField } from '@/components/ui/FormField'
import { SelectField } from '@/components/ui/SelectField'
import { Button } from '@/components/ui/Button'

type Settings = {
  start_time: string
  end_time: string
  slot_interval: string
  booking_window: string
}

type BlockedSlot = {
  id: string
  date: string
  slot: string | null
}

export default function AdminSettingsPage() {
  const router = useRouter()

  const [settings, setSettings] = useState<Settings>({
    start_time: '09:00',
    end_time: '21:00',
    slot_interval: '30',
    booking_window: '14',
  })
  const [settingsLoading, setSettingsLoading] = useState(true)
  const [settingsSaving, setSettingsSaving] = useState(false)
  const [settingsError, setSettingsError] = useState('')
  const [settingsSaved, setSettingsSaved] = useState(false)

  const [blockedSlots, setBlockedSlots] = useState<BlockedSlot[]>([])
  const [blocksLoading, setBlocksLoading] = useState(true)
  const [blockDate, setBlockDate] = useState('')
  const [blockSlot, setBlockSlot] = useState('')
  const [blocking, setBlocking] = useState(false)
  const [blockError, setBlockError] = useState('')
  const [unblocking, setUnblocking] = useState<string | null>(null)

  useEffect(() => {
    async function load() {
      try {
        const [sRes, bRes] = await Promise.all([
          fetch('/api/admin/settings'),
          fetch('/api/admin/blocked-slots'),
        ])
        if (sRes.status === 401 || bRes.status === 401) {
          router.push('/admin/login')
          return
        }
        const sData = await sRes.json()
        const bData = await bRes.json()
        if (sRes.ok) setSettings((prev) => ({ ...prev, ...sData }))
        if (bRes.ok) setBlockedSlots(bData)
      } finally {
        setSettingsLoading(false)
        setBlocksLoading(false)
      }
    }
    load()
  }, [router])

  async function handleSaveSettings(e: { preventDefault(): void }) {
    e.preventDefault()
    setSettingsSaving(true)
    setSettingsError('')
    setSettingsSaved(false)
    try {
      const res = await fetch('/api/admin/settings', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(settings),
      })
      if (res.status === 401) { router.push('/admin/login'); return }
      if (res.ok) {
        setSettingsSaved(true)
        setTimeout(() => setSettingsSaved(false), 3000)
      } else {
        const data = await res.json()
        setSettingsError(data.error ?? 'Failed to save settings')
      }
    } catch {
      setSettingsError('Something went wrong')
    } finally {
      setSettingsSaving(false)
    }
  }

  async function handleBlock(e: { preventDefault(): void }) {
    e.preventDefault()
    if (!blockDate) return
    setBlocking(true)
    setBlockError('')
    try {
      const res = await fetch('/api/admin/blocked-slots', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ date: blockDate, slot: blockSlot || null }),
      })
      if (res.status === 401) { router.push('/admin/login'); return }
      if (res.ok) {
        const refreshed = await fetch('/api/admin/blocked-slots')
        if (refreshed.ok) setBlockedSlots(await refreshed.json())
        setBlockDate('')
        setBlockSlot('')
      } else {
        const data = await res.json()
        setBlockError(data.error ?? 'Failed to block')
      }
    } catch {
      setBlockError('Something went wrong')
    } finally {
      setBlocking(false)
    }
  }

  async function handleUnblock(item: BlockedSlot) {
    setUnblocking(item.id)
    try {
      const res = await fetch('/api/admin/blocked-slots', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ date: item.date, slot: item.slot }),
      })
      if (res.status === 401) { router.push('/admin/login'); return }
      if (res.ok) {
        setBlockedSlots((prev) => prev.filter((b) => b.id !== item.id))
      }
    } finally {
      setUnblocking(null)
    }
  }

  return (
    <PageLayout>
      {/* Header */}
      <div className="flex items-center gap-3 mb-8">
        <Link
          href="/admin/dashboard"
          className="w-9 h-9 flex items-center justify-center rounded-xl border border-zinc-200 bg-white text-zinc-500 hover:border-zinc-400 transition-colors"
          aria-label="Back to dashboard"
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
          </svg>
        </Link>
        <div>
          <h1 className="text-2xl font-bold text-zinc-900">Settings</h1>
          <p className="text-zinc-500 text-sm mt-0.5">Shop hours and availability</p>
        </div>
      </div>

      {/* Shop hours */}
      <Card className="px-5 py-5 mb-6">
        <h2 className="text-sm font-semibold text-zinc-900 mb-4">Shop Hours</h2>

        {settingsLoading ? (
          <p className="text-zinc-400 text-sm">Loading…</p>
        ) : (
          <form onSubmit={handleSaveSettings} className="flex flex-col gap-4">
            <div className="grid grid-cols-2 gap-3">
              <FormField
                label="Opens at"
                size="sm"
                type="time"
                value={settings.start_time}
                onChange={(e) => setSettings((s) => ({ ...s, start_time: e.target.value }))}
                required
              />
              <FormField
                label="Closes at"
                size="sm"
                type="time"
                value={settings.end_time}
                onChange={(e) => setSettings((s) => ({ ...s, end_time: e.target.value }))}
                required
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <SelectField
                label="Slot interval"
                size="sm"
                value={settings.slot_interval}
                onChange={(e) => setSettings((s) => ({ ...s, slot_interval: e.target.value }))}
              >
                <option value="15">15 min</option>
                <option value="30">30 min</option>
                <option value="45">45 min</option>
                <option value="60">60 min</option>
              </SelectField>

              <div>
                <label className="block text-xs font-medium text-zinc-500 mb-1.5">Booking window</label>
                <div className="relative">
                  <input
                    type="number"
                    value={settings.booking_window}
                    onChange={(e) => setSettings((s) => ({ ...s, booking_window: e.target.value }))}
                    min={1}
                    max={60}
                    required
                    className="w-full px-3 py-2.5 rounded-xl border border-zinc-200 text-zinc-900 text-sm focus:outline-none focus:border-zinc-500 bg-white pr-10"
                  />
                  <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-zinc-400">days</span>
                </div>
              </div>
            </div>

            {settingsError && <p className="text-red-500 text-sm">{settingsError}</p>}

            <Button type="submit" disabled={settingsSaving} size="sm" className="w-full">
              {settingsSaving ? 'Saving…' : settingsSaved ? 'Saved!' : 'Save Changes'}
            </Button>
          </form>
        )}
      </Card>

      {/* Block dates */}
      <Card className="px-5 py-5">
        <h2 className="text-sm font-semibold text-zinc-900 mb-4">Blocked Dates &amp; Slots</h2>

        <form onSubmit={handleBlock} className="flex flex-col gap-3 mb-5">
          <div className="grid grid-cols-2 gap-3">
            <FormField
              label="Date"
              size="sm"
              type="date"
              value={blockDate}
              onChange={(e) => setBlockDate(e.target.value)}
              required
            />
            <FormField
              label={<>Time <span className="text-zinc-400 font-normal">(empty = full day)</span></>}
              size="sm"
              type="time"
              value={blockSlot}
              onChange={(e) => setBlockSlot(e.target.value)}
            />
          </div>

          {blockError && <p className="text-red-500 text-sm">{blockError}</p>}

          <Button type="submit" disabled={blocking || !blockDate} size="sm" className="w-full">
            {blocking ? 'Blocking…' : 'Block'}
          </Button>
        </form>

        {blocksLoading ? (
          <p className="text-zinc-400 text-sm">Loading…</p>
        ) : blockedSlots.length === 0 ? (
          <p className="text-zinc-400 text-sm">No blocked dates or slots.</p>
        ) : (
          <ul className="flex flex-col gap-2">
            {blockedSlots.map((item) => (
              <li
                key={item.id}
                className="flex items-center justify-between gap-3 py-2.5 border-t border-zinc-100 first:border-t-0"
              >
                <div>
                  <p className="text-sm font-medium text-zinc-800">{item.date}</p>
                  <p className="text-xs text-zinc-400 mt-0.5">
                    {item.slot ? formatSlot(item.slot) : 'Full day'}
                  </p>
                </div>
                <Button
                  variant="ghost-destructive"
                  onClick={() => handleUnblock(item)}
                  disabled={unblocking === item.id}
                >
                  {unblocking === item.id ? 'Removing…' : 'Remove'}
                </Button>
              </li>
            ))}
          </ul>
        )}
      </Card>
    </PageLayout>
  )
}
