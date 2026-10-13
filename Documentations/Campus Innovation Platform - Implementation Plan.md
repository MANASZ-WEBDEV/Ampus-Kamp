# Campus Innovation Platform - Implementation Plan (Learn While You Build)

*8-week plan for building with an AI coding agent (Antigravity) while revising React, TypeScript and backend skills. Every week has something to learn, something to build, tasks to give the agent, and a review you do yourself. October 2026.*

## 1. How This Plan Works

Each week has five parts: **Learn** (revise first), **Build** (what gets made), **Agent tasks** (small prompts you give), **Review** (what you check in the code) and **Done when** (a test that proves it works).

**The loop for every task**

1. **Learn:** 30 to 45 minutes on the concept (official docs, a short video, or asking the agent to explain it).
2. **Define:** write the acceptance criteria in your own words before prompting.
3. **Prompt:** one small task, with the files to touch and the criteria. Ask for a plan first and approve it.
4. **Review:** read the diff line by line with the checklists in section 8.
5. **Run and test:** run it, try to break it, and run the tests.
6. **Explain back:** write 3 sentences in your learning log on what each new file does and why. If you cannot explain it, ask the agent to simplify it. Do not merge code you cannot explain.

**Habits that keep you in control**

- One feature slice per session, one git branch per feature, one commit per task.
- The agent may only change files listed in the task. It must ask before adding a dependency.
- Hand-write one small piece each week yourself (for example the upload-limit check), then compare it with the agent's version.
- Keep the Backend Schemas document and the requirement IDs (FR-x) open as the source of truth.

**About Antigravity.** I have not verified its specific features. Put the rules in section 5 into a markdown file at the repo root, check Antigravity's documentation for how it reads project rules, and ask it to show a plan before it edits files.

## 2. Stack

| Side | Choice |
| --- | --- |
| Server | Node.js, Express, TypeScript (strict), Mongoose, Zod (validation), JWT, bcrypt, Vitest, Supertest |
| Client | React, Vite, TypeScript (strict), React Router, TanStack Query, React Hook Form with Zod, Tailwind, a PWA plugin, Vitest with React Testing Library |
| Services | MongoDB Atlas, a free-tier LLM API, email service, file storage (Cloudinary or similar) |

## 3. Folder Structure (feature-wise)

Everything about one feature lives together. A feature folder holds its model, schema, service, controller, routes and tests.

```
server/
  src/
    app.ts                    # builds the Express app
    server.ts                 # starts it
    routes.ts                 # mounts every module's router under /api
    config/
      env.ts                  # reads and validates environment variables with Zod
      db.ts                   # MongoDB connection
    shared/
      middleware/             # auth.ts, requireRole.ts, validate.ts, rateLimit.ts, errorHandler.ts
      utils/                  # asyncHandler.ts, hash.ts, pagination.ts
      errors.ts               # AppError classes
      types.ts                # shared types such as AuthUser
    modules/
      auth/                   # auth.routes.ts, auth.controller.ts, auth.service.ts, auth.schema.ts, auth.test.ts
      users/                  # user.model.ts, user.schema.ts, user.service.ts, user.controller.ts, user.routes.ts, user.test.ts
      roster/                 # roster.model.ts, roster.service.ts, import script
      departments/
      courses/
      credentials/            # also qr-verify.service.ts, upload handling
      events/                 # also extraction/ (llm.service.ts, regex.service.ts)
      registrations/
      teams/                  # team posts
      links/                  # requests, invites, connects
      looking/                # I'm looking for a team
      safety/                 # blocks and reports
      participations/
      analytics/
      notifications/          # in-app, email, web push
      settings/
      audit/
    jobs/                     # expireLinks.ts, lockRegistrations.ts, spotCheck.ts
  tests/                      # integration tests that cross modules
  scripts/                    # seed.ts, importRoster.ts, evaluateExtraction.ts

client/
  src/
    app/                      # App.tsx, router.tsx, providers.tsx
    features/
      auth/                   # api/auth.api.ts, components/, hooks/useAuth.ts, pages/LoginPage.tsx, schemas/auth.schema.ts, types.ts, index.ts
      events/
      teams/
      registrations/
      credentials/
      profile/
      analytics/
      admin/
      notifications/
    components/ui/            # Button, Card, Badge, Modal, EmptyState, Skeleton
    lib/                      # apiClient.ts, queryClient.ts, utils.ts
    hooks/                    # shared hooks
    types/                    # shared types
```

**What each file type is for (server)**

