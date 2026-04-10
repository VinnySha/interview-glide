## Ticket SEC-301: SSN Storage

- **Symptom:** SSNs were stored in plaintext in `users.ssn`, and auth responses could include sensitive user fields.
- **Root cause:** `signup` persisted raw `input.ssn`, and signup/login used broad user object spreading with only `password` removed.
- **Fix:** Added AES-256-GCM SSN encryption in `lib/security/ssn.ts` and used it in `auth.signup`; added `sanitizeUser()` in `server/lib/sanitizeUser.ts` (used by `auth.signup` / `auth.login`) to exclude `password` and `ssn`; added focused tests in `lib/security/ssn.test.ts` and `server/routers/auth.test.ts`.
- **Why this fix is correct:** SSNs are now encrypted at rest, auth payloads no longer expose SSN/password, and tests verify both guarantees.
- **Prevention / follow-up:** Require `SSN_ENCRYPTION_KEY` in all environments and keep explicit response shaping for sensitive DB models.

## Ticket SEC-303: XSS Vulnerability

- **Symptom:** Transaction descriptions could execute or inject HTML when shown in the UI.
- **Root cause:** `TransactionList` rendered `transaction.description` with `dangerouslySetInnerHTML`, treating stored text as HTML.
- **Fix:** Render description as normal React text (`{transaction.description ?? "-"}`) so content is escaped; added regression tests in `lib/security/transactionDescriptionRender.test.ts`.
- **Why this fix is correct:** React escapes text node children by default, so markup in the DB is displayed as text and not parsed as HTML.
- **Prevention / follow-up:** Avoid `dangerouslySetInnerHTML` for user- or DB-sourced strings; consider ESLint `react/no-danger` and server-side length/sanitization if descriptions are ever rendered in email or PDF.

## Ticket VAL-208: Weak Password Requirements

- **Symptom:** Passwords like `abcdefgh` (no uppercase, no special char) were accepted by the server.
- **Root cause:** Server Zod schema only enforced `min(8)`; client had partial checks (number required) but no uppercase or special character rules, and the server is the source of truth.
- **Fix:** Added `.regex()` rules on the server Zod schema requiring lowercase, uppercase, digit, and special character; synced client `validate` rules to match; added partitioned tests in `server/routers/auth.password.test.ts`.
- **Why this fix is correct:** Server enforces all complexity rules regardless of client, and client gives immediate feedback matching the same rules.
- **Prevention / follow-up:** Keep password policy in a shared constant or Zod schema importable by both client and server to prevent drift.

## Ticket VAL-202: Date of Birth Validation

- **Symptom:** Future dates and ages under 18 were accepted during signup (e.g. birth year 2025).
- **Root cause:** Server schema was `z.string()` with no date parsing or age check; client only enforced `required`.
- **Fix:** Added `.refine()` on the server Zod schema computing age from the parsed date and rejecting under 18; synced the same logic to the client `validate` rule; added partitioned tests in `server/routers/auth.dob.test.ts`.
- **Why this fix is correct:** Server rejects any DOB that doesn't parse or yields age < 18 regardless of client behavior; client gives immediate feedback with the same rule.
- **Prevention / follow-up:** Extract age-check into a shared utility if more forms need it; consider a `max` attribute on the HTML date input for additional UX guardrail.

## Ticket PERF-408: Resource Leak

- **Symptom:** Database connections remained open, risking resource exhaustion under load.
- **Root cause:** `initDb()` in `lib/db/index.ts` opened a second `new Database(dbPath)` connection (`conn`) pushed into a `connections` array that was never used or closed. The DDL already ran on the primary `sqlite` instance.
- **Fix:** Removed the unused `conn` and `connections` array from `initDb()`; added a source-level regression test in `lib/db/index.test.ts` asserting only one `new Database(` call exists and no dangling connection arrays remain.
- **Why this fix is correct:** Only one SQLite connection (the one backing Drizzle) is now opened; the leaked second handle and its accumulating array are gone.
- **Prevention / follow-up:** Code review for extra connection instantiations; add connection-count monitoring in production.
