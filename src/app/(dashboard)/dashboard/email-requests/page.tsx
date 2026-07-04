'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { useUser } from '@/lib/contexts/user-context'
import { getRolePermissions } from '@/lib/types/database'
import { approveEmailChange, rejectEmailChange } from '@/app/actions/email-change'
import { ArrowLeft, Check, X, Mail } from 'lucide-react'

interface EmailRequest {
  id: string
  user_id: string
  current_email: string
  new_email: string
  status: 'pending' | 'approved' | 'rejected'
  created_at: string
  user?: { full_name: string; email: string }
}

const supabase = createClient()

export default function EmailRequestsPage() {
  const { profile } = useUser()
  const router = useRouter()
  const permissions = getRolePermissions(profile?.role)
  const canManage = permissions?.canManageUsers

  const [requests, setRequests] = useState<EmailRequest[]>([])
  const [loading, setLoading] = useState(true)
  const [processing, setProcessing] = useState<string | null>(null)

  useEffect(() => {
    loadRequests()
  }, [])

  async function loadRequests() {
    const { data } = await supabase
      .from('email_change_requests')
      .select('*, user:profiles!email_change_requests_user_id_fkey(full_name, email)')
      .order('created_at', { ascending: false })

    if (data) {
      const mapped = data.map((r: Record<string, unknown>) => ({
        ...r,
        user: Array.isArray(r.user) ? r.user[0] : r.user,
      })) as EmailRequest[]
      setRequests(mapped)
    }
    setLoading(false)
  }

  async function handleApprove(request: EmailRequest) {
    setProcessing(request.id)
    const result = await approveEmailChange(request.id)
    if (result.error) {
      alert(result.error)
    }
    setProcessing(null)
    await loadRequests()
  }

  async function handleReject(request: EmailRequest) {
    setProcessing(request.id)
    const result = await rejectEmailChange(request.id)
    if (result.error) {
      alert(result.error)
    }
    setProcessing(null)
    await loadRequests()
  }

  function timeAgo(dateStr: string) {
    const diff = Date.now() - new Date(dateStr).getTime()
    const mins = Math.floor(diff / 60000)
    if (mins < 1) return 'Just now'
    if (mins < 60) return `${mins}m ago`
    const hrs = Math.floor(mins / 60)
    if (hrs < 24) return `${hrs}h ago`
    const days = Math.floor(hrs / 24)
    return `${days}d ago`
  }

  if (!canManage) {
    return (
      <div className="px-5 pt-10 text-center">
        <p className="text-[13px] text-gray-500">You don't have permission to view this page.</p>
      </div>
    )
  }

  const pendingRequests = requests.filter(r => r.status === 'pending')
  const pastRequests = requests.filter(r => r.status !== 'pending')

  return (
    <div>
      <div className="bg-black px-5 pt-5 pb-6">
        <button
          onClick={() => router.back()}
          className="flex items-center gap-1.5 text-gray-400 hover:text-white transition-colors mb-4"
        >
          <ArrowLeft className="w-4 h-4" />
          <span className="text-[12px]">Back</span>
        </button>
        <h1 className="font-serif text-[24px] font-medium text-white leading-tight">
          Email Change Requests
        </h1>
        <p className="text-gray-400 text-[12px] mt-1">Review and approve email change requests from team members</p>
      </div>

      {loading ? (
        <div className="px-5 pt-8 space-y-3">
          {[1, 2].map(i => (
            <div key={i} className="h-24 bg-gray-200 rounded-[14px] animate-pulse" />
          ))}
        </div>
      ) : (
        <>
          {/* Pending Requests */}
          <div className="px-5 pt-6 pb-4">
            <div className="flex items-center gap-2.5 mb-3.5">
              <span className="w-[3px] h-3 bg-amber-500 rounded-sm" />
              <span className="text-[10px] font-medium tracking-[0.12em] uppercase text-gray-400">
                Pending Requests ({pendingRequests.length})
              </span>
            </div>

            {pendingRequests.length === 0 ? (
              <div className="bg-white rounded-[14px] border border-gray-200 shadow-sm p-6 text-center">
                <Mail className="w-8 h-8 text-gray-300 mx-auto mb-2" />
                <p className="text-[13px] text-gray-400">No pending requests</p>
              </div>
            ) : (
              <div className="space-y-2.5">
                {pendingRequests.map(request => (
                  <div key={request.id} className="bg-white rounded-[14px] border border-gray-200 border-l-[3px] border-l-amber-400 shadow-sm p-4">
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex-1 min-w-0">
                        <div className="text-[14px] font-semibold">{request.user?.full_name}</div>
                        <div className="mt-2 space-y-1">
                          <div className="flex items-center gap-2">
                            <span className="text-[10px] text-gray-400 uppercase w-12 flex-shrink-0">From</span>
                            <span className="text-[13px] text-gray-600 truncate">{request.current_email}</span>
                          </div>
                          <div className="flex items-center gap-2">
                            <span className="text-[10px] text-gray-400 uppercase w-12 flex-shrink-0">To</span>
                            <span className="text-[13px] font-medium truncate">{request.new_email}</span>
                          </div>
                        </div>
                        <div className="text-[10px] text-gray-400 mt-2">{timeAgo(request.created_at)}</div>
                      </div>
                      <div className="flex items-center gap-1.5 flex-shrink-0">
                        <button
                          onClick={() => handleApprove(request)}
                          disabled={processing === request.id}
                          className="flex items-center gap-1 px-3 py-1.5 bg-sage-600 text-white rounded-full text-[11px] font-medium hover:bg-sage-700 transition-colors disabled:opacity-50"
                        >
                          <Check className="w-3 h-3" />
                          Approve
                        </button>
                        <button
                          onClick={() => handleReject(request)}
                          disabled={processing === request.id}
                          className="flex items-center gap-1 px-3 py-1.5 bg-red-50 text-red-600 border border-red-200 rounded-full text-[11px] font-medium hover:bg-red-100 transition-colors disabled:opacity-50"
                        >
                          <X className="w-3 h-3" />
                          Decline
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Past Requests */}
          {pastRequests.length > 0 && (
            <div className="px-5 pb-7">
              <div className="flex items-center gap-2.5 mb-3.5">
                <span className="w-[3px] h-3 bg-gray-300 rounded-sm" />
                <span className="text-[10px] font-medium tracking-[0.12em] uppercase text-gray-400">
                  History
                </span>
              </div>
              <div className="space-y-2">
                {pastRequests.map(request => (
                  <div key={request.id} className="bg-white rounded-[14px] border border-gray-200 shadow-sm p-4">
                    <div className="flex items-center justify-between">
                      <div className="flex-1 min-w-0">
                        <div className="text-[13px] font-medium">{request.user?.full_name}</div>
                        <div className="text-[12px] text-gray-500 mt-0.5 truncate">
                          {request.current_email} → {request.new_email}
                        </div>
                        <div className="text-[10px] text-gray-400 mt-1">{timeAgo(request.created_at)}</div>
                      </div>
                      <div className={`flex items-center gap-1 px-2 py-1 rounded-full text-[10px] font-medium ${
                        request.status === 'approved'
                          ? 'bg-green-50 text-green-700'
                          : 'bg-red-50 text-red-600'
                      }`}>
                        {request.status === 'approved' ? (
                          <><Check className="w-3 h-3" /> Approved</>
                        ) : (
                          <><X className="w-3 h-3" /> Declined</>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </>
      )}
    </div>
  )
}