| File | Responsibility |
| --- | --- |
| `x.model.ts` | Mongoose schema and model, indexes |
| `x.schema.ts` | Zod schemas for request bodies, queries and params, plus inferred types |
| `x.service.ts` | Business logic. The only layer that touches models |
| `x.controller.ts` | Thin: reads the request, calls the service, sends the response |
| `x.routes.ts` | URL paths, middleware (auth, role, validate) and controller wiring |
| `x.test.ts` | Tests for that module |

**Rules**

- Direction of calls: routes, then controller, then service, then model. Never skip a layer.
- A module can use another module only through its service, not its model.
- On the client, a feature exposes what others may use through its `index.ts`. Do not import deep files from another feature.
- Use a path alias such as `@/` instead of long relative paths.
- API responses use one shape, for example `{ data }` on success and `{ error: { code, message } }` on failure.

## 4. Conventions

- Files: `user.model.ts`, `user.routes.ts` (lowercase, dot-separated). React components: `EventCard.tsx` (PascalCase).
- Zod schemas end with `Schema` (`createEventSchema`). Types come from `z.infer`.
- TypeScript strict mode. No `any`. Every function that crosses a layer has typed inputs and outputs.
- Async route handlers go through `asyncHandler` so errors reach the error middleware.
- Environment variables are read once in `config/env.ts` and validated.

## 5. Agent Rules File (paste into the repo root)

```
PROJECT: Campus Innovation Platform (events, teams, registrations, verified achievements, department analytics).
STACK: Server: Node, Express, TypeScript, Mongoose, Zod, JWT, bcrypt, Vitest, Supertest.
       Client: React, Vite, TypeScript, React Router, TanStack Query, React Hook Form, Zod, Tailwind.
STRUCTURE: server/src/modules/<feature>/ with <feature>.model.ts, .schema.ts, .service.ts, .controller.ts, .routes.ts, .test.ts.
           client/src/features/<feature>/ with api/, components/, hooks/, pages/, schemas/, types.ts, index.ts.
RULES:
- TypeScript strict. No any. Explain any type assertion.
- Validate every request body, query and params with Zod in the route.
- Controllers are thin. Business logic is in services. Only services touch models.
- Every protected route uses auth and role middleware. Never trust role, department or userId from the client.
- Secrets come only from env. Never log secrets or personal data.
- Never return passwordHash or phone unless the rules allow it.
- Every screen handles loading, empty and error states.
- Touch only the files listed in the task. Ask before adding dependencies.
- Before coding, write a short plan and wait for my approval.
- After coding, list the files changed, how to run and test, and anything you were unsure about.
```

## 6. Task Prompt Template

```
TASK: <one sentence>
CONTEXT: <feature, related collection from the Backend Schemas doc, requirement IDs>
FILES TO CREATE OR CHANGE: <list>
ACCEPTANCE CRITERIA:
1. ...
2. ...
OUT OF SCOPE: <what not to build>
HOW I WILL TEST: <curl commands or test cases>
Write a plan first and wait for my approval.
```

## 7. Week-by-Week Plan

### Week 0 (first 1 to 2 days): Setup and feasibility spikes

- **Learn:** tsconfig strict mode, git branching, how Vite and Express projects start.
- **Build:** repo with `server/` and `client/`, Express with `/health`, MongoDB connection, validated env, linting, the rules file.
- **Spikes (about half a day total):** (1) scan a real NPTEL certificate, fetch the link from code and see what comes back; (2) call the free LLM API once with a pasted event message; (3) collect 10 real announcements.
- **Done when:** GET /health works, the client renders, and the spike results are written down (they decide whether QR auto-verify and extraction go ahead as planned).

### Week 1: Foundation and authentication

- **Learn:** TypeScript (types vs interfaces, unions, generics basics, `Partial` and `Pick`); Express request flow and middleware; Mongoose schemas and models; password hashing and JWT; React components, props, state and controlled forms; React Router; React Hook Form with Zod.
- **Build (server):** error handling, validate middleware, Department and StudentRoster models with a CSV import script, User model, register with roster check and email OTP, login, `/me`, auth and role middleware, login rate limit.
- **Build (client):** app shell, router, API client, auth feature (login, register, OTP), protected routes.
- **Agent tasks:** (1) env, db and error handling; (2) Department and roster models plus import script; (3) User model and register/login (example below); (4) auth and role middleware; (5) client shell and router; (6) auth pages.
- **Review:** passwordHash never returned, JWT secret from env, roster check happens on the server, Zod on every body, rate limit on login and OTP. On the client, understand where the token is stored: an httpOnly cookie is safer against script theft but needs CSRF thinking; localStorage is simpler but exposed to XSS. Ask the agent to explain the option it chose.
- **Done when:** register, verify, login and `/me` work; a student calling a faculty-only route gets 403 (test).

**Example prompt (task 3)**

