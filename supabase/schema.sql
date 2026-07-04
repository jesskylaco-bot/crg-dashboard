-- CRG Platform Database Schema
-- Run this in your Supabase SQL Editor to set up the database.
-- This file reflects the LIVE database structure (introspected, not hand-maintained).
--
-- NOTE ON ROLES: access control moved from the `user_role` enum to a `roles`
-- table referenced by profiles.role_id. The `user_role` enum is now only used
-- by training_resources.roles_allowed (legacy column). See the roles seed at the
-- bottom — permission flags there are PLACEHOLDERS; replace with your real data.

-- ============================================================================
-- Extensions
-- ============================================================================
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================================================
-- Enum types
-- ============================================================================
CREATE TYPE user_role AS ENUM (
  'super_admin',
  'operations_manager',
  'transaction_coordinator',
  'virtual_assistant',
  'agent',
  'new_agent'
);

CREATE TYPE onboarding_status AS ENUM (
  'not_started',
  'in_progress',
  'pending_approval',
  'approved',
  'rejected'
);

CREATE TYPE transaction_stage AS ENUM (
  'lead',
  'active',
  'offer_stage',
  'pending',
  'under_contract',
  'closing',
  'closed',
  'archived',
  'lost',
  'withdrawn'
);

-- ============================================================================
-- Tables
-- ============================================================================

-- Roles (permission sets; replaces the old profiles.role enum)
CREATE TABLE roles (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  name TEXT NOT NULL UNIQUE,
  description TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  "canViewAllTransactions" BOOLEAN DEFAULT false NOT NULL,
  "canEditTransactions" BOOLEAN DEFAULT false NOT NULL,
  "canManageUsers" BOOLEAN DEFAULT false NOT NULL,
  "canManageOnboarding" BOOLEAN DEFAULT false NOT NULL,
  "canViewReports" BOOLEAN DEFAULT false NOT NULL,
  "canManageAnnouncements" BOOLEAN DEFAULT false NOT NULL,
  "canAccessTraining" BOOLEAN DEFAULT false NOT NULL,
  "requiresOnboarding" BOOLEAN DEFAULT false NOT NULL,
  "canManageForms" BOOLEAN DEFAULT false NOT NULL
);

-- Team Members (directory; profile_id FK added after profiles due to circular ref)
CREATE TABLE team_members (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  full_name TEXT NOT NULL,
  email TEXT NOT NULL,
  phone TEXT,
  photo_url TEXT,
  drive_folder_link TEXT,
  is_active BOOLEAN DEFAULT true NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  profile_id UUID
);

-- Profiles (extends Supabase auth.users)
CREATE TABLE profiles (
  id UUID REFERENCES auth.users(id) ON DELETE CASCADE PRIMARY KEY,
  email TEXT NOT NULL,
  full_name TEXT NOT NULL,
  onboarding_status onboarding_status DEFAULT 'not_started' NOT NULL,
  is_active BOOLEAN DEFAULT true NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  team_member_id UUID REFERENCES team_members(id) ON DELETE SET NULL,
  role_id UUID REFERENCES roles(id) ON DELETE SET NULL
);

-- Resolve the profiles <-> team_members circular reference
ALTER TABLE team_members
  ADD CONSTRAINT team_members_profile_id_fkey
  FOREIGN KEY (profile_id) REFERENCES profiles(id) ON DELETE SET NULL;

