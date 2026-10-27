"""Verify native launch and transport settings in the merged manifest."""
from pathlib import Path
import sys
import xml.etree.ElementTree as ET
ns = '{http://schemas.android.com/apk/res/android}'
manifest = ET.parse(Path(sys.argv[1])).getroot()
app = manifest.find('application')
assert app.get(ns + 'usesCleartextTraffic') == 'false'
assert app.get(ns + 'name') == 'org.syllaboss.app.SyllabossApp'
activities = {n.get(ns + 'name'): n for n in app.findall('activity')}
assert 'org.syllaboss.app.MainActivity' in activities
assert not any('google.androidbrowserhelper' in name for name in activities)
print('Native Android entry point and HTTPS-only transport verified.')
