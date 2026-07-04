'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useUser } from '@/lib/contexts/user-context'
import { Plus, Pencil, Trash2, X, FileText } from 'lucide-react'

const supabase = createClient()

interface Form {
  id: string
  title: string
  url: string
  description: string | null
  is_active: boolean
  order_index: number
}

interface FormData {
  title: string
  url: string
  description: string
}

const emptyForm: FormData = { title: '', url: '', description: '' }

export default function FormsPage() {
  const { permissions } = useUser()
  const canManage = permissions?.canManageForms

  const [forms, setForms] = useState<Form[]>([])
  const [loading, setLoading] = useState(true)

  const [showModal, setShowModal] = useState(false)
  const [editingForm, setEditingForm] = useState<Form | null>(null)
  const [deletingForm, setDeletingForm] = useState<Form | null>(null)
  const [form, setForm] = useState<FormData>(emptyForm)
  const [saving, setSaving] = useState(false)

  async function loadForms() {
    const { data } = await supabase
      .from('forms')
      .select('*')
      .eq('is_active', true)
      .order('order_index', { ascending: true })

    if (data) setForms(data)
    setLoading(false)
  }

  useEffect(() => {
    loadForms()
  }, [])

  function openAdd() {
    setForm(emptyForm)
    setEditingForm(null)
    setShowModal(true)
  }

  function openEdit(f: Form) {
    setForm({ title: f.title, url: f.url, description: f.description || '' })
    setEditingForm(f)
    setShowModal(true)
  }

  function closeModal() {
    setShowModal(false)
    setEditingForm(null)
  }

  async function saveForm() {
    if (!form.title.trim() || !form.url.trim()) return
    setSaving(true)
    try {
      if (editingForm) {
        await supabase
          .from('forms')
          .update({
            title: form.title.trim(),
            url: form.url.trim(),
            description: form.description.trim() || null,
          })
          .eq('id', editingForm.id)
      } else {
        const nextIndex = forms.length > 0 ? Math.max(...forms.map(f => f.order_index)) + 1 : 1
        await supabase.from('forms').insert({
          title: form.title.trim(),
          url: form.url.trim(),
          description: form.description.trim() || null,
          order_index: nextIndex,
        })
      }
      closeModal()
      await loadForms()
    } catch {
      alert('Failed to save form.')
    } finally {
      setSaving(false)
    }
  }

  async function deleteForm() {
    if (!deletingForm) return
    setSaving(true)
    try {
      await supabase.from('forms').delete().eq('id', deletingForm.id)
      setDeletingForm(null)
      await loadForms()
    } catch {
      alert('Failed to delete form.')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div>
      {/* Header */}
      <div className="bg-[#0a0a0a] py-[22px] px-5 text-white flex items-start justify-between">
        <div>
          <h1 className="font-serif text-[28px] font-medium mb-[3px]">Forms & Documents</h1>
          <p className="text-[12px] text-[#a0a09a]">Important CRG links</p>
        </div>
        {canManage && (
          <button
            onClick={openAdd}
            className="mt-1 flex items-center gap-1.5 px-3.5 py-2 bg-[#8aab8e] text-white rounded-[9px] text-[12px] font-medium hover:bg-[#7a9b7e] transition-colors"
          >
            <Plus className="w-3.5 h-3.5" />
            Add
          </button>
        )}
      </div>

      {/* Forms List */}
      <div className="p-5">
        {loading ? (
          <div className="space-y-2.5">
            {[1, 2].map(i => (
              <div key={i} className="h-14 bg-gray-200 rounded-[9px] animate-pulse" />
            ))}
          </div>
        ) : forms.length === 0 ? (
          <div className="text-center py-10 text-[12px] text-[#a0a09a]">No forms added yet.</div>
        ) : (
          <div className="space-y-2">
            {forms.map((f) => (
              <div
                key={f.id}
                className="bg-white rounded-[9px] py-3.5 px-4 border border-[#e8e8e4] shadow-[0_2px_8px_rgba(0,0,0,0.06)] flex items-center gap-3.5"
              >
                <FileText className="w-4 h-4 flex-shrink-0 text-gray-400" />
                <a
                  href={f.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex-1 min-w-0 text-[13px] font-medium hover:text-sage-600 transition-colors truncate"
                >
                  {f.title}
                </a>
                {canManage && (
                  <div className="flex gap-1 flex-shrink-0">
                    <button
                      onClick={() => openEdit(f)}
                      className="w-6 h-6 rounded-full border border-[#e8e8e4] bg-[#f5f5f3] flex items-center justify-center text-[#a0a09a] hover:bg-[#8aab8e] hover:text-white hover:border-[#8aab8e] transition-all duration-200"
                    >
                      <Pencil className="w-2.5 h-2.5" />
                    </button>
                    <button
                      onClick={() => setDeletingForm(f)}
                      className="w-6 h-6 rounded-full border border-[#e8e8e4] bg-[#f5f5f3] flex items-center justify-center text-[#a0a09a] hover:bg-[#c0392b] hover:text-white hover:border-[#c0392b] transition-all duration-200"
                    >
                      <Trash2 className="w-2.5 h-2.5" />
                    </button>
                  </div>
                )}
                {!canManage && (
                  <div className="text-[#d0d0cc] flex-shrink-0">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="14" height="14">
                      <path d="M9 18l6-6-6-6" />
                    </svg>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Add/Edit Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center">
          <div className="fixed inset-0 bg-black/50" onClick={closeModal} />
          <div className="relative w-full max-w-[480px] bg-white rounded-t-[20px] sm:rounded-[20px] p-5 pb-8">
            <div className="flex items-center justify-between mb-5">
              <h2 className="font-serif text-[20px] font-medium">
                {editingForm ? 'Edit Form' : 'Add Form'}
              </h2>
              <button onClick={closeModal} className="p-1.5 rounded-full hover:bg-[#f5f5f3] transition-colors">
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="space-y-3.5">
              <div>
                <label className="block text-[11px] font-medium text-[#a0a09a] uppercase tracking-[0.08em] mb-1.5">
                  Title *
                </label>
                <input
                  type="text"
                  value={form.title}
                  onChange={(e) => setForm({ ...form, title: e.target.value })}
                  className="w-full py-2.5 px-3.5 border border-[#e8e8e4] rounded-[9px] text-[14px] bg-[#f5f5f3] outline-none font-sans transition-[border-color] duration-200 focus:border-[#8aab8e]"
                  placeholder="Form title"
                />
              </div>
              <div>
                <label className="block text-[11px] font-medium text-[#a0a09a] uppercase tracking-[0.08em] mb-1.5">
                  URL *
                </label>
                <input
                  type="url"
                  value={form.url}
                  onChange={(e) => setForm({ ...form, url: e.target.value })}
                  className="w-full py-2.5 px-3.5 border border-[#e8e8e4] rounded-[9px] text-[14px] bg-[#f5f5f3] outline-none font-sans transition-[border-color] duration-200 focus:border-[#8aab8e]"
                  placeholder="https://forms.gle/..."
                />
              </div>
              <div>
                <label className="block text-[11px] font-medium text-[#a0a09a] uppercase tracking-[0.08em] mb-1.5">
                  Description
                </label>
                <input
                  type="text"
                  value={form.description}
                  onChange={(e) => setForm({ ...form, description: e.target.value })}
                  className="w-full py-2.5 px-3.5 border border-[#e8e8e4] rounded-[9px] text-[14px] bg-[#f5f5f3] outline-none font-sans transition-[border-color] duration-200 focus:border-[#8aab8e]"
                  placeholder="Optional description"
                />
              </div>
            </div>
            <button
              onClick={saveForm}
              disabled={saving || !form.title.trim() || !form.url.trim()}
              className="mt-5 w-full py-3 bg-[#0a0a0a] text-white rounded-[10px] text-[14px] font-medium hover:bg-[#1a1a1a] transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {saving ? 'Saving...' : 'Save'}
            </button>
          </div>
        </div>
      )}

      {/* Delete Confirm */}
      {deletingForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center px-5">
          <div className="fixed inset-0 bg-black/50" onClick={() => setDeletingForm(null)} />
          <div className="relative w-full max-w-[360px] bg-white rounded-[16px] p-5">
            <h3 className="font-serif text-[18px] font-medium mb-2">Delete Form</h3>
            <p className="text-[13px] text-[#6b6b66] leading-[1.5] mb-5">
              Are you sure you want to delete <strong>{deletingForm.title}</strong>?
            </p>
            <div className="flex gap-2.5">
              <button
                onClick={() => setDeletingForm(null)}
                className="flex-1 py-2.5 border border-[#e8e8e4] rounded-[10px] text-[13px] font-medium hover:bg-[#f5f5f3] transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={deleteForm}
                disabled={saving}
                className="flex-1 py-2.5 bg-[#c0392b] text-white rounded-[10px] text-[13px] font-medium hover:bg-[#a93226] transition-colors disabled:opacity-50"
              >
                {saving ? 'Deleting...' : 'Delete'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
