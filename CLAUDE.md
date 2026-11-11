# CLAUDE.md

Inventory, sales, and purchasing system: Next.js 15 (App Router, React 19), TypeScript strict, Drizzle ORM on PostgreSQL, Tailwind v4 + shadcn-style UI, Zod, Vitest. Sentry for error reporting.

Shared governance for all AI agents lives in [GEMINI.md](GEMINI.md) and [.agents/rules/](.agents/rules/). This file adapts those rules for Claude Code; where they conflict with the code, the code wins (e.g. `.agents/rules/strict_architecture.md` still mentions Sequelize — the project now uses Drizzle).

## Commands

```bash
npm run dev                 # next dev --turbopack
npm run type-check          # tsc --noEmit
npm run lint
npm run test:only <file>    # run one test file (preferred during development)
npm run test:unit           # tests/unit + tests/unit/components (no DB)
npm run test:integration    # tests/integration, serial, needs local Postgres
npm test                    # unit + integration
```

- Git hooks (husky): **pre-commit** runs `type-check` + `test:unit`; **pre-push** runs `npm test`. Never bypass with `--no-verify`.
- Integration tests load `.env.test` and hard-fail unless `DB_NAME=inventory_test_db`. Never point tests at another database.
- There is no migrations folder; schema lives in `src/server/db/schema/` and maps to existing legacy tables. Do not run `drizzle-kit push`/`generate` without asking.
- `tests/db/schema.sql` is a structure-only export of production; CI loads it into an empty Postgres before `test:integration`. After any production schema change, regenerate it with `npm run db:dump-schema` (read-only; needs `pg_dump` ≥ the server version) and commit it.

## Architecture & data flow

```
page.tsx (async Server Component)
  → requirePermission(...)                     src/server/auth/guards.ts
  → xxxServerService.getAll(...)               src/server/services/
  → <XxxClientWidget initial... />             src/components/widgets/  ("use client")
       → modal/form → server action            src/server/actions/*.actions.ts
            → createProtectedAction({permission, schema, handler})
                 → xxxServerService.create/update/delete
                 → revalidatePath(...)
```

There are no API routes (`src/app/api` does not exist). Server Actions call services directly; never fetch `localhost` loopbacks.

### Pages (`src/app/`)
- Route groups: `(auth)`, `(dashboard)`, `(print)`.
- `page.tsx` files are `async` Server Components that call `await requirePermission(PERMISSIONS.X)` first, fetch via services, and hand data to a widget.
- If a page must be `"use client"` (e.g. `scanner`, `price-manager`), enforce permissions in a sibling server `layout.tsx` with `requirePermission`.
- Export `metadata` as `{ title: "<Page> | Inventory System", description }`.

### Server actions (`src/server/actions/<entity>.actions.ts`)
- File starts with `"use server"`.
- Mutations are wrapped with `createProtectedAction` from [safeAction.ts](src/server/actions/safeAction.ts): it handles session, RBAC permission, and Zod validation (schema validates the **last** argument), and returns `ActionResult<T>` (`{ success: true, data } | { success: false, error, fieldErrors? }`). Don't throw across the action boundary; Next.js redacts errors in production.
- Use the acting user from `ctx.user` (pass `ctx.user.id` to services for audit fields).
- **Never use a hardcoded user ID as a fallback** (e.g. `userId ?? 1`, `userId || 1`, or a default parameter `userId = 1`). Records would be attributed to the wrong user and the audit trail would be corrupted. If an operation needs a user, make `userId` a required parameter and throw when it's missing. Remove existing fallbacks when you touch that code.
- Serialize DB results before returning (`JSON.parse(JSON.stringify(result))`) and call `revalidatePath` for every affected route.
- Naming: `<verb><Entity>Action`, e.g. `createCategoryAction`.

### Services (`src/server/services/<entity>Server.service.ts`)
- Exported as an object literal, `export const categoryServerService = { get, getAll, create, update, delete, ... }`, re-exported from [services/index.ts](src/server/services/index.ts). Import from `@/server/services`.
- Use plain CRUD verbs (`get`, `getAll`, `getPaginated`, `create`, `update`, `delete`) rather than entity-prefixed names. Domain operations get descriptive verbs (`cancelOrder`, `returnExchange`).
- Import `"server-only"`; use `db` from `@/server/db/drizzle` and tables from `@/server/db/schema`.
- Multi-step mutations must run in `db.transaction(async (tx) => …)`. Methods that participate in a caller's transaction accept an optional `tx` argument and use it instead of `db`.
- Soft delete: tables with `deletedAt` must filter `isNull(table.deletedAt)` on every read, including lookups inside transactions.
- Normalize DB/Zod errors with `handleServiceError` from [errorHandler.ts](src/server/services/errorHandler.ts).
- Query projection types and param interfaces (`ListSalesOrdersParams`, etc.) are co-located in the service file.
- Inventory changes go through `inventoryServerService` (`inventoryIncrease`/decrease with an `INVENTORY_MOVEMENT_TYPE` and reference type) so movements stay auditable; don't write `inventories` directly.

### Database (`src/server/db/`)
- One file per table in `schema/`, exported from `schema/index.ts`, with `relations()` defined beside the table.
- Table names are legacy PascalCase plural (`pgTable("Categories", …)`) and columns are camelCase; match the existing DB exactly.

