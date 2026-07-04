'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import { Profile, Notification, getRolePermissions } from '@/lib/types/database'
import { LogOut, User, UserPlus, Bell, Shield } from 'lucide-react'

const supabase = createClient()

interface HeaderProps {
  profile: Profile | null
  onLogout: () => void
}

export function Header({ profile, onLogout }: HeaderProps) {
  const [showUserMenu, setShowUserMenu] = useState(false)
  const [showNotifications, setShowNotifications] = useState(false)
  const [notifications, setNotifications] = useState<Notification[]>([])
  const [unreadCount, setUnreadCount] = useState(0)

  const roleName = profile?.role?.name || ''
  const permissions = getRolePermissions(profile?.role)
  const canManage = permissions?.canManageOnboarding
  const isSuperAdmin = roleName === 'Super Admin / Leadership'

  useEffect(() => {
    if (!profile?.id) return

    async function loadNotifications() {
      const { data } = await supabase
        .from('notifications')
        .select('*')
        .eq('user_id', profile!.id)
        .order('created_at', { ascending: false })
        .limit(20)

      if (data) {
        setNotifications(data)
        setUnreadCount(data.filter((n) => !n.is_read).length)
      }
    }

    loadNotifications()

    const channel = supabase
      .channel('notifications')
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'notifications', filter: `user_id=eq.${profile.id}` },
        (payload) => {
          const newNotif = payload.new as Notification
          setNotifications((prev) => [newNotif, ...prev])
          setUnreadCount((prev) => prev + 1)
        }
      )
      .subscribe()

    return () => { supabase.removeChannel(channel) }
  }, [profile?.id])

  async function markAllRead() {
    if (!profile?.id || unreadCount === 0) return
    await supabase
      .from('notifications')
      .update({ is_read: true })
      .eq('user_id', profile.id)
      .eq('is_read', false)

    setNotifications((prev) => prev.map((n) => ({ ...n, is_read: true })))
    setUnreadCount(0)
  }

  async function markRead(id: string) {
    await supabase.from('notifications').update({ is_read: true }).eq('id', id)
    setNotifications((prev) => prev.map((n) => n.id === id ? { ...n, is_read: true } : n))
    setUnreadCount((prev) => Math.max(0, prev - 1))
  }

  const today = new Date()
  const dateString = today.toLocaleDateString('en-US', {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
  })

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

  return (
    <header className="sticky top-0 z-30 flex h-14 items-center justify-between bg-black px-5">
      {/* Logo */}
      <Link href="/dashboard">
        <span className="font-serif text-[22px] font-semibold text-white tracking-wider">
          CRG<span className="text-sage-400">.</span>
        </span>
      </Link>

      {/* Date */}
      <div className="text-[11px] text-gray-400 tracking-wide">{dateString}</div>

      {/* Right side - bell + avatar */}
      <div className="flex items-center gap-2">
        {/* Bell */}
        <div className="relative">
          <button
            onClick={() => { setShowNotifications(!showNotifications); setShowUserMenu(false) }}
            className="p-1.5 rounded-full hover:bg-white/10 transition-colors relative"
          >
            <Bell className="h-5 w-5 text-gray-400" />
            {unreadCount > 0 && (
              <span className="absolute -top-0.5 -right-0.5 min-w-[16px] h-4 px-1 flex items-center justify-center bg-[#c0392b] text-white text-[9px] font-bold rounded-full">
                {unreadCount > 9 ? '9+' : unreadCount}
              </span>
            )}
          </button>

          {showNotifications && (
            <>
              <div className="fixed inset-0 z-40" onClick={() => setShowNotifications(false)} />
              <div className="absolute right-0 top-full mt-2 w-72 max-h-[400px] rounded-lg border border-gray-200 bg-white shadow-lg z-50 overflow-hidden">
                <div className="flex items-center justify-between px-3 py-2.5 border-b border-gray-100">
                  <span className="text-[13px] font-medium">Notifications</span>
                  {unreadCount > 0 && (
                    <button onClick={markAllRead} className="text-[11px] text-[#8aab8e] font-medium hover:underline">
                      Mark all read
                    </button>
                  )}
                </div>
                <div className="overflow-y-auto max-h-[340px]">
                  {notifications.length === 0 ? (
                    <div className="py-8 text-center text-[12px] text-[#a0a09a]">No notifications</div>
                  ) : (
                    notifications.map((n) => (
                      <div
                        key={n.id}
                        className={`px-3 py-2.5 border-b border-gray-50 cursor-pointer hover:bg-gray-50 transition-colors ${
                          !n.is_read ? 'bg-[#f0f5f0]' : ''
                        }`}
                        onClick={() => {
                          if (!n.is_read) markRead(n.id)
                          if (n.link) window.location.href = n.link
                          setShowNotifications(false)
                        }}
                      >
                        <div className="flex items-start gap-2">
                          {!n.is_read && <span className="w-1.5 h-1.5 rounded-full bg-[#8aab8e] flex-shrink-0 mt-1.5" />}
                          <div className={!n.is_read ? '' : 'pl-3.5'}>
                            <div className="text-[12px] font-medium leading-tight">{n.title}</div>
                            {n.body && <div className="text-[11px] text-[#a0a09a] mt-0.5 leading-snug">{n.body}</div>}
                            <div className="text-[10px] text-[#ccccc8] mt-1">{timeAgo(n.created_at)}</div>
                          </div>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>
            </>
          )}
        </div>

        {/* Avatar */}
        <div className="relative">
          <button
            onClick={() => { setShowUserMenu(!showUserMenu); setShowNotifications(false) }}
            className="p-1.5 rounded-full hover:bg-white/10 transition-colors"
          >
            <div className="h-8 w-8 rounded-full bg-sage-600 flex items-center justify-center text-white text-xs font-medium">
              {profile?.full_name?.split(' ').map(n => n[0]).join('').substring(0, 2) || 'U'}
            </div>
          </button>

          {showUserMenu && (
            <>
              <div className="fixed inset-0 z-40" onClick={() => setShowUserMenu(false)} />
              <div className="absolute right-0 top-full mt-2 w-56 rounded-lg border border-gray-200 bg-white shadow-lg z-50">
                <div className="p-3 border-b border-gray-100">
                  <p className="text-sm font-medium">{profile?.full_name}</p>
                  <p className="text-xs text-gray-500">{profile?.email}</p>
                  <p className="text-xs text-sage-600 mt-1">{roleName}</p>
                </div>
                <div className="p-1">
                  <Link
                    href="/dashboard/profile"
                    className="flex items-center gap-2 px-3 py-2 text-sm text-gray-700 rounded-md hover:bg-gray-50"
                    onClick={() => setShowUserMenu(false)}
                  >
                    <User className="h-4 w-4" />
                    Profile
                  </Link>
                  <Link
                    href="/dashboard/onboarding"
                    className="flex items-center gap-2 px-3 py-2 text-sm text-gray-700 rounded-md hover:bg-gray-50"
                    onClick={() => setShowUserMenu(false)}
                  >
                    <UserPlus className="h-4 w-4" />
                    {canManage ? 'Onboarding Progress' : 'My Onboarding'}
                  </Link>
                  {isSuperAdmin && (
                    <Link
                      href="/dashboard/roles"
                      className="flex items-center gap-2 px-3 py-2 text-sm text-gray-700 rounded-md hover:bg-gray-50"
                      onClick={() => setShowUserMenu(false)}
                    >
                      <Shield className="h-4 w-4" />
                      Manage Roles
                    </Link>
                  )}
                  <button
                    onClick={() => {
                      setShowUserMenu(false)
                      onLogout()
                    }}
                    className="flex w-full items-center gap-2 px-3 py-2 text-sm text-red-600 rounded-md hover:bg-red-50"
                  >
                    <LogOut className="h-4 w-4" />
                    Sign out
                  </button>
                </div>
              </div>
            </>
          )}
        </div>
      </div>
    </header>
  )
}
