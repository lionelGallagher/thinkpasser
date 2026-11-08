"""Pinned changes for packaging, remaining native controls and reverse traffic."""

import hashlib
import json
from pathlib import Path
from compiled_profile import macos_plist, return_scheme


HERE = Path(__file__).resolve().parent


def extend_distribution(changed):
    policy = json.loads((HERE / 'capability-policy.json').read_text(encoding='utf-8'))
    digest = hashlib.sha256(json.dumps(policy, sort_keys=True, separators=(',', ':')).encode()).hexdigest()
    scheme = return_scheme(policy)

    def edit(path, before, after, count=1):
        if changed[path].count(before) != count:
            raise ValueError(f'{path}: distribution source anchor differs: {before[:65]!r}')
        changed[path] = changed[path].replace(before, after)

    # The genuine controller I/O path also receives Printer jobs from the host.
    io = 'src/client/io_loop.rs'
    edit(io, '        if let Ok(msg_in) = Message::parse_from_bytes(&data) {\n',
         '        if let Ok(msg_in) = Message::parse_from_bytes(&data) {\n'
         '            #[cfg(feature = "thinkpasser")]\n'
         '            if !crate::product_policy::accepts_host_message(&msg_in) { return true; }\n')
    edit(io, '            Data::Message(msg) => {\n',
         '            Data::Message(msg) => {\n'
         '                #[cfg(feature = "thinkpasser")]\n'
         '                if !crate::product_policy::accepts_controller_message(&msg) { return true; }\n')
    edit(io, '            Data::SendFiles((id, r#type, path, to, file_num, include_hidden, is_remote)) => {\n',
         '            Data::SendFiles((id, r#type, path, to, file_num, include_hidden, is_remote)) => {\n'
         '                #[cfg(feature = "thinkpasser")]\n'
         '                if matches!(r#type, fs::JobType::Printer) { return true; }\n')
    edit(io, '            Data::NewVoiceCall => {\n',
         '            Data::NewVoiceCall => {\n'
         '                #[cfg(feature = "thinkpasser")]\n'
         '                if !crate::product_policy::allows_voice_call() { return true; }\n')
    edit(io, '    fn start_voice_call(&mut self) -> Option<std::sync::mpsc::Sender<()>> {\n',
         '    fn start_voice_call(&mut self) -> Option<std::sync::mpsc::Sender<()>> {\n'
         '        #[cfg(feature = "thinkpasser")]\n'
         '        if !crate::product_policy::allows_voice_call() { return None; }\n')
    edit(io, '    async fn send_toggle_privacy_mode_msg(&self, peer: &mut Stream) {\n',
         '    async fn send_toggle_privacy_mode_msg(&self, peer: &mut Stream) {\n'
         '        #[cfg(feature = "thinkpasser")]\n'
         '        if !crate::product_policy::allows_privacy_mode() { return; }\n')
    edit('src/ui_session_interface.rs', '    pub fn printer_response(&self, id: i32, path: String, printer_name: String) {\n',
         '    pub fn printer_response(&self, id: i32, path: String, printer_name: String) {\n'
         '        #[cfg(feature = "thinkpasser")]\n'
         '        if !crate::product_policy::allows_printer() { return; }\n')
    edit('src/flutter_ffi.rs', 'pub fn main_set_common(_key: String, _value: String) {\n',
         'pub fn main_set_common(_key: String, _value: String) {\n'
         '    #[cfg(feature = "thinkpasser")]\n'
         '    if _key == "install-printer" && !crate::product_policy::allows_printer() { return; }\n')
    edit('src/common.rs', 'pub fn load_custom_client() {\n',
         'pub fn load_custom_client() {\n'
         '    #[cfg(feature = "thinkpasser")]\n'
         '    if crate::product_policy::initialize_profile() { return; }\n')
    edit('src/core_main.rs', '    #[cfg(feature = "thinkpasser")]\n    if args.iter().any(',
         '    #[cfg(feature = "thinkpasser")]\n'
         '    if args.len() == 1 && args[0] == "--product-policy" {\n'
         '        println!("{}", crate::product_policy::build_profile_json());\n        return None;\n    }\n'
         '    #[cfg(feature = "thinkpasser")]\n'
         '    if args.len() == 1 && args[0].starts_with(&format!("{}://", crate::product_policy::return_scheme())) {\n'
         '        return core_main_invoke_product_return(args[0].clone());\n    }\n'
         '    #[cfg(feature = "thinkpasser")]\n    if args.iter().any(')
    helper = '''#[cfg(feature = "thinkpasser")]
fn core_main_invoke_product_return(url: String) -> Option<CoreMainAction> {
    #[cfg(windows)]
    {
        use winapi::um::winuser::WM_USER;
        let sent = crate::platform::send_message_to_hnwd(
            &crate::platform::FLUTTER_RUNNER_WIN32_WINDOW_CLASS,
            &crate::get_app_name(), (WM_USER + 2) as _, &url, false);
        return if sent { None } else { Some(CoreMainAction::StartUi(Vec::new())) };
    }
    #[cfg(target_os = "macos")]
    {
        return if crate::ipc::send_url_scheme(url).is_ok() { None }
        else { Some(CoreMainAction::StartUi(Vec::new())) };
    }
}

'''
    edit('src/core_main.rs', 'fn import_config(path: &str) {\n', helper + 'fn import_config(path: &str) {\n')
    edit('src/ui_interface.rs', 'pub fn get_builtin_option(key: &str) -> String {\n',
         'pub fn get_builtin_option(key: &str) -> String {\n'
         '    #[cfg(feature = "thinkpasser")]\n'
         '    if key == "thinkpasser-return-scheme" { return crate::product_policy::return_scheme().to_owned(); }\n')

    windows = 'src/platform/windows.rs'
    edit(windows, "pub fn get_silent_install_options(printer_override: Option<bool>) -> &'static str {\n",
         "pub fn get_silent_install_options(printer_override: Option<bool>) -> &'static str {\n"
         '    if cfg!(feature = "thinkpasser") { return "desktopicon startmenu"; }\n')
    edit(windows, '    let install_printer = options.contains("printer") && is_win_10_or_greater();',
         '    let install_printer = !cfg!(feature = "thinkpasser") && options.contains("printer") && is_win_10_or_greater();')
    edit(windows, '            format!("\\\"{}\\\" --install-remote-printer", &src_exe),',
         '            if cfg!(feature = "thinkpasser") { String::new() }\n'
         '            else { format!("\\\"{}\\\" --install-remote-printer", &src_exe) },')
    # Move only the old launch/URI commands into the non-product branch. Keep
    # install-state metadata, service startup and firewall rules unchanged.
    text = changed[windows]
    a = text.index('    reg add HKEY_CLASSES_ROOT\\\\.{ext}\\\\shell /f\n')
    b = text.index('    netsh advfirewall firewall add rule', a)
    legacy = text[a:b]
    # Reuse the exact Rust string escaping of the audited registration block.
    product_registration = legacy[legacy.index('    reg add HKEY_CLASSES_ROOT\\\\{ext} /f\n'):].replace('{ext}', scheme)
    edit(windows, legacy, '    {connection_entry_registration}\n')
    insert = ('    let connection_entry_registration = if cfg!(feature = "thinkpasser") {\n'
              '        format!("' + product_registration + '")\n'
              '    } else { format!("' + legacy + '") };\n\n')
    edit(windows, '    let reg_printer = reg_value_printer\n', insert + '    let reg_printer = reg_value_printer\n')

    home = 'flutter/lib/desktop/pages/desktop_home_page.dart'
    edit(home, '        buildLeftPane(context),\n        if (!isIncomingOnly) const VerticalDivider(width: 1),',
         '        if (!isThinkpasserProduct) buildLeftPane(context),\n'
         '        if (!isThinkpasserProduct && !isIncomingOnly) const VerticalDivider(width: 1),')
    install = 'flutter/lib/desktop/pages/install_page.dart'
    edit(install, "              Option(printer, label: 'Install {$appName} Printer'),",
         "              if (!isThinkpasserProduct) Option(printer, label: 'Install {$appName} Printer'),")
    edit(install, "      if (printer.value) args += ' printer';",
         "      if (!isThinkpasserProduct && printer.value) args += ' printer';")
    cm = 'flutter/lib/desktop/pages/server_page.dart'
    edit(cm, '            offstage: !client.authorized ||\n',
         '            offstage: (isThinkpasserProduct && client.type_() != ClientType.file) || !client.authorized ||\n')
    edit(cm, '    if (clientType == ClientType.file) {\n',
         '    if (isThinkpasserProduct && clientType != ClientType.file) return const SizedBox.shrink();\n'
         '    if (clientType == ClientType.file) {\n')
    edit(cm, '                      buildPermissionIcon(\n                        client.recording,',
         '                      if (!isThinkpasserProduct) buildPermissionIcon(\n                        client.recording,', 2)
    edit(cm, '                      if (isWindows)\n                        buildPermissionIcon(',
         '                      if (!isThinkpasserProduct && isWindows)\n                        buildPermissionIcon(')
    edit(cm, "                      if (bind.mainSupportedPrivacyModeImpls() != '[]')",
         "                      if (!isThinkpasserProduct && bind.mainSupportedPrivacyModeImpls() != '[]')")
    for before in ('offstage: !client.inVoiceCall,', 'offstage: !client.incomingVoiceCall,', 'offstage: !client.fromSwitch,'):
        edit(cm, before, before.replace('offstage: ', 'offstage: isThinkpasserProduct || '))

    common = 'flutter/lib/common.dart'
    edit(common, "import 'dart:math';\n", "import 'dart:math';\nimport 'product/return_router.dart';\n")
    getter = '''ProductReturnRouter? _productReturnRouter;
ProductReturnRouter get productReturnRouter => _productReturnRouter ??=
    ProductReturnRouter(scheme: bind.mainGetBuildinOption(key: 'thinkpasser-return-scheme'));

'''
    edit(common, 'final globalKey = GlobalKey<NavigatorState>();\n', getter + 'final globalKey = GlobalKey<NavigatorState>();\n')
    edit(common, '  if (isThinkpasserProduct) return false;\n  List<String>? args;',
         '''  if (isThinkpasserProduct) {
    final candidate = uri ?? Uri.tryParse(uriString ??
        (cmdArgs != null && cmdArgs.length == 1 ? cmdArgs.single : ''));
    if (candidate == null || candidate.scheme != productReturnRouter.scheme) return false;
    unawaited(productReturnRouter.dispatch(candidate).catchError((Object _) {
      debugPrint('Platform return exchange failed');
      return false;
    }));
    return true;
  }
  List<String>? args;''')
    edit(common, '    print("initialLink: $initialLink");',
         '    if (!isThinkpasserProduct) print("initialLink: $initialLink");')
    edit(common, '    debugPrint("A uri was received: $uri. handleByFlutter $handleByFlutter");',
         '    if (!isThinkpasserProduct) debugPrint("A uri was received: $uri. handleByFlutter $handleByFlutter");')

    build = 'build.py'
    edit(build, '    parser = argparse.ArgumentParser(description=\'Build script.\')\n',
         '    parser = argparse.ArgumentParser(description=\'Build script.\')\n'
         '    parser.add_argument("--thinkpasser", action="store_true", help="Build the dedicated product policy")\n')
    edit(build, "    features = ['inline'] if not args.flutter else []\n",
         "    features = ['inline'] if not args.flutter else []\n"
         '    if args.thinkpasser:\n'
         '        if not args.flutter or not (windows or osx):\n'
         '            raise ValueError("The product requires Flutter on Windows or macOS")\n'
         '        features.append("thinkpasser")\n')
    edit(build, '        if args.screencapturekit:\n', '        if args.screencapturekit or args.thinkpasser:\n')
    edit(build, '    if os.path.exists(exe_path):\n',
         '    if args.thinkpasser:\n'
         '        get_features(args)\n'
         '        from res.thinkpasser.build_profile import validate_environment\n'
         '        validate_environment(args)\n\n'
         '    if os.path.exists(exe_path):\n')
    edit(build, "    mac_arch = 'arm64' if platform.machine().lower() in ('arm64', 'aarch64') else 'x86_64'\n",
         "    mac_arch = 'arm64' if platform.machine().lower() in ('arm64', 'aarch64') else 'x86_64'\n"
         '    product_xcode = ""\n'
         '    if "thinkpasser" in features.split(","):\n'
         '        from res.thinkpasser.build_profile import macos_xcode_settings\n'
         '        product_xcode = macos_xcode_settings(REPO_ROOT)\n')
    edit(build, "f'FLUTTER_XCODE_ARCHS={mac_arch} FLUTTER_XCODE_ONLY_ACTIVE_ARCH=YES flutter build macos --release'",
         "f'{product_xcode} FLUTTER_XCODE_ARCHS={mac_arch} FLUTTER_XCODE_ONLY_ACTIVE_ARCH=YES flutter build macos --release'")
    edit(build, '    if skip_portable_pack:\n',
         '    if "thinkpasser" in features.split(","):\n'
         '        from res.thinkpasser.build_profile import assert_bundle_no_printer\n'
         '        assert_bundle_no_printer(flutter_build_dir_2)\n'
         '    if skip_portable_pack:\n')

    preprocess = 'res/msi/preprocess.py'
    edit(preprocess, '    parser = argparse.ArgumentParser(description="Msi preprocess script.")\n',
         '    parser = argparse.ArgumentParser(description="Msi preprocess script.")\n'
         '    parser.add_argument("--thinkpasser", action="store_true", help="Prepare a verified product payload")\n')
    edit(preprocess, '    if not prepare_resources():\n',
         '    if args.thinkpasser:\n'
         '        sys.path.insert(0, str(Path(__file__).resolve().parent.parent / "thinkpasser"))\n'
         '        from msi_profile import prepare as prepare_product_msi\n'
         '        prepare_product_msi(Path(__file__).resolve().parent, dist_dir, app_name)\n\n'
         '    if not prepare_resources():\n')

    signer = '.github/scripts/sign-macos-app.sh'
    edit(signer, 'sign_args=(--force --options runtime --sign "$identity")\n',
         '''product=$(/usr/libexec/PlistBuddy -c 'Print :ThinkpasserProduct' "$app_path/Contents/Info.plist" 2>/dev/null || true)
if [[ "$product" == "true" ]]; then
  for key in NSCameraUsageDescription NSMicrophoneUsageDescription; do
    if plutil -extract "$key" raw "$app_path/Contents/Info.plist" >/dev/null 2>&1; then
      echo "Excluded device usage description in product bundle: $key" >&2
      exit 1
    fi
  done
  for key in 'com\\.apple\\.security\\.device\\.audio-input' 'com\\.apple\\.security\\.device\\.camera'; do
    if plutil -extract "$key" raw "$entitlements" >/dev/null 2>&1; then
      echo "Excluded product device entitlement: $key" >&2
      exit 1
    fi
  done
fi

sign_args=(--force --options runtime --sign "$identity")
''')
    old = '''audio_input=$(plutil -extract 'com\\.apple\\.security\\.device\\.audio-input' raw - \\
  <<<"$actual_entitlements")
if [[ "$audio_input" != "true" ]]; then
  echo "Missing com.apple.security.device.audio-input entitlement" >&2
  exit 1
fi'''
    new = '''if [[ "$product" == "true" ]]; then
  if plutil -extract 'com\\.apple\\.security\\.device\\.audio-input' raw - <<<"$actual_entitlements" >/dev/null 2>&1; then
    echo "Unexpected product microphone entitlement after signing" >&2
    exit 1
  fi
else
''' + '\n'.join('  ' + line for line in old.splitlines()) + '\nfi'
    edit(signer, old, new)

    added = {}
    for source, target in (
        ('build_profile.py.in', 'res/thinkpasser/build_profile.py'),
        ('msi_profile.py.in', 'res/thinkpasser/msi_profile.py'),
        ('product_return_router.dart.in', 'flutter/lib/product/return_router.dart'),
        ('product_return_router_test.dart.in', 'flutter/test/product_return_router_test.dart'),
    ):
        added[target] = (HERE / source).read_text(encoding='utf-8').replace('@POLICY_DIGEST@', digest).replace('@RETURN_SCHEME@', scheme)
    for name in ('Info.plist', 'Release.entitlements', 'DebugProfile.entitlements'):
        relative = 'flutter/macos/Runner/' + name
        added['res/thinkpasser/macos-profile/' + name] = macos_plist(relative, changed[relative], policy).decode('utf-8')
    return added
