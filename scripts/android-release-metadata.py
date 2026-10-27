"""Create public release metadata from an APK and its public signing certificate."""
import hashlib
import json
import sys
from pathlib import Path

release = Path(sys.argv[1])
certificate_hash = hashlib.sha256((release / "signing-certificate.der").read_bytes()).hexdigest().upper()
fingerprint = ":".join(certificate_hash[i:i + 2] for i in range(0, len(certificate_hash), 2))
assetlinks = [{"relation": ["delegate_permission/common.handle_all_urls"], "target": {
    "namespace": "android_app", "package_name": "org.syllaboss.app", "sha256_cert_fingerprints": [fingerprint]
}}]
(release / "assetlinks.json").write_text(json.dumps(assetlinks, indent=2) + "\n")
apk = (release / "syllaboss.apk").read_bytes()
(release / "release.json").write_text(json.dumps({
    "version": "1.0.0", "versionCode": 1, "package": "org.syllaboss.app", "minimumAndroid": "7.0",
    "bytes": len(apk), "sha256": hashlib.sha256(apk).hexdigest(), "certificateSha256": fingerprint,
    "downloadUrl": "/downloads/syllaboss.apk", "requiresInternet": True
}, indent=2) + "\n")
