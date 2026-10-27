# Syllaboss Android

Version 2 is a native Kotlin and Jetpack Compose application. See [NATIVE-APP.md](NATIVE-APP.md) for screens, backend boundaries and release checks. The package remains `org.syllaboss.app`, supporting Android 7.0 and later.

Version 1.0.1 was a Trusted Web Activity that launched the website through Chrome. Its public stable download is retained while the native build is reviewed.

## Build

Use JDK 17, Gradle 8.13, Android SDK platform 36 and build tools 35.0.0. Run `gradle -p android assembleRelease assembleDebug`, or use the GitHub Actions **Build Android APK** workflow. Local Android Studio is not required.

Run CI with `unsigned_only=true` to obtain an aligned release and the official `apksigner.jar`. Sign locally with the original PKCS12 signing identity. Verify with `apksigner verify --verbose --print-certs` and compare the certificate fingerprint to the previous release. Never commit signing keys, passwords or decrypted backups.

Do not use `bootstrap_signing` for an update. It is only for the first signing identity. Increase `versionCode` for every distributed update. The original encrypted recovery backup and private recovery key must remain recoverable outside public source control.

The workflow checks the native manifest, boots Android 15, exercises navigation, and saves screenshots and accessibility dumps in `android-launch-evidence`. Signature verification alone does not establish runtime correctness. Authenticated flows also need a test account and the Clerk native settings.

Native preview releases are published separately from the stable legacy download until these checks are complete.
