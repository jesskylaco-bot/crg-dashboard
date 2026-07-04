'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { useUser } from '@/lib/contexts/user-context'
import { ArrowLeft, Pencil, Check, X, Eye, EyeOff, Lock, Phone, Mail, Shield, Calendar, Clock, CheckCircle2, XCircle } from 'lucide-react'

export default function ProfilePage() {
  const { profile } = useUser()
  const router = useRouter()
  const supabase = createClient()

  const [editingName, setEditingName] = useState(false)
  const [editingPhone, setEditingPhone] = useState(false)
  const [editingEmail, setEditingEmail] = useState(false)
  const [nameValue, setNameValue] = useState(profile?.full_name || '')
  const [phoneValue, setPhoneValue] = useState(profile?.phone || '')
  const [emailValue, setEmailValue] = useState(profile?.email || '')
  const [saving, setSaving] = useState(false)
  const [emailError, setEmailError] = useState('')
  const [pendingEmailRequest, setPendingEmailRequest] = useState<{ id: string; new_email: string; status: string } | null>(null)
  const [emailRequestSent, setEmailRequestSent] = useState(false)

  const [showPasswordSection, setShowPasswordSection] = useState(false)
  const [currentPassword, setCurrentPassword] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [showCurrent, setShowCurrent] = useState(false)
  const [showNew, setShowNew] = useState(false)
  const [showConfirm, setShowConfirm] = useState(false)
  const [passwordLoading, setPasswordLoading] = useState(false)
  const [passwordError, setPasswordError] = useState('')
  const [passwordSuccess, setPasswordSuccess] = useState(false)

  useEffect(() => {
    if (!profile?.id) return
    async function loadPendingRequest() {
      const { data } = await supabase
        .from('email_change_requests')
        .select('id, new_email, status')
        .eq('user_id', profile!.id)
        .order('created_at', { ascending: false })
        .limit(1)
      if (data && data.length > 0) {
        setPendingEmailRequest(data[0])
      }
    }
    loadPendingRequest()
  }, [profile?.id, supabase])

  const roleName = profile?.role?.name || 'Member'
  const initials = profile?.full_name?.split(' ').map(n => n[0]).join('').substring(0, 2) || 'U'
  const memberSince = profile?.created_at
    ? new Date(profile.created_at).toLocaleDateString('en-US', { month: 'long', year: 'numeric' })
    : ''

  async function saveName() {
    if (!nameValue.trim() || !profile?.id) return
    setSaving(true)
    const { error } = await supabase
      .from('profiles')
      .update({ full_name: nameValue.trim() })
      .eq('id', profile.id)
    setSaving(false)
    if (!error) {
      setEditingName(false)
      router.refresh()
    }
  }

  async function savePhone() {
    if (!profile?.id) return
    setSaving(true)
    const { error } = await supabase
      .from('profiles')
      .update({ phone: phoneValue.trim() || null })
      .eq('id', profile.id)
    setSaving(false)
    if (!error) {
      setEditingPhone(false)
      router.refresh()
    }
  }

  async function requestEmailChange() {
    if (!emailValue.trim() || !profile?.id) return
    const trimmed = emailValue.trim().toLowerCase()
    if (trimmed === profile.email) {
      setEditingEmail(false)
      return
    }
    setEmailError('')
    setSaving(true)

    const { data: existing } = await supabase
      .from('email_change_requests')
      .select('id')
      .eq('user_id', profile.id)
      .eq('status', 'pending')
      .limit(1)

    if (existing && existing.length > 0) {
      setEmailError('You already have a pending email change request.')
      setSaving(false)
      return
    }

    const { error: insertError } = await supabase
      .from('email_change_requests')
      .insert({
        user_id: profile.id,
        current_email: profile.email,
        new_email: trimmed,
      })

    if (insertError) {
      setEmailError(insertError.message)
      setSaving(false)
      return
    }

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
          title: `Email change request from ${profile.full_name}`,
          body: `${profile.full_name} wants to change email from ${profile.email} to ${trimmed}`,
          link: '/dashboard/email-requests',
        }))
      )
    }

    setSaving(false)
    setEditingEmail(false)
    setEmailRequestSent(true)
    setPendingEmailRequest({ id: '', new_email: trimmed, status: 'pending' })
  }

  function cancelEdit(field: 'name' | 'phone' | 'email') {
    if (field === 'name') {
      setNameValue(profile?.full_name || '')
      setEditingName(false)
    } else if (field === 'phone') {
      setPhoneValue(profile?.phone || '')
      setEditingPhone(false)
    } else {
      setEmailValue(profile?.email || '')
      setEmailError('')
      setEditingEmail(false)
    }
  }

  function resetPasswordForm() {
    setCurrentPassword('')
    setNewPassword('')
    setConfirmPassword('')
    setPasswordError('')
    setPasswordSuccess(false)
    setShowCurrent(false)
    setShowNew(false)
    setShowConfirm(false)
  }

  async function handleChangePassword(e: React.FormEvent) {
    e.preventDefault()
    setPasswordError('')

    if (newPassword.length < 6) {
      setPasswordError('New password must be at least 6 characters.')
      return
    }
    if (newPassword !== confirmPassword) {
      setPasswordError('New passwords do not match.')
      return
    }

    setPasswordLoading(true)

    const { data: { user } } = await supabase.auth.getUser()
    if (!user?.email) {
      setPasswordError('Unable to verify your account.')
      setPasswordLoading(false)
      return
    }

    const { error: signInError } = await supabase.auth.signInWithPassword({
      email: user.email,
      password: currentPassword,
    })

    if (signInError) {
      setPasswordError('Current password is incorrect.')
      setPasswordLoading(false)
      return
    }

    const { error: updateError } = await supabase.auth.updateUser({
      password: newPassword,
    })

    setPasswordLoading(false)

    if (updateError) {
      setPasswordError(updateError.message)
      return
    }

    setPasswordSuccess(true)
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

        <div className="flex items-center gap-4">
          <div className="h-16 w-16 rounded-full bg-sage-600 flex items-center justify-center text-white text-xl font-semibold flex-shrink-0">
            {initials}
          </div>
          <div>
            <h1 className="font-serif text-[24px] font-medium text-white leading-tight">
              {profile?.full_name}
            </h1>
            <p className="text-sage-400 text-[12px] mt-0.5">{roleName}</p>
          </div>
        </div>
      </div>

      {/* Profile Details */}
      <div className="px-5 pt-6 pb-4">
        <div className="flex items-center gap-2.5 mb-3.5">
          <span className="w-[3px] h-3 bg-sage-500 rounded-sm" />
          <span className="text-[10px] font-medium tracking-[0.12em] uppercase text-gray-400">
            Personal Information
          </span>
        </div>

        <div className="bg-white rounded-[14px] border border-gray-200 shadow-sm overflow-hidden">
          {/* Full Name */}
          <div className="px-4 py-3.5 border-b border-gray-100">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3 flex-1 min-w-0">
                <div className="w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center flex-shrink-0">
                  <span className="text-[13px] font-medium text-gray-500">
                    {initials}
                  </span>
                </div>
                <div className="flex-1 min-w-0">
                  <div className="text-[10px] text-gray-400 uppercase tracking-wide">Full Name</div>
                  {editingName ? (
                    <input
                      type="text"
                      value={nameValue}
                      onChange={(e) => setNameValue(e.target.value)}
                      autoFocus
                      className="w-full text-[14px] font-medium bg-transparent border-b border-sage-400 outline-none py-0.5 mt-0.5"
                    />
                  ) : (
                    <div className="text-[14px] font-medium truncate mt-0.5">{profile?.full_name}</div>
                  )}
                </div>
              </div>
              {editingName ? (
                <div className="flex items-center gap-1 flex-shrink-0 ml-2">
                  <button
                    onClick={saveName}
                    disabled={saving || !nameValue.trim()}
                    className="w-7 h-7 rounded-full bg-sage-600 flex items-center justify-center text-white hover:bg-sage-700 transition-colors disabled:opacity-50"
                  >
                    <Check className="w-3.5 h-3.5" />
                  </button>
                  <button
                    onClick={() => cancelEdit('name')}
                    className="w-7 h-7 rounded-full bg-gray-100 flex items-center justify-center text-gray-500 hover:bg-gray-200 transition-colors"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                </div>
              ) : (
                <button
                  onClick={() => setEditingName(true)}
                  className="w-7 h-7 rounded-full border border-gray-200 flex items-center justify-center text-gray-400 hover:bg-gray-50 transition-colors flex-shrink-0"
                >
                  <Pencil className="w-3 h-3" />
                </button>
              )}
            </div>
          </div>

          {/* Email */}
          <div className="px-4 py-3.5 border-b border-gray-100">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3 flex-1 min-w-0">
                <div className="w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center flex-shrink-0">
                  <Mail className="w-4 h-4 text-gray-500" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="text-[10px] text-gray-400 uppercase tracking-wide">Email</div>
                  {editingEmail ? (
                    <>
                      <input
                        type="email"
                        value={emailValue}
                        onChange={(e) => { setEmailValue(e.target.value); setEmailError('') }}
                        autoFocus
                        className="w-full text-[14px] font-medium bg-transparent border-b border-sage-400 outline-none py-0.5 mt-0.5"
                      />
                      {emailError && (
                        <p className="text-[11px] text-red-500 mt-1">{emailError}</p>
                      )}
                      <p className="text-[10px] text-gray-400 mt-1">Requires admin approval before taking effect</p>
                    </>
                  ) : (
                    <>
                      <div className="text-[14px] font-medium truncate mt-0.5">{profile?.email}</div>
                      {pendingEmailRequest?.status === 'pending' && (
                        <div className="flex items-center gap-1.5 mt-1.5">
                          <Clock className="w-3 h-3 text-amber-500" />
                          <p className="text-[11px] text-amber-600">
                            Change to <span className="font-medium">{pendingEmailRequest.new_email}</span> — awaiting admin approval
                          </p>
                        </div>
                      )}
                      {pendingEmailRequest?.status === 'approved' && (
                        <div className="flex items-center gap-1.5 mt-1.5">
                          <CheckCircle2 className="w-3 h-3 text-green-500" />
                          <p className="text-[11px] text-green-600">Email change approved</p>
                        </div>
                      )}
                      {pendingEmailRequest?.status === 'rejected' && (
                        <div className="flex items-center gap-1.5 mt-1.5">
                          <XCircle className="w-3 h-3 text-red-500" />
                          <p className="text-[11px] text-red-500">Email change request was declined</p>
                        </div>
                      )}
                      {emailRequestSent && !pendingEmailRequest?.status && (
                        <p className="text-[11px] text-amber-600 mt-1">Request sent to admin for approval</p>
                      )}
                    </>
                  )}
                </div>
              </div>
              {editingEmail ? (
                <div className="flex items-center gap-1 flex-shrink-0 ml-2">
                  <button
                    onClick={requestEmailChange}
                    disabled={saving || !emailValue.trim() || emailValue.trim().toLowerCase() === profile?.email}
                    className="rounded-full bg-sage-600 px-3 py-1.5 text-[11px] font-medium text-white hover:bg-sage-700 transition-colors disabled:opacity-50"
                  >
                    {saving ? 'Sending...' : 'Request Approval'}
                  </button>
                  <button
                    onClick={() => cancelEdit('email')}
                    className="w-7 h-7 rounded-full bg-gray-100 flex items-center justify-center text-gray-500 hover:bg-gray-200 transition-colors"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                </div>
              ) : (
                pendingEmailRequest?.status !== 'pending' && (
                  <button
                    onClick={() => { setEditingEmail(true); setEmailRequestSent(false) }}
                    className="w-7 h-7 rounded-full border border-gray-200 flex items-center justify-center text-gray-400 hover:bg-gray-50 transition-colors flex-shrink-0"
                  >
                    <Pencil className="w-3 h-3" />
                  </button>
                )
              )}
            </div>
          </div>

          {/* Phone */}
          <div className="px-4 py-3.5 border-b border-gray-100">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3 flex-1 min-w-0">
                <div className="w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center flex-shrink-0">
                  <Phone className="w-4 h-4 text-gray-500" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="text-[10px] text-gray-400 uppercase tracking-wide">Phone</div>
                  {editingPhone ? (
                    <input
                      type="tel"
                      value={phoneValue}
                      onChange={(e) => setPhoneValue(e.target.value)}
                      autoFocus
                      placeholder="Add phone number"
                      className="w-full text-[14px] font-medium bg-transparent border-b border-sage-400 outline-none py-0.5 mt-0.5"
                    />
                  ) : (
                    <div className="text-[14px] font-medium truncate mt-0.5">
                      {profile?.phone || <span className="text-gray-300">Not set</span>}
                    </div>
                  )}
                </div>
              </div>
              {editingPhone ? (
                <div className="flex items-center gap-1 flex-shrink-0 ml-2">
                  <button
                    onClick={savePhone}
                    disabled={saving}
                    className="w-7 h-7 rounded-full bg-sage-600 flex items-center justify-center text-white hover:bg-sage-700 transition-colors disabled:opacity-50"
                  >
                    <Check className="w-3.5 h-3.5" />
                  </button>
                  <button
                    onClick={() => cancelEdit('phone')}
                    className="w-7 h-7 rounded-full bg-gray-100 flex items-center justify-center text-gray-500 hover:bg-gray-200 transition-colors"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                </div>
              ) : (
                <button
                  onClick={() => setEditingPhone(true)}
                  className="w-7 h-7 rounded-full border border-gray-200 flex items-center justify-center text-gray-400 hover:bg-gray-50 transition-colors flex-shrink-0"
                >
                  <Pencil className="w-3 h-3" />
                </button>
              )}
            </div>
          </div>

          {/* Role — read-only */}
          <div className="px-4 py-3.5 border-b border-gray-100">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center flex-shrink-0">
                <Shield className="w-4 h-4 text-gray-500" />
              </div>
              <div>
                <div className="text-[10px] text-gray-400 uppercase tracking-wide">Role</div>
                <div className="text-[14px] font-medium mt-0.5">{roleName}</div>
              </div>
            </div>
          </div>

          {/* Member Since — read-only */}
          <div className="px-4 py-3.5">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center flex-shrink-0">
                <Calendar className="w-4 h-4 text-gray-500" />
              </div>
              <div>
                <div className="text-[10px] text-gray-400 uppercase tracking-wide">Member Since</div>
                <div className="text-[14px] font-medium mt-0.5">{memberSince}</div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Change Password Section */}
      <div className="px-5 pb-7">
        <div className="flex items-center gap-2.5 mb-3.5">
          <span className="w-[3px] h-3 bg-sage-500 rounded-sm" />
          <span className="text-[10px] font-medium tracking-[0.12em] uppercase text-gray-400">
            Security
          </span>
        </div>

        <div className="bg-white rounded-[14px] border border-gray-200 shadow-sm overflow-hidden">
          <button
            onClick={() => {
              setShowPasswordSection(!showPasswordSection)
              if (showPasswordSection) resetPasswordForm()
            }}
            className="w-full px-4 py-3.5 flex items-center justify-between hover:bg-gray-50 transition-colors"
          >
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center">
                <Lock className="w-4 h-4 text-gray-500" />
              </div>
              <div className="text-left">
                <div className="text-[14px] font-medium">Change Password</div>
                <div className="text-[11px] text-gray-400 mt-0.5">Update your account password</div>
              </div>
            </div>
            <svg
              className={`w-4 h-4 text-gray-400 transition-transform ${showPasswordSection ? 'rotate-180' : ''}`}
              fill="none" stroke="currentColor" viewBox="0 0 24 24"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
            </svg>
          </button>

          {showPasswordSection && (
            <div className="px-4 pb-4 border-t border-gray-100">
              {passwordSuccess ? (
                <div className="pt-4">
                  <div className="rounded-[10px] bg-green-50 border border-green-200 p-4 text-center">
                    <p className="text-[13px] font-medium text-green-800">Password updated successfully.</p>
                  </div>
                  <button
                    onClick={() => {
                      resetPasswordForm()
                      setShowPasswordSection(false)
                    }}
                    className="mt-3 w-full py-2.5 bg-[#0a0a0a] text-white rounded-[10px] text-[13px] font-medium hover:bg-[#1a1a1a] transition-colors"
                  >
                    Done
                  </button>
                </div>
              ) : (
                <form onSubmit={handleChangePassword} className="pt-4 space-y-3.5">
                  {passwordError && (
                    <div className="rounded-[10px] bg-red-50 border border-red-200 px-3 py-2.5 text-[13px] text-red-700">
                      {passwordError}
                    </div>
                  )}

                  {/* Current Password */}
                  <div>
                    <label className="block text-[11px] font-medium text-gray-400 uppercase tracking-[0.08em] mb-1.5">
                      Current Password
                    </label>
                    <div className="relative">
                      <input
                        type={showCurrent ? 'text' : 'password'}
                        value={currentPassword}
                        onChange={(e) => setCurrentPassword(e.target.value)}
                        required
                        className="w-full py-2.5 px-3.5 pr-10 border border-[#e8e8e4] rounded-[9px] text-[14px] bg-[#f5f5f3] outline-none transition-[border-color] duration-200 focus:border-[#8aab8e]"
                      />
                      <button
                        type="button"
                        onClick={() => setShowCurrent(!showCurrent)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                      >
                        {showCurrent ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                      </button>
                    </div>
                  </div>

                  {/* New Password */}
                  <div>
                    <label className="block text-[11px] font-medium text-gray-400 uppercase tracking-[0.08em] mb-1.5">
                      New Password
                    </label>
                    <div className="relative">
                      <input
                        type={showNew ? 'text' : 'password'}
                        value={newPassword}
                        onChange={(e) => setNewPassword(e.target.value)}
                        required
                        className="w-full py-2.5 px-3.5 pr-10 border border-[#e8e8e4] rounded-[9px] text-[14px] bg-[#f5f5f3] outline-none transition-[border-color] duration-200 focus:border-[#8aab8e]"
                      />
                      <button
                        type="button"
                        onClick={() => setShowNew(!showNew)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                      >
                        {showNew ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                      </button>
                    </div>
                    <p className="text-[10px] text-gray-400 mt-1">Minimum 6 characters</p>
                  </div>

                  {/* Confirm New Password */}
                  <div>
                    <label className="block text-[11px] font-medium text-gray-400 uppercase tracking-[0.08em] mb-1.5">
                      Confirm New Password
                    </label>
                    <div className="relative">
                      <input
                        type={showConfirm ? 'text' : 'password'}
                        value={confirmPassword}
                        onChange={(e) => setConfirmPassword(e.target.value)}
                        required
                        className="w-full py-2.5 px-3.5 pr-10 border border-[#e8e8e4] rounded-[9px] text-[14px] bg-[#f5f5f3] outline-none transition-[border-color] duration-200 focus:border-[#8aab8e]"
                      />
                      <button
                        type="button"
                        onClick={() => setShowConfirm(!showConfirm)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                      >
                        {showConfirm ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                      </button>
                    </div>
                  </div>

                  <button
                    type="submit"
                    disabled={passwordLoading}
                    className="w-full py-2.5 bg-[#0a0a0a] text-white rounded-[10px] text-[13px] font-medium hover:bg-[#1a1a1a] transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {passwordLoading ? 'Updating...' : 'Update Password'}
                  </button>
                </form>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
