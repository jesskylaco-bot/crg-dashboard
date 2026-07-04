---
name: project-crg-platform
description: CRG Platform is a brokerage operations dashboard for Cobb Realty Group, currently using Google Sheets for data, evolving into a full Supabase-backed platform
metadata:
  type: project
---

CRG Platform is an internal operations dashboard for Cobb Realty Group (real estate brokerage). Currently mobile-first Next.js 16 app with Supabase auth and Google Sheets for live data (team, transactions).

**Why:** The brokerage relies on disconnected spreadsheets and manual follow-ups. The goal is to centralize everything into one platform that supports internal staff and agents externally.

**How to apply:** All features should be built incrementally — keep Google Sheets as a fallback while migrating data to Supabase. Role-based permissions are already defined in `src/lib/types/database.ts` and should be enforced as features are built. The friend (project owner) has a big vision; Akhil is the implementer. Prioritize core infrastructure (data in Supabase, CRUD) before adding new feature areas.

Key state as of 2026-05-21:
- Auth: working (Supabase, 6 roles defined)
- Team page: read-only from Google Sheets, VA team hardcoded
- Transactions page: read-only from Google Sheets
- Dashboard home: mock/static data
- Onboarding: template exists, not wired up
- No API routes yet, uses server actions for auth only
