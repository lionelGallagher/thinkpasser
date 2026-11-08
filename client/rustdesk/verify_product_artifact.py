"""Check a local native artifact's compiled policy identity and excluded assets.

Does not exercise remote-desktop functionality, sign, notarize or publish.
"""

import argparse
import hashlib
import json
from pathlib import Path
import plistlib
import subprocess


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--bundle', type=Path, required=True)
    parser.add_argument('--executable', type=Path, required=True)
    parser.add_argument('--platform', choices=['windows', 'macos'], required=True)
    args = parser.parse_args()
    policy = json.loads((Path(__file__).parent / 'capability-policy.json').read_text(encoding='utf-8'))
    expected = hashlib.sha256(json.dumps(policy, sort_keys=True, separators=(',', ':')).encode()).hexdigest()
    result = subprocess.run([str(args.executable.resolve()), '--product-policy'],
                            capture_output=True, text=True, check=True, timeout=30)
    actual = json.loads(result.stdout.strip())
    if actual.get('product') != 'thinkpasser' or actual.get('policySha256') != expected:
        raise ValueError('Executable does not report this exact compiled product policy')
    for path in args.bundle.rglob('*'):
        parts = [part.lower() for part in path.relative_to(args.bundle).parts]
        if 'rustdeskprinterdriver' in parts or path.name.lower() == 'printer_driver_adapter.dll':
            raise ValueError('Excluded printer payload in artifact: ' + str(path.relative_to(args.bundle)))
    if args.platform == 'macos':
        info = plistlib.loads((args.bundle / 'Contents/Info.plist').read_bytes())
        if info.get('ThinkpasserProduct') is not True:
            raise ValueError('Product Info.plist was not used by the macOS build')
        if any(key in info for key in ('NSCameraUsageDescription', 'NSMicrophoneUsageDescription')):
            raise ValueError('Excluded capture-device usage description in artifact')
        schemes = [scheme for item in info.get('CFBundleURLTypes', []) for scheme in item.get('CFBundleURLSchemes', [])]
        if schemes != [policy['productReturnIntegration']['scheme']]:
            raise ValueError('Artifact registers an unexpected URL scheme')
    print(json.dumps({
        'compiledPolicyIdentityMatched': True,
        'excludedPrinterAssetsAbsent': True,
        'nativeRemoteBehaviorExercised': False,
        'businessConnectionGrantEnforced': actual.get('businessConnectionGrantEnforced', False),
        'releaseApproved': False,
    }, indent=2))


if __name__ == '__main__':
    main()
