#!/usr/bin/env bash
set -euo pipefail
mkdir -p android-smoke
adb shell pm list packages | grep -q 'com.android.chrome'
adb install -r android/app/build/outputs/apk/debug/app-debug.apk
adb logcat -c
adb shell am start -W -n org.syllaboss.app/com.google.androidbrowserhelper.trusted.LauncherActivity > android-smoke/launch.txt
sleep 20
adb logcat -b crash -d > android-smoke/crashes.txt
adb logcat -d -s TWALauncherActivity TWAProviderPicker > android-smoke/browser-launch.txt
adb shell dumpsys activity activities > android-smoke/activities.txt
adb exec-out screencap -p > android-smoke/launch.png
if grep -q 'org.syllaboss.app' android-smoke/crashes.txt; then
  cat android-smoke/crashes.txt
  exit 1
fi
grep -q 'Status: ok' android-smoke/launch.txt
grep -q 'Found TWA provider' android-smoke/browser-launch.txt
grep -Eq '(topResumedActivity|mResumedActivity|ResumedActivity):?=.*com.android.chrome|ResumedActivity:.*com.android.chrome' android-smoke/activities.txt
echo 'Android 15 cold launch passed: no Syllaboss crash; Chrome is in the foreground.'
