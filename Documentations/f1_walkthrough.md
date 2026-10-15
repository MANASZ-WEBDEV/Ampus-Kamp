# F-1 Implementation Walkthrough
### How Authentication & Profiles Were Built — Step by Step

> **Purpose:** Learn the exact sequence of decisions and actions used to implement F-1.  
> Read this before every future feature (F-2 onwards) to stay in discipline.

---

## Phase 0 — Read Before Writing Anything

**Rule #1: Never open a code editor before understanding the requirements.**

### Step 1 — Read the Feature Plan

Opened and read the Feature-Wise Implementation Plan (MAANG 2026).

Extracted F-1's specific requirements:

**Backend (server-side):**
- `StudentRoster` — CSV-seeded collection; enrollment + collegeId uniqueness
- `Dept` — Department master collection with code, name, head ref
- `Otp` — SHA-256 hashed OTP; TTL index 10 min; max 3 attempts; constant-time compare
- `User` — Full profile model; `passwordHash` and `phone` marked `select: false` (never leak)
- Email service via SMTP (OTP delivery; dev mode prints to console)
- Auth flow: Register → OTP email → Verify → JWT cookie
- Login flow: enrollmentNo + password → verify → JWT cookie
- `GET /api/v1/users/me` — private profile (auth required)
- `GET /api/v1/users/:id` — public profile (no phone, no email)
- `PUT /api/v1/users/me` — update skills, phoneVisible, allowInvites
- `POST /api/v1/roster/import` — admin-only CSV bulk import
- Acceptance criteria: `passwordHash` never in any response, phone only in own profile, OTP lockout after 3 fails

**Frontend (client-side):**
- LoginPage, RegisterPage, OtpPage — match stitch UI reference pixel-perfectly
- ProfilePage — avatar with initials, stats grid, privacy toggle, skills cloud, account details
- AuthContext + `useAuth` hook — JWT state, `getMe` on mount, logout
- ProtectedRoute — redirects to `/login` if not authenticated
- BottomNav — 4 tabs + centre FAB

### Step 2 — Explore the Reference Design

Opened `stitch_campus_innovation_platform_pwa/1._login_sign_up_verification/code.html`.

Key observations from the stitch HTML:
- Card layout: `bg-surface-container-lowest`, `rounded-2xl`, `p-4`, `shadow-sm`
- Primary button: full-width `h-14`, `rounded-2xl`, `bg-primary`, `text-on-primary`
- Input fields: `bg-surface-container-low`, `rounded-xl`, `px-4 py-3.5`, focus ring in primary
- Typography: `font-headline-lg-mobile` for page titles, `font-body-md` for body text
- Color scheme: all tokens come from Tailwind config already set in F-0
- OTP input: 6-box grid, each box 48×56px, auto-advance on digit entry

**Why this matters:** The stitch files are the single source of truth for visual design. Any screen that deviates will feel inconsistent when all features are visible together.

---

## Phase 1 — Database Models (4 models)

**Rule:** Schema before service, service before controller, controller before route. Never invert this order.

### Step 3 — Write `server/src/models/dept.model.ts`

The Department master collection. Key decisions:
- `code` field: unique, uppercase 3-6 chars (e.g. `"CS"`, `"MECH"`)
- `head` field: `ref: 'User'` — points to the faculty member who is HOD
- `studentCount` field: cached count updated by cron job (not counted on-the-fly in queries)
- No `timestamps: false` — we want `createdAt`/`updatedAt` for all master data

```ts
const deptSchema = new Schema({
  name: { type: String, required: true, trim: true },
  code: { type: String, required: true, unique: true, uppercase: true },
  head:  { type: Schema.Types.ObjectId, ref: 'User', default: null },
  studentCount: { type: Number, default: 0 },
});
```

### Step 4 — Write `server/src/models/roster.model.ts`

The pre-seeded student roster. Every student must exist here before they can register.

Key decisions:
- Compound unique index on `{ enrollmentNo, collegeId }` — prevents duplicate seeding
- `claimedBy` ref: once a User registers with this enrollmentNo, this field is set. If set, new registrations are rejected (409 Conflict)
- `select: false` is NOT needed here — roster data is never returned to clients (admin-only)