-- Transactions
CREATE TABLE transactions (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  property_address TEXT NOT NULL,
  client_name TEXT NOT NULL,
  client_email TEXT,
  client_phone TEXT,
  agent_id UUID REFERENCES team_members(id) ON DELETE SET NULL,
  tc_id UUID REFERENCES team_members(id) ON DELETE SET NULL,
  stage transaction_stage DEFAULT 'lead' NOT NULL,
  price DECIMAL(12, 2),
  listing_date DATE,
  offer_date DATE,
  contract_date DATE,
  closing_date DATE,
  notes TEXT,
  zillow_link TEXT,
  drive_folder_link TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- Announcements
CREATE TABLE announcements (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  title TEXT NOT NULL,
  body TEXT NOT NULL,
  author_id UUID REFERENCES profiles(id) ON DELETE SET NULL,
  is_active BOOLEAN DEFAULT true NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- Onboarding tasks (template)
CREATE TABLE onboarding_tasks (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  title TEXT NOT NULL,
  description TEXT,
  order_index INTEGER NOT NULL,
  is_required BOOLEAN DEFAULT true NOT NULL,
  task_type TEXT NOT NULL CHECK (task_type IN ('checklist', 'document_upload', 'video', 'form', 'approval')),
  resource_url TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- User onboarding progress
CREATE TABLE user_onboarding_progress (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  task_id UUID REFERENCES onboarding_tasks(id) ON DELETE CASCADE NOT NULL,
  is_completed BOOLEAN DEFAULT false NOT NULL,
  completed_at TIMESTAMPTZ,
  document_url TEXT,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  UNIQUE(user_id, task_id)
);

-- Training resources
CREATE TABLE training_resources (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  title TEXT NOT NULL,
  description TEXT,
  category TEXT NOT NULL,
  resource_type TEXT NOT NULL CHECK (resource_type IN ('video', 'document', 'link', 'course')),
  resource_url TEXT,
  is_required BOOLEAN DEFAULT false NOT NULL,
  order_index INTEGER DEFAULT 0 NOT NULL,
  roles_allowed user_role[] DEFAULT ARRAY['agent', 'new_agent']::user_role[],
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- Email change requests (admin approval flow)
CREATE TABLE email_change_requests (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  current_email TEXT NOT NULL,
  new_email TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
  reviewed_by UUID REFERENCES profiles(id) ON DELETE SET NULL,
  reviewed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- Forms (shared form links)
CREATE TABLE forms (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  title TEXT NOT NULL,
  url TEXT NOT NULL,
  description TEXT,
  is_active BOOLEAN DEFAULT true NOT NULL,
  order_index INTEGER DEFAULT 0 NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- Notifications
CREATE TABLE notifications (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  title TEXT NOT NULL,
  body TEXT,
  is_read BOOLEAN DEFAULT false NOT NULL,
  link TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- ============================================================================
-- Row Level Security
-- ============================================================================
ALTER TABLE roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE team_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE announcements ENABLE ROW LEVEL SECURITY;
ALTER TABLE onboarding_tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_onboarding_progress ENABLE ROW LEVEL SECURITY;
ALTER TABLE training_resources ENABLE ROW LEVEL SECURITY;
ALTER TABLE email_change_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE forms ENABLE ROW LEVEL SECURITY;
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;

-- ---- roles policies ----
CREATE POLICY "Authenticated users can view roles"
  ON roles FOR SELECT
  USING (auth.uid() IS NOT NULL);

CREATE POLICY "Authenticated users can update roles"
  ON roles FOR UPDATE
  USING (auth.uid() IS NOT NULL);

-- ---- profiles policies ----
CREATE POLICY "Authenticated users can view profiles"
  ON profiles FOR SELECT
  USING (auth.uid() IS NOT NULL);

CREATE POLICY "Allow profile creation"
  ON profiles FOR INSERT
  WITH CHECK (true);

CREATE POLICY "Users can update their own profile"
  ON profiles FOR UPDATE
  USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);

CREATE POLICY "Admins can update any profile"
  ON profiles FOR UPDATE
  USING (auth.uid() IS NOT NULL);

-- ---- team_members policies ----
CREATE POLICY "Authenticated users can view team members"
  ON team_members FOR SELECT
  USING (auth.uid() IS NOT NULL);

CREATE POLICY "Authenticated users can insert team members"
  ON team_members FOR INSERT
  WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "Authenticated users can update team members"
  ON team_members FOR UPDATE
  USING (auth.uid() IS NOT NULL);

CREATE POLICY "Authenticated users can delete team members"
  ON team_members FOR DELETE
  USING (auth.uid() IS NOT NULL);

-- ---- transactions policies ----
CREATE POLICY "Authenticated users can view transactions"
  ON transactions FOR SELECT
  USING (auth.uid() IS NOT NULL);

CREATE POLICY "Authenticated users can insert transactions"
  ON transactions FOR INSERT
  WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "Authenticated users can update transactions"
  ON transactions FOR UPDATE
  USING (auth.uid() IS NOT NULL);

CREATE POLICY "Authenticated users can delete transactions"
  ON transactions FOR DELETE
  USING (auth.uid() IS NOT NULL);

-- ---- announcements policies ----
CREATE POLICY "Authenticated users can view active announcements"
  ON announcements FOR SELECT
  USING ((auth.uid() IS NOT NULL) AND (is_active = true));

CREATE POLICY "Authenticated users can insert announcements"
  ON announcements FOR INSERT
  WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "Authenticated users can update announcements"
  ON announcements FOR UPDATE
  USING (auth.uid() IS NOT NULL);

CREATE POLICY "Authenticated users can delete announcements"
  ON announcements FOR DELETE
  USING (auth.uid() IS NOT NULL);

-- ---- onboarding_tasks policies ----
-- (Two SELECT policies exist live; both retained as-is.)
CREATE POLICY "Anyone can view onboarding tasks"
  ON onboarding_tasks FOR SELECT
  USING (auth.uid() IS NOT NULL);

CREATE POLICY "Authenticated users can view onboarding tasks"
  ON onboarding_tasks FOR SELECT
  USING (auth.uid() IS NOT NULL);

CREATE POLICY "Authenticated users can insert onboarding tasks"
  ON onboarding_tasks FOR INSERT
  WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "Authenticated users can update onboarding tasks"
  ON onboarding_tasks FOR UPDATE
  USING (auth.uid() IS NOT NULL);

CREATE POLICY "Authenticated users can delete onboarding tasks"
  ON onboarding_tasks FOR DELETE
  USING (auth.uid() IS NOT NULL);

-- ---- user_onboarding_progress policies ----
CREATE POLICY "Anyone can view their progress"
  ON user_onboarding_progress FOR SELECT
  USING (auth.uid() IS NOT NULL);

CREATE POLICY "Authenticated users can view all progress"
  ON user_onboarding_progress FOR SELECT
  USING (auth.uid() IS NOT NULL);

CREATE POLICY "Users can insert their progress"
  ON user_onboarding_progress FOR INSERT
  WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "Users can update their progress"
  ON user_onboarding_progress FOR UPDATE
  USING (auth.uid() IS NOT NULL);

-- ---- training_resources policies ----
CREATE POLICY "Authenticated users can view training resources"
  ON training_resources FOR SELECT
  USING (auth.uid() IS NOT NULL);

CREATE POLICY "Authenticated users can insert training resources"
  ON training_resources FOR INSERT
  WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "Authenticated users can update training resources"
  ON training_resources FOR UPDATE
  USING (auth.uid() IS NOT NULL);

CREATE POLICY "Authenticated users can delete training resources"
  ON training_resources FOR DELETE
  USING (auth.uid() IS NOT NULL);

-- ---- email_change_requests policies ----
CREATE POLICY "Users can view their own email change requests"
  ON email_change_requests FOR SELECT
  USING (user_id = auth.uid());

CREATE POLICY "Admins can view all email change requests"
  ON email_change_requests FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM profiles p
      JOIN roles r ON r.id = p.role_id
      WHERE p.id = auth.uid()
      AND r.name = ANY (ARRAY['Super Admin / Leadership', 'Operations Manager'])
    )
  );

CREATE POLICY "Users can insert their own email change requests"
  ON email_change_requests FOR INSERT
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Admins can update email change requests"
  ON email_change_requests FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM profiles p
      JOIN roles r ON r.id = p.role_id
      WHERE p.id = auth.uid()
      AND r.name = ANY (ARRAY['Super Admin / Leadership', 'Operations Manager'])
    )
  );

-- ---- forms policies ----
CREATE POLICY "Authenticated users can view active forms"
  ON forms FOR SELECT
  USING (auth.uid() IS NOT NULL);

CREATE POLICY "Authenticated users can manage forms"
  ON forms FOR ALL
  USING (auth.uid() IS NOT NULL);

-- ---- notifications policies ----
CREATE POLICY "Users can view their own notifications"
  ON notifications FOR SELECT
  USING (auth.uid() IS NOT NULL);

CREATE POLICY "Authenticated users can insert notifications"
  ON notifications FOR INSERT
  WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "Users can update their own notifications"
  ON notifications FOR UPDATE
  USING (auth.uid() IS NOT NULL);

-- ============================================================================
-- Functions and Triggers
-- ============================================================================

-- Auto-update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_profiles_updated_at
  BEFORE UPDATE ON profiles
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_team_members_updated_at
  BEFORE UPDATE ON team_members
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_transactions_updated_at
  BEFORE UPDATE ON transactions
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_forms_updated_at
  BEFORE UPDATE ON forms
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Handle new user signup: create a profile and assign the "New Agent" role
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  INSERT INTO public.profiles (id, email, full_name, role_id, onboarding_status, is_active)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'full_name', 'New User'),
    (SELECT id FROM public.roles WHERE name = 'New Agent'),
    'not_started',
    true
  );
  RETURN NEW;