### Where things go
| What | Where |
| --- | --- |
| Zod schemas + inferred types (`XxxInputSchema`, `XxxUpdateSchema`, `XxxInput`, `XxxData`) built with `drizzle-zod`, re-exported from `src/schemas/index.ts` | `src/schemas/<entity>.schema.ts` |
| `as const` enums, status maps, select options, Tailwind class maps | `src/constants/` |
| Pure compile-time types (`ActionResult`, `PaginatedResponse`, summaries) | `src/types/` |
| Permissions (`PERMISSIONS`, `ROLE_PERMISSIONS`, `hasPermission`) | `src/lib/rbac.ts` |
| Browser fetchers | `src/lib/api-clients/` |
| Client state (zustand) | `src/stores/` |
| Hooks | `src/hooks/` |

Components go in a subfolder of `src/components/`, never loose at the root:
- `ui/`: shadcn primitives, lowercase-kebab filenames (`button.tsx`)
- `common/`: reusable building blocks (`DataTable`, `DatePicker`, `PermissionGuard`)
- `widgets/`: page-level client containers (`XxxWidget` / `XxxClientWidget`)
- `modals/`: `XxxModal`
- `forms/`: form pieces
- `layout/`, `providers/`

Forms use `react-hook-form` + `@hookform/resolvers/zod` with the shared schemas.

### Consuming action results
Actions **never throw**: a failure (no session, missing permission, validation, DB error) comes back as `{ success: false, error, fieldErrors? }`. A `try/catch` around an action call does not catch any of these.

```ts
const res = await createThingAction(values);
if (!res.success) {
  // map res.fieldErrors onto form.setError when it's a form
  toast.error(res.error);
  return;               // no success toast, no closing, no clearDraft, no setState
}
toast.success("Saved");
```

- Never discard the result (`await xAction(...)` as a bare statement), never read `res.data` before checking `res.success`, and never annotate the result `: any`.
- Side effects that assume the save happened (closing the modal, `clearDraft`, `setStatus`, `router.refresh`) go **after** the success check.
- A failed **read** is not an empty result. Don't write `res.success ? res.data : []`; keep the current state and `toast.error(res.error)`. Treating failure as "nothing found" has wiped saved drafts.
- Every export in `src/server/actions/*.actions.ts` is built with `createProtectedAction` (only `loginAction` / `logoutAction` are exempt), so all actions share this contract.
- Mock action failures in component tests with `mockResolvedValue({ success: false, error })`, **not** `mockRejectedValue`; actions don't reject.

Enforced by `tests/unit/actionResultGuard.test.ts` (runs in pre-commit). It checks the call-site shape only; it can't tell whether the failure branch does the right thing. So every component that calls a mutation needs a test where the action returns `{ success: false }`, asserting no success toast and nothing closed or cleared (see `tests/unit/components/MutationFailurePaths.test.tsx`).

Path alias: `@/*` → `src/*`.

## Testing (unit-first TDD)

- Write a failing test before writing functional code.
- `tests/unit/*.test.ts`: node env, no DB (schemas, pure logic, mocked SQL).
- `tests/unit/components/**/*.test.tsx`: jsdom, React components.
- `tests/integration/**/*.test.ts`: real `inventory_test_db`; call `setupDatabase()` in `beforeAll`, `resetDatabase()` in `beforeEach` (from `tests/setup.ts`), and use helpers in `tests/utils/fixtures.ts`.
- Iterate with `npm run test:only tests/unit/<file>.test.ts`. Run the relevant integration file **once** at the end as the final check.
- Vitest globals are enabled. Use Arrange-Act-Assert, `it.each` for input matrices, and test names that state the business rule (e.g. "rejects COMPLETED so orders cannot bypass inventory deduction").
- No tautological tests that just assert constants exist; assert behavior.

## Code standards

- Production-grade only: no mock data, placeholder strings, or hardcoded fallback arrays in pages, services, or components.
- No backwards-compat wrappers or re-export shims; update consumers directly.
- Comments explain *why*. Use TSDoc on public service contracts and non-obvious business rules.
- No new `console.log` in production code. Errors surface through `ActionResult`, error boundaries, and Sentry (`src/app/global-error.tsx`, `src/instrumentation-client.ts`).
- Never hardcode secrets. Env vars come from `.env.*` files (`DB_HOST`, `DB_PORT`, `DB_USERNAME`, `DB_PASSWORD`, `DB_NAME`).
- Line totals and quantities: reuse `src/lib/compute.ts` (`getAmount`, `getTotalAmount`, `truncateQty`, `computeSalesOrderSummary`). For display, use `formatCurrency` / `formatDate` / `formatDateTime` from `src/lib/utils.ts`. For date-range queries, use `getDateBounds` from `src/server/services/dateFilter.ts` rather than doing timezone math by hand.
## Working agreements

- Review, analyze, or explain requests are read-only: report findings and options with one marked **(Recommended)**, and don't edit files until asked.
- For non-trivial code changes, state the root cause/approach and the tests you'll write before editing.
- When a requested approach conflicts with these rules, say so and propose an alternative instead of silently deviating.
- The user works on Windows. Prefer npm scripts; when giving shell commands for the user to run, make them PowerShell-compatible.