```ts
const rosterSchema = new Schema({
  enrollmentNo: { type: String, required: true, uppercase: true },
  collegeId:    { type: String, required: true, uppercase: true },
  name:         { type: String, required: true, trim: true },
  email:        { type: String, required: true, lowercase: true },
  department:   { type: Schema.Types.ObjectId, ref: 'Dept', required: true },
  year:         { type: Number, enum: [1, 2, 3, 4], required: true },
  claimedBy:    { type: Schema.Types.ObjectId, ref: 'User', default: null },
});
```

**Why `claimedBy`?** Without this, two students could register with the same enrollment number (each having a separate User document). The `claimedBy` flag makes a roster entry one-time-use only.

### Step 5 — Write `server/src/models/otp.model.ts`

The OTP storage model. Key security decisions:
- `codeHash`: stores SHA-256 of the OTP, never the raw 6-digit code
- `expiresAt`: TTL index (`expireAfterSeconds: 0`) — MongoDB auto-deletes expired OTPs
- `attempts`: incremented on every wrong guess; locked when ≥ 3
- `type` field: `'verification'` or `'login'` — same model handles both flows

```ts
otpSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });
otpSchema.index({ userId: 1, type: 1 });
```

**Why SHA-256 instead of storing the raw code?** If the database is breached, an attacker can't extract and use OTP codes. The code is generated fresh, emailed to the user, and only the hash lives in the DB.

**Why `timingSafeEqual` for comparison?**
A naïve `storedHash === incomingHash` comparison takes longer to execute when the strings share a common prefix. This tiny timing difference can leak information to an attacker probing with many OTP guesses. `timingSafeEqual` always takes the same time regardless of where strings differ.

### Step 6 — Write `server/src/models/user.model.ts`

The main user model. Key security decisions:
- `passwordHash: { ..., select: false }` — never returned in queries unless explicitly requested with `.select('+passwordHash')`
- `phone: { ..., select: false }` — same; phone is private by default
- `status` enum: `'pending'` → `'active'` on OTP verify. Suspended users cannot log in
- `role` enum: 4 roles (`student`, `faculty`, `dept_head`, `admin`)
- `skills`: array of strings, max 20 items (validated by Zod middleware)
- `phoneVisible` / `allowInvites`: privacy control flags (F-5 uses these)

```ts
passwordHash: {
  type: String,
  required: true,
  select: false,   // ← CRITICAL: never leaked in find() results
},
phone: {
  type: String,
  default: null,
  select: false,   // ← CRITICAL: never leaked in public profile queries
},
```

**Why `select: false` instead of a projection in every query?**
Projections are easy to forget — every future developer writing a query must remember to exclude sensitive fields. `select: false` makes the field opt-in: the query must explicitly add `.select('+passwordHash')` to get it. This is the defence-in-depth principle.

---

## Phase 2 — Shared Utilities (auth-specific)

### Step 7 — Write `server/src/shared/utils/jwt.ts`

Two functions:
- `signToken(payload)` — signs with `env.JWT_SECRET`, expiry from `env.JWT_EXPIRES_IN`
- `verifyToken(token)` — wraps `jwt.verify()` and returns typed `AuthUser`

**Payload includes:** `id`, `role`, `name`, `department`, `status` — everything the middleware needs without a DB lookup on every request.

### Step 8 — Write `server/src/shared/utils/otp.ts`

```ts
export function generateOtpCode(): string {
  // crypto.randomInt is cryptographically secure (unlike Math.random)
  return String(crypto.randomInt(100_000, 999_999));
}

export function hashOtp(code: string): string {
  return crypto.createHash('sha256').update(code).digest('hex');
}

export function verifyOtp(code: string, storedHash: string): boolean {
  const incoming = Buffer.from(hashOtp(code), 'hex');
  const stored   = Buffer.from(storedHash, 'hex');
  // Constant-time comparison — prevents timing attacks
  return incoming.length === stored.length &&
    crypto.timingSafeEqual(incoming, stored);
}
```

**Why `crypto.randomInt` not `Math.random()`?** `Math.random()` is not cryptographically secure — a determined attacker who knows the PRNG seed could predict the sequence. `crypto.randomInt` uses the OS's cryptographic entropy source.

### Step 9 — Write `server/src/shared/utils/cookie.ts`