END;
$$;

-- Trigger to auto-create profile on signup (lives on auth.users)
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION handle_new_user();

-- ============================================================================
-- Seed data
-- ============================================================================

-- Roles (exact live data)
-- The names 'New Agent', 'Super Admin / Leadership', and 'Operations Manager' are
-- referenced by handle_new_user() and the email_change_requests RLS policies, so
-- those exact names must exist.
INSERT INTO roles (name, description, "canViewAllTransactions", "canEditTransactions", "canManageUsers", "canManageOnboarding", "canViewReports", "canManageAnnouncements", "canAccessTraining", "requiresOnboarding", "canManageForms") VALUES
  ('Agent', 'Full agent with access to own transactions and resources', true, true, false, false, true, true, true, false, false),
  ('New Agent', 'Onboarding-only access until approved', true, true, false, false, true, true, true, true, false),
  ('Operations Manager', 'Manages daily operations, compliance, and reporting', true, true, true, true, true, true, true, false, true),
  ('Super Admin / Leadership', 'Full access to all features and settings', true, true, true, true, true, true, true, false, true),
  ('Transaction Coordinator', 'Manages transaction updates and documents', true, true, false, false, true, false, true, false, false),
  ('Virtual Assistant / Marketing', 'Supports marketing and administrative tasks', true, false, false, false, false, true, true, false, false)
