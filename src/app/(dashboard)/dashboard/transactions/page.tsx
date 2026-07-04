'use client'

import { useEffect, useState, useRef } from 'react'
import { createClient } from '@/lib/supabase/client'
import { formatCurrency } from '@/lib/utils'
import { Transaction, TeamMember, TransactionStage } from '@/lib/types/database'
import { Plus, Pencil, Trash2, X, ChevronDown } from 'lucide-react'
import { useUser } from '@/lib/contexts/user-context'

const supabase = createClient()

const STAGES: { value: TransactionStage; label: string }[] = [
  { value: 'lead', label: 'Lead' },
  { value: 'active', label: 'Active' },
  { value: 'offer_stage', label: 'Offer' },
  { value: 'pending', label: 'Pending' },
  { value: 'under_contract', label: 'Contract' },
  { value: 'closing', label: 'Closing' },
  { value: 'closed', label: 'Closed' },
  { value: 'archived', label: 'Archived' },
  { value: 'lost', label: 'Lost' },
  { value: 'withdrawn', label: 'Withdrawn' },
]

const PIPELINE_STAGES: { value: TransactionStage; label: string; color: string; bg: string }[] = [
  { value: 'lead', label: 'Lead', color: '#616161', bg: '#f5f5f5' },
  { value: 'active', label: 'Active', color: '#1565c0', bg: '#e3f2fd' },
  { value: 'offer_stage', label: 'Offer', color: '#283593', bg: '#e8eaf6' },
  { value: 'pending', label: 'Pending', color: '#e65100', bg: '#fff3e0' },
  { value: 'under_contract', label: 'Contract', color: '#e65100', bg: '#fff3e0' },
  { value: 'closing', label: 'Closing', color: '#e65100', bg: '#fff3e0' },
  { value: 'closed', label: 'Closed', color: '#2e7d32', bg: '#e8f5e9' },
]

function getStageBadge(stage: string): { cls: string; label: string } {
  switch (stage) {
    case 'closed':
      return { cls: 'bg-[#e8f5e9] text-[#2e7d32]', label: 'Closed' }
    case 'pending':
    case 'under_contract':
      return { cls: 'bg-[#fff3e0] text-[#e65100]', label: stage === 'under_contract' ? 'Under Contract' : 'Pending' }
    case 'closing':
      return { cls: 'bg-[#fff3e0] text-[#e65100]', label: 'Closing' }
    case 'lost':
    case 'withdrawn':
      return { cls: 'bg-[#fce4ec] text-[#880e4f]', label: stage === 'lost' ? 'Lost' : 'Withdrawn' }
    case 'archived':
      return { cls: 'bg-[#f3e5f5] text-[#6a1b9a]', label: 'Archived' }
    case 'offer_stage':
      return { cls: 'bg-[#e8eaf6] text-[#283593]', label: 'Offer Stage' }
    case 'lead':
      return { cls: 'bg-[#f5f5f5] text-[#616161]', label: 'Lead' }
    default:
      return { cls: 'bg-[#e3f2fd] text-[#1565c0]', label: 'Active' }
  }
}

const FILTER_OPTIONS = ['All', 'Active', 'Pending', 'Closed', 'Lost']

interface TransactionFormData {
  property_address: string
  client_name: string
  client_email: string
  client_phone: string
  agent_id: string
  stage: TransactionStage
  price: string
  listing_date: string
  offer_date: string
  contract_date: string
  closing_date: string
  notes: string
  zillow_link: string
  drive_folder_link: string
}

const emptyForm: TransactionFormData = {
  property_address: '',
  client_name: '',
  client_email: '',
  client_phone: '',
  agent_id: '',
  stage: 'lead',
  price: '',
  listing_date: '',
  offer_date: '',
  contract_date: '',
  closing_date: '',
  notes: '',
  zillow_link: '',
  drive_folder_link: '',
}

