# F-0 Implementation Walkthrough
### How the Project Scaffold Was Built — Step by Step

> **Purpose:** Learn the exact sequence of decisions and actions used to implement F-0.  
> Repeat this same discipline for every future feature (F-1 through F-10).

---

## Phase 0 — Read Before Writing Anything

**Rule #1: Never open a code editor before understanding the requirements.**

### Step 1 — Read the Implementation Plan

Opened and read [feature_implementation_plan.md](file:///c:/MANAS/Ampus/Documentations/feature_implementation_plan.md).

Extracted F-0's specific requirements:
- Express app factory + `/api/v1/health` endpoint
- MongoDB connection with retry + graceful shutdown
- Zod environment validation (app refuses to start with bad config)
- Shared middleware: auth, requireRole, validate, rateLimit, errorHandler
- Shared utils: asyncHandler, hash, pagination
- Client: Vite + React + Tailwind + PWA shell
- `AGENT_RULES.md` and `docs/spikes.md` at repo root

### Step 2 — Explore the reference design (Stitch files)

Opened the stitch PWA folder to understand the design system:

```
stitch_campus_innovation_platform_pwa/
  engineering_incubator_pwa/DESIGN.md   ← design token source of truth
  1._login_sign_up_verification/code.html ← how the UI actually looks
```

From `DESIGN.md`, extracted the exact token values used in the stitch HTML:
- **Colors:** primary `#004541`, secondary `#855300`, surface `#faf8ff`
- **Fonts:** Outfit (headlines), Manrope (body), JetBrains Mono (code)
- **Spacing:** 4px/8px base unit system with named tokens (`space-sm`, `gutter`, etc.)
- **Elevation:** 4 shadow levels (ambient, not harsh drop shadows)
- **Shapes:** rounded-lg = 0.75rem, pill = 9999px

**Why this matters:** Every UI component built from F-1 onwards must use these exact tokens so screens feel consistent with the reference designs.

---

## Phase 1 — Root-Level Files

### Step 3 — Write `AGENT_RULES.md`

**File:** `Implementation/AGENT_RULES.md`

This is the most important file in the repo. It encodes the project rules so any developer (or AI agent) can read it and immediately understand:
- The folder structure convention
- Which layer does what (route → controller → service → model)
- Security rules (never trust client-sent role/department/userId)
- The commit message format

**Why write this first?** Because every file written after this must follow these rules. If the rules aren't written down first, developers make inconsistent decisions.

### Step 4 — Write `.gitignore`

**File:** `Implementation/.gitignore`

Key decisions:
- `node_modules/` — never commit dependencies
- `.env` — never commit secrets. Only `.env.example` is committed
- `dist/` — never commit compiled output
- `dev-dist/` — Vite PWA generates this, exclude it
- `scripts/labeled-dataset.csv` — student data used for AI training, never commit

### Step 5 — Write `docs/spikes.md`

**File:** `Implementation/docs/spikes.md`

Created a fillable template for the two week-0 feasibility experiments:
1. **NPTEL QR spike** — can we auto-verify certificates from the QR code?
2. **LLM extraction spike** — which model extracts event fields best?

These spikes must be done *before* F-3 and F-7 are built, because their results decide which code paths to implement.

---

## Phase 2 — Server Configuration

All server files live in `Implementation/server/`.

### Step 6 — Write `server/package.json`

Listed every dependency the server needs:

| Package | Why |
|---------|-----|
| `express` | HTTP server framework |
| `mongoose` | MongoDB ODM |
| `zod` | Runtime validation (env + request bodies) |
| `jsonwebtoken` | JWT sign + verify |
| `bcryptjs` | Password hashing (12 rounds) |
| `helmet` | Security headers |
| `cors` | Cross-origin requests from the client |
| `express-rate-limit` | Prevent brute-force attacks |
| `cookie-parser` | Read httpOnly JWT cookie |
| `morgan` | HTTP request logging |
| `compression` | Gzip response compression |
| `multer` | Multipart file upload (for credentials in F-7) |
| `node-cron` | Scheduled jobs (close events, expire links, etc.) |
| `node-cache` | In-memory cache for analytics + home feed |
| `uuid` | Request ID generation |
| `dotenv` | Load `.env` file |

Dev dependencies: `tsx` (run TypeScript directly in dev), `vitest` (tests), `supertest` (HTTP integration testing), `typescript`, `eslint`, type stubs.

### Step 7 — Write `server/tsconfig.json`

Key settings chosen:
```json
"strict": true              // No implicit any, no unchecked nulls
"noUncheckedIndexedAccess"  // arr[0] is T | undefined, not T (safer)
"noImplicitReturns"         // Every code path must return
"module": "CommonJS"        // tsx works cleanly with CommonJS
"baseUrl": ".",
"paths": { "@/*": ["src/*"] } // @/config/env instead of ../../../config/env
```

**Why `@/` aliases?** Long relative imports (`../../shared/errors`) break when files move. `@/shared/errors` always works regardless of file location.

### Step 8 — Write `server/.env.example`

A template showing every environment variable the server uses, with comments explaining where to get each value. **The actual `.env` is never committed** — only this example file is.

For local dev, a `.env` was also created (not committed) with:
```
MONGODB_URI=mongodb://localhost:27017/campus_innovation
JWT_SECRET=dev-only-secret-at-least-32-chars-long-do-not-use-in-production
```

---

## Phase 3 — Server Core Files

### Step 9 — Write `server/src/config/env.ts` ← Critical file

This is the **first file that runs** when the server starts.

```ts
const parsed = envSchema.safeParse(process.env);

if (!parsed.success) {
  // Print each broken variable with its specific error
  parsed.error.issues.forEach((issue) => {
    console.error(`  • ${issue.path.join('.')}: ${issue.message}`);
  });
  process.exit(1);  // Hard stop — app cannot run misconfigured
}

export const env = parsed.data;
```

**Why Zod for env?** `process.env` values are all strings. `PORT=5000` needs to be a number. `JWT_SECRET` needs to be at least 32 chars. Zod validates and coerces these at startup rather than failing mysteriously at runtime.

**The golden rule:** Import `env` from this file everywhere. Never access `process.env` directly.

### Step 10 — Write `server/src/config/db.ts`

MongoDB connection with:
- **5 retries** with 3-second delay between each — handles transient Atlas/network blips
- **Graceful disconnect** — called during SIGTERM so in-flight DB operations finish cleanly
- Structured JSON logs on every state change

```ts
while (attempts < MAX_RETRIES) {
  try {
    await mongoose.connect(env.MONGODB_URI, { maxPoolSize: 10 });
    return;
  } catch {
    attempts++;
    await sleep(3000);  // wait before retrying
  }
}
throw new Error('MongoDB: failed after 5 attempts');
```

### Step 11 — Write `server/src/shared/errors.ts`

A typed error hierarchy. Every error the app throws must be an `AppError` subclass:

```
AppError (base)
  ├── NotFoundError      → 404 NOT_FOUND
  ├── UnauthorizedError  → 401 UNAUTHORIZED
  ├── ForbiddenError     → 403 FORBIDDEN
  ├── ConflictError      → 409 CONFLICT
  ├── ValidationError    → 422 VALIDATION_ERROR
  ├── RateLimitError     → 429 RATE_LIMIT_EXCEEDED
  └── ServiceUnavailableError → 503
```

**Why this matters:** The error handler middleware checks `instanceof AppError` and automatically sets the correct HTTP status code and response shape. Unknown errors become generic 500s without leaking stack traces.

### Step 12 — Write `server/src/shared/types.ts`

Shared TypeScript interfaces used across all modules:
- `UserRole` — the 4 roles (`student`, `faculty`, `dept_head`, `admin`)
- `AuthUser` — what gets embedded in the JWT payload
- `AuthRequest` — extends `express.Request` with `.user` typed
- `ApiSuccess<T>` / `ApiError` — the canonical `{ data }` / `{ error }` shapes

---

## Phase 4 — Shared Middleware (5 files)

These are the building blocks every feature route uses.

### Step 13 — Write `auth.ts`

Reads the JWT from two places (in priority order):
1. `amp_token` httpOnly cookie (preferred — immune to XSS)
2. `Authorization: Bearer <token>` header (for Postman / mobile clients)

Attaches the decoded `AuthUser` to `req.user`.

**Security rule:** If either token is missing or invalid, throws `UnauthorizedError` — never silently passes.

### Step 14 — Write `requireRole.ts`

```ts
export function requireRole(roles: UserRole[]) {
  return (req: AuthRequest, _res, next) => {
    if (!roles.includes(req.user.role)) {
      return next(new ForbiddenError(`Needs: [${roles.join(', ')}]`));
    }
    next();
  };
}
```

**Critical:** `req.user.role` comes from the JWT (server-set). It is **never** read from `req.body`, `req.query`, or `req.params`. A student cannot claim to be faculty by sending `role: "faculty"` in the request body.

### Step 15 — Write `validate.ts`

Zod middleware factory. Applied to every route before the controller runs:

```ts
router.post('/events', validate(createEventSchema), handler)
router.get('/events', validate(eventQuerySchema, 'query'), handler)
```

On failure: returns `422` with a `details` object mapping each invalid field to its specific error message. On success: replaces `req.body` with the coerced/transformed value (e.g., string `"3"` → number `3`).

### Step 16 — Write `rateLimit.ts`

Four separate limiters for different threat surfaces:

| Limiter | Limit | Why |
|---------|-------|-----|
| `loginLimiter` | 10 / 15 min / IP | Brute-force password attacks |
| `otpLimiter` | 5 / 10 min / IP | OTP guessing attacks |
| `extractionLimiter` | 100 / hour / IP | LLM API cost protection |
| `apiLimiter` | 300 / min / IP | General abuse safety net |

All limiters are skipped in `NODE_ENV=test` so tests run at full speed.

### Step 17 — Write `errorHandler.ts`

**Must be the last middleware registered** in `app.ts`. Catches every error thrown in any route or middleware.

Handles these specific error types in order:
1. `AppError` (our typed errors) → status + code from the error
2. Mongoose `ValidationError` → 422
3. Mongoose duplicate key `E11000` → 409
4. JWT errors → 401
5. Everything else → 500 with generic message

**Stack traces are NEVER sent to clients in production.** The structured JSON log is written server-side only.

---

## Phase 5 — Shared Utilities (3 files)

### Step 18 — Write `asyncHandler.ts`

A tiny but critical wrapper:

```ts
export function asyncHandler(fn: AsyncFn): RequestHandler {
  return (req, res, next) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
}
```

**Why needed?** Express v4 doesn't catch async errors automatically. Without this wrapper, a `throw` inside an `async` handler becomes an unhandled rejection and crashes the process. With this wrapper, all errors are forwarded to the error handler middleware.

### Step 19 — Write `hash.ts`

Three functions:
- `hashPassword(password)` — bcrypt with 12 rounds (OWASP 2024 minimum)
- `comparePassword(plain, hash)` — constant-time comparison (prevents timing attacks)
- `sha256(buffer)` — server-computed SHA-256 for proof file deduplication

**Rule:** `sha256` is always computed from the raw file buffer on the server. A client-submitted hash is never trusted.

### Step 20 — Write `pagination.ts`

Cursor-based pagination using MongoDB `_id`:

```ts
// Client sends: GET /events?cursor=<lastId>&limit=20
// Server applies: { _id: { $lt: cursor } }
// Returns: { items, nextCursor, hasMore }
```

**Why cursor-based, not offset?** `SKIP 1000` in MongoDB is slow — it still scans 1000 documents. Cursor-based jumps directly to the last seen `_id` using the index, regardless of page number.

---

## Phase 6 — App Wiring

### Step 21 — Write `server/src/app.ts`

The Express **application factory**. Separated from `server.ts` so tests can import the app without opening a network port.

Middleware stack (order matters):
```
helmet         → security headers first
cors           → allow requests from CLIENT_URL only
request-id     → inject UUID into every request for tracing
morgan         → log each request (skips 2xx in test mode)
json/urlencoded → parse request bodies
cookieParser   → parse the amp_token cookie
compression    → gzip responses
apiLimiter     → global rate limit on /api/*
mountRoutes()  → all feature routes
errorHandler   → catch everything (MUST be last)
```

### Step 22 — Write `server/src/server.ts`

The **entry point** that actually starts the HTTP server.

Sequence:
1. Connect to MongoDB (with retry)
2. Create the Express app
3. `server.listen(PORT)`
4. Register SIGTERM/SIGINT handlers for graceful shutdown

Graceful shutdown sequence:
```
SIGTERM received
  → server.close()        // stop accepting new connections
  → wait for in-flight requests to finish
  → disconnectDB()        // close Mongoose connection cleanly
  → process.exit(0)
  → Force-exit after 10s if still waiting
```

### Step 23 — Write `server/src/routes.ts`

Central route registry. All feature routers mount here. Comments show exactly where each future feature's router will be added:

```ts
app.use('/api/v1/health', healthRouter);  // F-0: active
// app.use('/api/v1/auth', authRouter);   // F-1: add when built
// app.use('/api/v1/events', eventsRouter); // F-2: add when built
// ...
```

A root `GET /` route was added that returns a JSON info card instead of Express's default `Cannot GET /` — useful for developers who open port 5000 directly in a browser.

### Step 24 — Write `server/src/modules/health/health.routes.ts`

The only active module in F-0. Returns:
```json
{
  "data": {
    "status": "ok",
    "env": "development",
    "version": "1.0.0-F0",
    "database": "connected",
    "uptime": 91,
    "jobs": { "closeEvents": null, "expireLinks": null, ... }
  }
}
```

The `jobs` object has `null` values now — each scheduled job (F-2 through F-9) will update its own `lastRunAt` timestamp here. This makes missed cron jobs immediately visible at `GET /api/v1/health`.

---

## Phase 7 — Client Configuration

All client files live in `Implementation/client/`.

### Step 25 — Write `client/package.json`

Key dependencies chosen:

| Package | Why |
|---------|-----|
| `react` + `react-dom` | UI framework |
| `react-router-dom` v7 | Client-side routing |
| `@tanstack/react-query` | Server state management + caching |
| `axios` | HTTP client (typed errors, interceptors) |
| `zod` | Client-side form validation |
| `vite-plugin-pwa` | PWA manifest + service worker + offline cache |
| `tailwindcss` | Utility CSS using the design system tokens |

### Step 26 — Write `client/tsconfig.json`

```json
"moduleResolution": "bundler"  // Vite handles resolution, not Node
"allowImportingTsExtensions": true  // Can write .tsx imports
"noEmit": true  // tsc only type-checks; Vite does the actual build
"paths": { "@/*": ["src/*"] }  // Same @/ alias as server
```

### Step 27 — Write `client/vite.config.ts`

Key configuration:
- `@vitejs/plugin-react` — React JSX transform
- `VitePWA` — generates service worker with 4 caching strategies:
  - Google Fonts → CacheFirst (1 year)
  - `/api/v1/events` → StaleWhileRevalidate (60s) — works offline
  - `/api/v1/users/me` → StaleWhileRevalidate (30s) — works offline
- `server.proxy` → `/api/*` requests in dev are proxied to `localhost:5000` so no CORS errors during development

### Step 28 — Write `client/tailwind.config.ts`

Copied the **exact** color tokens, font sizes, spacing, and shadow values from the `DESIGN.md` stitch file into Tailwind's `extend` section. This means:

```ts
// Works in any component, exactly as in the stitch HTML:
className="bg-primary text-on-primary font-headline text-headline-sm"
```

Every screen built from F-1 onwards automatically uses the design system without any extra setup.

### Step 29 — Write `client/index.html`

Added:
- Preconnect links for Google Fonts (renders fonts faster)
- All 3 design system fonts loaded: Outfit, Manrope, JetBrains Mono
- Material Symbols (variable font — supports FILL/WGHT adjustments)
- PWA meta tags: `theme-color`, `apple-mobile-web-app-capable`
- Manifest link and favicon

### Step 30 — Write `client/public/manifest.json` + `favicon.svg`

PWA manifest defines how the app looks when installed:
- `display: "standalone"` — no browser chrome when installed
- `orientation: "portrait"` — mobile-first
- `theme_color: "#004541"` — matches primary color in the design system

---

## Phase 8 — Client Application Shell

### Step 31 — Write `client/src/styles/index.css`

Three Tailwind layers:

**`@layer base`** — resets and defaults:
- `overscroll-behavior: none` — prevents page bounce on mobile
- Hide scrollbars (keep scroll functionality) — PWA aesthetic
- `:focus-visible` ring using the primary color
- 44×44px minimum touch targets (WCAG 2.5.5 compliance)

**`@layer components`** — reusable class groups:
- `.card` — white background + border + level-1 shadow
- `.card-hover` — adds cursor + hover animation
- `.btn-primary`, `.btn-secondary`, `.btn-accent`, `.btn-destructive`
- `.chip` — pill-shaped tag
- `.input-base` — form field with focus ring
- `.verified-seal` — green badge for verified credentials
- `.bottom-nav` — fixed bottom navigation bar

**`@layer utilities`** — single-purpose helpers:
- `.pb-safe` / `.pt-safe` — iPhone notch / home bar safe area padding
- `.line-clamp-2` / `.line-clamp-3` — text truncation

### Step 32 — Write `main.tsx` → `App.tsx` → `providers.tsx` → `router.tsx`

The component hierarchy:
```
main.tsx         → ReactDOM.createRoot() + StrictMode
  App.tsx        → composes Providers + AppRouter
    Providers    → QueryClientProvider (+ devtools in DEV)
      AppRouter  → BrowserRouter + Routes
        /        → ScaffoldPage (F-0 placeholder)
```

`router.tsx` has all F-1 through F-10 routes **pre-commented** so the complete route map is visible even before the features are built. Developers uncomment routes as features land.

### Step 33 — Write `client/src/lib/apiClient.ts`

Axios instance with two interceptors:

**Request interceptor:** Injects `x-request-id` header (UUID) on every request. Allows matching client requests to server log lines for debugging.

**Response interceptor:** Converts any HTTP error into a typed `ApiError`:
```ts
throw new ApiError(errPayload.code, errPayload.message, status, errPayload.details);
```

Methods on `ApiError`:
- `.isUnauthorized()` → `status === 401`
- `.isForbidden()` → `status === 403`
- `.isRateLimit()` → `status === 429`

These make error handling in components clean:
```ts
if (error.isUnauthorized()) navigate('/login');
```

### Step 34 — Write `client/src/lib/queryClient.ts`

TanStack Query defaults:
- `staleTime: 30s` — data is considered fresh for 30 seconds after fetch
- `gcTime: 5 min` — unused cached data is garbage-collected after 5 minutes
- `retry: 2` — except `401`/`403` which are never retried (user needs to re-auth or doesn't have access)
- `refetchOnWindowFocus: false` — prevents refetches when alt-tabbing (common annoyance in PWAs)

### Step 35 — Write UI primitive components

Five components that every future screen uses:

| Component | Purpose | States it handles |
|-----------|---------|-------------------|
| `Button` | Primary interactive element | loading (spinner), disabled, 5 variants |
| `Badge` | Status + taxonomy tags | verified, pending, rejected, event types |
| `Card` | Content container | optional interactive (hover/press) mode |
| `Skeleton` | Loading placeholder | matches Card structure exactly |
| `EmptyState` | Zero-data view | icon + title + description + optional action |

**Rule:** Every screen that renders a list must handle all three states: loading (Skeleton), empty (EmptyState), and error (EmptyState with retry action). This was enforced in the component contracts from day one.

### Step 36 — Write `ScaffoldPage.tsx`

The F-0 placeholder for `/`. Shows:
1. Brand header with the school icon
2. API status card (polls `/api/v1/health` every 10 seconds)
3. Feature progress tracker showing all F-0 through F-10 with checkmarks

This page is replaced entirely when F-1 (auth) is built.

---

## Phase 9 — Install, Type-Check, and Verify

### Step 37 — Run `npm install` in both directories

```bash
cd Implementation/server && npm install
cd Implementation/client && npm install
```

**What to do with audit warnings:**
- Audit reports show vulnerable packages
- Distinguish between **runtime** deps (real concern) and **devDependencies** (test/build tools only)
- Fixed runtime issues: upgraded `node-cron` to v4 (fixed old `uuid` dep), upgraded `react-router-dom` to v7 (fixed open-redirect CVE)
- Deferred devDep-only issues (vitest, tailwindcss@3, eslint@8) to F-10 hardening

### Step 38 — Run `tsc --noEmit` on both

```bash
npx tsc --noEmit  # in server/
npx tsc --noEmit  # in client/
```

Found and fixed 3 type errors:

**Error 1 (server):** `errorHandler.ts` — Mongoose's E11000 code is a `number`, but `NodeJS.ErrnoException.code` is typed as `string | undefined`.  
Fix: Cast to `{ code?: unknown }` before comparing with `=== 11000`.

**Error 2 (server):** `pagination.ts` — `lastItem._id` is a Mongoose `ObjectId`, not a plain `string`.  
Fix: Use `String(lastItem._id)` instead of a type assertion.

**Error 3 (client):** `providers.tsx` — `import.meta.env` not recognized.  
Fix: Create `src/vite-env.d.ts` with `/// <reference types="vite/client" />`.

After fixes: **both pass `tsc --noEmit` with 0 errors.**

### Step 39 — Start dev servers and verify

```bash
# Terminal 1 — in server/
npm run dev
# tsx watch starts, MongoDB connects, server listens on :5000

# Terminal 2 — in client/
npm run dev  
# Vite starts in 1.8s, client at localhost:5173
```

Verified 4 things:

| Test | Command | Expected | Result |
|------|---------|----------|--------|
| Health endpoint | `curl localhost:5000/api/v1/health` | `{ data: { status: "ok" } }` | ✅ |
| DB state | (same) | `"database": "connected"` | ✅ |
| Vite proxy | `curl localhost:5173/api/v1/health` | Same response via proxy | ✅ |
| Bad env | Blank MONGODB_URI + short JWT_SECRET | Error + `process.exit(1)` | ✅ |

---

## Commit Plan (for when you say to commit)

F-0 should be committed as **4 atomic commits** — one concern per commit:

```
chore(scaffold): initialize monorepo structure and agent rules

feat(scaffold): add Express server with Zod env validation and MongoDB connection

feat(scaffold): add shared middleware (auth, role, validate, rateLimit, errorHandler) and utils

feat(scaffold): add Vite PWA client shell with design system and health status page
```

Each commit is independent — reviewers can understand exactly what changed and why.

---

## Key Lessons for Future Features

| Lesson | How to apply from F-1 onwards |
|--------|-------------------------------|
| Read requirements first | Check the plan doc + the FR-x IDs before writing |
| Explore reference designs | Look at stitch HTML for the feature's screen |
| Config before code | Write schema/model before service/controller |
| Never trust client data | `role`, `department`, `userId` always from `req.user` (JWT) |
| Every screen handles 3 states | loading · empty · error — no exceptions |
| Type-check before running | `tsc --noEmit` must pass before `npm run dev` |
| Fix type errors immediately | Don't accumulate `// @ts-ignore` debt |
| Test the unhappy paths | Wrong password, expired OTP, rate limit, 403 — test these first |
| Atomic commits | One logical change per commit, never mix features |
