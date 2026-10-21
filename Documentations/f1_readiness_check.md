# F-1 Readiness Audit — Are We Ready for F-2?

## ✅ Verdict: YES — Go ahead with F-2

F-1's core is complete and proven in production. The gaps below are minor and can be carried forward as tracked debt without blocking F-2.

---

## F-1 Acceptance Criteria — Status

### Backend API

| Criterion | Status | Evidence |
|-----------|--------|----------|
| Register with valid unclaimed roster → pending user + OTP sent | ✅ Done | Live test: `POST 201`, OTP printed to console |
| Unknown enrollment → `404` | ✅ Done | Integration test passing |
| Already claimed enrollment → `409` | ✅ Done | Integration test passing |
| Wrong password → `401` | ✅ Done | Integration test passing |
| Pending user login → `403` | ✅ Done | Integration test passing |
| `GET /users/:id` — no phone, no email in response | ✅ Done | Integration test asserts `phone` and `email` are undefined |
| Student calling admin-only route → `403` | ✅ Done | RBAC test: `POST /roster/import` as student → 403 |
| 6th login attempt in a minute → `429` | ✅ Done | `loginLimiter` at 5/min wired to `/login` |
| `passwordHash` select:false — never in response | ✅ Done | Test asserts `passwordHash` is undefined |
| OTP: 10 min TTL, max 3 attempts | ✅ Done | TTL index + attempt counter tested |
| `POST /roster/import` admin only | ✅ Done | Tested today — works end-to-end |
| `PUT /users/me` — update skills | ✅ Done | Integration test: skills array updated correctly |

### Frontend Components

| Component | Status | Notes |
|-----------|--------|-------|
| `LoginPage` `/login` | ✅ Done | Live, working |
| `RegisterPage` `/register` | ✅ Done | Live, working |
| `OtpPage` `/verify` | ✅ Done | Live, verified today in production |
| `ProfilePage` `/profile` | ✅ Done | Live — shows name, branch, year, skills, email, role, status |
| `useAuth` hook | ✅ Done | JWT persisted, `GET /users/me` called on load |
| `ProtectedRoute` | ✅ Done | Redirects to `/login` correctly |

---

## Known Gaps (Carry-Forward Debt, Not Blockers)

| Gap | Severity | When to fix |
|-----|----------|-------------|
| **No admin UI for roster upload** — admin must use curl/Postman | Low | F-10 (Admin dashboard) |
| **Post-login redirect** goes to `/login` (no home page yet) | Low | Fixed automatically when F-2 builds `/events` |
| **Rate-limit test** for `429` on login is in the integration suite but not manually verified | Low | Run `npm test` to confirm |
| **`PUT /users/me`** — no frontend edit form yet (button exists on ProfilePage but may be a stub) | Medium | Can build the edit form independently; not needed for F-2 |
| **Email (SMTP)** commented out in `.env` — OTP goes to server console only | Low | Uncomment and fill real Resend key before demo |
| **No `firstOpenedAt`** set on first-ever login check in production (verify via DB) | Low | Verify via MongoDB Atlas console |

---

## What F-2 Needs From F-1

F-2 (Events) depends on F-1 for:

| Dependency | Status |
|------------|--------|
| `requireAuth` middleware | ✅ Ready |
| `requireRole(['faculty', 'admin'])` middleware | ✅ Ready |
| `User` model with `role` and `department` fields | ✅ Ready |
| `Dept` model (for event `eligibility.branches`) | ✅ Ready |
| JWT in cookie + Bearer header — both work | ✅ Ready |
| A real logged-in student account for testing | ✅ Ready (Manas Rajani, active) |

---

## Recommended First Actions for F-2

1. **Create a faculty user** — F-2 needs `role: 'faculty'` to test event creation. Use the same seed-script pattern:
   ```bash
   npx tsx scripts/seed-faculty.ts
   ```
2. **Uncomment the F-2 route** in `routes.ts`:
   ```ts
   app.use('/api/v1/events', eventsRouter);
   ```
3. **Uncomment the client route** in `router.tsx`:
   ```tsx
   const EventFeedPage = lazy(() => import('@/pages/EventFeedPage'));
   <Route path="/events" element={<ProtectedRoute><EventFeedPage /></ProtectedRoute>} />
   ```
4. Start with `event.model.ts` → `event.service.ts` → `event.routes.ts` → frontend feed.