function StagePicker({
  currentStage,
  onSelect,
  onClose,
}: {
  currentStage: TransactionStage
  onSelect: (stage: TransactionStage) => void
  onClose: () => void
}) {
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) onClose()
    }
    document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [onClose])

  return (
    <div ref={ref} className="absolute right-0 top-full mt-1 z-50 w-44 bg-white border border-[#e8e8e4] rounded-[10px] shadow-lg py-1 overflow-hidden">
      {STAGES.map((s) => (
        <button
          key={s.value}
          onClick={() => onSelect(s.value)}
          className={`w-full text-left px-3 py-2 text-[12px] hover:bg-[#f5f5f3] transition-colors flex items-center justify-between ${
            s.value === currentStage ? 'font-semibold text-[#0a0a0a] bg-[#f5f5f3]' : 'text-[#666660]'
          }`}
        >
          {s.label}
          {s.value === currentStage && <span className="text-[#8aab8e]">●</span>}
        </button>
      ))}
    </div>
  )
}

function TransactionModal({
  open,
  title,
  initialData,
  teamMembers,
  saving,
  onSave,
  onClose,
}: {
  open: boolean
  title: string
  initialData: TransactionFormData
  teamMembers: TeamMember[]
  saving: boolean
  onSave: (data: TransactionFormData) => void
  onClose: () => void
}) {
  const [form, setForm] = useState<TransactionFormData>(initialData)

  useEffect(() => {
    if (open) setForm(initialData)
  }, [open, initialData])

  if (!open) return null

  const inputCls = "w-full py-2.5 px-3.5 border border-[#e8e8e4] rounded-[9px] text-[14px] bg-[#f5f5f3] outline-none font-sans transition-[border-color] duration-200 focus:border-[#8aab8e]"
  const labelCls = "block text-[11px] font-medium text-[#a0a09a] uppercase tracking-[0.08em] mb-1.5"

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center">
      <div className="fixed inset-0 bg-black/50" onClick={onClose} />
      <div className="relative w-full max-w-[480px] bg-white rounded-t-[20px] sm:rounded-[20px] p-5 pb-8 max-h-[85vh] overflow-y-auto">
        <div className="flex items-center justify-between mb-5">
          <h2 className="font-serif text-[20px] font-medium">{title}</h2>
          <button onClick={onClose} className="p-1.5 rounded-full hover:bg-[#f5f5f3] transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="space-y-3.5">
          <div>
            <label className={labelCls}>Property Address *</label>
            <input type="text" value={form.property_address} onChange={(e) => setForm({ ...form, property_address: e.target.value })} className={inputCls} placeholder="123 Main St, Atlanta, GA" />
          </div>
          <div>
            <label className={labelCls}>Client Name *</label>
            <input type="text" value={form.client_name} onChange={(e) => setForm({ ...form, client_name: e.target.value })} className={inputCls} placeholder="John & Jane Doe" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className={labelCls}>Client Email</label>
              <input type="email" value={form.client_email} onChange={(e) => setForm({ ...form, client_email: e.target.value })} className={inputCls} placeholder="client@email.com" />
            </div>
            <div>
              <label className={labelCls}>Client Phone</label>
              <input type="tel" value={form.client_phone} onChange={(e) => setForm({ ...form, client_phone: e.target.value })} className={inputCls} placeholder="(555) 123-4567" />
            </div>
          </div>
          <div>
            <label className={labelCls}>Agent</label>
            <select value={form.agent_id} onChange={(e) => setForm({ ...form, agent_id: e.target.value })} className={inputCls}>
              <option value="">Select agent...</option>
              {teamMembers.map((m) => (
                <option key={m.id} value={m.id}>{m.full_name}</option>
              ))}
            </select>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className={labelCls}>Stage</label>
              <select value={form.stage} onChange={(e) => setForm({ ...form, stage: e.target.value as TransactionStage })} className={inputCls}>
                {STAGES.map((s) => (
                  <option key={s.value} value={s.value}>{s.label}</option>
                ))}
              </select>
            </div>
            <div>
              <label className={labelCls}>Price</label>
              <input type="number" value={form.price} onChange={(e) => setForm({ ...form, price: e.target.value })} className={inputCls} placeholder="350000" />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className={labelCls}>Listing Date</label>
              <input type="date" value={form.listing_date} onChange={(e) => setForm({ ...form, listing_date: e.target.value })} className={inputCls} />
            </div>
            <div>
              <label className={labelCls}>Offer Date</label>
              <input type="date" value={form.offer_date} onChange={(e) => setForm({ ...form, offer_date: e.target.value })} className={inputCls} />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className={labelCls}>Contract Date</label>
              <input type="date" value={form.contract_date} onChange={(e) => setForm({ ...form, contract_date: e.target.value })} className={inputCls} />
            </div>
            <div>
              <label className={labelCls}>Closing Date</label>
              <input type="date" value={form.closing_date} onChange={(e) => setForm({ ...form, closing_date: e.target.value })} className={inputCls} />
            </div>
          </div>
          <div>
            <label className={labelCls}>Notes</label>
            <textarea value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} className={inputCls + " resize-none h-20"} placeholder="Additional notes..." />
          </div>
          <div>
            <label className={labelCls}>Zillow Link</label>
            <input type="url" value={form.zillow_link} onChange={(e) => setForm({ ...form, zillow_link: e.target.value })} className={inputCls} placeholder="https://zillow.com/..." />
          </div>
          <div>
            <label className={labelCls}>Drive Folder Link</label>
            <input type="url" value={form.drive_folder_link} onChange={(e) => setForm({ ...form, drive_folder_link: e.target.value })} className={inputCls} placeholder="https://drive.google.com/..." />
          </div>
        </div>

        <button
          onClick={() => {
            if (!form.property_address.trim() || !form.client_name.trim()) return
            onSave(form)
          }}
          disabled={saving || !form.property_address.trim() || !form.client_name.trim()}
          className="mt-5 w-full py-3 bg-[#0a0a0a] text-white rounded-[10px] text-[14px] font-medium hover:bg-[#1a1a1a] transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {saving ? 'Saving...' : 'Save'}
        </button>
      </div>
    </div>
  )
}

