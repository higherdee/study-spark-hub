# Syllaboss Android

This is an installable, signed Android application using Google's Android Browser Helper (Trusted Web Activity). It opens `https://syllaboss.org/dashboard` in the user's compatible browser without browser chrome when Digital Asset Links verification succeeds. Chrome is recommended. Sign-in, uploads and downloads use the live website. Internet access is required; the application does not provide offline storage or background notifications.

The app supports Android 7.0 and later. Its package ID is `org.syllaboss.app`.

## Build

Use JDK 17, Gradle 8.13, Android SDK platform 36, and build tools 35.0.0. Run `gradle -p android assembleRelease`. The GitHub Actions **Build Android APK** workflow builds, aligns, signs, verifies, and uploads the release files.

The first release used the explicit `bootstrap_signing` option. **Do not bootstrap another signing identity for an update.** Updates must use the original key and an increased `versionCode` in `app/build.gradle`.

For subsequent CI releases, configure repository secrets `ANDROID_KEYSTORE_BASE64` (base64 of the saved PKCS12 keystore) and `ANDROID_KEYSTORE_PASSWORD`. The signing alias is `syllaboss`. Secret configuration is a separate administrative action; no signing secrets are committed in this repository.

## Signing recovery

The first signing identity was recovered locally to the ignored `scratch/android-signing/` folder (`release.p12` and `password.txt`). Preserve that folder in secure backup for future releases. The recovery private key is the ignored `scratch/android-signing-recovery-key.pem`. The matching public recipient certificate is safe to commit at `signing-recovery-recipient.pem`.

CI artifacts include only the signed application, public metadata, public certificate, verification results, and an **encrypted** signing backup. The unencrypted signing identity is never uploaded as an artifact. The recovery private key is never sent to GitHub.

## Publish

After verification, copy only `syllaboss.apk` and `release.json` to `public/downloads/` (rename metadata to `android-release.json`). Copy `assetlinks.json` to `public/.well-known/assetlinks.json`. Keep the download link's version query in sync with `versionName` to avoid cached older packages. Never copy signing backups or passwords into `public/`.

Verify the production APK's SHA-256 against `android-release.json`, and verify the website's certificate fingerprint matches the APK signing certificate. Test installation, full-screen launch, sign-in, uploads, and downloads on a real Android device before claiming device testing is complete.
