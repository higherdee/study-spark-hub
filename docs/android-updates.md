# Android updates

Download the native app from https://syllaboss.org/downloads/syllaboss-native.apk.

Users of versions before 2.2 need to install the new APK once. Their existing app did not contain an update checker. Keep the existing signing identity so updates preserve the installed app and its data.

The update-enabled app checks release metadata when it starts. For a newer version, it downloads the APK, validates its SHA-256 hash, package name, version code and signing identity, then offers installation through Android's installer. Android can require the user to allow this installation source and confirm installation. This is not a silent installer.

Pushing native app changes to main runs the Android release workflow. It builds release and debug variants, checks the manifest, runs the Android 15 launch/navigation checks, signs using encrypted GitHub Actions secrets, and publishes the verified native APK and metadata. A failed check stops publication. Changes only to the published download files do not trigger another Android build.

The first automatic release was version 2.2.19, code 119. Its signing certificate matches the previous 2.1 release. Website/backend improvements reach the app through the existing API; native interface changes require the new signed APK.
