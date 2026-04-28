'use client'

import { useState, useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { PageLayout } from '@/components/PageLayout'
import { Button } from '@/components/Button'
import { Collapsible } from '@/components/Collapsible'
import { Spinner } from '@/components/Spinner'
import { Icon } from '@/components/Icon'

export default function AdminSettingsPage() {
  const router = useRouter()
  const [loading, setLoading] = useState(true)

  const [shopName, setShopName] = useState('')
  const [shopPhone, setShopPhone] = useState('')
  const [ownerSaving, setOwnerSaving] = useState(false)
  const [ownerSaved, setOwnerSaved] = useState(false)
  const [ownerError, setOwnerError] = useState('')

  const load = useCallback(async () => {
    const res = await fetch('/api/admin/settings')
    if (res.status === 401) { router.push('/login'); return }
    if (res.ok) {
      const data = await res.json()
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

  return (
    <PageLayout>
      {/* Header */}
      <div className="px-5 pt-8 pb-6">
        <div className="h-8 flex items-center mb-1.5">
          <Link
            href="/dashboard"
            className="flex items-center gap-1 text-sm text-zinc-400 hover:text-zinc-600 transition-colors"
            aria-label="Back to dashboard"
          >
            <Icon name="chevron-left" className="w-4 h-4" />
            Back
          </Link>
        </div>
        <h1 className="text-[1.6rem] font-bold text-zinc-900 leading-tight">Settings</h1>
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
                  placeholder="601XXXXXXXXX"
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
      </div>
    </PageLayout>
  )
}
