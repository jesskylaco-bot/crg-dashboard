'use server'

import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'

async function getCallerProfile() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null

  const { data: profile } = await supabase
    .from('profiles')
    .select('id, role:roles(name)')
    .eq('id', user.id)
    .single()

  return profile
}

function isAdmin(profile: Record<string, unknown> | null): boolean {
  if (!profile) return false
  const role = profile.role as { name: string } | null
  return role?.name === 'Super Admin / Leadership' || role?.name === 'Operations Manager'
}

export async function approveEmailChange(requestId: string) {
  const caller = await getCallerProfile()
  if (!isAdmin(caller)) {
    return { error: 'Unauthorized' }
  }

  const supabase = await createClient()
  const adminClient = createAdminClient()

  const { data: request, error: fetchError } = await supabase
    .from('email_change_requests')
    .select('*')
    .eq('id', requestId)
    .eq('status', 'pending')
    .single()

  if (fetchError || !request) {
    return { error: 'Request not found or already processed' }
  }

  const { error: authError } = await adminClient.auth.admin.updateUserById(
    request.user_id,
    { email: request.new_email }
  )

  if (authError) {
    return { error: `Failed to update login email: ${authError.message}` }
  }

  await supabase
    .from('profiles')
    .update({ email: request.new_email })
    .eq('id', request.user_id)

  await supabase
    .from('team_members')
    .update({ email: request.new_email })
    .eq('email', request.current_email)

  await supabase
    .from('email_change_requests')
    .update({
      status: 'approved',
      reviewed_by: caller!.id,
      reviewed_at: new Date().toISOString(),
    })
    .eq('id', requestId)

  await supabase.from('notifications').insert({
    user_id: request.user_id,
    title: 'Email change approved',
    body: `Your email has been updated to ${request.new_email}. Please log in with your new email.`,
    link: '/dashboard/profile',
  })

  return { success: true }
}

export async function rejectEmailChange(requestId: string) {
  const caller = await getCallerProfile()
  if (!isAdmin(caller)) {
    return { error: 'Unauthorized' }
  }

  const supabase = await createClient()

  const { data: request, error: fetchError } = await supabase
    .from('email_change_requests')
    .select('user_id, new_email')
    .eq('id', requestId)
    .eq('status', 'pending')
    .single()

  if (fetchError || !request) {
    return { error: 'Request not found or already processed' }
  }

  await supabase
    .from('email_change_requests')
    .update({
      status: 'rejected',
      reviewed_by: caller!.id,
      reviewed_at: new Date().toISOString(),
    })
    .eq('id', requestId)

  await supabase.from('notifications').insert({
    user_id: request.user_id,
    title: 'Email change declined',
    body: `Your request to change email to ${request.new_email} was declined. Contact your admin for details.`,
    link: '/dashboard/profile',
  })

  return { success: true }
}
