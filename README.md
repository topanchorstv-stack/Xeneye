# XenEye (MVP)
Construction tracking: projects, buildings/floors/areas, PDF drawings with status-coloured markup, issues with photos, progress, dashboard.
Stack: Next.js 14, TypeScript, Tailwind, Supabase (Auth, Postgres, Storage), PDF.js.

## Setup
1. Create a Supabase project. In **SQL Editor** run `supabase/setup_all.sql` (same as migrations 001 + 002). Run once only.
2. Authentication > Providers > Email: for testing you may disable "Confirm email".
3. `cp .env.example .env.local`, fill `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_ANON_KEY` (publishable key). Never use a secret/service-role key here.
4. `npm install && npm run dev`, open http://localhost:3000, sign up.
5. Promote an engineer: `update profiles set role='engineer' where id='<uuid from Authentication > Users>';`
6. Optional demo data: run `supabase/seed.sql` (needs an engineer; creates a project labelled DEMO).
7. Storage limit: Supabase Free allows up to 50 MB per file; check Storage settings if uploads fail.

## GitHub
`git init && git add . && git commit -m "XenEye MVP" && git branch -M main && git remote add origin <repo-url> && git push -u origin main`
(`.env.local` is git-ignored.)

## Deploy (Vercel)
Import the repo, add the two env vars, deploy. In Supabase > Authentication > URL Configuration add the Vercel URL.

## Tests
See `tests/MANUAL_TESTS.md`. See `PROJECT_STATUS.md` for known gaps.