Sets the httpOnly JWT cookie with security-hardened options:
```ts
res.cookie('amp_token', token, {
  httpOnly: true,          // JS cannot read this cookie (XSS-proof)
  secure: isProduction,    // HTTPS only in production
  sameSite: 'lax',         // Prevents CSRF (lax = safe for SPA navigations)
  maxAge: 30 * 24 * 60 * 60 * 1000,  // 30 days (matches JWT_EXPIRES_IN)
  path: '/',
});
```

**Why httpOnly?** If `httpOnly` were false, an XSS vulnerability anywhere in the app (including third-party scripts) could read the token and steal the session. `httpOnly` makes the cookie completely inaccessible to JavaScript.

### Step 10 — Write `server/src/shared/utils/hash.ts` (extended)

Added `sha256(input: string)` for OTP hashing. The existing `hashPassword` / `comparePassword` bcrypt functions were already in place from F-0.

---

## Phase 3 — Email Service

### Step 11 — Write `server/src/services/email.service.ts`

Nodemailer-based email service with two modes:
- **SMTP mode** (production): Uses `EMAIL_HOST`, `EMAIL_PORT`, `EMAIL_USER`, `EMAIL_PASS` from `.env`
- **Dev console mode** (fallback): When SMTP is not configured or `NODE_ENV=test`, prints the OTP to the server console in a visible box instead of sending an email

```ts
// Dev fallback — safe even with no email config:
console.log(`
 ┌─────────────────────────────────────────────┐
 │   OTP EMAIL (dev mode — no SMTP configured) │
 │   To:      ${to}
 │   Subject: ${subject}
 │   Code:    ${code}
 └─────────────────────────────────────────────┘
`);
```

**Why a fallback?** Without this, running tests or developing locally without email credentials would crash. The fallback means F-1 works end-to-end on any machine regardless of SMTP setup.

---

## Phase 4 — Auth Module (4 files)

**Convention:** Every module has exactly 4 files: `schema → service → controller → routes`.

### Step 12 — Write `server/src/modules/auth/auth.schema.ts`

Zod schemas for request validation:

```ts
export const registerSchema = z.object({
  enrollmentNo: z.string().min(1).max(20).toUpperCase(),
  collegeId:    z.string().min(1).max(20).toUpperCase(),
  password:     z.string().min(8).max(72),
});

export const verifyOtpSchema = z.object({
  userId:  z.string().length(24),  // MongoDB ObjectId is always 24 hex chars
  code:    z.string().length(6).regex(/^\d{6}$/),
});

export const loginSchema = z.object({
  enrollmentNo: z.string().min(1).toUpperCase(),
  password:     z.string().min(1),
});
```

**Why validate at this layer?** The controller should never receive invalid data. If validation is inside the service, the service becomes harder to test (must always construct valid inputs). Zod at the route level means invalid requests are rejected before any business logic runs.

### Step 13 — Write `server/src/modules/auth/auth.service.ts`

The business logic layer. Four functions:

**`register(enrollmentNo, collegeId, password)`**
1. Look up `StudentRoster` by `{ enrollmentNo, collegeId }` — throws `NotFoundError` if not found
2. Check `roster.claimedBy` — throws `ConflictError` (409) if already registered
3. Hash the password with bcrypt (12 rounds)
4. Create `User` with `status: 'pending'`
5. Set `roster.claimedBy = user._id` to lock the enrollment
6. Generate a 6-digit OTP, hash it, store in `Otp` collection with 10-minute TTL
7. Send OTP email via `emailService`
8. Return `{ userId }` — client needs this to submit the OTP

**`verifyOtp(userId, code)`**
1. Find the `Otp` document for this user and type
2. Check `attempts >= 3` → throws `UnauthorizedError` (OTP locked)
3. `verifyOtp(code, stored.codeHash)` with `timingSafeEqual` — wrong code increments `attempts` and throws `UnauthorizedError`
4. Correct code: delete OTP document, set `user.status = 'active'`
5. Sign JWT, return token for cookie

**`login(enrollmentNo, password)`**
1. Find user by `enrollmentNo` with `.select('+passwordHash')` (opt-in for password)
2. Throw `UnauthorizedError` — same error for wrong user and wrong password (no enumeration)
3. Check `user.status !== 'active'` → throws `ForbiddenError` (pending/suspended)
4. `comparePassword(plain, hash)` — constant-time bcrypt compare
5. Sign JWT, return token

