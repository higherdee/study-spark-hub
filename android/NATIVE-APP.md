# Native Syllaboss for Android

Version 2 replaces the Chrome launcher with Kotlin and Jetpack Compose. App screens do not use a WebView or Trusted Web Activity. Legal documents open in the system browser. Clerk manages authentication and session storage.

## Native screens

Welcome, Today, searchable Library, saved reading shelf, PDF/image reader with pinch zoom and pagination, Boss AI, student profile, points activity, campus leaders, material sharing, study groups and discussions, and a persistent focus timer.

The institution and course directories are bundled JSON. Library metadata and opened documents are cached on the device. AI and account operations require internet. Focus time does not mint reward points. Conversations are saved on the server and the active thread is restored per signed-in user after app termination. Study-group messages refresh manually.

## Backend and security

`/api/mobile` returns public verified material metadata and bearer-authenticated private resources. The verified JWT subject determines ownership. Client-supplied reward balances, account IDs and sender names are ignored. Database and AI credentials remain on the server. Documents use `/api/materials`; uploads use the existing authenticated `/api/upload` content validator and server verification.

## Build and signing

Run `.github/workflows/build-apk.yml` with `unsigned_only=true`. It compiles both variants, checks the manifest, boots Android 15, and exercises native navigation. Download the aligned release and sign with the original signing identity. Do not bootstrap a second key for this package. Never put private signing files in Git.

The `android-launch-evidence` artifact contains screenshots and accessibility dumps. Local Android Studio is not needed.

## Release validation

Check native cold launch, all tabs, live library search, reading and bookmarks, focus start/pause/reopen, and native sign-in. Authenticated profile edits, uploads, AI and study-group operations must also be tested with an account. Check large text, keyboard, gestures and status bars on real hardware before declaring full device coverage.

Clerk Native API and production Android identifiers must be configured for native sign-in. Access to private account settings requires user approval. Do not claim authenticated end-to-end tests passed before completing them.

The first native release does not include withdrawal submission, subscription checkout, administration, battle games, push notifications, or background uploads. It does not expose inactive buttons for those features.

## Validation on 28 October 2026

The Android 15 emulator checks passed for cold launch, guest navigation, live library results, rendering a real document, Boss AI screen navigation, account navigation and starting the focus timer. Twelve API access-control, conversation and Markdown rendering tests passed and the website production build passed. An isolated debug-only Android activity also verified native mathematics, tables and code rendering. Release screens use the exact website emblem and bundled Hanken Grotesk and Newsreader fonts; the redundant outer sign-in header is removed.

Clerk Native API is enabled in production. The `org.syllaboss.app` release certificate is registered, its native return URL is allowlisted, and Clerk's public assetlinks file matches the original signing certificate.

Email-code sign-in completion and authenticated AI, profile, upload and group operations still need an on-device account session. No user credentials or authenticated sessions were sent to the build runner. This release is a native preview, not a claim of complete website feature parity or full hardware coverage.
