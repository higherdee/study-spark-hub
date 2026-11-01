# Notebook implementation checklist

Preserve the existing mobile website layout, settings, brand logo, and withdrawal minimum. Web and Android must expose the same student features.

## Current verification — 1 November 2026

- 58 isolated tests pass across nine files: billing ownership, approved prices, renewal extension, webhook retries, free limits, retention, admin promo rewards, native study generation, focus intervals, atomic battle awards, retry-safe stake collection, and unfunded sponsorship rejection.
- Website production build and private-credential scan passed. Further battle changes require the final build to be repeated before deployment.
- Admin promo campaigns support editable SyllaPlus days, daily AI token credits, and monthly download credits, with dates, per-user/global limits, audit records, and retry-safe redemption. Existing claims retain their original reward after campaign edits.
- Web and native code now include explicit study-mode controls, real material reading, reviews, shared preferences, private download gates, and verified focus timing. These remain unchecked below until both clients have been exercised on screen.
- Battle grading no longer fabricates fallback marks. Final score updates and winner payouts are atomic; a completed battle cannot pay its pot twice.
- Android compilation reached the Java compiler boundary. A complete compatible JDK is being prepared; no updated APK has yet been verified or published.
- Live deployment access and complete provider sandbox payment/webhook verification remain outstanding. Checkout is not being advertised as live.

## Membership and free access

- [x] Approved country-group prices and Bachs/Paddle sandbox catalogs.
- [x] Immediate first payment; seven extra days before first renewal once per account.
- [x] Authenticated billing, ownership checks, cancellation, and payment verification foundation.
- [ ] Complete signed webhook/payment tests, deployment, and Android billing return.
- [ ] Admin-configurable promo rewards with server validation and redemption on both clients.
- [ ] Free accounts: no paid badge; normal 1x earning multiplier.
- [ ] Free accounts: maximum five flashcards, MCQs, or theory items per generation.
- [ ] Free accounts: one AI request per minute and 1,000 AI tokens per UTC day.
- [ ] Free accounts: no library material attachment/import into Boss AI.
- [ ] Free accounts: six material downloads per UTC month.
- [ ] Promotion before material preview; 30-second promotion before download, verified by server.
- [ ] Contextual, dismissible SyllaPlus promotions. Describe the paid seven-day renewal extension honestly.
- [ ] Delete free-account chat history after seven days with a transition notice for existing conversations; preserve paid access and payment grace periods.

## AI and studying

- [ ] Selecting a study mode opens topic/count controls rather than generating automatically.
- [ ] Derive topic from an existing conversation when requested; ask for context when absent.
- [ ] Put mode controls and generation prompts above the composer.
- [ ] Colorful, readable flashcards.
- [ ] Separate scrollable material reader and movable, resizable, minimizable Boss AI panel on web and Android.
- [ ] Material review count, ratings, and authenticated reviews.
- [ ] Continuous focus timer and round goals (three weekday, five weekend); preserve saved preferences.

## Peers, onboarding, and presentation

- [ ] Improve battle UI and provide the same explicit AI generation controls there.
- [ ] Peers drawer appears on the main peers page, not individual chats/groups.
- [ ] Empty peers screen explains username/group search.
- [ ] Peers and related student features work in Android.
- [ ] Terms/privacy acceptance before signup, persisted server-side; cookie preferences on web.
- [ ] Remove unverifiable platform claims.
- [ ] Preserve mobile settings in Android; test Android 14+ and publish an updated signed APK.

No item is considered complete solely because a button or label exists. Validate the server rule, the visible result, and both clients where applicable.
