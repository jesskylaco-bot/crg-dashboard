export interface RolePermissions {
  canViewAllTransactions: boolean
  canEditTransactions: boolean
  canManageUsers: boolean
  canManageOnboarding: boolean
  canViewReports: boolean
  canManageAnnouncements: boolean
  canAccessTraining: boolean
  canManageForms: boolean
  requiresOnboarding: boolean
}

export interface Role extends Partial<RolePermissions> {
  id: string
  name: string
  description?: string
  created_at: string
}

export type OnboardingStatus =
  | 'not_started'
  | 'in_progress'
  | 'pending_approval'
  | 'approved'
  | 'rejected'

export type TransactionStage =
  | 'lead'
  | 'active'
  | 'offer_stage'
  | 'pending'
  | 'under_contract'
  | 'closing'
  | 'closed'
  | 'archived'
  | 'lost'
  | 'withdrawn'

export interface Profile {
  id: string
  email: string
  full_name: string
  phone?: string
  photo_url?: string
  role_id?: string
  team_member_id?: string
  onboarding_status: OnboardingStatus
  is_active: boolean
  created_at: string
  updated_at: string
  role?: Role
  team_member?: TeamMember
}

export interface Transaction {
  id: string
  property_address: string
  client_name: string
  client_email?: string
  client_phone?: string
  agent_id?: string
  tc_id?: string
  stage: TransactionStage
  price?: number
  listing_date?: string
  offer_date?: string
  contract_date?: string
  closing_date?: string
  notes?: string
  zillow_link?: string
  drive_folder_link?: string
  created_at: string
  updated_at: string
  agent?: TeamMember
  tc?: TeamMember
}

export interface TeamMember {
  id: string
  full_name: string
  email: string
  phone?: string
  photo_url?: string
  drive_folder_link?: string
  profile_id?: string
  is_active: boolean
  created_at: string
  updated_at: string
}

export interface Announcement {
  id: string
  title: string
  body: string
  author_id: string
  is_active: boolean
  created_at: string
}

export interface Notification {
  id: string
  user_id: string
  title: string
  body?: string
  is_read: boolean
  link?: string
  created_at: string
}

export interface OnboardingTask {
  id: string
  title: string
  description?: string
  order_index: number
  is_required: boolean
  task_type: 'checklist' | 'document_upload' | 'video' | 'form' | 'approval'
  resource_url?: string
}

export interface UserOnboardingProgress {
  id: string
  user_id: string
  task_id: string
  is_completed: boolean
  completed_at?: string
  document_url?: string
  notes?: string
}

export interface EmailChangeRequest {
  id: string
  user_id: string
  current_email: string
  new_email: string
  status: 'pending' | 'approved' | 'rejected'
  reviewed_by?: string
  reviewed_at?: string
  created_at: string
  user?: Profile
}

const SUPER_ADMIN_PERMISSIONS: RolePermissions = {
  canViewAllTransactions: true,
  canEditTransactions: true,
  canManageUsers: true,
  canManageOnboarding: true,
  canViewReports: true,
  canManageAnnouncements: true,
  canAccessTraining: true,
  canManageForms: true,
  requiresOnboarding: false,
}

export function getRolePermissions(role?: Role | null): RolePermissions | null {
  if (!role) return null
  if (role.name === 'Super Admin / Leadership') return SUPER_ADMIN_PERMISSIONS
  if (role.canViewAllTransactions !== undefined) {
    return {
      canViewAllTransactions: role.canViewAllTransactions ?? false,
      canEditTransactions: role.canEditTransactions ?? false,
      canManageUsers: role.canManageUsers ?? false,
      canManageOnboarding: role.canManageOnboarding ?? false,
      canViewReports: role.canViewReports ?? false,
      canManageAnnouncements: role.canManageAnnouncements ?? false,
      canAccessTraining: role.canAccessTraining ?? false,
      canManageForms: role.canManageForms ?? false,
      requiresOnboarding: role.requiresOnboarding ?? false,
    }
  }
  return ROLE_PERMISSIONS[role.name] || null
}

export const ROLE_PERMISSIONS: Record<string, RolePermissions> = {
  'Super Admin / Leadership': {
    canViewAllTransactions: true,
    canEditTransactions: true,
    canManageUsers: true,
    canManageOnboarding: true,
    canViewReports: true,
    canManageAnnouncements: true,
    canAccessTraining: true,
    canManageForms: true,
    requiresOnboarding: false,
  },
  'Operations Manager': {
    canViewAllTransactions: true,
    canEditTransactions: true,
    canManageUsers: true,
    canManageOnboarding: true,
    canViewReports: true,
    canManageAnnouncements: true,
    canAccessTraining: true,
    canManageForms: true,
    requiresOnboarding: false,
  },
  'Transaction Coordinator': {
    canViewAllTransactions: true,
    canEditTransactions: true,
    canManageUsers: false,
    canManageOnboarding: false,
    canViewReports: true,
    canManageAnnouncements: false,
    canAccessTraining: true,
    canManageForms: false,
    requiresOnboarding: false,
  },
  'Virtual Assistant / Marketing': {
    canViewAllTransactions: true,
    canEditTransactions: false,
    canManageUsers: false,
    canManageOnboarding: false,
    canViewReports: false,
    canManageAnnouncements: true,
    canAccessTraining: true,
    canManageForms: false,
    requiresOnboarding: false,
  },
  'Agent': {
    canViewAllTransactions: false,
    canEditTransactions: true,
    canManageUsers: false,
    canManageOnboarding: false,
    canViewReports: false,
    canManageAnnouncements: false,
    canAccessTraining: true,
    canManageForms: false,
    requiresOnboarding: false,
  },
  'New Agent': {
    canViewAllTransactions: false,
    canEditTransactions: false,
    canManageUsers: false,
    canManageOnboarding: false,
    canViewReports: false,
    canManageAnnouncements: false,
    canAccessTraining: true,
    canManageForms: false,
    requiresOnboarding: true,
  },
}
