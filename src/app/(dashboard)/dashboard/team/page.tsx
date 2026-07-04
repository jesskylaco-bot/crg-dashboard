'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { getInitials } from '@/lib/utils'
import { TeamMember, Role } from '@/lib/types/database'
import { useUser } from '@/lib/contexts/user-context'
import { Plus, Pencil, Trash2, X, Upload, ImageIcon } from 'lucide-react'
import { uploadTeamPhoto, deleteTeamPhoto } from '@/lib/supabase/storage'

const supabase = createClient()

interface MemberFormData {
  full_name: string
  email: string
  phone: string
  photo_url: string
  photo_file: File | null
  photo_removed: boolean
  drive_folder_link: string
  role_id: string
}

const emptyForm: MemberFormData = {
  full_name: '',
  email: '',
  phone: '',
  photo_url: '',
  photo_file: null,
  photo_removed: false,
  drive_folder_link: '',
  role_id: '',
}

interface TeamMemberWithProfile extends TeamMember {
  linked_profile_id?: string
  linked_role_id?: string
  linked_role_name?: string
}

function MemberModal({
  open,
  title,
  initialData,
  roles,
  isSuperAdmin,
  hasLinkedProfile,
  saving,
  onSave,
  onClose,
}: {
  open: boolean
  title: string
  initialData: MemberFormData
  roles: Role[]
  isSuperAdmin: boolean
  hasLinkedProfile: boolean
  saving: boolean
  onSave: (data: MemberFormData) => void
  onClose: () => void
}) {
  const [form, setForm] = useState<MemberFormData>(initialData)

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
            <label className={labelCls}>Full Name *</label>
            <input type="text" value={form.full_name} onChange={(e) => setForm({ ...form, full_name: e.target.value })} className={inputCls} placeholder="John Smith" />
          </div>
          <div>
            <label className={labelCls}>Email *</label>
            <input type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} className={inputCls} placeholder="john@mycobbrealty.com" />
          </div>
          <div>
            <label className={labelCls}>Phone</label>
            <input type="tel" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} className={inputCls} placeholder="(555) 123-4567" />
          </div>
          <div>
            <label className={labelCls}>Photo</label>
            {(form.photo_file || (form.photo_url && !form.photo_removed)) ? (
              <div className="flex items-center gap-3">
                <div className="w-14 h-14 rounded-full overflow-hidden bg-[#0a0a0a] flex items-center justify-center flex-shrink-0">
                  <img
                    src={form.photo_file ? URL.createObjectURL(form.photo_file) : form.photo_url}
                    alt="Preview"
                    className="w-full h-full object-cover"
                  />
                </div>
                <button
                  type="button"
                  onClick={() => setForm({ ...form, photo_file: null, photo_url: '', photo_removed: true })}
                  className="text-[12px] text-[#c0392b] font-medium hover:underline"
                >
                  Remove
                </button>
              </div>
            ) : (
              <label className="flex items-center gap-2.5 py-3 px-3.5 border border-dashed border-[#ccccc8] rounded-[9px] bg-[#f5f5f3] cursor-pointer hover:border-[#8aab8e] transition-colors">
                <Upload className="w-4 h-4 text-[#a0a09a]" />
                <span className="text-[13px] text-[#a0a09a]">Upload photo (max 5MB)</span>
                <input
                  type="file"
                  accept="image/jpeg,image/png,image/webp,image/gif"
                  className="hidden"
                  onChange={(e) => {
                    const file = e.target.files?.[0]
                    if (!file) return
                    if (file.size > 5 * 1024 * 1024) {
                      alert('File must be under 5MB')
                      return
                    }
                    setForm({ ...form, photo_file: file, photo_removed: false })
                  }}
                />
              </label>
            )}
          </div>
          <div>
            <label className={labelCls}>Drive Folder Link</label>
            <input type="url" value={form.drive_folder_link} onChange={(e) => setForm({ ...form, drive_folder_link: e.target.value })} className={inputCls} placeholder="https://drive.google.com/..." />
          </div>
          {hasLinkedProfile && (
            <div>
              <label className={labelCls}>Role {!isSuperAdmin && '(Admin only)'}</label>
              <select
                value={form.role_id}
                onChange={(e) => setForm({ ...form, role_id: e.target.value })}
                disabled={!isSuperAdmin}
                className={inputCls + (isSuperAdmin ? '' : ' opacity-50 cursor-not-allowed')}
              >
                <option value="">No role assigned</option>
                {roles.map((r) => (
                  <option key={r.id} value={r.id}>{r.name}</option>
                ))}
              </select>
            </div>
          )}
        </div>

        <button
          onClick={() => {
            if (!form.full_name.trim() || !form.email.trim()) return
            onSave(form)
          }}
          disabled={saving || !form.full_name.trim() || !form.email.trim()}
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
  memberName,
  deleting,
  onConfirm,
  onClose,
}: {
  open: boolean
  memberName: string
  deleting: boolean
  onConfirm: () => void
  onClose: () => void
}) {
  if (!open) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center px-5">
      <div className="fixed inset-0 bg-black/50" onClick={onClose} />
      <div className="relative w-full max-w-[360px] bg-white rounded-[16px] p-5">
        <h3 className="font-serif text-[18px] font-medium mb-2">Remove Team Member</h3>
        <p className="text-[13px] text-[#6b6b66] leading-[1.5] mb-5">
          Are you sure you want to remove <strong>{memberName}</strong> from the team?
        </p>
        <div className="flex gap-2.5">
          <button onClick={onClose} className="flex-1 py-2.5 border border-[#e8e8e4] rounded-[10px] text-[13px] font-medium hover:bg-[#f5f5f3] transition-colors">
            Cancel
          </button>
          <button onClick={onConfirm} disabled={deleting} className="flex-1 py-2.5 bg-[#c0392b] text-white rounded-[10px] text-[13px] font-medium hover:bg-[#a93226] transition-colors disabled:opacity-50">
            {deleting ? 'Removing...' : 'Remove'}
          </button>
        </div>
      </div>
    </div>
  )
}