**`logout(res)`**
1. Clear the `amp_token` cookie by setting `maxAge: 0`

**Security rule in login:** The same `UnauthorizedError` with the same message is thrown for both "user not found" and "wrong password". This prevents attackers from using the error message to discover valid enrollment numbers.

### Step 14 — Write `server/src/modules/auth/auth.controller.ts`

Thin controller layer. Each method:
1. Calls the corresponding service function
2. Sends the `{ data }` response in the canonical shape
3. Sets the JWT cookie via `setAuthCookie(res, token)` where applicable

```ts
export const register = asyncHandler(async (req, res) => {
  const { userId } = await authService.register(req.body);
  res.status(201).json({ data: { userId } });
});
```

**Rule:** Controllers never contain business logic. If-statements and database queries belong in the service.

### Step 15 — Write `server/src/modules/auth/auth.routes.ts`

```
POST /api/v1/auth/register      → validate(registerSchema) → register
POST /api/v1/auth/verify-otp    → validate(verifyOtpSchema) → otpLimiter → verifyOtp
POST /api/v1/auth/login         → validate(loginSchema) → loginLimiter → login
POST /api/v1/auth/logout        → requireAuth → logout
```

**Why `otpLimiter` before the controller?** Rate limiting happens at the network edge, before any business logic. Even if the controller is bypassed somehow, the limiter has already fired.

---

## Phase 5 — Users Module (4 files)

### Step 16 — Write `server/src/modules/users/user.schema.ts`

```ts
export const updateMeSchema = z.object({
  skills:       z.array(z.string().min(1).max(50)).max(20).optional(),
  phoneVisible: z.boolean().optional(),
  allowInvites: z.boolean().optional(),
}).strict();  // .strict() rejects unknown keys — prevents mass-assignment attacks
```

**Why `.strict()`?** Without it, a user could send `{ role: "admin" }` in the update body. Mongoose would ignore unknown fields, but `.strict()` makes Zod reject the request before it ever reaches Mongoose, giving a clear 422 error.

### Step 17 — Write `server/src/modules/users/user.service.ts`

Three functions:

**`getMe(userId)`** — private profile
- Finds user by `_id`, populates `department` with `{ name, code }`
- Does NOT add `.select('+passwordHash')` or `.select('+phone')` — sensitive fields remain hidden even in own profile endpoint (phone is returned separately if `phoneVisible` is true)

**`updateMe(userId, updates)`**
- Only allows updating the fields defined in `updateMeSchema`
- Uses `{ new: true }` so the updated document is returned

**`getUserById(userId)`** — public profile
- Explicit projection: `{ name: 1, enrollmentNo: 1, skills: 1, department: 1, year: 1, role: 1 }`
- No phone, no email — these are never in the public projection

### Step 18 — Write `server/src/modules/users/user.routes.ts`

```
GET  /api/v1/users/me     → requireAuth → getMe
PUT  /api/v1/users/me     → requireAuth → validate(updateMeSchema) → updateMe
GET  /api/v1/users/:id    → requireAuth → getUserById
```

All users routes require auth — there are no public endpoints. This is intentional: the platform is campus-only.

---

## Phase 6 — Roster Module (4 files)

### Step 19 — Write `server/src/modules/roster/roster.service.ts`

**`importFromCsv(filePath)`**
1. Parse the CSV file using `csv-parse/sync`
2. For each row: look up `Dept` by `code`, validate required fields
3. Use `StudentRoster.insertMany(rows, { ordered: false })` — `ordered: false` means duplicate rows are skipped (idempotent import) instead of stopping the whole batch

**Why `ordered: false`?**
If the admin uploads the same CSV twice, the second import would normally throw E11000 on the first duplicate and stop processing. `ordered: false` lets MongoDB skip duplicates and continue inserting new rows — the import is safely re-runnable.

### Step 20 — Write `server/src/modules/roster/roster.routes.ts`

```
POST /api/v1/roster/import  → requireAuth → requireRole(['admin']) → upload.single('file') → importRoster
```

