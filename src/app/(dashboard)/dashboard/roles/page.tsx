'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { useUser } from '@/lib/contexts/user-context'
import { Role } from '@/lib/types/database'
import { ArrowLeft, ChevronDown, ChevronUp } from 'lucide-react'

const supabase = createClient()

const PERMISSION_LABELS: { key: string; label: string; description: string }[] = [
  { key: 'canViewAllTransactions', label: 'View All Transactions', description: 'Can see all transactions, not just their own' },
  { key: 'canEditTransactions', label: 'Edit Transactions', description: 'Can create, edit, and update transactions' },
  { key: 'canViewReports', label: 'View Reports', description: 'Can access reporting and pipeline dashboards' },
  { key: 'canManageAnnouncements', label: 'Manage Announcements', description: 'Can create, edit, and delete announcements' },
  { key: 'canAccessTraining', label: 'Access Training', description: 'Can view training resources and SOPs' },
  { key: 'canManageForms', label: 'Manage Forms', description: 'Can add, edit, and delete forms & documents' },
]

export default function RolesPage() {
  const { profile } = useUser()
  const router = useRouter()
  const isSuperAdmin = profile?.role?.name === 'Super Admin / Leadership'

  const [roles, setRoles] = useState<Role[]>([])
  const [loading, setLoading] = useState(true)
  const [expandedRole, setExpandedRole] = useState<string | null>(null)
  const [saving, setSaving] = useState<string | null>(null)

  useEffect(() => {
    loadRoles()
  }, [])

  async function loadRoles() {
    const { data } = await supabase
      .from('roles')
      .select('*')
      .order('created_at', { ascending: true })

    if (data) setRoles(data.filter((r: Role) => r.name !== 'Super Admin / Leadership'))
    setLoading(false)
  }

  async function togglePermission(roleId: string, key: string, currentValue: boolean) {
    setSaving(roleId)
    const { error } = await supabase
      .from('roles')
      .update({ [key]: !currentValue })
      .eq('id', roleId)

    if (!error) {
      setRoles(prev =>
        prev.map(r =>
          r.id === roleId ? { ...r, [key]: !currentValue } : r
        )
      )
    }
    setSaving(null)
  }

  if (!isSuperAdmin) {
    return (
      <div className="px-5 pt-10 text-center">
        <p className="text-[13px] text-gray-500">You don't have permission to view this page.</p>
      </div>
    )
  }

  return (
    <div>
      {/* Header */}
      <div className="bg-black px-5 pt-5 pb-6">
        <button
          onClick={() => router.back()}
          className="flex items-center gap-1.5 text-gray-400 hover:text-white transition-colors mb-4"
        >
          <ArrowLeft className="w-4 h-4" />
          <span className="text-[12px]">Back</span>
        </button>
        <h1 className="font-serif text-[24px] font-medium text-white leading-tight">
          Manage Roles
        </h1>
        <p className="text-gray-400 text-[12px] mt-1">Configure permissions and access for each role</p>
      </div>

      {loading ? (
        <div className="px-5 pt-6 space-y-3">
          {[1, 2, 3].map(i => (
            <div key={i} className="h-16 bg-gray-200 rounded-[14px] animate-pulse" />
          ))}
        </div>
      ) : (
        <div className="px-5 pt-6 pb-7 space-y-2.5">
          {roles.map(role => {
            const isExpanded = expandedRole === role.id
            const isSaving = saving === role.id
            const enabledCount = PERMISSION_LABELS.filter(
              p => (role as unknown as Record<string, unknown>)[p.key] === true
            ).length

            return (
              <div
                key={role.id}
                className="bg-white rounded-[14px] border border-gray-200 shadow-sm overflow-hidden"
              >
                {/* Role header */}
                <button
                  onClick={() => setExpandedRole(isExpanded ? null : role.id)}
                  className="w-full px-4 py-3.5 flex items-center justify-between hover:bg-gray-50 transition-colors"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-full bg-black flex items-center justify-center text-white text-[11px] font-bold flex-shrink-0">
                      {role.name.split(' ').map(w => w[0]).join('').substring(0, 2)}
                    </div>
                    <div className="text-left">
                      <div className="text-[14px] font-semibold">{role.name}</div>
                      <div className="text-[11px] text-gray-400 mt-0.5">
                        {enabledCount} of {PERMISSION_LABELS.length} permissions enabled
                      </div>
                    </div>
                  </div>
                  {isExpanded
                    ? <ChevronUp className="w-4 h-4 text-gray-400" />
                    : <ChevronDown className="w-4 h-4 text-gray-400" />
                  }
                </button>

                {/* Permissions toggles */}
                {isExpanded && (
                  <div className="border-t border-gray-100 px-4 py-3 space-y-1">
                    {PERMISSION_LABELS.map(perm => {
                      const value = (role as unknown as Record<string, unknown>)[perm.key] === true

                      return (
                        <div
                          key={perm.key}
                          className="flex items-center justify-between py-2.5 px-2 rounded-lg hover:bg-gray-50 transition-colors"
                        >
                          <div className="flex-1 min-w-0 mr-3">
                            <div className="text-[13px] font-medium">{perm.label}</div>
                            <div className="text-[11px] text-gray-400 mt-0.5">{perm.description}</div>
                          </div>
                          <button
                            onClick={() => togglePermission(role.id, perm.key, value)}
                            disabled={isSaving}
                            className={`relative w-11 h-6 rounded-full transition-colors flex-shrink-0 ${
                              value ? 'bg-sage-600' : 'bg-gray-200'
                            } ${isSaving ? 'opacity-50' : ''}`}
                          >
                            <span
                              className={`absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform ${
                                value ? 'translate-x-5' : 'translate-x-0'
                              }`}
                            />
                          </button>
                        </div>
                      )
                    })}
                  </div>
                )}
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
