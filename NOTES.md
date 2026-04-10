## Ticket SEC-301: SSN Storage

- **Symptom:** SSNs were stored in plaintext in `users.ssn`, and auth responses could include sensitive user fields.
- **Root cause:** `signup` persisted raw `input.ssn`, and signup/login used broad user object spreading with only `password` removed.
- **Fix:** Added AES-256-GCM SSN encryption in `lib/security/ssn.ts` and used it in `auth.signup`; added `sanitizeUser()` in `server/routers/auth.ts` to exclude `password` and `ssn`; added focused tests in `lib/security/ssn.test.ts` and `server/routers/auth.test.ts`.
- **Why this fix is correct:** SSNs are now encrypted at rest, auth payloads no longer expose SSN/password, and tests verify both guarantees.
- **Prevention / follow-up:** Require `SSN_ENCRYPTION_KEY` in all environments and keep explicit response shaping for sensitive DB models.