```
TASK: Add the User model and register and login endpoints.
CONTEXT: Auth and users modules. See User and StudentRoster in the Backend Schemas doc. Requirements FR-1 to FR-5.
FILES TO CREATE: modules/users/user.model.ts, user.schema.ts, user.service.ts; modules/auth/auth.schema.ts, auth.service.ts, auth.controller.ts, auth.routes.ts, auth.test.ts
ACCEPTANCE CRITERIA:
1. POST /api/auth/register accepts enrollmentNo, collegeId, password; both IDs must match one StudentRoster row that is not claimed.
2. Name, department and year are copied from the roster, never from the request.
3. Password is hashed with bcrypt; passwordHash is never returned.
4. POST /api/auth/login returns a signed JWT for active users only.
5. All inputs validated with Zod; errors use the shared error shape.
OUT OF SCOPE: OTP, roles, client code.
HOW I WILL TEST: Supertest cases for success, unknown enrollment, wrong college ID, already claimed, wrong password.
Write a plan first and wait for my approval.
```

### Week 2: Events and the feed

- **Learn:** Mongoose queries, indexes and pagination; TanStack Query (queries, caching, loading and error states); rendering lists and keys in React; Tailwind basics.
- **Build:** events module (create, edit, publish, close), feed endpoint with filters by type, branch, year and deadline, event detail; client events feature (feed, filters, detail, faculty form); seed 10 real events. **Deploy server and client this week.**
- **Agent tasks:** (1) Event model and CRUD; (2) feed query with filters and pagination; (3) client feed page; (4) event detail page; (5) faculty create form; (6) seed script.
- **Review:** faculty-only routes, only published events shown to students, indexes match the filters, loading, empty and error states on every screen.
- **Done when:** faculty post an event and students see it on the deployed link.

### Week 3: Paste-to-post extraction

- **Learn:** async/await and error handling; retry with backoff; calling an HTTP API; Zod `safeParse`; writing a prompt that returns strict JSON; keeping API keys in env.
- **Build:** `POST /events/extract` with an LLM service, a regex baseline and fallback, JSON validation, a confirm screen that highlights uncertain fields, saving the raw text and edited fields; the evaluation script (reads a labeled CSV, prints precision, recall and F1 per field).
- **Agent tasks:** (1) regex baseline; (2) LLM service with timeout and retry; (3) validation and fallback; (4) extract endpoint; (5) confirm UI; (6) evaluation script.
- **Review:** the LLM output is never trusted (always validated), the API key is not in the client, rate limit on the endpoint, only pasted event text is sent (no personal data).
- **Done when:** a pasted message becomes an editable card, and the script prints F1 for regex and LLM on your labeled set. Keep labeling messages every week.

### Week 4: Team posts, requests and notifications

- **Learn:** state machines (pending to accepted or declined); MongoDB unique and partial indexes; atomic updates with `$inc` and conditions; React mutations and cache invalidation; sending email; the basics of web push and service workers.
- **Build:** teams module (create, close), links module (request, accept, decline, withdraw), inbox, contact reveal after acceptance, notifications module (in-app and email), expiry job; client teams feature (posts list, create post, inbox).
- **Agent tasks:** (1) TeamPost model and routes; (2) TeamLink model with the pending-unique index; (3) accept flow with `spotsLeft` handled atomically; (4) contact reveal rule; (5) notifications service; (6) client screens.
- **Review:** a student cannot accept someone else's link, `spotsLeft` cannot go below zero when two accept at once, phone is hidden until accepted, limits read from Setting.
- **Done when:** request, accept and WhatsApp reveal work end to end, and the daily limit is enforced.

### Week 5: Invites, looking flag and registration

- **Learn:** MongoDB transactions (Atlas supports them), counters and consistency, aggregation basics; multi-step forms in React.
- **Build:** invite and connect links, people search, looking flag, block and report; registrations (individual, team with member confirmation, external tracking), event counters, roster CSV export; client event cards with counts, register flow.
- **Agent tasks:** (1) invite and connect; (2) people search with privacy rules; (3) looking flag; (4) Registration model and unique index; (5) registration submit and withdraw with counters in a transaction; (6) roster export; (7) client flows.
- **Review:** one active registration per student per event (try to break it), declined members are removed, counters match the real count, search never returns contact details.
- **Done when:** your own team registers for a seeded event and the card shows the right counts.

### Week 6: Credentials and verification

