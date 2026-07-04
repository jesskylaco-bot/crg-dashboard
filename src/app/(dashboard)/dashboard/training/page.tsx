'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useUser } from '@/lib/contexts/user-context'
import { Plus, Pencil, Trash2, X, Video, FileText, Link2, GraduationCap, ExternalLink } from 'lucide-react'

const supabase = createClient()

interface TrainingResource {
  id: string
  title: string
  description: string | null
  category: string
  resource_type: 'video' | 'document' | 'link' | 'course'
  resource_url: string | null
  is_required: boolean
  order_index: number
}

interface FormData {
  title: string
  description: string
  category: string
  resource_type: 'video' | 'document' | 'link' | 'course'
  resource_url: string
  is_required: boolean
}

const emptyForm: FormData = {
  title: '',
  description: '',
  category: '',
  resource_type: 'document',
  resource_url: '',
  is_required: false,
}

const RESOURCE_TYPES = [
  { value: 'video', label: 'Video', icon: Video },
  { value: 'document', label: 'Document', icon: FileText },
  { value: 'link', label: 'Link', icon: Link2 },
  { value: 'course', label: 'Course', icon: GraduationCap },
]

function getTypeIcon(type: string) {
  switch (type) {
    case 'video': return Video
    case 'link': return Link2
    case 'course': return GraduationCap
    default: return FileText
  }
}

