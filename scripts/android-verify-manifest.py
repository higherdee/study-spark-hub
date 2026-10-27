"""Validate the Android Browser Helper runtime components after manifest merging."""
from pathlib import Path
import sys
import xml.etree.ElementTree as ET

namespace = "{http://schemas.android.com/apk/res/android}"
path = Path(sys.argv[1])
manifest = ET.parse(path).getroot()
application = manifest.find("application")
activities = {node.get(namespace + "name"): node for node in application.findall("activity")}
helper = "com.google.androidbrowserhelper.trusted."
assert helper + "LauncherActivity" in activities, "Launcher activity is missing"
for component in ("ManageDataLauncherActivity", "FocusActivity"):
    assert helper + component in activities, f"Browser Helper requires the registered {component} component at runtime"
assert application.get(namespace + "manageSpaceActivity") == helper + "ManageDataLauncherActivity"
metadata = {node.get(namespace + "name"): node.get(namespace + "value") for node in activities[helper + "LauncherActivity"].findall("meta-data")}
assert metadata.get("android.support.customtabs.trusted.DEFAULT_URL") == "https://syllaboss.org/dashboard"
assert application.get(namespace + "usesCleartextTraffic") == "false"
print("Android Browser Helper manifest contract verified.")