function DeleteConfirm({
  open,
  label,
  deleting,
  onConfirm,
  onClose,
}: {
  open: boolean
  label: string
  deleting: boolean
  onConfirm: () => void
  onClose: () => void
}) {
  if (!open) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center px-5">
      <div className="fixed inset-0 bg-black/50" onClick={onClose} />
      <div className="relative w-full max-w-[360px] bg-white rounded-[16px] p-5">
        <h3 className="font-serif text-[18px] font-medium mb-2">Delete Transaction</h3>
        <p className="text-[13px] text-[#6b6b66] leading-[1.5] mb-5">
          Are you sure you want to delete the transaction for <strong>{label}</strong>?
        </p>
        <div className="flex gap-2.5">
          <button onClick={onClose} className="flex-1 py-2.5 border border-[#e8e8e4] rounded-[10px] text-[13px] font-medium hover:bg-[#f5f5f3] transition-colors">
            Cancel
          </button>
          <button onClick={onConfirm} disabled={deleting} className="flex-1 py-2.5 bg-[#c0392b] text-white rounded-[10px] text-[13px] font-medium hover:bg-[#a93226] transition-colors disabled:opacity-50">
            {deleting ? 'Deleting...' : 'Delete'}
          </button>
        </div>
      </div>
    </div>
  )
}