export default function TrainingPage() {
  const { profile, permissions } = useUser()
  const isSuperAdmin = profile?.role?.name === 'Super Admin / Leadership'

  if (!permissions?.canAccessTraining && !isSuperAdmin) {
    return (
      <div className="px-5 pt-10 text-center">
        <p className="text-[13px] text-gray-500">You don't have access to this section.</p>
      </div>
    )
  }

  const [resources, setResources] = useState<TrainingResource[]>([])
  const [loading, setLoading] = useState(true)
  const [activeCategory, setActiveCategory] = useState('All')

  const [showModal, setShowModal] = useState(false)
  const [editingRes, setEditingRes] = useState<TrainingResource | null>(null)
  const [deletingRes, setDeletingRes] = useState<TrainingResource | null>(null)
  const [form, setForm] = useState<FormData>(emptyForm)
  const [saving, setSaving] = useState(false)

  async function loadData() {
    try {
      setLoading(true)
      const { data, error } = await supabase
        .from('training_resources')
        .select('*')
        .order('order_index')

      if (error) throw error
      setResources(data || [])
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadData()
  }, [])

  const categories = ['All', ...Array.from(new Set(resources.map((r) => r.category)))]

  const filtered = activeCategory === 'All'
    ? resources
    : resources.filter((r) => r.category === activeCategory)

  const grouped: { category: string; items: TrainingResource[] }[] = []
  filtered.forEach((r) => {
    const existing = grouped.find((g) => g.category === r.category)
    if (existing) {
      existing.items.push(r)
    } else {
      grouped.push({ category: r.category, items: [r] })
    }
  })

  function openAdd() {
    setForm(emptyForm)
    setEditingRes(null)
    setShowModal(true)
  }

  function openEdit(r: TrainingResource) {
    setForm({
      title: r.title,
      description: r.description || '',
      category: r.category,
      resource_type: r.resource_type,
      resource_url: r.resource_url || '',
      is_required: r.is_required,
    })
    setEditingRes(r)
    setShowModal(true)
  }

  function closeModal() {
    setShowModal(false)
    setEditingRes(null)
  }

  async function handleSave() {
    if (!form.title.trim() || !form.category.trim()) return
    setSaving(true)
    try {
      if (editingRes) {
        await supabase
          .from('training_resources')
          .update({
            title: form.title.trim(),
            description: form.description.trim() || null,
            category: form.category.trim(),
            resource_type: form.resource_type,
            resource_url: form.resource_url.trim() || null,
            is_required: form.is_required,
          })
          .eq('id', editingRes.id)
      } else {
        const maxOrder = resources.length > 0 ? Math.max(...resources.map((r) => r.order_index)) : 0
        await supabase.from('training_resources').insert({
          title: form.title.trim(),
          description: form.description.trim() || null,
          category: form.category.trim(),
          resource_type: form.resource_type,
          resource_url: form.resource_url.trim() || null,
          is_required: form.is_required,
          order_index: maxOrder + 1,
        })
      }
      closeModal()
      await loadData()
    } catch {
      alert('Failed to save resource.')
    } finally {
      setSaving(false)
    }
  }

  async function handleDelete() {
    if (!deletingRes) return
    setSaving(true)
    try {
      await supabase.from('training_resources').delete().eq('id', deletingRes.id)
      setDeletingRes(null)
      await loadData()
    } catch {
      alert('Failed to delete resource.')
    } finally {
      setSaving(false)
    }
  }

  const inputCls = "w-full py-2.5 px-3.5 border border-[#e8e8e4] rounded-[9px] text-[14px] bg-[#f5f5f3] outline-none font-sans transition-[border-color] duration-200 focus:border-[#8aab8e]"
  const labelCls = "block text-[11px] font-medium text-[#a0a09a] uppercase tracking-[0.08em] mb-1.5"

  if (loading) {
    return (
      <div>
        <div className="bg-[#0a0a0a] py-[22px] px-5">
          <div className="h-7 w-40 bg-white/20 rounded mb-1 animate-pulse" />
          <div className="h-4 w-48 bg-white/20 rounded animate-pulse" />
        </div>
        <div className="p-5 space-y-2.5">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="bg-white rounded-[14px] p-4 border border-[#e8e8e4] h-16 animate-pulse" />
          ))}
        </div>
      </div>
    )
  }

  return (
    <div>
      <div className="bg-[#0a0a0a] py-[22px] px-5 text-white flex items-start justify-between">
        <div>
          <h1 className="font-serif text-[28px] font-medium mb-[3px]">Training & Support</h1>
          <p className="text-[12px] text-[#a0a09a]">SOPs, guides, and resources</p>
        </div>
        {isSuperAdmin && (
          <button
            onClick={openAdd}
            className="mt-1 flex items-center gap-1.5 px-3.5 py-2 bg-[#8aab8e] text-white rounded-[9px] text-[12px] font-medium hover:bg-[#7a9b7e] transition-colors"
          >
            <Plus className="w-3.5 h-3.5" />
            Add
          </button>
        )}
      </div>

      {/* Category Filter */}
      <div className="bg-white py-3 px-5 flex gap-2 overflow-x-auto border-b border-[#e8e8e4] scrollbar-hide">
        {categories.map((cat) => (
          <button
            key={cat}
            onClick={() => setActiveCategory(cat)}
            className={`flex-shrink-0 py-1.5 px-4 rounded-full text-[12px] font-medium border transition-all duration-200 ${
              activeCategory === cat
                ? 'bg-[#0a0a0a] text-white border-[#0a0a0a]'
                : 'bg-white text-[#666660] border-[#e8e8e4] hover:border-[#a0a09a] hover:text-[#0a0a0a]'
            }`}
          >
            {cat}
          </button>
        ))}
      </div>

      {/* Resource Groups */}
      <div className="p-5">
        {grouped.length === 0 ? (
          <div className="text-center py-12 text-[#a0a09a] text-[13px]">No resources found.</div>
        ) : (
          grouped.map((group) => (
            <div key={group.category} className="mb-7">
              <div className="flex items-center gap-2.5 mb-3">
                <span className="w-[3px] h-3 bg-[#8aab8e] rounded-sm flex-shrink-0" />
                <span className="text-[10px] font-medium tracking-[0.12em] uppercase text-[#a0a09a]">
                  {group.category}
                </span>
              </div>
              <div className="space-y-2">
                {group.items.map((item) => {
                  const TypeIcon = getTypeIcon(item.resource_type)
                  const hasLink = item.resource_url && item.resource_url !== '#'

                  return (
                    <div
                      key={item.id}
                      className="bg-white rounded-[14px] py-3.5 px-4 border border-[#e8e8e4] shadow-[0_2px_8px_rgba(0,0,0,0.06)] hover:shadow-[0_4px_16px_rgba(0,0,0,0.10)] transition-all duration-[150ms] flex items-center gap-3.5"
                    >
                      <div className="w-10 h-10 bg-[#f5f5f3] rounded-[9px] flex items-center justify-center flex-shrink-0 text-[#5a7a5e]">
                        <TypeIcon className="w-5 h-5" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="font-medium text-[14px]">{item.title}</span>
                          {item.is_required && (
                            <span className="text-[9px] font-semibold py-0.5 px-1.5 rounded-full bg-[#fce4ec] text-[#880e4f]">Required</span>
                          )}
                        </div>
                        {item.description && (
                          <div className="text-[12px] text-[#a0a09a] mt-0.5">{item.description}</div>
                        )}
                      </div>
                      <div className="flex items-center gap-1.5 flex-shrink-0">
                        {isSuperAdmin && (
                          <>
                            <button
                              onClick={() => openEdit(item)}
                              className="w-7 h-7 rounded-full border border-[#e8e8e4] bg-[#f5f5f3] flex items-center justify-center text-[#a0a09a] hover:bg-[#8aab8e] hover:text-white hover:border-[#8aab8e] transition-all duration-200"
                            >
                              <Pencil className="w-3 h-3" />
                            </button>
                            <button
                              onClick={() => setDeletingRes(item)}
                              className="w-7 h-7 rounded-full border border-[#e8e8e4] bg-[#f5f5f3] flex items-center justify-center text-[#a0a09a] hover:bg-[#c0392b] hover:text-white hover:border-[#c0392b] transition-all duration-200"
                            >
                              <Trash2 className="w-3 h-3" />
                            </button>
                          </>
                        )}
                        {hasLink && (
                          <a
                            href={item.resource_url!}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="w-7 h-7 rounded-full border border-[#e8e8e4] bg-[#f5f5f3] flex items-center justify-center text-[#0a0a0a] hover:bg-[#0a0a0a] hover:text-white hover:border-[#0a0a0a] transition-all duration-200"
                          >
                            <ExternalLink className="w-3 h-3" />
                          </a>
                        )}
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>
          ))
        )}
      </div>

      {/* Add/Edit Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center">
          <div className="fixed inset-0 bg-black/50" onClick={closeModal} />
          <div className="relative w-full max-w-[480px] bg-white rounded-t-[20px] sm:rounded-[20px] p-5 pb-8 max-h-[85vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-5">
              <h2 className="font-serif text-[20px] font-medium">{editingRes ? 'Edit Resource' : 'Add Resource'}</h2>
              <button onClick={closeModal} className="p-1.5 rounded-full hover:bg-[#f5f5f3] transition-colors">
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="space-y-3.5">
              <div>
                <label className={labelCls}>Title *</label>
                <input type="text" value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} className={inputCls} placeholder="Resource title" />
              </div>
              <div>
                <label className={labelCls}>Description</label>
                <textarea value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} className={inputCls + " resize-none h-16"} placeholder="Brief description" />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className={labelCls}>Category *</label>
                  <input type="text" value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })} className={inputCls} placeholder="Onboarding, Marketing..." />
                </div>
                <div>
                  <label className={labelCls}>Type</label>
                  <select value={form.resource_type} onChange={(e) => setForm({ ...form, resource_type: e.target.value as FormData['resource_type'] })} className={inputCls}>
                    {RESOURCE_TYPES.map((t) => (
                      <option key={t.value} value={t.value}>{t.label}</option>
                    ))}
                  </select>
                </div>
              </div>
              <div>
                <label className={labelCls}>URL</label>
                <input type="url" value={form.resource_url} onChange={(e) => setForm({ ...form, resource_url: e.target.value })} className={inputCls} placeholder="https://..." />
              </div>
              <label className="flex items-center gap-2.5 cursor-pointer">
                <input
                  type="checkbox"
                  checked={form.is_required}
                  onChange={(e) => setForm({ ...form, is_required: e.target.checked })}
                  className="w-4 h-4 rounded border-[#e8e8e4] text-[#8aab8e] focus:ring-[#8aab8e]"
                />
                <span className="text-[13px] text-[#666660]">Mark as required</span>
              </label>
            </div>
            <button
              onClick={handleSave}
              disabled={saving || !form.title.trim() || !form.category.trim()}
              className="mt-5 w-full py-3 bg-[#0a0a0a] text-white rounded-[10px] text-[14px] font-medium hover:bg-[#1a1a1a] transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {saving ? 'Saving...' : 'Save'}
            </button>
          </div>
        </div>
      )}

      {/* Delete Confirm */}
      {deletingRes && (
        <div className="fixed inset-0 z-50 flex items-center justify-center px-5">
          <div className="fixed inset-0 bg-black/50" onClick={() => setDeletingRes(null)} />
          <div className="relative w-full max-w-[360px] bg-white rounded-[16px] p-5">
            <h3 className="font-serif text-[18px] font-medium mb-2">Delete Resource</h3>
            <p className="text-[13px] text-[#6b6b66] leading-[1.5] mb-5">
              Are you sure you want to delete <strong>{deletingRes.title}</strong>?
            </p>
            <div className="flex gap-2.5">
              <button onClick={() => setDeletingRes(null)} className="flex-1 py-2.5 border border-[#e8e8e4] rounded-[10px] text-[13px] font-medium hover:bg-[#f5f5f3] transition-colors">Cancel</button>
              <button onClick={handleDelete} disabled={saving} className="flex-1 py-2.5 bg-[#c0392b] text-white rounded-[10px] text-[13px] font-medium hover:bg-[#a93226] transition-colors disabled:opacity-50">
                {saving ? 'Deleting...' : 'Delete'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
