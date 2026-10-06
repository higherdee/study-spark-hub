Syllaboss Native App Downloads Folder
=======================================

Syllaboss installs natively on all devices (Android, Windows, iOS, Mac, Linux) directly via 1-tap Progressive Web App (PWA / WebAPK) without requiring manual binary downloads or Play Store / App Store approvals.

If you compile and host custom standalone native binaries (e.g. built via Capacitor or Electron):
Set the environment variables:
- APK_DOWNLOAD_URL="https://your-host.com/syllaboss.apk"
- EXE_DOWNLOAD_URL="https://your-host.com/syllaboss-setup.exe"
- LINUX_DOWNLOAD_URL="https://your-host.com/syllaboss.AppImage"

Do NOT place mock or text placeholder files here, as operating systems (Windows and Android) will reject them as corrupted packages ("This app can't run on your PC" / "There was a problem parsing the package").
