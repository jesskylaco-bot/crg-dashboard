'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import { Card, CardContent } from '@/components/ui/card'
import { Announcement } from '@/lib/types/database'
import { getGreeting, formatCurrency } from '@/lib/utils'
import { useUser } from '@/lib/contexts/user-context'
import {
  ClipboardList,
  Users,
  GraduationCap,
  FileText,
  AlertCircle,
  Plus,
  Pencil,
  Trash2,
  X,
} from 'lucide-react'

export default function DashboardPage() {
  const { profile, permissions } = useUser()
  const canViewReports = permissions?.canViewReports
  const canManageAnnouncements = permissions?.canManageAnnouncements
  const [stats, setStats] = useState({ active: 0, pending: 0, closed: 0 })
  const [announcements, setAnnouncements] = useState<Announcement[]>([])
  const [stageCounts, setStageCounts] = useState<{ stage: string; count: number; value: number }[]>([])
  const [agentStats, setAgentStats] = useState<{ name: string; deals: number; volume: number }[]>([])
  const [monthlyStats, setMonthlyStats] = useState<{ month: string; count: number }[]>([])
  const [loading, setLoading] = useState(true)
  const supabase = createClient()

  const [showAnnModal, setShowAnnModal] = useState(false)
  const [editingAnn, setEditingAnn] = useState<Announcement | null>(null)
  const [deletingAnn, setDeletingAnn] = useState<Announcement | null>(null)
  const [annForm, setAnnForm] = useState({ title: '', body: '' })
  const [annSaving, setAnnSaving] = useState(false)

  function openAddAnn() {
    setAnnForm({ title: '', body: '' })
    setShowAnnModal(true)
  }

  function openEditAnn(a: Announcement) {
    setAnnForm({ title: a.title, body: a.body })
    setEditingAnn(a)
    setShowAnnModal(true)
  }

  function closeAnnModal() {
    setShowAnnModal(false)
    setEditingAnn(null)
  }

  async function saveAnn() {
    if (!annForm.title.trim()) return
    setAnnSaving(true)
    try {
      if (editingAnn) {
        await supabase
          .from('announcements')
          .update({ title: annForm.title.trim(), body: annForm.body.trim() })
          .eq('id', editingAnn.id)
      } else {
        await supabase.from('announcements').insert({
          title: annForm.title.trim(),
          body: annForm.body.trim(),
          author_id: profile?.id || null,
          is_active: true,
        })
      }
      closeAnnModal()
      await reloadAnnouncements()
    } catch {
      alert('Failed to save announcement.')
    } finally {
      setAnnSaving(false)
    }
  }

  async function deleteAnn() {
    if (!deletingAnn) return
    setAnnSaving(true)
    try {
      await supabase.from('announcements').delete().eq('id', deletingAnn.id)
      setDeletingAnn(null)
      await reloadAnnouncements()
    } catch {
      alert('Failed to delete announcement.')
    } finally {
      setAnnSaving(false)
    }
  }

  async function reloadAnnouncements() {
    const { data } = await supabase
      .from('announcements')
      .select('*')
      .eq('is_active', true)
      .order('created_at', { ascending: false })
    if (data) setAnnouncements(data)
  }

  useEffect(() => {
    async function loadData() {

      const [txResult, annResult] = await Promise.all([
        supabase.from('transactions').select('stage, price, closing_date, agent:team_members!transactions_agent_id_fkey(full_name)'),
        supabase.from('announcements').select('*').eq('is_active', true).order('created_at', { ascending: false }),
      ])

      if (txResult.data) {
        const txs = (txResult.data as unknown as { stage: string; price: number | null; closing_date: string | null; agent: { full_name: string } | { full_name: string }[] | null }[]).map((t) => ({
          ...t,
          agent: Array.isArray(t.agent) ? t.agent[0] || null : t.agent,
        }))

        let a = 0, p = 0, c = 0
        txs.forEach((t) => {
          if (t.stage === 'closed') c++
          else if (['pending', 'under_contract'].includes(t.stage)) p++
          else if (!['lost', 'withdrawn', 'archived'].includes(t.stage)) a++
        })
        setStats({ active: a, pending: p, closed: c })

        const stageLabels: Record<string, string> = {
          lead: 'Lead', active: 'Active', offer_stage: 'Offer', pending: 'Pending',
          under_contract: 'Contract', closing: 'Closing', closed: 'Closed',
        }
        const stageData: Record<string, { count: number; value: number }> = {}
        txs.forEach((t) => {
          if (!stageLabels[t.stage]) return
          if (!stageData[t.stage]) stageData[t.stage] = { count: 0, value: 0 }
          stageData[t.stage].count++
          stageData[t.stage].value += Number(t.price) || 0
        })
        setStageCounts(
          Object.entries(stageLabels)
            .filter(([key]) => stageData[key])
            .map(([key, label]) => ({ stage: label, count: stageData[key].count, value: stageData[key].value }))
        )

        const agentMap: Record<string, { deals: number; volume: number }> = {}
        txs.forEach((t) => {
          const name = t.agent?.full_name || 'Unassigned'
          if (!agentMap[name]) agentMap[name] = { deals: 0, volume: 0 }
          agentMap[name].deals++
          agentMap[name].volume += Number(t.price) || 0
        })
        setAgentStats(
          Object.entries(agentMap)
            .map(([name, data]) => ({ name, ...data }))
            .sort((x, y) => y.deals - x.deals)
        )

        const monthMap: Record<string, number> = {}
        txs.forEach((t) => {
          if (t.stage === 'closed' && t.closing_date) {
            const d = new Date(t.closing_date)
            const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
            monthMap[key] = (monthMap[key] || 0) + 1
          }
        })
        const sortedMonths = Object.entries(monthMap).sort(([a], [b]) => a.localeCompare(b)).slice(-6)
        setMonthlyStats(
          sortedMonths.map(([key, count]) => {
            const [y, m] = key.split('-')
            const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']
            return { month: `${monthNames[Number(m) - 1]} ${y.slice(2)}`, count }
          })
        )
      }

      if (annResult.data) {
        setAnnouncements(annResult.data)
      }

      setLoading(false)
    }

    loadData()
  }, [supabase])

  const greeting = getGreeting()

  const quickActions = [
    {
      href: '/dashboard/transactions',
      label: 'Active Deals',
      icon: ClipboardList,
      description: 'View and manage transactions',
    },
    {
      href: '/dashboard/team',
      label: 'Team Directory',
      icon: Users,
      description: 'Contact team members',
    },
    {
      href: '/dashboard/training',
      label: 'Training & SOPs',
      icon: GraduationCap,
      description: 'Access resources',
    },
    {
      href: '/dashboard/forms',
      label: 'Forms & Docs',
      icon: FileText,
      description: 'Submit forms',
    },
  ]

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="h-32 bg-gray-200 rounded-xl animate-pulse" />
        <div className="grid grid-cols-3 gap-4">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-24 bg-gray-200 rounded-xl animate-pulse" />
          ))}
        </div>
      </div>
    )
  }

  return (
    <div>
      {/* Hero Section - matches original */}
      <div className="bg-black px-5 pt-7 pb-6 text-white">
        <p className="text-sage-400 text-[11px] font-medium tracking-[0.12em] uppercase mb-1.5">
          {greeting}
        </p>
        <h1 className="font-serif text-[34px] font-medium leading-tight mb-2">
          Cobb Realty Group
        </h1>
        <p className="text-gray-400 text-[12px] leading-relaxed max-w-[300px]">
          Your home base for listings, buyers, contracts, training, and more.
        </p>
      </div>

      {/* Stats - matches original pill style */}
      <div className="bg-black px-5 pb-6">
        <div className="grid grid-cols-3 gap-2.5">
          <div className="bg-white/[0.08] border border-white/[0.07] rounded-[9px] py-3.5 px-2.5 text-center hover:bg-white/[0.13] transition-colors">
            <div className="font-serif text-[30px] font-semibold text-white leading-none">{stats.active}</div>
            <div className="text-[10px] text-sage-300 mt-1.5 tracking-wide">Active</div>
          </div>
          <div className="bg-white/[0.08] border border-white/[0.07] rounded-[9px] py-3.5 px-2.5 text-center hover:bg-white/[0.13] transition-colors">
            <div className="font-serif text-[30px] font-semibold text-white leading-none">{stats.pending}</div>
            <div className="text-[10px] text-sage-300 mt-1.5 tracking-wide">Pending</div>
          </div>
          <div className="bg-white/[0.08] border border-white/[0.07] rounded-[9px] py-3.5 px-2.5 text-center hover:bg-white/[0.13] transition-colors">
            <div className="font-serif text-[30px] font-semibold text-white leading-none">{stats.closed}</div>
            <div className="text-[10px] text-sage-300 mt-1.5 tracking-wide">Closed</div>
          </div>
        </div>
      </div>

      {/* Reporting */}
      {canViewReports && (
        <>
          {/* Pipeline by Stage */}
          {stageCounts.length > 0 && (() => {
            const stageColors: Record<string, { dot: string; bg: string; border: string }> = {
              'Lead':     { dot: '#9e9e9e', bg: '#fafafa', border: '#e8e8e4' },
              'Active':   { dot: '#1565c0', bg: '#f0f7ff', border: '#c8ddf5' },
              'Offer':    { dot: '#283593', bg: '#f0f1fa', border: '#c8cae8' },
              'Pending':  { dot: '#e65100', bg: '#fff8f0', border: '#f5dcc8' },
              'Contract': { dot: '#e65100', bg: '#fff8f0', border: '#f5dcc8' },
              'Closing':  { dot: '#f57c00', bg: '#fff8f0', border: '#f5dcc8' },
              'Closed':   { dot: '#2e7d32', bg: '#f0f7f0', border: '#c8e6c9' },
            }
            return (
              <div className="px-5 pt-6 pb-4">
                <div className="flex items-center gap-2.5 mb-3">
                  <span className="w-[3px] h-3 bg-sage-500 rounded-sm" />
                  <span className="text-[10px] font-medium tracking-[0.12em] uppercase text-gray-400">Pipeline by Stage</span>
                </div>
                <div className="grid grid-cols-2 gap-2.5">
                  {stageCounts.map((s) => {
                    const colors = stageColors[s.stage] || stageColors['Lead']
                    return (
                      <div
                        key={s.stage}
                        className="rounded-[18px] py-4 px-4 border transition-all duration-200 hover:shadow-md"
                        style={{ background: colors.bg, borderColor: colors.border }}
                      >
                        <div className="flex items-center gap-2 mb-2">
                          <span className="w-2 h-2 rounded-full flex-shrink-0" style={{ background: colors.dot }} />
                          <span className="text-[11px] font-medium text-[#666660]">{s.stage}</span>
                        </div>
                        <div className="font-serif text-[28px] font-semibold text-[#0a0a0a] leading-none">{s.count}</div>
                        <div className="text-[10px] text-[#a0a09a] mt-1.5">{formatCurrency(s.value)}</div>
                      </div>
                    )
                  })}
                </div>
              </div>
            )
          })()}

          {/* Agent Performance */}
          {agentStats.length > 0 && (
            <div className="px-5 pb-4">
              <div className="flex items-center gap-2.5 mb-3">
                <span className="w-[3px] h-3 bg-sage-500 rounded-sm" />
                <span className="text-[10px] font-medium tracking-[0.12em] uppercase text-gray-400">Agent Performance</span>
              </div>
              <div className="space-y-1.5">
                {agentStats.slice(0, 8).map((agent, i) => (
                  <div key={agent.name} className="bg-white rounded-[10px] py-2.5 px-3.5 border border-[#e8e8e4] flex items-center gap-3">
                    <span className="text-[11px] font-semibold text-[#8aab8e] w-5 flex-shrink-0">#{i + 1}</span>
                    <span className="text-[13px] font-medium flex-1 min-w-0 truncate">{agent.name}</span>
                    <span className="text-[11px] text-[#666660] flex-shrink-0">{agent.deals} deal{agent.deals !== 1 ? 's' : ''}</span>
                    <span className="text-[11px] font-semibold text-[#0a0a0a] flex-shrink-0">{formatCurrency(agent.volume)}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Monthly Trends */}
          {monthlyStats.length > 0 && (
            <div className="px-5 pb-4">
              <div className="flex items-center gap-2.5 mb-3">
                <span className="w-[3px] h-3 bg-sage-500 rounded-sm" />
                <span className="text-[10px] font-medium tracking-[0.12em] uppercase text-gray-400">Deals Closed by Month</span>
              </div>
              <div className="flex items-end gap-2 h-28">
                {monthlyStats.map((m) => {
                  const maxCount = Math.max(...monthlyStats.map((x) => x.count))
                  const pct = maxCount > 0 ? (m.count / maxCount) * 100 : 0
                  return (
                    <div key={m.month} className="flex-1 flex flex-col items-center gap-1">
                      <span className="text-[10px] font-semibold text-[#0a0a0a]">{m.count}</span>
                      <div className="w-full bg-[#f0f0ec] rounded-t-[4px] relative" style={{ height: `${Math.max(pct, 8)}%` }}>
                        <div className="absolute inset-0 bg-[#8aab8e] rounded-t-[4px]" />
                      </div>
                      <span className="text-[9px] text-[#a0a09a]">{m.month}</span>
                    </div>
                  )
                })}
              </div>
            </div>
          )}
        </>
      )}

      {/* Onboarding Alert for New Agents */}
      {profile?.role?.name === 'New Agent' && profile?.onboarding_status !== 'approved' && (
        <div className="mx-5 mt-6">
          <Card className="border-amber-200 bg-amber-50">
            <CardContent className="p-4 flex items-start gap-3">
              <AlertCircle className="h-5 w-5 text-amber-600 mt-0.5" />
              <div>
                <h3 className="font-medium text-amber-900">Complete Your Onboarding</h3>
                <p className="text-sm text-amber-700 mt-1">
                  You have pending onboarding tasks. Complete them to get full access to the platform.
                </p>
                <Link
                  href="/dashboard/onboarding"
                  className="inline-block mt-3 py-2 px-4 bg-[#0a0a0a] text-white rounded-[9px] text-[12px] font-medium hover:bg-[#1a1a1a] transition-colors"
                >
                  Start Onboarding
                </Link>
              </div>
            </CardContent>
          </Card>
        </div>
      )}


      {/* Team Video */}
      <div className="flex items-center gap-2.5 px-5 mt-6 mb-3.5">
        <span className="w-[3px] h-3 bg-sage-500 rounded-sm" />
        <span className="text-[10px] font-medium tracking-[0.12em] uppercase text-gray-400">
          Team Video
        </span>
      </div>
      <div className="px-5 pb-7">
        <iframe
          className="w-full rounded-[14px] border-none block"
          height="200"
          loading="lazy"
          src="https://www.youtube.com/embed/6MH8uQLcK60?si=sDmaoWSlpXmo-v4n"
          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
          allowFullScreen
        />
      </div>

      {/* Team Updates Section */}
      <div className="flex items-center justify-between px-5 mb-3.5">
        <div className="flex items-center gap-2.5">
          <span className="w-[3px] h-3 bg-sage-500 rounded-sm" />
          <span className="text-[10px] font-medium tracking-[0.12em] uppercase text-gray-400">
            Team Updates
          </span>
        </div>
        {canManageAnnouncements && (
          <button
            onClick={openAddAnn}
            className="flex items-center gap-1 px-2.5 py-1 bg-[#8aab8e] text-white rounded-[7px] text-[10px] font-medium hover:bg-[#7a9b7e] transition-colors"
          >
            <Plus className="w-3 h-3" />
            Add
          </button>
        )}
      </div>

      {/* Announcements */}
      <div className="px-5 pb-7 space-y-2.5">
        {announcements.length === 0 ? (
          <div className="text-center py-6 text-[#a0a09a] text-[12px]">No announcements yet.</div>
        ) : (
          announcements.map((a) => (
            <div key={a.id} className="bg-white rounded-[14px] p-4 border border-gray-200 border-l-[3px] border-l-sage-500 shadow-sm">
              <div className="flex items-start justify-between gap-2">
                <div className="flex-1 min-w-0">
                  <h4 className="font-semibold text-[14px] mb-1.5 leading-tight">{a.title}</h4>
                  <p className="text-[12px] text-gray-500 leading-relaxed">{a.body}</p>
                </div>
                {canManageAnnouncements && (
                  <div className="flex gap-1 flex-shrink-0">
                    <button onClick={() => openEditAnn(a)} className="w-6 h-6 rounded-full border border-[#e8e8e4] bg-[#f5f5f3] flex items-center justify-center text-[#a0a09a] hover:bg-[#8aab8e] hover:text-white hover:border-[#8aab8e] transition-all duration-200">
                      <Pencil className="w-2.5 h-2.5" />
                    </button>
                    <button onClick={() => setDeletingAnn(a)} className="w-6 h-6 rounded-full border border-[#e8e8e4] bg-[#f5f5f3] flex items-center justify-center text-[#a0a09a] hover:bg-[#c0392b] hover:text-white hover:border-[#c0392b] transition-all duration-200">
                      <Trash2 className="w-2.5 h-2.5" />
                    </button>
                  </div>
                )}
              </div>
            </div>
          ))
        )}
      </div>

      {/* Announcement Modal */}
      {showAnnModal && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center">
          <div className="fixed inset-0 bg-black/50" onClick={closeAnnModal} />
          <div className="relative w-full max-w-[480px] bg-white rounded-t-[20px] sm:rounded-[20px] p-5 pb-8">
            <div className="flex items-center justify-between mb-5">
              <h2 className="font-serif text-[20px] font-medium">{editingAnn ? 'Edit Announcement' : 'New Announcement'}</h2>
              <button onClick={closeAnnModal} className="p-1.5 rounded-full hover:bg-[#f5f5f3] transition-colors">
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="space-y-3.5">
              <div>
                <label className="block text-[11px] font-medium text-[#a0a09a] uppercase tracking-[0.08em] mb-1.5">Title *</label>
                <input
                  type="text"
                  value={annForm.title}
                  onChange={(e) => setAnnForm({ ...annForm, title: e.target.value })}
                  className="w-full py-2.5 px-3.5 border border-[#e8e8e4] rounded-[9px] text-[14px] bg-[#f5f5f3] outline-none font-sans transition-[border-color] duration-200 focus:border-[#8aab8e]"
                  placeholder="Announcement title"
                />
              </div>
              <div>
                <label className="block text-[11px] font-medium text-[#a0a09a] uppercase tracking-[0.08em] mb-1.5">Body</label>
                <textarea
                  value={annForm.body}
                  onChange={(e) => setAnnForm({ ...annForm, body: e.target.value })}
                  className="w-full py-2.5 px-3.5 border border-[#e8e8e4] rounded-[9px] text-[14px] bg-[#f5f5f3] outline-none font-sans transition-[border-color] duration-200 focus:border-[#8aab8e] resize-none h-24"
                  placeholder="What's the update?"
                />
              </div>
            </div>
            <button
              onClick={saveAnn}
              disabled={annSaving || !annForm.title.trim()}
              className="mt-5 w-full py-3 bg-[#0a0a0a] text-white rounded-[10px] text-[14px] font-medium hover:bg-[#1a1a1a] transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {annSaving ? 'Saving...' : 'Save'}
            </button>
          </div>
        </div>
      )}

      {/* Delete Announcement Confirm */}
      {deletingAnn && (
        <div className="fixed inset-0 z-50 flex items-center justify-center px-5">
          <div className="fixed inset-0 bg-black/50" onClick={() => setDeletingAnn(null)} />
          <div className="relative w-full max-w-[360px] bg-white rounded-[16px] p-5">
            <h3 className="font-serif text-[18px] font-medium mb-2">Delete Announcement</h3>
            <p className="text-[13px] text-[#6b6b66] leading-[1.5] mb-5">
              Are you sure you want to delete <strong>{deletingAnn.title}</strong>?
            </p>
            <div className="flex gap-2.5">
              <button onClick={() => setDeletingAnn(null)} className="flex-1 py-2.5 border border-[#e8e8e4] rounded-[10px] text-[13px] font-medium hover:bg-[#f5f5f3] transition-colors">Cancel</button>
              <button onClick={deleteAnn} disabled={annSaving} className="flex-1 py-2.5 bg-[#c0392b] text-white rounded-[10px] text-[13px] font-medium hover:bg-[#a93226] transition-colors disabled:opacity-50">
                {annSaving ? 'Deleting...' : 'Delete'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Quick Access */}
      <div className="flex items-center gap-2.5 px-5 mb-3.5">
        <span className="w-[3px] h-3 bg-sage-500 rounded-sm" />
        <span className="text-[10px] font-medium tracking-[0.12em] uppercase text-gray-400">
          Quick Access
        </span>
      </div>

      <div className="grid grid-cols-2 gap-3 px-5 mb-7">
        {quickActions.map((action) => (
          <Link key={action.href} href={action.href}>
            <div className="bg-white rounded-[14px] p-4 border border-gray-200 shadow-sm hover:shadow-md hover:-translate-y-0.5 active:scale-[0.97] transition-all cursor-pointer">
              <div className="flex items-center justify-between mb-2.5">
                <div className="w-9 h-9 bg-black rounded-[9px] flex items-center justify-center">
                  <action.icon className="h-[18px] w-[18px] text-sage-400" />
                </div>
                <svg className="h-3.5 w-3.5 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                </svg>
              </div>
              <h3 className="font-medium text-[13px]">{action.label}</h3>
            </div>
          </Link>
        ))}
      </div>

      {/* Company Calendar */}
      <div className="flex items-center gap-2.5 px-5 mb-3.5">
        <span className="w-[3px] h-3 bg-sage-500 rounded-sm" />
        <span className="text-[10px] font-medium tracking-[0.12em] uppercase text-gray-400">
          Company Calendar
        </span>
      </div>
      <div className="px-5 pb-7">
        <iframe
          className="w-full rounded-[14px] border-none block"
          loading="lazy"
          height="350"
          src="https://calendar.google.com/calendar/embed?src=c_f33122657a99025e777b0b8e88b8a99964039423e596283c13d37c226f16825f%40group.calendar.google.com"
          style={{ overflow: 'hidden' }}
        />
      </div>

      {/* Social Links */}
      <div className="flex items-center gap-2.5 px-5 mb-3.5 justify-center">
        <span className="text-[10px] font-medium tracking-[0.12em] uppercase text-gray-400">
          Connect With Us
        </span>
      </div>
      <div className="flex justify-center gap-3.5 px-5 pb-7">
        <a href="https://www.facebook.com/MCobbRealtor/" target="_blank" rel="noopener noreferrer" className="w-9 h-9 rounded-full border border-[#e8e8e4] bg-[#f5f5f3] flex items-center justify-center text-[#0a0a0a] hover:bg-[#0a0a0a] hover:text-white hover:border-[#0a0a0a] transition-all duration-200">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="18" height="18"><path d="M18 2h-3a5 5 0 0 0-5 5v3H7v4h3v8h4v-8h3l1-4h-4V7a1 1 0 0 1 1-1h3z"/></svg>
        </a>
        <a href="https://www.instagram.com/cobbrealtygroup/" target="_blank" rel="noopener noreferrer" className="w-9 h-9 rounded-full border border-[#e8e8e4] bg-[#f5f5f3] flex items-center justify-center text-[#0a0a0a] hover:bg-[#0a0a0a] hover:text-white hover:border-[#0a0a0a] transition-all duration-200">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="18" height="18"><rect x="2" y="2" width="20" height="20" rx="5" ry="5"/><path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z"/><line x1="17.5" y1="6.5" x2="17.51" y2="6.5"/></svg>
        </a>
        <a href="https://www.linkedin.com/company/cobbrealtygroup?trk=public_profile_topcard-current-company" target="_blank" rel="noopener noreferrer" className="w-9 h-9 rounded-full border border-[#e8e8e4] bg-[#f5f5f3] flex items-center justify-center text-[#0a0a0a] hover:bg-[#0a0a0a] hover:text-white hover:border-[#0a0a0a] transition-all duration-200">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="18" height="18"><path d="M16 8a6 6 0 0 1 6 6v7h-4v-7a2 2 0 0 0-2-2 2 2 0 0 0-2 2v7h-4v-7a6 6 0 0 1 6-6z"/><rect x="2" y="9" width="4" height="12"/><circle cx="4" cy="4" r="2"/></svg>
        </a>
      </div>
    </div>
  )
}
