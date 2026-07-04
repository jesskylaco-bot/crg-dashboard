'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { cn } from '@/lib/utils'
import { useUser } from '@/lib/contexts/user-context'
import {
  Home,
  ClipboardList,
  Users,
  GraduationCap,
  FileText,
} from 'lucide-react'

export function MobileNav() {
  const pathname = usePathname()
  const { permissions } = useUser()

  const navItems = [
    { href: '/dashboard', label: 'Home', icon: Home, show: true },
    { href: '/dashboard/transactions', label: 'Deals', icon: ClipboardList, show: true },
    { href: '/dashboard/team', label: 'Team', icon: Users, show: true },
    { href: '/dashboard/training', label: 'Training', icon: GraduationCap, show: permissions?.canAccessTraining },
    { href: '/dashboard/forms', label: 'Forms', icon: FileText, show: true },
  ].filter(item => item.show)

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 bg-black border-t border-white/5 pb-safe md:max-w-[480px] md:mx-auto">
      <div className="flex items-stretch h-[68px]">
        {navItems.map((item) => {
            const isActive = item.href === '/dashboard'
              ? pathname === '/dashboard'
              : pathname === item.href || pathname.startsWith(item.href + '/')
            return (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  'flex flex-1 flex-col items-center justify-center gap-1 py-2 text-[10px] tracking-wide transition-colors relative',
                  isActive ? 'text-sage-400' : 'text-gray-500'
                )}
              >
                {isActive && (
                  <span className="absolute top-0 left-1/2 -translate-x-1/2 w-6 h-0.5 bg-sage-400 rounded-b" />
                )}
                <item.icon className="h-5 w-5" />
                <span>{item.label}</span>
              </Link>
            )
          })}
      </div>
    </nav>
  )
}
