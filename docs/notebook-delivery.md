# Notebook implementation checklist

Preserve the existing mobile website layout, settings, brand logo, and withdrawal minimum. Web and Android must expose the same student features.

## Current verification — 1 November 2026

Latest delivery:
- Live web release now routes attached documents through their stored private files, with an extracted page/line index and a visible passage picker. Quizzes and flashcards also receive the real file instead of its title or upload description.
- A real Gemini request read original page 65, line 20 from a synthetic 70-page PDF and correctly quoted its unique capacitor-energy value. The faster path selects the exact indexed passage for text questions and extracts a single original PDF page for visual questions.
- Theory marking now returns a validated criterion breakdown, actual evidence and partial credit. Genuine zero scores remain zero; unreadable work produces a review request rather than invented marks.
- Assessment uses the reasoning model instead of falling back to lightweight chat/extraction models. A disputed reference with deducted marks receives a second review; a failed review withholds the numeric grade. Real model checks awarded 0/10 to an incorrect answer and 10/10 to a correct alternative calculation while flagging the incorrect reference. Eleven focused grading/routing/document tests passed. These examples verify the regression, not universal grading accuracy.
- Both billing groups expose ready sandbox checkout on the live domain. Bachs and Paddle webhook destinations are registered with private signing secrets. A completed customer payment and renewal still require end-to-end verification.
- Android 2.2.19 (code 119) was built, tested on Android 15, signed with the existing identity and published automatically by [GitHub Actions run 41339351906](https://github.com/higherdee/study-spark-hub/actions/runs/41339351906). The updated native preview was also installed and opened on the local Android 15 emulator without wiping its data.
- The app checks and downloads future verified APK updates at launch, then asks the user to open Android's installer. Users of earlier APKs must install this update-enabled version once.

- 58 isolated tests pass across nine files: billing ownership, approved prices, renewal extension, webhook retries, free limits, retention, admin promo rewards, native study generation, focus intervals, atomic battle awards, retry-safe stake collection, and unfunded sponsorship rejection.
- Website production build and private-credential scan passed. Further battle changes require the final build to be repeated before deployment.
- Admin promo campaigns support editable SyllaPlus days, daily AI token credits, and monthly download credits, with dates, per-user/global limits, audit records, and retry-safe redemption. Existing claims retain their original reward after campaign edits.
- Web and native code now include explicit study-mode controls, real material reading, reviews, shared preferences, private download gates, and verified focus timing. These remain unchecked below until both clients have been exercised on screen.
- Battle grading no longer fabricates fallback marks. Final score updates and winner payouts are atomic; a completed battle cannot pay its pot twice.
- Live deployment access is restored. Payment keys remain in sandbox mode; no real-money checkout has been enabled.

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
