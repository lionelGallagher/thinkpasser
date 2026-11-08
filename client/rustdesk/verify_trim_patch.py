"""Check patch preparation and failure behavior without building native RustDesk."""

from __future__ import annotations

import argparse
import hashlib
import json
from pathlib import Path
import plistlib
import shutil
import subprocess
import sys
import tempfile

import prepare_trim_patch as generator
import prepare_macos_profile as macos_profile
import verify_source_structure
import verify_build_integration


def digest(path: Path) -> str:
    return hashlib.sha256(generator.read_source(path).encode("utf-8")).hexdigest()


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--source", type=Path, required=True)
    parser.add_argument("--report", type=Path)
    args = parser.parse_args()
    source = args.source.resolve()
    lock = json.loads((generator.HERE / "upstream-lock.json").read_text(encoding="utf-8"))
    before = {name: digest(source / name) for name in lock["sourceFiles"]}
    patch = generator.prepare(source)
    committed = generator.HERE / "patches/0001-product-capability-boundary.patch"
    if patch != committed.read_text(encoding="utf-8"):
        raise RuntimeError("The committed patch is stale; regenerate it")

    subprocess.run(["git", "apply", "--check", str(committed)], cwd=source, check=True,
                   capture_output=True, text=True)
    results = [{"check": "pinned-baseline-and-patch-apply-check", "passed": True}]

    # Keep this isolated verification directory for review; do not recursively delete it.
    run = Path(tempfile.mkdtemp(prefix="thinkpasser-rustdesk-verify-"))
    patched = run / "patched-source"
    for name in lock["sourceFiles"]:
        target = patched / name
        target.parent.mkdir(parents=True, exist_ok=True)
        shutil.copyfile(source / name, target)
    subprocess.run(["git", "apply", str(committed)], cwd=patched, check=True,
                   capture_output=True, text=True)
    for name, (_, expected) in generator.build_changes(source).items():
        if generator.read_source(patched / name) != expected:
            raise RuntimeError(f"Applied patch differs from prepared source: {name}")
    results.append({"check": "patch-applied-in-isolated-copy-and-compared", "passed": True})
    results.extend(verify_source_structure.verify(patched))
    results.extend(verify_build_integration.verify(patched, run))

    profiles = macos_profile.prepare(source)
    for relative in macos_profile.PLISTS:
        name = Path(relative).name
        original = plistlib.loads((source / relative).read_bytes())
        actual = plistlib.loads(profiles[name])
        expected = dict(original)
        if name == "Info.plist":
            for key in ("NSCameraUsageDescription", "NSMicrophoneUsageDescription", "CFBundleURLTypes"):
                expected.pop(key, None)
            expected["ThinkpasserProduct"] = True
            policy = json.loads((generator.HERE / "capability-policy.json").read_text(encoding="utf-8"))
            expected["CFBundleURLTypes"] = [{
                "CFBundleTypeRole": "Viewer", "CFBundleURLName": "product.return",
                "CFBundleURLSchemes": [policy["productReturnIntegration"]["scheme"]],
            }]
        else:
            for key in ("com.apple.security.device.camera", "com.apple.security.device.microphone",
                        "com.apple.security.device.audio-input"):
                expected.pop(key, None)
        if actual != expected:
            raise RuntimeError(f"Unrelated product plist keys changed: {name}")
        committed_profile = generator.HERE / "macos-profile" / name
        if profiles[name] != committed_profile.read_bytes():
            raise RuntimeError(f"Committed product plist is stale: {name}")
    results.append({"check": "macos-product-plists-parse-and-preserve-unrelated-keys", "passed": True,
                    "scope": "Unsigned build inputs only; no macOS permission or capture runtime test"})

    invalid = run / "changed-source"
    for name in lock["sourceFiles"]:
        target = invalid / name
        target.parent.mkdir(parents=True, exist_ok=True)
        shutil.copyfile(source / name, target)
    with (invalid / "Cargo.toml").open("a", encoding="utf-8") as handle:
        handle.write("\n# changed baseline\n")
    output = run / "unexpected.patch"
    result = subprocess.run([
        sys.executable, str(generator.HERE / "prepare_trim_patch.py"),
        "--source", str(invalid), "--output", str(output)
    ], capture_output=True, text=True)
    if result.returncode == 0 or output.exists() or "source differs" not in result.stderr:
        raise RuntimeError("A changed upstream baseline was not rejected")
    results.append({"check": "changed-baseline-rejected-without-output", "passed": True})

    target = source / "Cargo.toml"
    result = subprocess.run([
        sys.executable, str(generator.HERE / "prepare_trim_patch.py"),
        "--source", str(source), "--output", str(target)
    ], capture_output=True, text=True)
    if result.returncode == 0 or "read-only source" not in result.stderr:
        raise RuntimeError("An output inside the source tree was not rejected")
    forbidden_profile_output = source / ("profile-output-must-not-exist-" + run.name)
    result = subprocess.run([
        sys.executable, str(generator.HERE / "prepare_macos_profile.py"),
        "--source", str(source), "--output-directory", str(forbidden_profile_output)
    ], capture_output=True, text=True)
    if result.returncode == 0 or forbidden_profile_output.exists() or "read-only source" not in result.stderr:
        raise RuntimeError("Product plist output inside the source tree was not rejected")
    after = {name: digest(source / name) for name in lock["sourceFiles"]}
    if before != after:
        raise RuntimeError("Verification modified the source snapshot")
    results.append({"check": "source-tree-output-rejected-and-source-unchanged", "passed": True,
                    "tools": ["patch-generator", "macos-profile-generator"]})

    report = {
        "scope": "source patch application, static guard review, executed Python build/MSI transforms, Bash syntax and unsigned plist preparation; no native build or remote session",
        "clientVersion": lock["client"],
        "checks": results,
        "nativeRustCompiled": False,
        "nativeFlutterCompiled": False,
        "rustPolicyTestsPreparedButNotExecuted": True,
        "dartProductReturnTestsPreparedButNotExecuted": True,
        "macosRuntimeVerified": False,
        "windowsRuntimeVerified": False,
        "browserRuntimeVerified": False,
        "remainingReleaseGates": "capability-policy.json: unimplementedReleaseGates"
    }
    if args.report:
        args.report.parent.mkdir(parents=True, exist_ok=True)
        args.report.write_text(json.dumps(report, ensure_ascii=False, indent=2) + "\n",
                               encoding="utf-8", newline="\n")
    print(json.dumps(report, ensure_ascii=False, indent=2))
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
