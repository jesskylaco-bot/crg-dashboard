'use client'

import { createContext, useContext } from 'react'
import { Profile, RolePermissions, getRolePermissions } from '@/lib/types/database'

interface UserContextValue {
  profile: Profile | null
  permissions: RolePermissions | null
}

const UserContext = createContext<UserContextValue>({
  profile: null,
  permissions: null,
})

export function UserProvider({
  profile,
  children,
}: {
  profile: Profile | null
  children: React.ReactNode
}) {
  const permissions = getRolePermissions(profile?.role)

  return (
    <UserContext.Provider value={{ profile, permissions }}>
      {children}
    </UserContext.Provider>
  )
}

export function useUser() {
  return useContext(UserContext)
}
