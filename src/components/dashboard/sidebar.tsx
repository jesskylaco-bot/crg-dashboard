'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { cn } from '@/lib/utils'
import { Profile, getRolePermissions } from '@/lib/types/database'
import {
  Home,
  ClipboardList,
  Users,
  GraduationCap,
  FileText,
  BarChart3,
  Settings,
  UserPlus,
  LogOut,
} from 'lucide-react'

interface SidebarProps {
  profile: Profile | null
  onLogout: () => void
}

export function Sidebar({ profile, onLogout }: SidebarProps) {
  const pathname = usePathname()
  const roleName = profile?.role?.name || ''
  const permissions = getRolePermissions(profile?.role)

  const navItems = [
    {
      href: '/dashboard',
      label: 'Home',
      icon: Home,
      show: true,
    },
    {
      href: '/dashboard/transactions',
      label: 'Transactions',
      icon: ClipboardList,
      show: true,
    },
    {
      href: '/dashboard/team',
      label: 'Team Directory',
      icon: Users,
      show: true,
    },
    {
      href: '/dashboard/training',
      label: 'Training',
      icon: GraduationCap,
      show: permissions?.canAccessTraining,
    },
    {
      href: '/dashboard/forms',
      label: 'Forms & Docs',
      icon: FileText,
      show: true,
    },
    {
      href: '/dashboard/reports',
      label: 'Reports',
      icon: BarChart3,
      show: permissions?.canViewReports,
    },
    {
      href: '/dashboard/onboarding',
      label: 'Onboarding',
      icon: UserPlus,
      show: permissions?.canManageOnboarding || roleName === 'New Agent',
    },
    {
      href: '/dashboard/settings',
      label: 'Settings',
      icon: Settings,
      show: permissions?.canManageUsers,
    },
  ]

  return (
    <aside className="fixed left-0 top-0 z-40 h-screen w-64 border-r border-gray-200 bg-white">
      <div className="flex h-full flex-col">
        {/* Logo */}
        <div className="flex h-16 items-center border-b border-gray-200 px-6">
          <Link href="/dashboard" className="flex items-center">
            <span className="text-2xl font-bold tracking-tight">
              CRG<span className="text-sage-600">.</span>
            </span>
          </Link>
        </div>

        {/* Navigation */}
        <nav className="flex-1 space-y-1 px-3 py-4">
          {navItems
            .filter((item) => item.show)
            .map((item) => {
              const isActive = pathname === item.href || pathname.startsWith(item.href + '/')
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={cn(
                    'flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors',
                    isActive
                      ? 'bg-gray-100 text-black'
                      : 'text-gray-600 hover:bg-gray-50 hover:text-black'
                  )}
                >
                  <item.icon className="h-5 w-5" />
                  {item.label}
                </Link>
              )
            })}
        </nav>

        {/* User section */}
        <div className="border-t border-gray-200 p-4">
          <div className="flex items-center gap-3 mb-3">
            <div className="h-10 w-10 rounded-full bg-black flex items-center justify-center text-white text-sm font-medium">
              {profile?.full_name?.split(' ').map(n => n[0]).join('').substring(0, 2) || 'U'}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-gray-900 truncate">
                {profile?.full_name || 'User'}
              </p>
              <p className="text-xs text-gray-500 truncate">
                {roleName || 'Member'}
              </p>
            </div>
          </div>
          <button
            onClick={onLogout}
            className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-sm text-gray-600 hover:bg-gray-50 hover:text-black transition-colors"
          >
            <LogOut className="h-4 w-4" />
            Sign out
          </button>
        </div>
      </div>
    </aside>
  )
}
