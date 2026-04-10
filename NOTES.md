# SecureBank Bug Investigation & Resolution

For additional notes on my process, reasoning, and prioritization decisions, see the [Notes Along the Way](https://docs.google.com/document/d/1HJR9JlO8i3NUpB0w9ctphL1fG6gQthaOSgpOyp8je7U/edit?usp=sharing) tab in my write-up document.

I prioritized issues by customer risk: first security/compliance and financial correctness, then authentication/session risks and transaction validation, and finally lower-severity UX and formatting defects. For each issue, I used a repeatable workflow of reproduction, root-cause analysis, targeted fix, regression testing, and concise documentation.

---

# Critical Priority

---

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

## Ticket PERF-406: Balance Calculation

- **Symptom:** Account balances became incorrect after many transactions.
- **Root cause:** `fundAccount` computed the returned `newBalance` by adding `amount/100` in a 100-iteration loop, accumulating floating-point drift. The DB update was correct (`balance + amount`) but the client received the drifting value.
- **Fix:** Replaced the loop with a single `account.balance + amount` rounded to cents (`Math.round(… * 100) / 100`); added partitioned tests in `server/routers/account.balance.test.ts`.
- **Why this fix is correct:** One addition + cent rounding eliminates drift; the returned balance now matches exactly what the DB stores.
- **Prevention / follow-up:** Use integer cents internally for all monetary arithmetic if precision requirements grow.

## Ticket PERF-405: Missing Transactions

- **Symptom:** After multiple funding events, not all transactions appeared in history.
- **Root cause:** `fundAccount` fetched the "just-created" transaction with `.orderBy(transactions.createdAt).limit(1)` — no account filter, ascending order. This always returned the globally oldest transaction row, not the one just inserted.
- **Fix:** Added `.where(eq(transactions.accountId, input.accountId))` and changed to `.orderBy(desc(transactions.id))` so the query returns the newest transaction for the specific account; added regression tests in `server/routers/account.txnQuery.test.ts`.
- **Why this fix is correct:** The query now scopes to the funding account and sorts newest-first, so the returned transaction matches the one just created.
- **Prevention / follow-up:** Use `RETURNING` or fetch by inserted ID instead of re-querying by sort order.

## Ticket PERF-401: Account Creation Error

- **Symptom:** New accounts showed $100 balance when the DB fetch after insert returned nothing.
- **Root cause:** `createAccount` had a fallback `|| { balance: 100, status: "pending", ... }` that silently returned fake data instead of reporting failure.
- **Fix:** Replaced the fallback with a `TRPCError` throw so the client sees an explicit error; added regression tests in `server/routers/account.creation.test.ts`.
- **Why this fix is correct:** If the account wasn't persisted or can't be fetched, the user gets an error instead of phantom data with a wrong balance.
- **Prevention / follow-up:** Never use optimistic fallback objects for financial data; always fail loudly on DB inconsistencies.

## Ticket VAL-206: Card Number Validation

- **Symptom:** System accepted invalid card numbers — no checksum validation, and only Visa/Mastercard prefixes recognized.
- **Root cause:** `FundingModal` only checked for 16 digits and prefix `4` or `5`; no Luhn validation, no Amex/Discover/JCB support.
- **Fix:** Added `lib/validation/cardNumber.ts` with Luhn checksum, issuer prefix recognition (Visa, Mastercard, Amex, Discover, JCB), and proper length ranges; wired into `FundingModal` validation; added partitioned tests in `lib/validation/cardNumber.test.ts`.
- **Why this fix is correct:** Luhn catches typos and random digits; prefix + length matching covers all major card networks; structurally invalid numbers are rejected before any transaction attempt.
- **Prevention / follow-up:** Add server-side card validation on the `fundAccount` endpoint for defense in depth.

---

# High Priority

---

## Ticket SEC-304: Session Management

- **Symptom:** Multiple valid sessions accumulated per user with no invalidation; old sessions remained active after new logins.
- **Root cause:** `signup` and `login` both inserted a new session row without deleting prior sessions for the same user.
- **Fix:** Added `db.delete(sessions).where(eq(sessions.userId, user.id))` before session creation in both signup and login; added regression tests in `server/routers/auth.session.test.ts`.
- **Why this fix is correct:** Each auth event now invalidates all prior sessions, ensuring only one valid session per user at a time.
- **Prevention / follow-up:** Consider a session limit (e.g. max N devices) instead of single-session if multi-device support is needed later.

## Ticket PERF-403: Session Expiry

- **Symptom:** Sessions were accepted as valid right up until the exact expiry timestamp, with only a console warning near expiry.
- **Root cause:** `createContext` in `server/trpc.ts` used `new Date(session.expiresAt) > new Date()` (strict `>`) and logged a warning within 60s of expiry but still authenticated the request.
- **Fix:** Added a 60-second buffer: sessions are rejected when `expiresIn <= 60_000ms`, removed the warning-only code path; added partitioned tests in `server/session.expiry.test.ts`.
- **Why this fix is correct:** Requests near session expiry are now denied rather than racing against the clock, reducing the window for stale-session access.
- **Prevention / follow-up:** Make buffer configurable via env var; consider issuing a refresh token before the buffer window.

## Ticket SEC-302: Insecure Random Numbers

- **Symptom:** Account numbers were potentially predictable.
- **Root cause:** `generateAccountNumber()` used `Math.random()`, which is not cryptographically secure.
- **Fix:** Replaced with `crypto.randomInt()` (CSPRNG); added regression test in `server/routers/account.rng.test.ts`.
- **Why this fix is correct:** `crypto.randomInt` draws from the OS entropy pool, making account numbers unpredictable.
- **Prevention / follow-up:** Lint or code review for `Math.random` usage in security-sensitive contexts.

## Ticket VAL-210: Card Type Detection

- **Symptom:** Valid Mastercard 2-series cards (2221-2720) were rejected, and there was no card type detection for the UI.
- **Root cause:** `isRecognizedCard` only matched Mastercard classic prefixes (51-55); no `detectCardType` function existed.
- **Fix:** Added Mastercard 2-series regex to issuer matching; refactored into `detectCardType()` returning the issuer name (or null); added partitioned tests in `lib/validation/cardNumber.test.ts`.
- **Why this fix is correct:** All major issuers including modern Mastercard ranges are now recognized; `detectCardType` enables future UI card-type display.
- **Prevention / follow-up:** Keep issuer rules updated as networks add prefixes; wire `detectCardType` into the FundingModal UI for visual feedback.

## Ticket VAL-207: Routing Number Optional

- **Symptom:** Bank transfers could be submitted without a routing number, causing failed ACH transfers.
- **Root cause:** Server schema defined `routingNumber` as `.optional()` unconditionally; no server-side enforcement that bank transfers require it.
- **Fix:** Added `.refine()` on the server `fundAccount` schema requiring `routingNumber` when `type === "bank"`; added partitioned tests in `server/routers/account.routing.test.ts`.
- **Why this fix is correct:** Server now rejects bank transfers missing a routing number regardless of client behavior; card transfers remain unaffected.
- **Prevention / follow-up:** Consider conditional Zod schemas (discriminated union) for cleaner type-dependent validation.

## Ticket VAL-205: Zero Amount Funding

- **Symptom:** Users could submit a funding request for $0.00.
- **Root cause:** Client `min` validation used `value: 0.0` instead of `0.01`, so zero passed the `>=` check. The server's `z.number().positive()` correctly rejects zero, but the client let it through to the user without feedback.
- **Fix:** Changed client min to `0.01`; added partitioned tests in `server/routers/account.amount.test.ts` confirming the server schema rejects zero and negative amounts.
- **Why this fix is correct:** Both client and server now reject `$0.00` — client gives immediate feedback, server enforces as source of truth.
- **Prevention / follow-up:** Ensure client min values match server constraints; consider a shared validation constant.

## Ticket VAL-201: Email Validation Problems

- **Symptom:** System accepted invalid email formats (e.g. missing TLD) and common typos like `.con`; silently lowercased without notifying the user.
- **Root cause:** Client used a loose regex (`/^\S+@\S+$/i`) that accepted anything with `@`; server had `z.string().email()` but no typo detection; lowercase normalization happened silently.
- **Fix:** Added `lib/validation/email.ts` with stricter format validation, Levenshtein-based TLD typo detection against known TLDs, and an `emailWillBeLowercased()` helper; wired into signup client validation and server `.refine()`; added a yellow notice in the signup form when uppercase is detected; added partitioned tests in `lib/validation/email.test.ts`.
- **Why this fix is correct:** Client catches format issues, TLD typos (edit distance 1 from known TLDs), and notifies users about lowercase normalization before submission; server rejects suspicious TLDs as a second layer.
- **Prevention / follow-up:** Consider DNS MX lookup for production-grade email validation.

## Ticket PERF-407: Performance Degradation

- **Symptom:** System slowed down when loading transaction history for accounts with many transactions.
- **Root cause:** `getTransactions` ran an N+1 query — for each transaction, it issued a separate `db.select().from(accounts)` to get the account type, even though the account was already fetched for ownership verification.
- **Fix:** Replaced the per-transaction loop query with `account.accountType` from the already-fetched account object; added regression tests in `server/routers/account.perf.test.ts`.
- **Why this fix is correct:** Transaction enrichment now uses O(1) data from the existing account lookup instead of O(N) redundant queries.
- **Prevention / follow-up:** Review other query paths for N+1 patterns; consider query analysis tooling.

---

# Medium Priority

---

## Ticket PERF-402: Logout Issues

- **Symptom:** Logout always returned `success: true` even when the session was not deleted.
- **Root cause:** Session deletion was gated on `if (ctx.user)` — if context resolution failed (expired/invalid token), the DB row was never deleted but the response still reported success.
- **Fix:** Moved token extraction and session deletion outside the `ctx.user` guard; return `success: false` when no token is present; added regression tests in `server/routers/auth.logout.test.ts`.
- **Why this fix is correct:** Logout now always attempts to delete the session row from the cookie token, and honestly reports whether it did.
- **Prevention / follow-up:** Integration test logout with an expired session to confirm the row is cleaned up.

## Ticket VAL-203: State Code Validation

- **Symptom:** System accepted `XX` as a valid state code.
- **Root cause:** Server only checked `length(2).toUpperCase()`; client only checked `/^[A-Z]{2}$/`. Neither validated against actual US state/territory codes.
- **Fix:** Added `lib/validation/stateCodes.ts` with a `US_STATE_CODES` set (50 states + 6 territories) and `validateStateCode()`; wired into server `.refine()` and client `validate`; added partitioned tests in `lib/validation/stateCodes.test.ts`.
- **Why this fix is correct:** Only real US state/territory codes are accepted; arbitrary 2-letter strings like `XX` are rejected on both client and server.
- **Prevention / follow-up:** Keep the state code set updated if new territories are added.

## Ticket VAL-204: Phone Number Format

- **Symptom:** System accepted any string of digits as a phone number; client and server had mismatched rules.
- **Root cause:** Server used `/^\+?\d{10,15}$/` (optional `+`), client used `/^\d{10}$/` (no `+`, US-only). Neither enforced a standard format.
- **Fix:** Both server and client now require E.164 format (`/^\+\d{10,15}$/` — mandatory `+` prefix with 10-15 digits); updated placeholder to `+12125551234`; added partitioned tests in `server/routers/auth.phone.test.ts`.
- **Why this fix is correct:** E.164 is the international standard for phone numbers; mandatory `+` prefix prevents ambiguous local-only numbers; client and server rules are now identical.
- **Prevention / follow-up:** Consider a phone number formatting library for display and input masking.

## Ticket VAL-209: Amount Input Issues

- **Symptom:** System accepted amounts with multiple leading zeros like `00100.00`.
- **Root cause:** Client regex `/^\d+\.?\d{0,2}$/` allowed any number of leading digits including zeros.
- **Fix:** Changed pattern to `/^(0|[1-9]\d*)\.?\d{0,2}$/` which allows `0` or a non-zero-leading number; added partitioned tests in `components/FundingModal.amount.test.ts`.
- **Why this fix is correct:** `0` is allowed for sub-dollar amounts (`0.50`), but `01`, `00100` etc. are rejected. Decimal precision is still capped at 2 places.
- **Prevention / follow-up:** Consider normalizing the input on blur (strip leading zeros) for better UX.

## Ticket PERF-404: Transaction Sorting

- **Symptom:** Transaction order appeared random when reviewing history.
- **Root cause:** `getTransactions` query had no `orderBy` clause — SQLite does not guarantee row order without one.
- **Fix:** Added `.orderBy(desc(transactions.id))` so transactions are returned newest first; added behavioral tests in `server/routers/account.sorting.test.ts`.
- **Why this fix is correct:** Explicit descending sort by ID gives deterministic newest-first ordering regardless of DB internals.
- **Prevention / follow-up:** Require `orderBy` on all list queries as a code review convention.

## Ticket UI-101: Dark Mode Text Visibility

- **Symptom:** Text typed into form inputs was invisible (white on white) in dark mode.
- **Root cause:** Dark mode sets `--foreground: #ededed` on `body`, which form inputs inherit. Inputs have white backgrounds (Tailwind `border-gray-300` classes) but no explicit text color, so inherited light text becomes invisible.
- **Fix:** Added a global CSS rule in `app/globals.css` setting `input, select, textarea { color: #171717; }` so form text is always dark regardless of body color scheme.
- **Why this fix is correct:** Inputs always have light backgrounds in this app, so pinning their text to dark ensures visibility in both light and dark mode without touching individual component classes.
- **Prevention / follow-up:** Consider a full dark-mode-aware design system with explicit input theming if dark backgrounds for inputs are ever introduced.
