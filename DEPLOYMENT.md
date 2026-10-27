# Syllaboss deployment

The application uses TanStack Start with Nitro. `npm run build` detects the hosting platform; a local build defaults to a Cloudflare Worker. On Cloudflare use the generated `.output/server/wrangler.json` and deploy the Worker, including its server entry and static assets. The application cannot run as static files alone.

## Required hosting variables

Configure these in the service running the application, not only in local `.env.local`:

- `VITE_CLERK_PUBLISHABLE_KEY` (build time) and `CLERK_SECRET_KEY` (runtime).
- `TURSO_DATABASE_URL` and `TURSO_AUTH_TOKEN` (runtime).
- `R2_ENDPOINT`, `R2_BUCKET_NAME`, `R2_ACCESS_KEY_ID`, `R2_SECRET_ACCESS_KEY` (runtime).
- The AI provider credentials used by the deployed assistant.

Keep credentials private. Do not prefix server secrets with `VITE_`.

## Current live-site findings

On 27 October 2026, the public domain returned HTTP 500. Cloudflare DNS routes the root and www domains to Vercel. Vercel runtime logs confirm the startup exception: `TURSO_AUTH_TOKEN must be configured on the server.` Configure the existing application's production variables in Vercel before redeploying. The local database connection succeeded. A local production homepage check returned HTTP 200 with configured credentials.

Missing storage and database credentials previously threw when shared server modules were imported, potentially preventing unrelated public pages from rendering. Initialization is now deferred to service operations. Missing credentials still prevent those operations and must be configured in hosting.

The production-domain maintenance gate has been removed. Authentication and admin route checks remain in place.

## Release verification

1. Build and run the tests.
2. Deploy to the intended host and verify the custom domain serves that deployment.
3. Verify the homepage, public library, sign-in, onboarding, material preview, upload and download.
4. Verify AI conversations persist, community messages work, and authorized admin screens load.
5. Verify points and withdrawal behavior using controlled accounts without initiating real payouts.
6. Check a real iPhone and Android phone, including keyboard, bottom navigation and safe areas.

The repository currently has broader TypeScript errors; a successful Vite build is not a clean type check. Live authenticated flows and physical-device behavior have not yet been verified.