- **Learn:** file uploads (multer, cloud storage), file hashing, MongoDB `$lookup`; TypeScript enums and unions for status fields.
- **Build:** course catalog import, credential upload with the 5 per 24 hours and 15 pending limits, duplicate checks (certificate ID and file hash), faculty verification queue for the student's own department, audit log, QR auto-verify if the week 0 spike worked; client add-achievement, my achievements, verification queue.
- **Agent tasks:** (1) Course model and import; (2) Credential model and upload; (3) limits and duplicate checks; (4) verification endpoints with role and department checks; (5) QR decode and fetch service (allowlisted host only); (6) client screens.
- **Review:** department comes from the user record, nobody verifies their own record, editing resets to pending, the QR fetch accepts only allowlisted hosts and has a timeout.
- **Done when:** an NPTEL certificate goes from upload to verified, a duplicate is blocked, and the sixth upload in a day is refused.

### Week 7: Analytics, admin and polish

- **Learn:** the MongoDB aggregation pipeline (`$group`, `$lookup`, `$project`); a chart library (Recharts); role-based UI.
- **Build:** analytics module (counts, department ranking by participation rate, certificates per 100 students, points), settings screen for limits and weights, department and admin dashboards, GET /home, PWA install and web push, spot-check job.
- **Agent tasks:** (1) ranking aggregation; (2) breakdown endpoint; (3) settings module; (4) dashboards; (5) GET /home; (6) PWA setup.
- **Review:** only verified items count, divide-by-zero is handled, department heads see only their department, the ranking matches a hand calculation on seed data.
- **Done when:** the ranking on seed data equals your spreadsheet calculation.

### Week 8: Hardening, pilot and evaluation

- **Learn:** Vitest and Supertest basics, a simple security checklist, how to present results.
- **Build:** tests for the critical paths, bug fixes, real events seeded, pilot with one batch and 2 to 3 faculty, the extraction evaluation (100 or more labeled messages), the ranking-metric comparison, final documents and a demo script.
- **Done when:** the demo checklist in section 10 passes on the deployed app.

## 8. Review Checklists

**Backend (check every diff)**

- Zod validation on body, query and params for every route.
- Auth and role middleware on every protected route; ownership checks (this record belongs to this user).
- Role, department and userId come from the token or database, never from the request body.
- No `any`, no unexplained type assertions.
- Controllers are thin; logic is in services; only services call models.
- Indexes exist for the queries and the uniqueness rules in the schema doc.
- Limits come from Setting, not hard-coded.
- Secrets only from env; no personal data in logs; passwordHash and phone are never returned by default.
- Errors use the shared shape and never leak stack traces.
- At least one test for success and one for a failure or a forbidden case.

**Frontend (check every diff)**

- Props and API responses are typed; no `any`.
- Server data uses TanStack Query, not scattered `useEffect` fetches.
- Loading, empty and error states exist on every screen.
- Forms use React Hook Form with a Zod schema; error messages are visible.
- Business rules stay on the server; the client only displays and sends.
- Buttons are disabled with a reason when an action is not allowed.
- Tap targets are large enough, contrast is readable, status is not shown by color alone.
- A feature imports from another feature only through its `index.ts`.

## 9. Learning Log and Weekly Self-Test

**Learning log (one entry per task)**

```
Task: <name>   Date: <date>
What the agent built: <3 sentences>
One thing I did not know before: <concept>
One thing I changed or rejected, and why: <note>
Question I still have: <question>
```

**Self-test (end of each week, answer without looking)**

1. Trace one request from the browser to the database and back, naming each file it passes through.
2. Where does validation happen, and what happens when it fails?
3. How does the server know who is calling, and how does it know they are allowed?
4. Which index would you remove and what query would become slow?
5. What happens in the UI while data loads, when there is none, and when it fails?
6. What is the hardest bug you hit this week and how did you find it?

If you cannot answer one, spend an hour on that topic before starting the next week.

## 10. Cut Order and Demo Checklist

**If time runs short, cut in this order**

1. Connect requests and the looking flag.
2. Web push (keep email and in-app).
3. PDF annual report.
4. QR auto-verify (keep the faculty button).
5. External event tracking.
6. Weighted points (keep participation rate and certificates per 100 students).

**Never cut:** authentication with roster check, events and feed, paste-to-post extraction with the evaluation, team request and accept, credentials with faculty verification, and the department ranking.

**Demo checklist**

- A faculty member pastes a real message and publishes an event.
- A student sees it, forms a team and registers, and the card counts update.
- A student uploads an NPTEL certificate and it is verified.
- The department ranking changes and the breakdown explains why.
- The extraction accuracy numbers are ready on one slide.

## 11. First-Day Checklist

- Create the repo, the folder skeleton from section 3 and the rules file from section 5.
- Open the Backend Schemas document and the requirement analysis next to the editor.
- Create the MongoDB Atlas project and the LLM API key (kept in `.env`, which is git-ignored).
- Run the three week 0 spikes and write down the results.
- Start the learning log and give the agent task 1 of week 1.
