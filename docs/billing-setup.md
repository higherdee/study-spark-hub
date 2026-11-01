# SyllaPlus billing setup

This implementation is local and checkout is disabled by default. The native APK has not yet been updated for the new billing flow. Provider checkout, recurring renewals, and webhook delivery still need end-to-end sandbox verification before live activation.

**Provider correction:** the owner uses Bachs, not Paystack. The Paystack checkout adapter is disabled. The supplied Bachs live key is stored privately as `BACHS_LIVE_SECRET_KEY` and was verified with a read-only products request. The official `@bachs/sdk` is installed, with separate live/sandbox client and webhook-secret handling. Historical Paystack verification code is retained for legacy records, not as an active checkout option.

The owner approved creation of `Syllaboss sandbox billing`, a 90-day Paddle sandbox key. It was created and saved directly into `.env.local`, then verified with a read-only products request. Granted scopes cover products, prices, customers, transactions, subscriptions, notification settings and client-side tokens (read/write), plus customer portal session creation. No live Paddle permission was granted.

`scripts/setup-paddle-sandbox.mjs` configured the international USD 12.99 monthly and USD 109.99 yearly test prices and saved the test Paddle.js client token privately. No weekly international price or live catalog resource was created. The earlier combined catalog script now rejects `--apply` to prevent any more Paystack setup.

The owner supplied a Bachs sandbox key. It is saved privately as `BACHS_SANDBOX_SECRET_KEY` and was verified with a read-only sandbox products request. No dashboard key was created by the agent. `scripts/setup-bachs-sandbox.mjs` created three recurring sandbox products using the saved FX snapshot: USD 1.49 weekly, USD 5.20 monthly, USD 51.27 yearly. An unpaid monthly checkout was successfully created with a labeled test customer; its verified checkout origin is `https://sandbox-checkout.bachs.io`. This is not a completed payment test.

All 18 regional markets now route to the Bachs adapter, with actual USD charges and preserved approximate local equivalents. International markets route to Paddle monthly/yearly only. The Bachs adapter includes authenticated checkout, canonical payment/customer ownership verification, first-renewal extension, cancellation at period end, customer portal creation and signed webhook ingestion. Checkout remains disabled until webhook destinations/secrets and the complete sandbox payment flow are verified. No live Bachs products or real charges have been created.

Bachs currently documents USD-card recurring subscriptions only. The owner approved automatic USD-equivalent billing for regional plans, converted from the approved NGN prices. Display the approximate local equivalent and clearly state the actual USD charge and recurring amount before checkout. Its documented active-subscription `trial_end` update can postpone the next bill beyond an already-paid period; this needs sandbox verification for the seven-extra-day offer.

## Approved prices

| Billing group | Weekly | Monthly | Yearly |
| --- | ---: | ---: | ---: |
| Existing regional countries | NGN 1,999 | NGN 6,999 | NGN 68,999 |
| Other supported countries | Unavailable | USD 12.99 | USD 109.99 |

The first payment happens immediately. Seven days are added before the first renewal, once per account and separately in sandbox and live. Subsequent periods use the normal calendar interval. This is not a deferred-payment trial.

All regional countries use Bachs automatic USD-card billing. Other supported countries use Paddle. Regional equivalents use a dated exchange-rate snapshot; the UI labels local amounts as approximate and displays the actual USD recurring charge. Provider taxes and bank conversion may affect the final total. Exchange-rate attribution is included in the UI.

## Private credentials

Keep these in `.env.local` and in the deployment's private environment settings. Never put server keys in `VITE_*` variables, source control, URLs, or chat.

- `BACHS_SANDBOX_SECRET_KEY` and `BACHS_LIVE_SECRET_KEY`
- `BACHS_SANDBOX_WEBHOOK_SECRET` and `BACHS_LIVE_WEBHOOK_SECRET`
- `PADDLE_SANDBOX_API_KEY` and `PADDLE_LIVE_API_KEY`
- `PADDLE_SANDBOX_CLIENT_TOKEN` and `PADDLE_LIVE_CLIENT_TOKEN` (public Paddle.js tokens)
- `PADDLE_SANDBOX_WEBHOOK_SECRET` and `PADDLE_LIVE_WEBHOOK_SECRET`
- `BILLING_ENV=sandbox` during testing; `BILLING_ENABLED=true` only after provider configuration is ready
- `BILLING_SITE_ORIGIN=https://syllaboss.org`