ON CONFLICT (name) DO NOTHING;

-- VA/Operations team directory
INSERT INTO team_members (full_name, email, photo_url) VALUES
  ('Cara Flores', 'cara@mycobbrealty.com', 'https://www.dropbox.com/scl/fi/xd8n13k0tbp1crxws3ces/Cara.png?rlkey=pusc88acd8psx7dl0fnyju55j&raw=1'),
  ('Mica Ancajas', 'mica@tycobbrealty.com', 'https://www.dropbox.com/scl/fi/mdyqsy4girhlxj3fsexye/Mica.png?rlkey=vdy2pwpo6gmwxj3um0th11xrb&raw=1'),
  ('Melrose Santos', 'melrose@tycobbrealty.com', 'https://www.dropbox.com/scl/fi/8yhew9qjwil18597r4pk3/Melrose.png?rlkey=z5gvqxx52ycb4ehafttszr9e6&raw=1'),
  ('Jessan Cinco', 'social@mycobbrealty.com', 'https://www.dropbox.com/scl/fi/tmuinfv15a0wxi7qcdtdh/Jessan.png?rlkey=sm96nx7bw2eoyaq9qq00g4hsg&raw=1');

-- Default onboarding tasks
INSERT INTO onboarding_tasks (title, description, order_index, is_required, task_type) VALUES
  ('Welcome to CRG', 'Watch the welcome video from leadership', 1, true, 'video'),
  ('Complete Profile', 'Add your photo and contact information', 2, true, 'checklist'),
  ('Review Company Policies', 'Read and acknowledge company policies', 3, true, 'checklist'),
  ('Upload Real Estate License', 'Upload a copy of your active GA license', 4, true, 'document_upload'),
  ('E&O Insurance', 'Upload proof of Errors & Omissions insurance', 5, true, 'document_upload'),
  ('W-9 Form', 'Complete and submit W-9 for tax purposes', 6, true, 'form'),
  ('CRM Training', 'Complete the CRM basics course', 7, true, 'video'),
  ('Transaction Process Overview', 'Learn our transaction workflow', 8, true, 'video'),
  ('Marketing Guidelines', 'Review branding and marketing standards', 9, false, 'checklist'),
  ('Schedule Orientation Call', 'Book a call with your mentor', 10, true, 'checklist'),
  ('Submit Onboarding Completion Form', 'Final submission for review', 11, true, 'form');