Admin-only, guarded by both `requireAuth` and `requireRole`. The `multer` upload middleware runs before the controller and validates the `multipart/form-data` content.

### Step 21 — Write `server/scripts/importRoster.ts`

A standalone CLI script for seeding the database from the command line:

```bash
npx tsx scripts/importRoster.ts path/to/students.csv
```

Used by an admin to seed the roster without needing an HTTP server running. Connects to MongoDB, calls the same service function as the API route, then disconnects.

---

## Phase 7 — Route Registry Update

### Step 22 — Update `server/src/routes.ts`

Uncommented the F-1 router registrations:

```ts
// F-1 — active
app.use('/api/v1/auth',  authRouter);
app.use('/api/v1/users', usersRouter);
app.use('/api/v1/roster', rosterRouter);
```

**Rule:** `routes.ts` is the index of what's live. Looking at it tells you exactly which features are active.

---

## Phase 8 — Integration Tests

### Step 23 — Write `server/src/modules/auth/auth.test.ts`

17 test cases covering every acceptance criterion from the spec:

**Register (5 tests):**
- ✅ Creates pending user + returns `userId`
- ✅ 404 for unknown enrollment number
- ✅ 404 for wrong collegeId (correct enrollment, wrong ID)
- ✅ 409 for already-claimed enrollment
- ✅ 422 for password shorter than 8 chars

**Verify OTP (3 tests):**
- ✅ Correct OTP → sets `status: active`, returns JWT cookie + body
- ✅ Wrong OTP → 401
- ✅ 3 wrong OTPs → lockout (attempts ≥ 3) → subsequent correct OTP still returns 401

**Login (4 tests):**
- ✅ Correct password, active account → JWT cookie
- ✅ Wrong password → 401
- ✅ Pending account → 403
- ✅ Unknown enrollment number → 401 (same message as wrong password — no enumeration)

**Users (3 tests):**
- ✅ `GET /me` — own profile includes email, no passwordHash in response
- ✅ `GET /me` — 401 without token
- ✅ `GET /:id` — public profile has no phone, no email

**Update (1 test):**
- ✅ `PUT /me` — updates skills array, returns updated profile

**RBAC (1 test):**
- ✅ Student calling admin-only endpoint → 403

**Test setup (beforeAll / afterEach):**
```ts
beforeAll(async () => {
  // Connects to mongodb-memory-server (no Atlas needed for tests)
  // Seeds: one Dept, one StudentRoster entry
});

afterEach(async () => {
  // Clears User + Otp documents
  // Resets StudentRoster.claimedBy → null
  // (Critical: without this reset, test 2 onwards gets 409 on register)
});
```

**Key lesson:** `afterEach` must reset all side effects — not just `User` and `Otp`, but also `StudentRoster.claimedBy`. Forgetting this caused 10/17 tests to fail with `TypeError: Cannot read properties of undefined (reading 'userId')` because the second register call returned 409 and `res.body.data` was undefined.

---

## Phase 9 — Frontend Auth Module

### Step 24 — Write `client/src/features/auth/api/auth.api.ts`

All auth HTTP calls in one place:
```ts
export const register   = (body) => apiClient.post('/auth/register', body).then(r => r.data.data);
export const verifyOtp  = (body) => apiClient.post('/auth/verify-otp', body).then(r => r.data.data);
export const login      = (body) => apiClient.post('/auth/login', body).then(r => r.data.data);
export const logout     = ()     => apiClient.post('/auth/logout');
export const getMe      = ()     => apiClient.get('/users/me').then(r => r.data.data);
export const updateMe   = (body) => apiClient.put('/users/me', body).then(r => r.data.data);
```

**Why a dedicated API file?** React components should never contain `axios.post(...)` directly. Centralising calls means: one place to update when the API changes, easy to mock in tests, and consistent error handling through the Axios interceptor.

### Step 25 — Write `client/src/features/auth/context/AuthContext.tsx`

Global auth state using React Context:

```ts
interface AuthContextValue {
  user: AuthUser | null;     // null = not logged in
  isLoading: boolean;        // true during initial /users/me check
  login: (data) => Promise<void>;
  logout: () => Promise<void>;
}
```

**On mount:** `getMe()` is called once to hydrate state from the server (cookie is already set — we just need the user object). This means the app knows immediately on load whether the user is logged in, without a flash.