export default function TeamPage() {
  const { profile } = useUser()
  const isSuperAdmin = profile?.role?.name === 'Super Admin / Leadership'
  const myTeamMemberId = profile?.team_member_id

  const [members, setMembers] = useState<TeamMemberWithProfile[]>([])
  const [roles, setRoles] = useState<Role[]>([])
  const [searchQuery, setSearchQuery] = useState('')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const [showAddModal, setShowAddModal] = useState(false)
  const [editingMember, setEditingMember] = useState<TeamMemberWithProfile | null>(null)
  const [deletingMember, setDeletingMember] = useState<TeamMemberWithProfile | null>(null)
  const [saving, setSaving] = useState(false)

  async function loadData() {
    try {
      setLoading(true)
      const [membersResult, rolesResult] = await Promise.all([
        supabase
          .from('team_members')
          .select('*, linked_profile:profiles!profiles_team_member_id_fkey(id, role_id, role:roles(*))')
          .eq('is_active', true)
          .order('full_name'),
        supabase
          .from('roles')
          .select('*')
          .order('name'),
      ])

      if (membersResult.error) throw membersResult.error

      const enriched: TeamMemberWithProfile[] = (membersResult.data || []).map((m: Record<string, unknown>) => {
        const linkedArr = m.linked_profile as Record<string, unknown>[] | null
        const linked = linkedArr && linkedArr.length > 0 ? linkedArr[0] : null
        const linkedRole = linked?.role as Record<string, unknown> | null
        return {
          ...m,
          linked_profile_id: linked?.id as string | undefined,
          linked_role_id: linked?.role_id as string | undefined,
          linked_role_name: linkedRole?.name as string | undefined,
        } as TeamMemberWithProfile
      })

      setMembers(enriched)
      setRoles(rolesResult.data || [])
      setError(null)
    } catch {
      setError('Error loading team data.')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadData()
  }, [])

  async function handleAdd(form: MemberFormData) {
    setSaving(true)
    try {
      const { data: newMember, error: insertError } = await supabase
        .from('team_members')
        .insert({
          full_name: form.full_name.trim(),
          email: form.email.trim(),
          phone: form.phone.trim() || null,
          photo_url: null,
          drive_folder_link: form.drive_folder_link.trim() || null,
        })
        .select('id')
        .single()
      if (insertError || !newMember) throw insertError

      if (form.photo_file) {
        const publicUrl = await uploadTeamPhoto(newMember.id, form.photo_file)
        await supabase
          .from('team_members')
          .update({ photo_url: publicUrl })
          .eq('id', newMember.id)
      }

      setShowAddModal(false)
      await loadData()
    } catch {
      alert('Failed to add team member.')
    } finally {
      setSaving(false)
    }
  }

  async function handleEdit(form: MemberFormData) {
    if (!editingMember) return
    setSaving(true)
    try {
      let photoUrl: string | null = editingMember.photo_url || null

      if (form.photo_file) {
        if (editingMember.photo_url) await deleteTeamPhoto(editingMember.photo_url)
        photoUrl = await uploadTeamPhoto(editingMember.id, form.photo_file)
      } else if (form.photo_removed) {
        if (editingMember.photo_url) await deleteTeamPhoto(editingMember.photo_url)
        photoUrl = null
      }

      const { error: updateError } = await supabase
        .from('team_members')
        .update({
          full_name: form.full_name.trim(),
          email: form.email.trim(),
          phone: form.phone.trim() || null,
          photo_url: photoUrl,
          drive_folder_link: form.drive_folder_link.trim() || null,
        })
        .eq('id', editingMember.id)
      if (updateError) throw updateError

      if (isSuperAdmin && editingMember.linked_profile_id && form.role_id) {
        await supabase
          .from('profiles')
          .update({ role_id: form.role_id })
          .eq('id', editingMember.linked_profile_id)
      }

      setEditingMember(null)
      await loadData()
    } catch {
      alert('Failed to update team member.')
    } finally {
      setSaving(false)
    }
  }

  async function handleDelete() {
    if (!deletingMember) return
    setSaving(true)
    try {
      if (deletingMember.photo_url) await deleteTeamPhoto(deletingMember.photo_url)

      const { error: deleteError } = await supabase
        .from('team_members')
        .delete()
        .eq('id', deletingMember.id)
      if (deleteError) throw deleteError
      setDeletingMember(null)
      await loadData()
    } catch {
      alert('Failed to remove team member.')
    } finally {
      setSaving(false)
    }
  }

  const filtered = searchQuery
    ? members.filter(
        (m) =>
          m.full_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
          m.email.toLowerCase().includes(searchQuery.toLowerCase())
      )
    : members

  if (loading) {
    return (
      <div>
        <div className="bg-[#0a0a0a] py-[22px] px-5">
          <div className="h-7 w-40 bg-white/20 rounded mb-1 animate-pulse" />
          <div className="h-4 w-48 bg-white/20 rounded animate-pulse" />
        </div>
        <div className="p-5 space-y-2.5">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="bg-white rounded-[14px] p-4 border border-[#e8e8e4] h-20 animate-pulse" />
          ))}
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div>
        <div className="bg-[#0a0a0a] py-[22px] px-5 text-white">
          <h1 className="font-serif text-[28px] font-medium mb-[3px]">Agent Directory</h1>
          <p className="text-[12px] text-[#a0a09a]">Cobb Realty Group team</p>
        </div>
        <div className="text-center py-12 px-5 text-[#c0392b] text-[13px] leading-[1.6]">{error}</div>
      </div>
    )
  }

  const MemberCard = ({ member }: { member: TeamMemberWithProfile }) => {
    const initials = getInitials(member.full_name)
    const isOwnCard = myTeamMemberId === member.id
    const canEdit = isSuperAdmin || isOwnCard
    const canDelete = isSuperAdmin

    return (
      <div className="bg-white rounded-[14px] py-3.5 px-4 border border-[#e8e8e4] shadow-[0_2px_8px_rgba(0,0,0,0.06)] hover:shadow-[0_4px_16px_rgba(0,0,0,0.10)] transition-shadow duration-200 flex items-center gap-3.5">
        <div className="w-12 h-12 rounded-full bg-[#0a0a0a] flex items-center justify-center font-serif text-[18px] font-semibold text-[#8aab8e] flex-shrink-0 overflow-hidden">
          {member.photo_url ? (
            <img src={member.photo_url} alt={member.full_name} className="w-full h-full object-cover" />
          ) : (
            initials
          )}
        </div>
        <div className="flex-1 min-w-0">
          <div className="text-[15px] font-medium">{member.full_name}</div>
          <div className="text-[11px] text-[#a0a09a] mt-px truncate">{member.email}</div>
        </div>
        <div className="flex gap-1.5">
          {canEdit && (
            <button
              onClick={() => setEditingMember(member)}
              className="w-8 h-8 rounded-full border border-[#e8e8e4] bg-[#f5f5f3] flex items-center justify-center text-[#a0a09a] hover:bg-[#8aab8e] hover:text-white hover:border-[#8aab8e] transition-all duration-200"
            >
              <Pencil className="w-3.5 h-3.5" />
            </button>
          )}
          {canDelete && (
            <button
              onClick={() => setDeletingMember(member)}
              className="w-8 h-8 rounded-full border border-[#e8e8e4] bg-[#f5f5f3] flex items-center justify-center text-[#a0a09a] hover:bg-[#c0392b] hover:text-white hover:border-[#c0392b] transition-all duration-200"
            >
              <Trash2 className="w-3.5 h-3.5" />
            </button>
          )}
          {member.drive_folder_link && (
            <a href={member.drive_folder_link} target="_blank" rel="noopener noreferrer" className="w-8 h-8 rounded-full border border-[#e8e8e4] bg-[#f5f5f3] flex items-center justify-center text-[#0a0a0a] hover:bg-[#0a0a0a] hover:text-white hover:border-[#0a0a0a] transition-all duration-200">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="14" height="14"><path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z"/></svg>
            </a>
          )}
          {member.phone && (
            <a href={`tel:${member.phone}`} className="w-8 h-8 rounded-full border border-[#e8e8e4] bg-[#f5f5f3] flex items-center justify-center text-[#0a0a0a] hover:bg-[#0a0a0a] hover:text-white hover:border-[#0a0a0a] transition-all duration-200">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="14" height="14"><path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72c.127.96.361 1.903.7 2.81a2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45c.907.339 1.85.573 2.81.7A2 2 0 0 1 22 16.92z"/></svg>
            </a>
          )}
          <a href={`mailto:${member.email}`} className="w-8 h-8 rounded-full border border-[#e8e8e4] bg-[#f5f5f3] flex items-center justify-center text-[#0a0a0a] hover:bg-[#0a0a0a] hover:text-white hover:border-[#0a0a0a] transition-all duration-200">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="14" height="14"><path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/><polyline points="22,6 12,13 2,6"/></svg>
          </a>
        </div>
      </div>
    )
  }

  return (
    <div>
      <div className="bg-[#0a0a0a] py-[22px] px-5 text-white flex items-start justify-between">
        <div>
          <h1 className="font-serif text-[28px] font-medium mb-[3px]">Agent Directory</h1>
          <p className="text-[12px] text-[#a0a09a]">Cobb Realty Group team</p>
        </div>
        {isSuperAdmin && (
          <button
            onClick={() => setShowAddModal(true)}
            className="mt-1 flex items-center gap-1.5 px-3.5 py-2 bg-[#8aab8e] text-white rounded-[9px] text-[12px] font-medium hover:bg-[#7a9b7e] transition-colors"
          >
            <Plus className="w-3.5 h-3.5" />
            Add
          </button>
        )}
      </div>

      <div className="py-3 px-5 bg-white border-b border-[#e8e8e4]">
        <input
          type="text"
          placeholder="Search agents..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="w-full py-2.5 px-3.5 border border-[#e8e8e4] rounded-[9px] text-[14px] bg-[#f5f5f3] outline-none font-sans transition-[border-color] duration-200 focus:border-[#8aab8e]"
        />
      </div>

      <div className="py-3.5 px-5 space-y-2.5">
        {filtered.length === 0 ? (
          <div className="text-center py-12 px-5 text-[#a0a09a] text-[13px] leading-[1.6]">
            No team members found.
          </div>
        ) : (
          filtered.map((member) => (
            <MemberCard key={member.id} member={member} />
          ))
        )}
      </div>

      <MemberModal
        open={showAddModal}
        title="Add Team Member"
        initialData={emptyForm}
        roles={roles}
        isSuperAdmin={isSuperAdmin}
        hasLinkedProfile={false}
        saving={saving}
        onSave={handleAdd}
        onClose={() => setShowAddModal(false)}
      />

      <MemberModal
        open={!!editingMember}
        title="Edit Team Member"
        initialData={
          editingMember
            ? {
                full_name: editingMember.full_name,
                email: editingMember.email,
                phone: editingMember.phone || '',
                photo_url: editingMember.photo_url || '',
                photo_file: null,
                photo_removed: false,
                drive_folder_link: editingMember.drive_folder_link || '',
                role_id: editingMember.linked_role_id || '',
              }
            : emptyForm
        }
        roles={roles}
        isSuperAdmin={isSuperAdmin}
        hasLinkedProfile={!!editingMember?.linked_profile_id}
        saving={saving}
        onSave={handleEdit}
        onClose={() => setEditingMember(null)}
      />

      <DeleteConfirm
        open={!!deletingMember}
        memberName={deletingMember?.full_name || ''}
        deleting={saving}
        onConfirm={handleDelete}
        onClose={() => setDeletingMember(null)}
      />
    </div>
  )
}
