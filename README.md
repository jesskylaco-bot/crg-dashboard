# CRG Platform

A full-stack brokerage operations platform for Cobb Realty Group, built with Next.js and Supabase.

## Features

### Implemented (Phase 1)
- ✅ **Authentication** - Login, signup, password reset with Supabase Auth
- ✅ **Role-Based Access Control** - 6 user roles with different permissions
  - Super Admin / Leadership
  - Operations Manager
  - Transaction Coordinator
  - Virtual Assistant / Marketing
  - Agent
  - New Agent (onboarding-only access)
- ✅ **Dashboard** - Role-aware home page with stats and quick actions
- ✅ **Transactions** - View and filter deals by stage
- ✅ **Team Directory** - Agent and staff listings with contact info
- ✅ **Training Hub** - Organized training resources
- ✅ **Forms & Documents** - Quick access to important forms
- ✅ **Onboarding System** - Task-based onboarding for new agents

### Planned (Future Phases)
- 🔲 Full transaction lifecycle management (CRUD)
- 🔲 Document upload and compliance tracking
- 🔲 Reporting and analytics dashboard
- 🔲 Notifications system
- 🔲 Google Sheets sync (legacy data migration)

## Tech Stack

- **Framework**: Next.js 15 (App Router)
- **Database & Auth**: Supabase
- **Styling**: Tailwind CSS
- **Icons**: Lucide React
- **Deployment**: Vercel

## Getting Started

### Prerequisites
- Node.js 18+
- A Supabase project

### 1. Clone and Install

```bash
cd crg-platform
npm install
```

### 2. Set Up Supabase

1. Create a new project at [supabase.com](https://supabase.com)
2. Go to **SQL Editor** and run the schema from `supabase/schema.sql`
3. Copy your project URL and anon key from **Settings > API**

### 3. Configure Environment

```bash
cp .env.local.example .env.local
```

Edit `.env.local` with your Supabase credentials:

```env
NEXT_PUBLIC_SUPABASE_URL=your_supabase_project_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
NEXT_PUBLIC_SITE_URL=http://localhost:3000
```

### 4. Run Development Server

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

## Project Structure

```
src/
├── app/
│   ├── (auth)/           # Auth pages (login, signup, etc.)
│   ├── (dashboard)/      # Protected dashboard pages
│   ├── actions/          # Server actions
│   ├── auth/callback/    # OAuth callback handler
│   └── page.tsx          # Root redirect
├── components/
│   ├── dashboard/        # Dashboard-specific components
│   └── ui/               # Reusable UI components
└── lib/
    ├── supabase/         # Supabase client utilities
    ├── types/            # TypeScript types
    └── utils.ts          # Helper functions
```

## User Roles & Permissions

| Role | View All Transactions | Edit Transactions | Manage Users | View Reports | Manage Onboarding |
|------|----------------------|-------------------|--------------|--------------|-------------------|
| Super Admin | ✅ | ✅ | ✅ | ✅ | ✅ |
| Operations Manager | ✅ | ✅ | ✅ | ✅ | ✅ |
| Transaction Coordinator | ✅ | ✅ | ❌ | ✅ | ❌ |
| Virtual Assistant | ✅ | ❌ | ❌ | ❌ | ❌ |
| Agent | Own only | ✅ | ❌ | ❌ | ❌ |
| New Agent | ❌ | ❌ | ❌ | ❌ | ❌ |

## Deployment

### Vercel (Recommended)

1. Push to GitHub
2. Import project in Vercel
3. Add environment variables
4. Deploy

### Environment Variables for Production

```env
NEXT_PUBLIC_SUPABASE_URL=your_production_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_production_anon_key
NEXT_PUBLIC_SITE_URL=https://your-domain.com
```

## License

Private - Cobb Realty Group