export default function TransactionsPage() {
  const { profile, permissions } = useUser()
  const isSuperAdmin = profile?.role?.name === 'Super Admin / Leadership'
  const canViewAll = permissions?.canViewAllTransactions
  const canEdit = permissions?.canEditTransactions
  const myTeamMemberId = profile?.team_member_id

  const [transactions, setTransactions] = useState<Transaction[]>([])
  const [teamMembers, setTeamMembers] = useState<TeamMember[]>([])
  const [searchQuery, setSearchQuery] = useState('')
  const [activeFilter, setActiveFilter] = useState('All')
  const [selectedTransaction, setSelectedTransaction] = useState<Transaction | null>(null)
  const [detailOpen, setDetailOpen] = useState(false)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const [showAddModal, setShowAddModal] = useState(false)
  const [editingTx, setEditingTx] = useState<Transaction | null>(null)
  const [deletingTx, setDeletingTx] = useState<Transaction | null>(null)
  const [saving, setSaving] = useState(false)
  const [stagePickerTxId, setStagePickerTxId] = useState<string | null>(null)

  async function loadData() {
    try {
      setLoading(true)
      const [txResult, teamResult] = await Promise.all([
        supabase
          .from('transactions')
          .select('*, agent:team_members!transactions_agent_id_fkey(*)')
          .order('created_at', { ascending: false }),
        supabase
          .from('team_members')
          .select('*')
          .eq('is_active', true)
          .order('full_name'),
      ])

      if (txResult.error) throw txResult.error
      if (teamResult.error) throw teamResult.error

      setTransactions(txResult.data || [])
      setTeamMembers(teamResult.data || [])
      setError(null)
    } catch {
      setError('Error loading data. Check your connection.')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadData()
  }, [])

  const visibleTransactions = canViewAll
    ? transactions
    : transactions.filter((t) => t.agent_id === myTeamMemberId)

  function applyFilters(txs: Transaction[]): Transaction[] {
    let filtered = txs

    if (searchQuery) {
      const q = searchQuery.toLowerCase()
      filtered = filtered.filter(
        (t) =>
          t.client_name.toLowerCase().includes(q) ||
          t.property_address.toLowerCase().includes(q) ||
          t.agent?.full_name?.toLowerCase().includes(q)
      )
    }

    if (activeFilter !== 'All') {
      const f = activeFilter.toLowerCase()
      filtered = filtered.filter((t) => {
        if (f === 'active') return ['active', 'lead', 'offer_stage'].includes(t.stage)
        if (f === 'pending') return ['pending', 'under_contract', 'closing'].includes(t.stage)
        if (f === 'closed') return t.stage === 'closed' || t.stage === 'archived'
        if (f === 'lost') return t.stage === 'lost' || t.stage === 'withdrawn'
        return true
      })
    }

    return filtered
  }

  async function handleQuickStageChange(txId: string, newStage: TransactionStage) {
    setStagePickerTxId(null)
    try {
      const { error: updateError } = await supabase
        .from('transactions')
        .update({ stage: newStage })
        .eq('id', txId)
      if (updateError) throw updateError
      setTransactions((prev) =>
        prev.map((t) => (t.id === txId ? { ...t, stage: newStage } : t))
      )
    } catch {
      alert('Failed to update stage.')
    }
  }

  async function handleAdd(form: TransactionFormData) {
    setSaving(true)
    try {
      const { error: insertError } = await supabase.from('transactions').insert({
        property_address: form.property_address.trim(),
        client_name: form.client_name.trim(),
        client_email: form.client_email.trim() || null,
        client_phone: form.client_phone.trim() || null,
        agent_id: form.agent_id || null,
        tc_id: null,
        stage: form.stage,
        price: form.price ? Number(form.price) : null,
        listing_date: form.listing_date || null,
        offer_date: form.offer_date || null,
        contract_date: form.contract_date || null,
        closing_date: form.closing_date || null,
        notes: form.notes.trim() || null,
        zillow_link: form.zillow_link.trim() || null,
        drive_folder_link: form.drive_folder_link.trim() || null,
      })
      if (insertError) throw insertError
      setShowAddModal(false)
      await loadData()
    } catch {
      alert('Failed to add transaction.')
    } finally {
      setSaving(false)
    }
  }

  async function handleEdit(form: TransactionFormData) {
    if (!editingTx) return
    setSaving(true)
    try {
      const { error: updateError } = await supabase
        .from('transactions')
        .update({
          property_address: form.property_address.trim(),
          client_name: form.client_name.trim(),
          client_email: form.client_email.trim() || null,
          client_phone: form.client_phone.trim() || null,
          agent_id: form.agent_id || null,
          tc_id: null,
          stage: form.stage,
          price: form.price ? Number(form.price) : null,
          listing_date: form.listing_date || null,
          offer_date: form.offer_date || null,
          contract_date: form.contract_date || null,
          closing_date: form.closing_date || null,
          notes: form.notes.trim() || null,
          zillow_link: form.zillow_link.trim() || null,
          drive_folder_link: form.drive_folder_link.trim() || null,
        })
        .eq('id', editingTx.id)
      if (updateError) throw updateError
      setEditingTx(null)
      await loadData()
    } catch {
      alert('Failed to update transaction.')
    } finally {
      setSaving(false)
    }
  }

  async function handleDelete() {
    if (!deletingTx) return
    setSaving(true)
    try {
      const { error: deleteError } = await supabase.from('transactions').delete().eq('id', deletingTx.id)
      if (deleteError) throw deleteError
      setDeletingTx(null)
      if (detailOpen && selectedTransaction?.id === deletingTx.id) setDetailOpen(false)
      await loadData()
    } catch {
      alert('Failed to delete transaction.')
    } finally {
      setSaving(false)
    }
  }

  function txToForm(tx: Transaction): TransactionFormData {
    return {
      property_address: tx.property_address,
      client_name: tx.client_name,
      client_email: tx.client_email || '',
      client_phone: tx.client_phone || '',
      agent_id: tx.agent_id || '',
      stage: tx.stage,
      price: tx.price ? String(tx.price) : '',
      listing_date: tx.listing_date || '',
      offer_date: tx.offer_date || '',
      contract_date: tx.contract_date || '',
      closing_date: tx.closing_date || '',
      notes: tx.notes || '',
      zillow_link: tx.zillow_link || '',
      drive_folder_link: tx.drive_folder_link || '',
    }
  }

  const filteredTransactions = applyFilters(visibleTransactions)

  if (loading) {
    return (
      <div>
        <div className="bg-[#0a0a0a] py-[22px] px-5">
          <div className="h-7 w-32 bg-white/20 rounded mb-1 animate-pulse" />
          <div className="h-4 w-40 bg-white/20 rounded animate-pulse" />
        </div>
        <div className="p-5 space-y-2.5">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="bg-white rounded-[14px] p-4 border border-[#e8e8e4] h-24 animate-pulse" />
          ))}
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div>
        <div className="bg-[#0a0a0a] py-[22px] px-5 text-white">
          <h1 className="font-serif text-[28px] font-medium mb-[3px]">Transactions</h1>
          <p className="text-[12px] text-[#a0a09a]">Deal pipeline</p>
        </div>
        <div className="text-center py-12 px-5 text-[#c0392b] text-[13px] leading-[1.6]">{error}</div>
      </div>
    )
  }

  const detailZillowUrl = selectedTransaction?.zillow_link
    || (selectedTransaction?.property_address
      ? `https://www.zillow.com/homes/${encodeURIComponent(selectedTransaction.property_address)}`
      : '')

  return (
    <div>
      <div className="bg-[#0a0a0a] py-[22px] px-5 text-white flex items-start justify-between">
        <div>
          <h1 className="font-serif text-[28px] font-medium mb-[3px]">Transactions</h1>
          <p className="text-[12px] text-[#a0a09a]">Deal pipeline</p>
        </div>
        {canEdit && (
          <button
            onClick={() => setShowAddModal(true)}
            className="mt-1 flex items-center gap-1.5 px-3.5 py-2 bg-[#8aab8e] text-white rounded-[9px] text-[12px] font-medium hover:bg-[#7a9b7e] transition-colors"
          >
            <Plus className="w-3.5 h-3.5" />
            Add
          </button>
        )}
      </div>

      {/* Pipeline Summary */}
      <div className="bg-[#0a0a0a] px-5 pb-5">
        <div className="flex gap-2 overflow-x-auto scrollbar-hide pb-1">
          {PIPELINE_STAGES.map((ps) => {
            const count = visibleTransactions.filter((t) => t.stage === ps.value).length
            return (
              <button
                key={ps.value}
                onClick={() => {
                  setActiveFilter('All')
                  setSearchQuery('')
                }}
                className="flex-shrink-0 min-w-[70px] rounded-[9px] py-2.5 px-3 text-center transition-all duration-200"
                style={{ background: 'rgba(255,255,255,0.08)', border: '1px solid rgba(255,255,255,0.07)' }}
              >
                <div className="font-serif text-[22px] font-semibold text-white leading-none">{count}</div>
                <div className="text-[9px] mt-1 tracking-wide" style={{ color: ps.color === '#616161' ? '#a0a09a' : ps.color }}>{ps.label}</div>
              </button>
            )
          })}
        </div>
      </div>

      {/* Filter Pills */}
      <div className="bg-white py-3 px-5 flex gap-2 overflow-x-auto border-b border-[#e8e8e4] scrollbar-hide">
        {FILTER_OPTIONS.map((filter) => (
          <button
            key={filter}
            onClick={() => setActiveFilter(filter)}
            className={`flex-shrink-0 py-1.5 px-4 rounded-full text-[12px] font-medium border transition-all duration-200 ${
              activeFilter === filter
                ? 'bg-[#0a0a0a] text-white border-[#0a0a0a]'
                : 'bg-white text-[#666660] border-[#e8e8e4] hover:border-[#a0a09a] hover:text-[#0a0a0a]'
            }`}
          >
            {filter}
          </button>
        ))}
      </div>

      {/* Search */}
      <div className="py-3 px-5 bg-white border-b border-[#e8e8e4]">
        <input
          type="text"
          placeholder="Search by client, address, agent..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="w-full py-2.5 px-3.5 border border-[#e8e8e4] rounded-[9px] text-[14px] bg-[#f5f5f3] outline-none font-sans transition-[border-color] duration-200 focus:border-[#8aab8e]"
        />
      </div>

      <div className="text-[11px] text-[#a0a09a] py-2.5 px-5 tracking-[0.04em]">
        {filteredTransactions.length} results
      </div>

      {/* Transaction Cards */}
      <div className="py-3.5 px-5 space-y-2.5">
        {filteredTransactions.length === 0 ? (
          <div className="text-center py-12 px-5 text-[#a0a09a] text-[13px] leading-[1.6]">
            No transactions found
          </div>
        ) : (
          filteredTransactions.map((tx) => {
            const badge = getStageBadge(tx.stage)
            const zillowUrl = tx.zillow_link
              || (tx.property_address ? `https://www.zillow.com/homes/${encodeURIComponent(tx.property_address)}` : '')
            const agentFirst = tx.agent?.full_name?.split(' ')[0] || '—'

            return (
              <div
                key={tx.id}
                className="bg-white rounded-[14px] py-4 px-[18px] border border-[#e8e8e4] shadow-[0_2px_8px_rgba(0,0,0,0.06)] hover:shadow-[0_4px_16px_rgba(0,0,0,0.10)] transition-all duration-[150ms]"
              >
                <div className="flex items-start justify-between mb-2.5">
                  <div className="flex-1 min-w-0 cursor-pointer" onClick={() => { setSelectedTransaction(tx); setDetailOpen(true) }}>
                    <div className="text-[15px] font-medium leading-[1.2]">{tx.client_name}</div>
                    {zillowUrl ? (
                      <a
                        href={zillowUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        onClick={(e) => e.stopPropagation()}
                        className="text-[12px] text-[#2980b9] mt-1 inline-block font-medium pb-px border-b border-dotted border-[#2980b9]"
                      >
                        {tx.property_address}
                      </a>
                    ) : (
                      <div className="text-[12px] text-[#666660] mt-1">{tx.property_address}</div>
                    )}
                  </div>
                  <div className="flex items-center gap-1.5 ml-2 flex-shrink-0">
                    <div className="relative">
                      <button
                        onClick={() => {
                          if (canEdit) setStagePickerTxId(stagePickerTxId === tx.id ? null : tx.id)
                        }}
                        className={`text-[10px] font-semibold py-1 px-2.5 rounded-full whitespace-nowrap tracking-[0.02em] ${badge.cls} ${
                          canEdit ? 'cursor-pointer hover:opacity-80' : ''
                        } flex items-center gap-1`}
                      >
                        {badge.label}
                        {canEdit && <ChevronDown className="w-2.5 h-2.5" />}
                      </button>
                      {stagePickerTxId === tx.id && (
                        <StagePicker
                          currentStage={tx.stage}
                          onSelect={(stage) => handleQuickStageChange(tx.id, stage)}
                          onClose={() => setStagePickerTxId(null)}
                        />
                      )}
                    </div>
                    {canEdit && (
                      <>
                        <button
                          onClick={() => setEditingTx(tx)}
                          className="w-7 h-7 rounded-full border border-[#e8e8e4] bg-[#f5f5f3] flex items-center justify-center text-[#a0a09a] hover:bg-[#8aab8e] hover:text-white hover:border-[#8aab8e] transition-all duration-200"
                        >
                          <Pencil className="w-3 h-3" />
                        </button>
                        <button
                          onClick={() => setDeletingTx(tx)}
                          className="w-7 h-7 rounded-full border border-[#e8e8e4] bg-[#f5f5f3] flex items-center justify-center text-[#a0a09a] hover:bg-[#c0392b] hover:text-white hover:border-[#c0392b] transition-all duration-200"
                        >
                          <Trash2 className="w-3 h-3" />
                        </button>
                      </>
                    )}
                  </div>
                </div>
                <div
                  className="flex items-center justify-between pt-2.5 border-t border-[#e8e8e4] cursor-pointer"
                  onClick={() => { setSelectedTransaction(tx); setDetailOpen(true) }}
                >
                  <span className="text-[11px] text-[#a0a09a]">{agentFirst}</span>
                  <span className="text-[12px] text-[#0a0a0a] font-semibold">
                    {tx.price ? formatCurrency(Number(tx.price)) : ''}
                  </span>
                </div>
              </div>
            )
          })
        )}
      </div>

      {/* Detail bottom sheet */}
      {detailOpen && selectedTransaction && (
        <div
          id="txDetailOverlay"
          className="fixed inset-0 z-[200] flex flex-col pt-[60px] bg-black/60 animate-[fadeIn_0.25s_ease]"
          onClick={(e) => { if ((e.target as HTMLElement).id === 'txDetailOverlay') setDetailOpen(false) }}
        >
          <div className="bg-white rounded-t-[20px] flex-1 overflow-y-auto px-5 pt-6 pb-8 relative animate-[slideUp_0.3s_cubic-bezier(0.32,0.72,0,1)]">
            <button
              className="absolute top-5 right-5 w-8 h-8 bg-[#e8e8e4] border-none rounded-full text-[18px] cursor-pointer flex items-center justify-center hover:bg-[#d0d0cc] transition-colors"
              onClick={() => setDetailOpen(false)}
            >
              ×
            </button>
            <div className="w-10 h-1 bg-[#e8e8e4] rounded-sm mx-auto mb-6" />
            <div className="font-serif text-[26px] font-medium mb-1">{selectedTransaction.client_name}</div>
            <div className="text-[13px] mb-5">
              {detailZillowUrl ? (
                <a href={detailZillowUrl} target="_blank" rel="noopener noreferrer" className="text-[#2980b9] no-underline border-b border-dotted border-[#2980b9]">
                  {selectedTransaction.property_address}
                </a>
              ) : (
                selectedTransaction.property_address
              )}
            </div>
            <div className="divide-y divide-[#e8e8e4]">
              {[
                ['Agent', selectedTransaction.agent?.full_name],
                ['Stage', getStageBadge(selectedTransaction.stage).label],
                ['Price', selectedTransaction.price ? formatCurrency(Number(selectedTransaction.price)) : null],
                ['Client Email', selectedTransaction.client_email],
                ['Client Phone', selectedTransaction.client_phone],
                ['Listing Date', selectedTransaction.listing_date],
                ['Offer Date', selectedTransaction.offer_date],
                ['Contract Date', selectedTransaction.contract_date],
                ['Closing Date', selectedTransaction.closing_date],
                ['Notes', selectedTransaction.notes],
              ].map(([label, value]) => (
                <div key={label} className="flex justify-between py-[13px] text-[13px]">
                  <span className="text-[#a0a09a] text-[12px]">{label}</span>
                  <span className="font-medium text-right max-w-[60%]">{value || '—'}</span>
                </div>
              ))}
              <div className="flex justify-between py-[13px] text-[13px]">
                <span className="text-[#a0a09a] text-[12px]">Zillow</span>
                <span className="font-medium text-right max-w-[60%]">
                  {detailZillowUrl ? (
                    <a href={detailZillowUrl} target="_blank" rel="noopener noreferrer" className="text-[#2980b9] no-underline">
                      View Property
                    </a>
                  ) : '—'}
                </span>
              </div>
              {selectedTransaction.drive_folder_link && (
                <div className="flex justify-between py-[13px] text-[13px]">
                  <span className="text-[#a0a09a] text-[12px]">Drive Folder</span>
                  <span className="font-medium text-right max-w-[60%]">
                    <a href={selectedTransaction.drive_folder_link} target="_blank" rel="noopener noreferrer" className="text-[#2980b9] no-underline">
                      Open Folder
                    </a>
                  </span>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      <TransactionModal
        open={showAddModal}
        title="Add Transaction"
        initialData={emptyForm}
        teamMembers={teamMembers}
        saving={saving}
        onSave={handleAdd}
        onClose={() => setShowAddModal(false)}
      />

      <TransactionModal
        open={!!editingTx}
        title="Edit Transaction"
        initialData={editingTx ? txToForm(editingTx) : emptyForm}
        teamMembers={teamMembers}
        saving={saving}
        onSave={handleEdit}
        onClose={() => setEditingTx(null)}
      />

      <DeleteConfirm
        open={!!deletingTx}
        label={deletingTx ? `${deletingTx.client_name} — ${deletingTx.property_address}` : ''}
        deleting={saving}
        onConfirm={handleDelete}
        onClose={() => setDeletingTx(null)}
      />
    </div>
  )
}
