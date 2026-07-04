'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Sidebar } from '@/components/dashboard/sidebar'
import { Header } from '@/components/dashboard/header'
import { MobileNav } from '@/components/dashboard/mobile-nav'
import { Profile } from '@/lib/types/database'
import { UserProvider } from '@/lib/contexts/user-context'

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const [profile, setProfile] = useState<Profile | null>(null)
  const [loading, setLoading] = useState(true)
  const router = useRouter()
  const supabase = createClient()

  useEffect(() => {
    async function loadProfile() {
      const { data: { user } } = await supabase.auth.getUser()

      if (!user) {
        router.push('/login')
        return
      }

      const { data: profileData } = await supabase
        .from('profiles')
        .select('*, role:roles(*)')
        .eq('id', user.id)
        .single()

      setProfile(profileData)
      setLoading(false)
    }

    loadProfile()
  }, [router, supabase])

  const handleLogout = async () => {
    await supabase.auth.signOut()
    router.push('/login')
    router.refresh()
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-black"></div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50 md:bg-[#c8cec9]">
      {/* App container - mobile-like on desktop */}
      <div className="app-container md:max-w-[480px] md:mx-auto md:bg-gray-50 md:shadow-2xl">
        {/* Header */}
        <Header profile={profile} onLogout={handleLogout} />

        {/* Main content */}
        <UserProvider profile={profile}>
          <main className="pb-20">
            {children}
          </main>

          {/* Mobile bottom nav */}
          <MobileNav />
        </UserProvider>
      </div>
    </div>
  )
}