**On logout:** Calls `authApi.logout()` (clears the cookie server-side), then clears the TanStack Query cache (`queryClient.clear()`) and resets `user` to null.

### Step 26 — Write `client/src/features/auth/components/ProtectedRoute.tsx`

```tsx
export function ProtectedRoute({ children, roles }) {
  const { user, isLoading } = useAuth();

  if (isLoading) return <PageLoader />;
  if (!user) return <Navigate to="/login" replace />;
  if (roles && !roles.includes(user.role)) return <Navigate to="/" replace />;

  return <>{children}</>;
}
```

**Three states handled:**
1. `isLoading` — show spinner (don't flash the login page)
2. `!user` — redirect to login
3. Wrong role — redirect to home (for role-restricted pages like `/admin`)

### Step 27 — Write `client/src/pages/LoginPage.tsx`

Matches the stitch reference design exactly:
- `useForm` for field state + error display
- `useMutation` for the login API call
- On 401: shows "Incorrect enrollment number or password" inline (no toast)
- On success: navigates to `/profile`
- Form is disabled while mutation is pending (prevents double-submit)

### Step 28 — Write `client/src/pages/RegisterPage.tsx`

Multi-step flow:
1. Enrollment number + college ID + password form
2. On success: stores `userId` in `sessionStorage` and navigates to `/verify`

**Why `sessionStorage` for `userId`?** The OTP verification page needs the `userId` returned by the register endpoint. `sessionStorage` is cleared when the tab is closed (more secure than `localStorage`) and doesn't persist across sessions. It's not sensitive enough to need a server-side session.

### Step 29 — Write `client/src/pages/OtpPage.tsx`

6-box OTP input grid:
- Auto-advances focus to next box on digit entry
- Auto-backspaces to previous box on delete
- Paste handling: splits pasted 6-digit string across all boxes
- On submit: calls `verifyOtp({ userId, code: boxes.join('') })`
- On 401: shows "Incorrect code. X attempts remaining" inline
- On success: sets `user` in AuthContext and navigates to `/profile`

### Step 30 — Write `client/src/pages/ProfilePage.tsx`

Full profile page:
- **Hero card:** initials avatar (generated from name), name, department, year, enrollment number
- **Stats grid:** Milestones / Verified Credits / Active Squads (placeholders for F-4/F-7)
- **Privacy toggle:** Phone visibility switch — calls `PUT /users/me` immediately on toggle (optimistic update with query invalidation)
- **Skills cloud:** Chip display of all skills + "Add Skill" button that opens the edit modal
- **Account details:** Email, role, status in a clean list
- **Edit modal:** Slide-up modal to add/remove skills and toggle allowInvites
- **Logout button:** Calls `authApi.logout()` then redirects to `/login`

### Step 31 — Write `client/src/components/layout/BottomNav.tsx`

5-item nav bar matching the stitch shell:
- Events · Teams · [FAB] · Badges · Profile
- Active tab: filled icon + bold label
- Reads active route from `useLocation()` automatically
- Centre FAB: `+` button for posting new content (links to `/new`)

---

## Phase 10 — App Wiring

### Step 32 — Update `client/src/app/providers.tsx`

Added `AuthProvider` wrapping order:
```tsx
<QueryClientProvider client={queryClient}>
  <AuthProvider>       {/* Must be inside QC so it can use useQueryClient */}
    {children}
  </AuthProvider>
</QueryClientProvider>
```

**Why AuthProvider inside QueryClientProvider?** `AuthProvider` calls `queryClient.clear()` on logout. If it were outside, `useQueryClient()` would throw an error.

### Step 33 — Update `client/src/app/router.tsx`

Activated all F-1 routes with lazy loading:
```tsx
const LoginPage    = lazy(() => import('@/pages/LoginPage'));
const RegisterPage = lazy(() => import('@/pages/RegisterPage'));
const OtpPage      = lazy(() => import('@/pages/OtpPage'));
const ProfilePage  = lazy(() => import('@/pages/ProfilePage'));

<Route path="/login"    element={<LoginPage />} />
<Route path="/register" element={<RegisterPage />} />
<Route path="/verify"   element={<OtpPage />} />
<Route path="/profile"  element={<ProtectedRoute><ProfilePage /></ProtectedRoute>} />
<Route path="/"         element={<Navigate to="/login" replace />} />
```

**Why lazy imports?** Each page component is code-split into its own chunk. A user visiting `/login` does not download the `ProfilePage` bundle until they navigate there. This dramatically improves initial load time, especially important for a PWA on mobile.

---

## Phase 11 — Environment Configuration

### Step 34 — Create `server/.env`

The actual `.env` (not committed to git). Values obtained from:

| Variable | Source |
|----------|--------|
| `MONGODB_URI` | MongoDB Atlas → Cluster0 → Connect → Drivers → Node.js |
| `JWT_SECRET` | `node -e "console.log(require('crypto').randomBytes(48).toString('hex'))"` |
| `EMAIL_HOST` / `EMAIL_PASS` | Resend.com → API Keys → Create Key |
| `LLM_API_KEY` | Groq Cloud console (for F-3, not needed for F-1) |

**The `.env` file is never committed.** Only `.env.example` with placeholder values lives in the repo.

---

## Phase 12 — Verify End-to-End

### Step 35 — Run Integration Tests

```bash
cd Implementation/server
npm test
```

Results:
```
✓ POST /api/v1/auth/register (5)   — 5 passed
✓ POST /api/v1/auth/verify-otp (3) — 3 passed
✓ POST /api/v1/auth/login (4)      — 4 passed
✓ GET  /api/v1/users/me (2)        — 2 passed
✓ GET  /api/v1/users/:id (1)       — 1 passed
✓ PUT  /api/v1/users/me (1)        — 1 passed
✓ RBAC — student calling admin (1) — 1 passed

Test Files  1 passed (1)
Tests  17 passed (17)
Duration  10.61s
```

### Step 36 — Verify tsc on both sides

```bash
npx tsc --noEmit  # in server/  → 0 errors
npx tsc --noEmit  # in client/  → 0 errors
```

---

## Commit Plan (Run After I Say to Commit)

F-1 should be committed as **9 atomic commits**, one per logical concern:

```
commit 1: feat(db): add Dept, StudentRoster, Otp, and User Mongoose models

commit 2: feat(auth): add JWT sign/verify, OTP generate/hash, httpOnly cookie utils

commit 3: feat(email): add Nodemailer SMTP service with dev console fallback

commit 4: feat(auth): add register, verify-otp, login, logout service + controller + routes

commit 5: feat(users): add getMe, updateMe, getUserById service + controller + routes

commit 6: feat(roster): add CSV import service + controller + admin-only route + CLI script

commit 7: feat(client): add AuthContext, ProtectedRoute, auth.api, and app providers wiring

commit 8: feat(client): add LoginPage, RegisterPage, OtpPage, ProfilePage, and BottomNav

commit 9: test(auth): add 17-case integration test suite with test isolation fix
```

Each commit is independent and reviewable on its own. The test commit comes last because the tests depend on all previous code being in place. The test isolation fix (`afterEach` resetting `StudentRoster.claimedBy`) is included in commit 9.

---

## Key Lessons for Future Features

| Lesson | Detail |
|--------|--------|
| **Schema first, always** | Model → Schema → Service → Controller → Route. Never reverse this. |
| **`select: false` for secrets** | `passwordHash`, `phone` — any sensitive field must have `select: false` on the model |
| **Constant-time comparison** | Any secret comparison (OTP, token) must use `timingSafeEqual`, never `===` |
| **Same error, wrong user + wrong password** | If you say "wrong password", attackers can enumerate valid users |
| **Test isolation is critical** | `afterEach` must reset ALL side effects — not just User/Otp but also FK references like `claimedBy` |
| **`ordered: false` for bulk import** | Idempotent CSV seeding — re-running the import skips duplicates instead of crashing |
| **Context ordering matters** | `AuthProvider` must be inside `QueryClientProvider` or `useQueryClient()` will throw |
| **Lazy-load every page** | `lazy(() => import(...))` on every page route ensures code-splitting |
| **Dev fallback for email** | Email service should always have a console fallback — never block dev/test for missing SMTP |
| **Atomic commits** | Each commit = one concern. Reviewers should be able to revert one commit without touching others |