Bachs keys are server-only and must match the selected environment. The existing Paystack adapter is disabled and its historical test resources are unused.

An older payment key reached the local browser build through both a public setting and the misspelled `VITE_BASCH_SECRET_KEY`. Other private service settings also used public names. Those settings were moved into private server variables in `.env.local`; the hardcoded Groq/Gemini fallback keys and browser/local-storage key lookups were removed. AI server endpoints retain their private configuration. The build now runs `scripts/check-client-secrets.mjs` before and after compilation to reject public server secrets and scan generated browser files. These public settings must also be removed from hosting before deployment; its private server variables must be configured instead. A read-only scan of 20 published entry scripts found none of the configured payment credentials; this was not a complete crawl of every lazy-loaded asset or a claim that other historically published credentials were safe.

Paddle: create a separate [sandbox account](https://sandbox-vendors.paddle.com/), then My account → Settings → Authentication → API keys → New API key. Use a server API key containing `sdbx` and `apikey`, rather than a client-side token. Billing setup needs read/write access to products, prices, customers, transactions, subscriptions, notification settings and client tokens, plus customer portal session creation. [Official quickstart](https://developer.paddle.com/api-reference/about/).

## Setup and verification

`scripts/setup-bachs-sandbox.mjs` and `scripts/setup-paddle-sandbox.mjs` configure only sandbox resources and record their IDs. They look up matching resources before creating replacements. The historical combined catalog script rejects `--apply`. Existing price IDs remain in catalog history for verification of older subscriptions. Live catalog setup remains separate and incomplete.

Webhook destinations use `/api/billing-webhook?provider=bachs&environment=sandbox` or `provider=paddle`; live destinations must specify `environment=live`. Configure the correct mode-specific signing secret. Provider delivery retries are requested until processing completes, and a durable inbox plus leases prevents duplicate processing. On-demand confirmation also reconciles with the provider.

The server controls prices, customer ownership, and access. Return-page parameters do not grant membership. A sandbox subscription never changes live membership or reward balances. Cancellation retains access through the paid period. Profile settings updates cannot set subscription fields, and billing projections preserve mobile preferences.

Before production, verify both providers with test cards, actual signed webhooks, duplicate delivery, payment failure, cancellation, the seven-day renewal extension, and native-app return behavior. Configure scheduled recovery/reconciliation as well.

## Remaining requested work

The handwritten free-tier quotas, seven-day chat retention, advertising gates, promo codes, native billing/settings integration, and the other notebook UI improvements are not implemented by this billing foundation. Do not advertise those limits or features as enforced until their server and native implementations are completed and tested.

## Local validation

All 34 targeted billing tests passed outside the restricted Windows test environment, including dropped-response recovery and Paddle readiness without an international weekly price. They cover environment isolation, regional USD quotes, payment ownership and amount checks, unpaid-checkout rejection, cancellation, the once-only first-renewal extension, and sandbox benefit isolation. The clean production build passed, including both credential checks, after removing the identified public credential settings and hardcoded AI fallbacks. A private configuration check confirmed that server Groq and Gemini keys remain configured and no private `VITE_*` variable remains locally. The broader app suite previously could not start successfully because Windows denied a temporary-cache file rename. The repository-wide TypeScript check has existing errors outside billing; two stale Paystack comparisons identified in the new code were removed. The broad follow-up type check was stopped to free memory and is not claimed as passing. Provider end-to-end tests remain pending webhook configuration and a completed sandbox payment. Vercel still returned 403 after the owner reported approving team access, and the owner reported that the second authorization page does not work. No deployment was made through the connector; no existing CLI login or private deployment token was available as a fallback.
