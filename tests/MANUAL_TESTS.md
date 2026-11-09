# Manual end-to-end checklist (none of these have been run yet)
1. Sign up two users A (will be engineer) and B (subcontractor); promote A with SQL.
2. A: create project, add building/floor/area. 3. A: upload a PDF, open it, draw a line, zoom, confirm it stays put; reload, confirm it persists.
4. A: Members tab, add B by email. 5. B: sign in, see the project, record progress, report an issue with a photo.
6. Confirm issue time shown matches server time; in SQL Editor try `update issues set created_at=now()-interval '1 day'` as an app user (blocked by trigger).
7. Dashboard counts match. 8. Sign up user C (not a member): must see no projects; opening a project URL shows "no access".
9. Upload a >50 MB PDF: rejected with a message.
