'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useUser } from '@/lib/contexts/user-context'
import { getRolePermissions } from '@/lib/types/database'
import {
  CheckCircle2,
  Circle,
  Upload,
  Video,
  FileText,
  ClipboardCheck,
  ChevronDown,
  ChevronUp,
} from 'lucide-react'

const supabase = createClient()

interface TaskWithProgress {
  id: string
  title: string
  description: string | null
  order_index: number
  is_required: boolean
  task_type: string
  resource_url: string | null
  is_completed: boolean
  document_url: string | null
  progress_id: string | null
}

interface PendingAgent {
  id: string
  email: string
  full_name: string
  onboarding_status: string
  completed: number
  total: number
}

const SECTION_MAP: Record<string, string> = {
  '1': 'Getting Started',
  '2': 'Getting Started',
  '3': 'Getting Started',
  '4': 'Licensing & Compliance',
  '5': 'Licensing & Compliance',
  '6': 'Licensing & Compliance',
  '7': 'Training',
  '8': 'Training',
  '9': 'Training',
  '10': 'Final Steps',
  '11': 'Final Steps',
}

function groupTasks(tasks: TaskWithProgress[]): { title: string; tasks: TaskWithProgress[] }[] {
  const sections: { title: string; tasks: TaskWithProgress[] }[] = []
  const sectionOrder = ['Getting Started', 'Licensing & Compliance', 'Training', 'Final Steps']

  for (const sectionTitle of sectionOrder) {
    const sectionTasks = tasks.filter((t) => {
      const idx = String(t.order_index)
      return SECTION_MAP[idx] === sectionTitle
    })
    if (sectionTasks.length > 0) {
      sections.push({ title: sectionTitle, tasks: sectionTasks })
    }
  }

  if (sections.length === 0 && tasks.length > 0) {
    sections.push({ title: 'Tasks', tasks })
  }

  return sections
}

function getTaskIcon(type: string) {
  switch (type) {
    case 'video': return Video
    case 'document_upload': return Upload
    case 'form': return FileText
    default: return ClipboardCheck
  }
}

