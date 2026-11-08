"""Emit the immutable product profile using audited configuration namespaces."""

import hashlib
import json
import plistlib
import re


LOCAL_KEYS = {
    'allow-auto-record-outgoing', 'hide-recording-button', 'disable-discovery-panel',
    'disable-group-panel', 'printer-incomming-job-action', 'allow-printer-auto-print',
    'enable-check-update',
}
BUILTIN_KEYS = {
    'hide-network-settings', 'hide-server-settings', 'hide-proxy-settings',
    'hide-websocket-settings', 'hide-remote-printer-settings',
    'hide-stop-service', 'hide-elevate-button-in-accept-window',
}
DISPLAY_KEYS = {'privacy_mode', 'terminal-persistent'}
SERVER_KEYS = {
    'access-mode', 'enable-keyboard', 'enable-clipboard', 'enable-file-transfer',
    'enable-audio', 'enable-remote-restart', 'enable-camera', 'enable-terminal',
    'enable-remote-printer', 'enable-tunnel', 'enable-record-session',
    'enable-block-input', 'enable-privacy-mode', 'allow-remote-config-modification',
    'allow-auto-record-incoming', 'enable-lan-discovery', 'direct-server',
    'allow-auto-disconnect', 'allow-insecure-tls-fallback',
    'allow-auto-update',
}


def return_scheme(policy):
    scheme = policy['productReturnIntegration']['scheme']
    if not re.fullmatch(r'[a-z][a-z0-9+.-]{2,40}', scheme) or scheme in {'rustdesk', 'http', 'https', 'file', 'rdp'}:
        raise ValueError('Product returns require a dedicated reviewed URI scheme')
    return scheme


def macos_plist(relative, text, policy):
    product = plistlib.loads(text.encode('utf-8'))
    if relative.endswith('Info.plist'):
        for key in ('NSCameraUsageDescription', 'NSMicrophoneUsageDescription', 'CFBundleURLTypes'):
            product.pop(key, None)
        product['ThinkpasserProduct'] = True
        product['CFBundleURLTypes'] = [{
            'CFBundleTypeRole': 'Viewer', 'CFBundleURLName': 'product.return',
            'CFBundleURLSchemes': [return_scheme(policy)],
        }]
    else:
        for key in ('com.apple.security.device.camera', 'com.apple.security.device.microphone',
                    'com.apple.security.device.audio-input'):
            product.pop(key, None)
    return plistlib.dumps(product, fmt=plistlib.FMT_XML, sort_keys=False)


def emit(policy: dict) -> str:
    entries = policy['upstreamSettingCandidates']['override-settings']
    namespaces = [
        ('OVERWRITE_SETTINGS', SERVER_KEYS), ('OVERWRITE_LOCAL_SETTINGS', LOCAL_KEYS),
        ('OVERWRITE_DISPLAY_SETTINGS', DISPLAY_KEYS), ('BUILTIN_SETTINGS', BUILTIN_KEYS),
    ]
    if set(entries) - set.union(SERVER_KEYS, LOCAL_KEYS, DISPLAY_KEYS, BUILTIN_KEYS):
        raise ValueError('Unreviewed product settings namespace; update the source audit')
    fingerprint = hashlib.sha256(json.dumps(policy, sort_keys=True, separators=(',', ':')).encode()).hexdigest()
    code = ['const _: () = {']
    for environment in ('THINKPASSER_RENDEZVOUS_SERVER', 'THINKPASSER_RELAY_SERVER', 'THINKPASSER_SERVER_KEY'):
        code.append(f'    assert!(!env!("{environment}").is_empty(), "Empty product deployment input: {environment}");')
    code.extend(['};', '', 'pub fn initialize_profile() -> bool {', '    use hbb_common::config;'])
    for name, keys in namespaces:
        values = [(key, value) for key, value in entries.items() if key in keys]
        if not values:
            continue
        code.append('    {')
        code.append(f'        let mut settings = config::{name}.write().unwrap();')
        for key, value in values:
            if not isinstance(value, str) or any(ord(c) < 32 for c in value):
                raise ValueError('Product setting values must be plain strings without control characters')
            code.append(f'        settings.insert({json.dumps(key)}.to_owned(), {json.dumps(value, ensure_ascii=False)}.to_owned());')
        if name == 'OVERWRITE_SETTINGS':
            for key, environment in (
                ('custom-rendezvous-server', 'THINKPASSER_RENDEZVOUS_SERVER'),
                ('relay-server', 'THINKPASSER_RELAY_SERVER'), ('key', 'THINKPASSER_SERVER_KEY'),
            ):
                code.append(f'        settings.insert("{key}".to_owned(), env!("{environment}").to_owned());')
        code.append('    }')
    scheme = return_scheme(policy)
    code.extend(['    true', '}', '',
                 f'pub fn return_scheme() -> &\'static str {{ "{scheme}" }}', '',
                 'pub fn build_profile_json() -> String {',
                 '    serde_json::json!({', '        "product": "thinkpasser",',
                 f'        "policySha256": "{fingerprint}",',
                 '        "businessConnectionGrantEnforced": false,',
                 '        "publicConnectionLaunches": false,',
                 '        "camera": false, "microphone": false, "printer": false,',
                 '        "recording": false, "terminalProtocol": false, "tcpTunnel": false',
                 '    }).to_string()', '}'])
    return '\n'.join(code)
