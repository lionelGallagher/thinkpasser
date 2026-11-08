"""Prepare reviewed macOS product plists outside an unchanged source checkout.

These files are build inputs, not a signed bundle. Use only with the thinkpasser
Rust patch and the macOS screencapturekit feature; actual capture needs Mac QA.
"""

from __future__ import annotations

import argparse
import hashlib
import json
from pathlib import Path
import plistlib

from prepare_trim_patch import HERE, read_source
from compiled_profile import macos_plist


PLISTS = (
    "flutter/macos/Runner/Info.plist",
    "flutter/macos/Runner/Release.entitlements",
    "flutter/macos/Runner/DebugProfile.entitlements",
)


def prepare(source: Path) -> dict[str, bytes]:
    lock = json.loads((HERE / "upstream-lock.json").read_text(encoding="utf-8"))
    policy = json.loads((HERE / "capability-policy.json").read_text(encoding="utf-8"))
    outputs: dict[str, bytes] = {}
    for relative in PLISTS:
        text = read_source(source / relative)
        if hashlib.sha256(text.encode("utf-8")).hexdigest() != lock["sourceFiles"][relative]:
            raise ValueError(f"{relative}: source differs from the audited baseline")
        outputs[Path(relative).name] = macos_plist(relative, text, policy)
    return outputs


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--source", type=Path, required=True)
    parser.add_argument("--output-directory", type=Path, required=True)
    args = parser.parse_args()
    source, output = args.source.resolve(), args.output_directory.resolve()
    try:
        output.relative_to(source)
    except ValueError:
        pass
    else:
        parser.error("Product plists must be outside the read-only source directory")
    try:
        outputs = prepare(source)
    except (OSError, ValueError, KeyError, plistlib.InvalidFileException) as error:
        parser.exit(1, f"No product plists written: {error}\n")
    destinations = {name: (output / name).resolve() for name in outputs}
    for destination in destinations.values():
        try:
            destination.relative_to(source)
        except ValueError:
            pass
        else:
            parser.error("A product plist output resolves inside the read-only source directory")
    output.mkdir(parents=True, exist_ok=True)
    for name, contents in outputs.items():
        destinations[name].write_bytes(contents)
    print(f"Prepared {len(outputs)} product plists in {output}; no source or signed bundle modified.")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