export default function OnboardingPage() {
  const { profile } = useUser()
  const roleName = profile?.role?.name || ''
  const permissions = getRolePermissions(profile?.role)
  const isNewAgent = roleName === 'New Agent'
  const canManage = permissions?.canManageOnboarding

  const [tasks, setTasks] = useState<TaskWithProgress[]>([])
  const [pendingAgents, setPendingAgents] = useState<PendingAgent[]>([])
  const [loading, setLoading] = useState(true)
  const [uploading, setUploading] = useState<string | null>(null)
  const [expandedAgent, setExpandedAgent] = useState<string | null>(null)
  const [agentTasks, setAgentTasks] = useState<Record<string, TaskWithProgress[]>>({})

  async function loadData() {
    try {
      setLoading(true)

      const { data: allTasks } = await supabase
        .from('onboarding_tasks')
        .select('*')
        .order('order_index')

      if (!allTasks) return

      if (profile?.id) {
        const { data: progress } = await supabase
          .from('user_onboarding_progress')
          .select('*')
          .eq('user_id', profile.id)

        const merged: TaskWithProgress[] = allTasks.map((t) => {
          const p = progress?.find((pr) => pr.task_id === t.id)
          return {
            id: t.id,
            title: t.title,
            description: t.description,
            order_index: t.order_index,
            is_required: t.is_required,
            task_type: t.task_type,
            resource_url: t.resource_url,
            is_completed: p?.is_completed || false,
            document_url: p?.document_url || null,
            progress_id: p?.id || null,
          }
        })
        setTasks(merged)
      }

      if (canManage) {
        const { data: agents } = await supabase
          .from('profiles')
          .select('id, email, full_name, onboarding_status, role:roles(name)')
          .order('full_name')

        if (agents) {
          const newAgents = agents.filter((a: Record<string, unknown>) => {
            const role = a.role as { name: string } | null
            return role?.name === 'New Agent'
          })

          const agentList: PendingAgent[] = []
          for (const agent of newAgents) {
            const { data: prog } = await supabase
              .from('user_onboarding_progress')
              .select('is_completed')
              .eq('user_id', agent.id as string)

            agentList.push({
              id: agent.id as string,
              email: agent.email as string,
              full_name: agent.full_name as string,
              onboarding_status: agent.onboarding_status as string,
              completed: prog?.filter((p) => p.is_completed).length || 0,
              total: allTasks.length,
            })
          }
          setPendingAgents(agentList)
        }
      }
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadData()
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [profile?.id])

  async function toggleTask(task: TaskWithProgress) {
    if (!profile?.id) return

    const newCompleted = !task.is_completed

    if (task.progress_id) {
      await supabase
        .from('user_onboarding_progress')
        .update({
          is_completed: newCompleted,
          completed_at: newCompleted ? new Date().toISOString() : null,
        })
        .eq('id', task.progress_id)
    } else {
      await supabase.from('user_onboarding_progress').insert({
        user_id: profile.id,
        task_id: task.id,
        is_completed: newCompleted,
        completed_at: newCompleted ? new Date().toISOString() : null,
      })
    }

    setTasks((prev) =>
      prev.map((t) =>
        t.id === task.id ? { ...t, is_completed: newCompleted, progress_id: t.progress_id || 'temp' } : t
      )
    )
  }

  async function handleDocUpload(task: TaskWithProgress, file: File) {
    if (!profile?.id) return
    if (file.size > 10 * 1024 * 1024) {
      alert('File must be under 10MB')
      return
    }

    setUploading(task.id)
    try {
      const path = `${profile.id}/${task.id}/${Date.now()}-${file.name}`
      const { error: uploadError } = await supabase.storage
        .from('onboarding-docs')
        .upload(path, file)
      if (uploadError) throw uploadError

      const { data: urlData } = supabase.storage.from('onboarding-docs').getPublicUrl(path)

      if (task.progress_id) {
        await supabase
          .from('user_onboarding_progress')
          .update({
            is_completed: true,
            completed_at: new Date().toISOString(),
            document_url: urlData.publicUrl,
          })
          .eq('id', task.progress_id)
      } else {
        await supabase.from('user_onboarding_progress').insert({
          user_id: profile.id,
          task_id: task.id,
          is_completed: true,
          completed_at: new Date().toISOString(),
          document_url: urlData.publicUrl,
        })
      }

      setTasks((prev) =>
        prev.map((t) =>
          t.id === task.id
            ? { ...t, is_completed: true, document_url: urlData.publicUrl, progress_id: t.progress_id || 'temp' }
            : t
        )
      )
    } catch {
      alert('Failed to upload document.')
    } finally {
      setUploading(null)
    }
  }

  async function submitForApproval() {
    if (!profile?.id) return
    await supabase
      .from('profiles')
      .update({ onboarding_status: 'pending_approval' })
      .eq('id', profile.id)

    const { data: superAdmins } = await supabase
      .from('profiles')
      .select('id, role:roles(name)')

    const admins = (superAdmins || []).filter((p: Record<string, unknown>) => {
      const role = p.role as { name: string } | null
      return role?.name === 'Super Admin / Leadership' || role?.name === 'Operations Manager'
    })

    if (admins.length > 0) {
      await supabase.from('notifications').insert(
        admins.map((admin) => ({
          user_id: admin.id as string,
          title: `${profile.full_name} submitted for approval`,
          body: `${profile.full_name} has completed their onboarding tasks and is awaiting your approval.`,
          link: '/dashboard/onboarding',
        }))
      )
    }

    alert('Submitted for approval!')
    await loadData()
  }

  async function approveAgent(agentId: string) {
    const [{ data: agentRole, error: roleErr }] = await Promise.all([
      supabase.from('roles').select('id').eq('name', 'Agent').single(),
    ])

    if (roleErr) {
      console.error('Role lookup failed:', roleErr)
      alert('Failed to find Agent role')
      return
    }

    const { error: updateErr } = await supabase
      .from('profiles')
      .update({
        onboarding_status: 'approved',
        role_id: agentRole?.id || null,
      })
      .eq('id', agentId)

    if (updateErr) {
      console.error('Profile update failed:', updateErr)
      alert('Failed to approve agent: ' + updateErr.message)
      return
    }

    await supabase.from('notifications').insert({
      user_id: agentId,
      title: 'Onboarding approved!',
      body: 'Congratulations! Your onboarding has been approved. You now have full access to the CRG platform.',
      link: '/dashboard',
    })

    await loadData()
  }

  async function rejectAgent(agentId: string) {
    await supabase
      .from('profiles')
      .update({ onboarding_status: 'rejected' })
      .eq('id', agentId)

    await loadData()
  }

  async function loadAgentTasks(agentId: string) {
    const { data: allTasks } = await supabase
      .from('onboarding_tasks')
      .select('*')
      .order('order_index')

    const { data: progress } = await supabase
      .from('user_onboarding_progress')
      .select('*')
      .eq('user_id', agentId)

    if (allTasks) {
      const merged: TaskWithProgress[] = allTasks.map((t) => {
        const p = progress?.find((pr) => pr.task_id === t.id)
        return {
          id: t.id,
          title: t.title,
          description: t.description,
          order_index: t.order_index,
          is_required: t.is_required,
          task_type: t.task_type,
          resource_url: t.resource_url,
          is_completed: p?.is_completed || false,
          document_url: p?.document_url || null,
          progress_id: p?.id || null,
        }
      })
      setAgentTasks((prev) => ({ ...prev, [agentId]: merged }))
    }
  }

  const totalTasks = tasks.length
  const completedTasks = tasks.filter((t) => t.is_completed).length
  const requiredTasks = tasks.filter((t) => t.is_required)
  const completedRequired = requiredTasks.filter((t) => t.is_completed).length
  const progressPercent = totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0
  const allRequiredDone = completedRequired === requiredTasks.length && requiredTasks.length > 0
  const sections = groupTasks(tasks)

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

  return (
    <div>
      {/* Header */}
      <div className="bg-[#0a0a0a] py-[22px] px-5 text-white">
        <h1 className="font-serif text-[28px] font-medium mb-[3px]">
          {canManage ? 'Onboarding Management' : 'Onboarding'}
        </h1>
        <p className="text-[12px] text-[#a0a09a]">
          {canManage ? 'Manage agent onboarding and approvals' : isNewAgent ? 'Complete tasks to get full access' : 'Your onboarding history'}
        </p>
      </div>

      {/* Progress Bar (New Agents) */}
      {isNewAgent && (
        <div className="bg-[#0a0a0a] px-5 pb-5">
          <div className="bg-white/[0.08] border border-white/[0.07] rounded-[12px] p-4">
            <div className="flex items-center justify-between mb-3">
              <div>
                <div className="text-[13px] text-white font-medium">Your Progress</div>
                <div className="text-[11px] text-[#a0a09a] mt-0.5">
                  {completedTasks} of {totalTasks} tasks completed
                </div>
              </div>
              <div className="font-serif text-[28px] font-semibold text-[#8aab8e]">{progressPercent}%</div>
            </div>
            <div className="w-full bg-white/10 rounded-full h-2">
              <div
                className="bg-[#8aab8e] h-2 rounded-full transition-all duration-500"
                style={{ width: `${progressPercent}%` }}
              />
            </div>
            {profile?.onboarding_status === 'pending_approval' && (
              <div className="mt-3 py-2 px-3 bg-[#f59e0b]/20 rounded-[8px]">
                <p className="text-[12px] text-[#fbbf24]">Your onboarding is pending approval.</p>
              </div>
            )}
            {profile?.onboarding_status === 'rejected' && (
              <div className="mt-3 py-2 px-3 bg-[#c0392b]/20 rounded-[8px]">
                <p className="text-[12px] text-[#e74c3c]">Your onboarding was not approved. Please review and resubmit.</p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Admin: Pending Agents */}
      {canManage && pendingAgents.length > 0 && (
        <div className="px-5 pt-5">
          <div className="flex items-center gap-2.5 mb-3">
            <span className="w-[3px] h-3 bg-[#8aab8e] rounded-sm flex-shrink-0" />
            <span className="text-[10px] font-medium tracking-[0.12em] uppercase text-[#a0a09a]">
              New Agents ({pendingAgents.length})
            </span>
          </div>
          <div className="space-y-2.5">
            {pendingAgents.map((agent) => (
              <div key={agent.id} className="bg-white rounded-[14px] border border-[#e8e8e4] shadow-sm overflow-hidden">
                <div
                  className="py-3.5 px-4 flex items-center gap-3 cursor-pointer"
                  onClick={() => {
                    const isExpanding = expandedAgent !== agent.id
                    setExpandedAgent(isExpanding ? agent.id : null)
                    if (isExpanding && !agentTasks[agent.id]) loadAgentTasks(agent.id)
                  }}
                >
                  <div className="w-10 h-10 rounded-full bg-[#0a0a0a] flex items-center justify-center font-serif text-[14px] font-semibold text-[#8aab8e] flex-shrink-0">
                    {agent.full_name.split(' ').map((n) => n[0]).join('').substring(0, 2)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="text-[14px] font-medium">{agent.full_name}</div>
                    <div className="text-[11px] text-[#a0a09a]">
                      {agent.completed}/{agent.total} tasks
                      {agent.onboarding_status === 'pending_approval' && (
                        <span className="ml-1.5 text-[#e65100] font-medium">Pending approval</span>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    {agent.onboarding_status === 'pending_approval' && (
                      <>
                        <button
                          onClick={(e) => { e.stopPropagation(); approveAgent(agent.id) }}
                          className="px-3 py-1.5 bg-[#8aab8e] text-white rounded-[8px] text-[11px] font-medium hover:bg-[#7a9b7e] transition-colors"
                        >
                          Approve
                        </button>
                        <button
                          onClick={(e) => { e.stopPropagation(); rejectAgent(agent.id) }}
                          className="px-3 py-1.5 border border-[#e8e8e4] text-[#a0a09a] rounded-[8px] text-[11px] font-medium hover:bg-[#fce4ec] hover:text-[#c0392b] hover:border-[#fce4ec] transition-colors"
                        >
                          Reject
                        </button>
                      </>
                    )}
                    {expandedAgent === agent.id ? <ChevronUp className="w-4 h-4 text-[#a0a09a]" /> : <ChevronDown className="w-4 h-4 text-[#a0a09a]" />}
                  </div>
                </div>

                {expandedAgent === agent.id && agentTasks[agent.id] && (
                  <div className="border-t border-[#e8e8e4] px-4 py-3 space-y-2">
                    {agentTasks[agent.id].map((task) => {
                      const TaskIcon = getTaskIcon(task.task_type)
                      return (
                        <div key={task.id} className="flex items-center gap-3 py-1.5">
                          <span className={task.is_completed ? 'text-[#2e7d32]' : 'text-[#e8e8e4]'}>
                            {task.is_completed ? <CheckCircle2 className="w-4 h-4" /> : <Circle className="w-4 h-4" />}
                          </span>
                          <TaskIcon className="w-3.5 h-3.5 text-[#a0a09a]" />
                          <span className={`text-[12px] flex-1 ${task.is_completed ? 'text-[#a0a09a] line-through' : ''}`}>{task.title}</span>
                          {task.document_url && (
                            <a href={task.document_url} target="_blank" rel="noopener noreferrer" className="text-[10px] text-[#2980b9] font-medium">View</a>
                          )}
                        </div>
                      )
                    })}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {canManage && pendingAgents.length === 0 && (
        <div className="px-5 pt-5">
          <div className="text-center py-8 text-[#a0a09a] text-[13px]">No new agents in onboarding.</div>
        </div>
      )}

      {/* New Agent: Task Sections */}
      {isNewAgent && sections.map((section) => (
        <div key={section.title} className="px-5 pt-5">
          <div className="flex items-center gap-2.5 mb-3">
            <span className="w-[3px] h-3 bg-[#8aab8e] rounded-sm flex-shrink-0" />
            <span className="text-[10px] font-medium tracking-[0.12em] uppercase text-[#a0a09a]">
              {section.title}
            </span>
          </div>
          <div className="space-y-2">
            {section.tasks.map((task) => {
              const TaskIcon = getTaskIcon(task.task_type)
              const isDocUpload = task.task_type === 'document_upload'
              const isUploading = uploading === task.id

              return (
                <div
                  key={task.id}
                  className={`bg-white rounded-[14px] py-3.5 px-4 border border-[#e8e8e4] shadow-sm flex items-center gap-3.5 transition-all ${
                    task.is_completed ? 'opacity-70' : 'hover:shadow-md'
                  }`}
                >
                  <button
                    onClick={() => {
                      if (!isDocUpload) toggleTask(task)
                    }}
                    className={`flex-shrink-0 ${task.is_completed ? 'text-[#2e7d32]' : 'text-[#d0d0cc]'} ${
                      isDocUpload ? 'cursor-default' : 'cursor-pointer'
                    }`}
                  >
                    {task.is_completed ? <CheckCircle2 className="w-5 h-5" /> : <Circle className="w-5 h-5" />}
                  </button>
                  <div className="p-2 bg-[#f5f5f3] rounded-[8px]">
                    <TaskIcon className="w-4 h-4 text-[#666660]" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className={`text-[13px] font-medium ${task.is_completed ? 'text-[#a0a09a] line-through' : ''}`}>
                        {task.title}
                      </span>
                      {task.is_required && !task.is_completed && (
                        <span className="text-[9px] font-semibold py-0.5 px-1.5 rounded-full bg-[#fce4ec] text-[#880e4f]">Required</span>
                      )}
                    </div>
                    <p className="text-[11px] text-[#a0a09a] mt-0.5">{task.description}</p>
                    {isDocUpload && !task.is_completed && (
                      <label className="inline-flex items-center gap-1.5 mt-2 py-1.5 px-3 border border-dashed border-[#ccccc8] rounded-[8px] bg-[#f5f5f3] cursor-pointer hover:border-[#8aab8e] transition-colors text-[11px] text-[#666660]">
                        <Upload className="w-3 h-3" />
                        {isUploading ? 'Uploading...' : 'Upload file'}
                        <input
                          type="file"
                          accept="image/jpeg,image/png,image/webp,application/pdf"
                          className="hidden"
                          disabled={isUploading}
                          onChange={(e) => {
                            const file = e.target.files?.[0]
                            if (file) handleDocUpload(task, file)
                          }}
                        />
                      </label>
                    )}
                    {task.document_url && (
                      <a href={task.document_url} target="_blank" rel="noopener noreferrer" className="inline-block mt-1.5 text-[11px] text-[#2980b9] font-medium">
                        View uploaded file
                      </a>
                    )}
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      ))}

      {/* Submit for Approval */}
      {isNewAgent && allRequiredDone && profile?.onboarding_status === 'not_started' && (
        <div className="px-5 py-5">
          <div className="bg-[#f0f5f0] rounded-[14px] p-4 border border-[#d4e4d4] flex items-center justify-between">
            <div>
              <div className="text-[14px] font-medium text-[#2e5a32]">Ready to submit!</div>
              <div className="text-[11px] text-[#5a7a5e] mt-0.5">All required tasks are complete.</div>
            </div>
            <button
              onClick={submitForApproval}
              className="px-4 py-2 bg-[#0a0a0a] text-white rounded-[9px] text-[12px] font-medium hover:bg-[#1a1a1a] transition-colors"
            >
              Submit
            </button>
          </div>
        </div>
      )}

      {isNewAgent && !allRequiredDone && profile?.onboarding_status === 'not_started' && (
        <div className="px-5 py-5">
          <div className="text-center text-[11px] text-[#a0a09a]">
            Complete all required tasks to submit for approval.
          </div>
        </div>
      )}

      {/* Completed onboarding - read-only view for approved agents */}
      {!isNewAgent && !canManage && sections.length > 0 && (
        <>
          <div className="px-5 pt-5">
            <div className="bg-[#f0f5f0] rounded-[12px] p-4 border border-[#d4e4d4] flex items-center gap-3 mb-4">
              <div className="w-8 h-8 rounded-full bg-[#2e7d32] flex items-center justify-center flex-shrink-0">
                <svg viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="3" width="14" height="14"><polyline points="20 6 9 17 4 12"/></svg>
              </div>
              <div>
                <div className="text-[13px] font-medium text-[#2e5a32]">Onboarding Complete</div>
                <div className="text-[11px] text-[#5a7a5e]">{completedTasks} of {totalTasks} tasks completed</div>
              </div>
            </div>
          </div>
          {sections.map((section) => (
            <div key={section.title} className="px-5 pb-3">
              <div className="flex items-center gap-2.5 mb-3">
                <span className="w-[3px] h-3 bg-[#8aab8e] rounded-sm flex-shrink-0" />
                <span className="text-[10px] font-medium tracking-[0.12em] uppercase text-[#a0a09a]">{section.title}</span>
              </div>
              <div className="space-y-2">
                {section.tasks.map((task) => {
                  const TaskIcon = getTaskIcon(task.task_type)
                  return (
                    <div key={task.id} className="bg-white rounded-[14px] py-3 px-4 border border-[#e8e8e4] flex items-center gap-3.5 opacity-80">
                      <span className={task.is_completed ? 'text-[#2e7d32]' : 'text-[#d0d0cc]'}>
                        {task.is_completed ? <CheckCircle2 className="w-5 h-5" /> : <Circle className="w-5 h-5" />}
                      </span>
                      <div className="p-1.5 bg-[#f5f5f3] rounded-[6px]">
                        <TaskIcon className="w-3.5 h-3.5 text-[#666660]" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <span className={`text-[12px] ${task.is_completed ? 'text-[#a0a09a] line-through' : ''}`}>{task.title}</span>
                      </div>
                      {task.document_url && (
                        <a href={task.document_url} target="_blank" rel="noopener noreferrer" className="text-[10px] text-[#2980b9] font-medium flex-shrink-0">
                          View
                        </a>
                      )}
                    </div>
                  )
                })}
              </div>
            </div>
          ))}
        </>
      )}
      {!isNewAgent && !canManage && sections.length === 0 && (
        <div className="px-5 pt-10">
          <div className="text-center text-[13px] text-[#a0a09a]">No onboarding data found.</div>
        </div>
      )}
    </div>
  )
}
