# Agent Rules — Campus Innovation Platform

## Project
Campus Innovation Platform (events, teams, registrations, verified achievements, department analytics).

## Stack
- **Server:** Node.js · Express · TypeScript (strict) · Mongoose · Zod · JWT · bcrypt · Vitest · Supertest
- **Client:** React · Vite · TypeScript · React Router · TanStack Query · React Hook Form · Zod · Tailwind CSS · PWA

## Structure
```
server/src/modules/<feature>/
  <feature>.model.ts       # Mongoose schema + indexes
  <feature>.schema.ts      # Zod request/response schemas
  <feature>.service.ts     # Business logic (only layer touching models)
  <feature>.controller.ts  # Thin request/response bridge
  <feature>.routes.ts      # URL wiring + middleware
  <feature>.test.ts        # Supertest tests

client/src/features/<feature>/
  api/<feature>.api.ts     # TanStack Query functions
  components/              # Dumb UI pieces
  hooks/                   # useXxx hooks
  pages/                   # Full page components
  schemas/                 # Client-side Zod schemas
  types.ts                 # Inferred + extended types
  index.ts                 # Public barrel export (only export from here)
```

## Rules
1. **TypeScript strict.** No `any`. Explain every type assertion with a comment.
2. **Validate every request** body, query, and params with Zod in the route middleware.
3. **Controllers are thin.** All business logic is in services. Only services touch models.
4. **Every protected route** uses `requireAuth` and `requireRole` middleware. Never trust `role`, `department`, or `userId` from the client.
5. **Secrets from env only.** Never log secrets, PII, or `passwordHash`. Never hard-code API keys.
6. **Never return** `passwordHash` or `phone` unless the business rule explicitly allows it (contact reveal after acceptance).
7. **Every screen** handles loading, empty, and error states.
8. **API routes** all prefixed with `/api/v1/`.
9. **Response shape:** `{ data: T }` on success, `{ error: { code, message, details? } }` on failure.
10. **Touch only the files listed** in the task. Ask before adding a dependency.
11. **Before coding,** write a short plan and wait for approval.
12. **After coding,** list files changed, how to run/test, and anything uncertain.
13. **Module boundaries:** a module uses another module only through its service, not its model.
14. **Client imports:** a feature imports from another feature only through its `index.ts`.
15. **Path alias:** use `@/` for both server and client instead of long relative paths.

## Commit Convention
```
<type>(<scope>): <short description>

Types: feat | fix | chore | refactor | test | docs | style
Scope: the feature module (e.g. auth, events, teams, credentials, analytics, scaffold)

Examples:
  feat(scaffold): add Express app factory with helmet, cors, and morgan
  feat(scaffold): add MongoDB connection with retry and graceful shutdown
  feat(auth): add User model and register/login endpoints
  fix(teams): enforce atomic spotsLeft decrement on accept
```

## Layering Rule
```
HTTP Request
  → Route (Zod validate middleware)
  → Controller (thin — reads req, calls service, sends res)
  → Service (all business logic)
  → Model (Mongoose)
```

## Source of Truth
Always keep the Feature-Wise Implementation Plan document open alongside this file.
Feature IDs (F-0 through F-10) and requirement IDs (FR-x) are referenced in every task.
