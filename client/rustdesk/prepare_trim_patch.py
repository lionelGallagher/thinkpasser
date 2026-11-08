"""Prepare an opt-in capability patch against the audited RustDesk source files.

The source checkout is read only. This tool writes a patch, never applies it.
The patch is a first hard-limit layer, not a complete branded native product.
"""

from __future__ import annotations

import argparse
import difflib
import hashlib
import json
from pathlib import Path

from entry_trim import extend_changes
from distribution_trim import extend_distribution
from compiled_profile import emit as emit_compiled_profile


HERE = Path(__file__).resolve().parent
ALLOWED_OPTIONS = {
    "enable-keyboard", "enable-clipboard", "enable-file-transfer",
    "enable-audio", "enable-remote-restart",
}


def read_source(path: Path) -> str:
    return path.read_text(encoding="utf-8").replace("\r\n", "\n").rstrip("\n") + "\n"


def replace_once(text: str, before: str, after: str, label: str) -> str:
    count = text.count(before)
    if count != 1:
        raise ValueError(f"{label}: expected one source anchor, found {count}")
    return text.replace(before, after, 1)


def build_changes(source: Path) -> dict[str, tuple[str, str]]:
    lock = json.loads((HERE / "upstream-lock.json").read_text(encoding="utf-8"))
    policy = json.loads((HERE / "capability-policy.json").read_text(encoding="utf-8"))
    if policy["upstreamClient"]["commit"] != lock["client"]["commit"]:
        raise ValueError("Policy and source lock refer to different upstream versions")
    if policy["permissions"]["unknown"] != "deny":
        raise ValueError("Unknown permission options must be denied")
    allowed = policy["permissions"]["allow"]
    if not allowed or len(set(allowed)) != len(allowed) or not set(allowed) <= ALLOWED_OPTIONS:
        raise ValueError("The permission allowlist contains unsupported product capabilities")
    if policy["upstreamSettingCandidates"]["override-settings"]["access-mode"] != "custom":
        raise ValueError("The product profile must use custom access mode")
    originals: dict[str, str] = {}
    for name, expected in lock["sourceFiles"].items():
        text = read_source(source / name)
        actual = hashlib.sha256(text.encode("utf-8")).hexdigest()
        if actual != expected:
            raise ValueError(f"{name}: source differs from the audited baseline; re-audit before patching")
        originals[name] = text

    changed = dict(originals)
    changed["Cargo.toml"] = replace_once(
        changed["Cargo.toml"], "[features]\n", "[features]\nthinkpasser = []\n", "Cargo feature"
    )
    changed["src/lib.rs"] = replace_once(
        changed["src/lib.rs"], "mod trusted_devices;\n",
        'mod trusted_devices;\n#[cfg(feature = "thinkpasser")]\nmod product_policy;\n', "policy module"
    )
    name = "src/server/connection.rs"
    changed[name] = replace_once(
        changed[name],
        "    ) -> bool {\n        use hbb_common::rendezvous_proto::control_permissions::Permission;",
        '    ) -> bool {\n        #[cfg(feature = "thinkpasser")]\n'
        '        if !crate::product_policy::allows_permission(enable_prefix_option) {\n'
        '            return false;\n        }\n'
        "        use hbb_common::rendezvous_proto::control_permissions::Permission;",
        "host permission boundary",
    )
    changed[name] = replace_once(
        changed[name],
        "        if self.authorized {\n            if matches!(msg.union.as_ref(), Some(message::Union::LoginRequest(_))) {",
        '        if self.authorized {\n            #[cfg(feature = "thinkpasser")]\n'
        '            if !crate::product_policy::accepts_controller_message(&msg) {\n'
        '                log::debug!("Ignored feature disabled by product policy");\n'
        '                return true;\n            }\n'
        "            if matches!(msg.union.as_ref(), Some(message::Union::LoginRequest(_))) {",
        "host message boundary",
    )
    changed[name] = replace_once(
        changed[name], "                        ipc::Data::SwitchPermission{name, enabled} => {\n",
        '                        ipc::Data::SwitchPermission{name, enabled} => {\n'
        '                            #[cfg(feature = "thinkpasser")]\n'
        '                            if enabled && !crate::product_policy::allows_permission_change(&name) {\n'
        '                                continue;\n                            }\n',
        "connection-manager permission boundary",
    )
    changed[name] = replace_once(
        changed[name], "                        ipc::Data::ChatMessage{text} => {\n",
        '                        ipc::Data::ChatMessage{text} => {\n'
        '                            #[cfg(feature = "thinkpasser")]\n'
        '                            if !crate::product_policy::allows_chat() {\n'
        '                                continue;\n                            }\n',
        "connection-manager chat boundary",
    )
    name = "src/ui_session_interface.rs"
    for anchor, guard, label in (
        ("    pub fn record_screen(&self, start: bool) {\n",
         '        if start && !crate::product_policy::allows_recording() {\n            return;\n        }\n',
         "outgoing recorder"),
        ("    pub fn send_chat(&self, text: String) {\n",
         '        if !crate::product_policy::allows_chat() {\n            return;\n        }\n',
         "outgoing chat"),
        ("    pub fn request_voice_call(&self) {\n",
         '        if !crate::product_policy::allows_voice_call() {\n            return;\n        }\n',
         "outgoing microphone call"),
    ):
        changed[name] = replace_once(
            changed[name], anchor, anchor + '        #[cfg(feature = "thinkpasser")]\n' + guard, label
        )

    extend_changes(changed)
    added_distribution = extend_distribution(changed)

    if not allowed or any(not isinstance(value, str) or '"' in value or "\n" in value for value in allowed):
        raise ValueError("Invalid allowed permission options")
    module = (HERE / "product_policy.rs.in").read_text(encoding="utf-8").replace(
        "@ALLOWED_PERMISSION_OPTIONS@", "\n".join(f'    "{value}",' for value in allowed)
    ).replace("@COMPILED_PROFILE@", emit_compiled_profile(policy))
    changes = {name: (originals[name], text) for name, text in changed.items() if text != originals[name]}
    module += (HERE / "product_policy_tests.rs.in").read_text(encoding="utf-8")
    changes["src/product_policy.rs"] = ("", module.rstrip("\n") + "\n")
    changes.update({name: ("", text) for name, text in added_distribution.items()})
    return changes


def prepare(source: Path) -> str:
    chunks: list[str] = []
    for name, (before, after) in build_changes(source).items():
        chunks.append(f"diff --git a/{name} b/{name}\n")
        if not before:
            chunks.append("new file mode 100644\n")
        chunks.extend(difflib.unified_diff(
            before.splitlines(keepends=True), after.splitlines(keepends=True),
            fromfile=f"a/{name}" if before else "/dev/null", tofile=f"b/{name}", n=3
        ))
    return "".join(chunks)


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--source", type=Path, required=True, help="RustDesk 1.5.1 source directory")
    parser.add_argument("--output", type=Path, required=True, help="Output patch path")
    args = parser.parse_args()
    source = args.source.resolve()
    output = args.output.resolve()
    try:
        output.relative_to(source)
    except ValueError:
        pass
    else:
        parser.error("The patch output must be outside the read-only source directory")
    try:
        patch = prepare(source)
    except (OSError, ValueError, KeyError) as error:
        parser.exit(1, f"No patch written: {error}\n")
    args.output.parent.mkdir(parents=True, exist_ok=True)
    args.output.write_text(patch, encoding="utf-8", newline="\n")
    print(f"Prepared {args.output}; the source directory was not modified.")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
