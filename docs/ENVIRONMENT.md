# Configuration and release checks

Copy `.env.example` to `.env.local`, or supply the variables in the deployment's secret manager. `.env.local` and all other real env files are ignored by Git. The template deliberately contains no usable credentials. Previously shared keys must be revoked and replaced before use.

## Public vs private

Only Clerk's **publishable** key, Supabase's **publishable** key and URL, payment **public** keys, and non-secret environment selectors belong in `VITE_*` variables. Vite puts these values in browser bundles. Never add `VITE_BASCH_SECRET_KEY`, `VITE_GEMINI_API_KEY`, `VITE_GROQ_API_KEY`, `VITE_API_SECRET`, or database/storage tokens.

Use a Clerk development instance for the preview host. The Clerk browser key and server secret must come from the same instance. A live instance configured for the production domain is not a drop-in preview login.

Server Supabase code accepts `SUPABASE_SECRET_KEY` or the legacy `SUPABASE_SERVICE_ROLE_KEY`. Browser realtime code uses only the publishable key. Payment previews should use sandbox/test settings; this environment has not executed any payments, payouts, migrations, or live database writes.

## Changes in this redesign

- Removed embedded AI, Clerk secret, payment, R2 and Turso credential fallbacks from the changed runtime files and legacy database scripts.
- Browser text/vision AI requests go through authenticated server functions. AI thread access checks both the session and thread ownership.
- Missing provider configuration now fails honestly instead of fabricating a successful academic response.
- Existing Git history may still contain exposed credentials. Removing current literals does not revoke those credentials. Rotate them; do not rewrite shared history casually.

## Remaining release blockers / limits

This is **not** a full security certification. The existing app imports database helpers into browser-facing code and has a wider server-function authorization surface outside the AI functions. A dedicated server-only data-access migration and authorization audit is required before treating the whole platform as production-secure. Do not expose database credentials in client environment variables to work around this.

The sandbox's network allowlist does not include Clerk, Turso, Supabase, Cloudflare R2, Groq, Gemini, or the payment providers. Live sign-in, database-backed chat, AI inference, file upload, battle grading, and financial flows therefore cannot be end-to-end validated here. Production build and unit tests are not substitutes for those checks.

The repository also has pre-existing TypeScript diagnostics in integrations and study widgets. `npm run build` transpiles successfully, but `npx tsc --noEmit` is not yet a clean release gate.

## Manual acceptance pass (with a staging account)

1. Sign in and finish onboarding on a narrow phone viewport and a desktop.
2. Type in both chats with the native mobile keyboard, including IME/dictation and Shift+Enter on desktop.
3. Send/edit a message, simulate a failed send, verify the draft and attachment survive, and retry.
4. Ask a follow-up after more than 16 AI messages; check recent context, formula rendering and failure recovery.
5. Create a friendly battle in a group and a direct conversation; join as a second account, answer questions, review results, then rematch.
6. Verify battle sounds remain off until explicitly enabled. Verify reduced-motion preferences.
7. Test point stakes, sponsorships and settlement only with staging data and an independent authorization/atomicity review.
