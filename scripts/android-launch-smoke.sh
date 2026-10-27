#!/usr/bin/env bash
set -euo pipefail
mkdir -p android-smoke
adb install -r android/app/build/outputs/apk/debug/app-debug.apk
adb logcat -c
adb shell am start -W -n org.syllaboss.app/.MainActivity > android-smoke/launch.txt
sleep 25
adb logcat -b crash -d > android-smoke/crashes.txt
adb shell dumpsys activity activities > android-smoke/activities.txt
adb exec-out screencap -p > android-smoke/welcome.png
adb shell uiautomator dump /sdcard/welcome.xml
adb pull /sdcard/welcome.xml android-smoke/welcome.xml
if grep -q 'org.syllaboss.app' android-smoke/crashes.txt; then cat android-smoke/crashes.txt; exit 1; fi
grep -q 'Status: ok' android-smoke/launch.txt
grep -q 'Less scattered' android-smoke/welcome.xml
# Guest exploration never needs a browser or a signed-in account.
python3 - <<'PY'
import xml.etree.ElementTree as E, re, subprocess
root=E.parse('android-smoke/welcome.xml')
for node in root.iter('node'):
    if 'Explore the library first' in node.get('text',''):
        x1,y1,x2,y2=map(int,re.findall(r'\d+',node.get('bounds')))
        subprocess.run(['adb','shell','input','tap',str((x1+x2)//2),str((y1+y2)//2)],check=True)
        break
else: raise SystemExit('Guest exploration button missing')
PY
sleep 15
adb exec-out screencap -p > android-smoke/today.png
adb shell uiautomator dump /sdcard/today.xml
adb pull /sdcard/today.xml android-smoke/today.xml
grep -q 'Make room' android-smoke/today.xml
adb logcat -b crash -d > android-smoke/crashes.txt
if grep -q 'org.syllaboss.app' android-smoke/crashes.txt; then cat android-smoke/crashes.txt; exit 1; fi
echo 'Native Android cold launch and guest navigation passed.'
python3 scripts/android-ui-smoke.py
