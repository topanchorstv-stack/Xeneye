# XenEye status
**Nothing has been compiled or run against a live Supabase project** (no network access to Supabase from the build environment). Expect small fixes on first `npm run dev`.

## Written
Schema + RLS + private storage policies (001), member-by-email RPC and activity triggers (002), seed.sql (DEMO), setup_all.sql;
login/signup; projects; structure CRUD; members; drawings upload (progress, 50 MB check) and library; PDF viewer with line/arrow/rect/circle/freehand,
select/delete/recolour; issues with photos and server timestamps shown in project timezone; estimated progress rollup; dashboard.

## Known gaps
- Text annotation tool, page thumbnails, mobile-tuned viewer toolbar.
- No project edit/delete screen, no activity feed screen (log is written to activity_logs).
- No shadcn/ui (plain Tailwind used). No per-subcontractor work-area assignment: members see the whole project.
- Auth guards are client-side; RLS is the real protection. No automated tests.
- Progress counts each area equally (estimate), from the latest progress record, not from annotations.
- Seed cannot create subcontractor logins.
