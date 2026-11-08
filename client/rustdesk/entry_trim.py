"""Anchored entry/capture changes for the pinned opt-in native product patch."""

from __future__ import annotations


def extend_changes(changed: dict[str, str]) -> None:
    def edit(path: str, before: str, after: str, count: int = 1) -> None:
        found = changed[path].count(before)
        if found != count:
            raise ValueError(f"{path}: expected {count} entry anchors, found {found}: {before[:65]!r}")
        changed[path] = changed[path].replace(before, after)

    # Reuse the existing synchronous bridge API. Dart cannot independently turn
    # this on/off with a dart-define or a mutable settings entry.
    edit("src/ui_interface.rs", "pub fn get_builtin_option(key: &str) -> String {\n",
         'pub fn get_builtin_option(key: &str) -> String {\n'
         '    if key == "thinkpasser-product" {\n'
         '        return if cfg!(feature = "thinkpasser") { "Y" } else { "N" }.to_owned();\n'
         '    }\n')
    edit("src/core_main.rs", '    #[cfg(any(target_os = "linux", target_os = "windows"))]\n    if args.is_empty() {',
         '    #[cfg(feature = "thinkpasser")]\n'
         '    if args.iter().any(|arg| crate::product_policy::blocks_cli_argument(arg)\n'
         '        || arg.starts_with(&crate::get_uri_prefix())) {\n'
         '        eprintln!("This connection entry is disabled in this product");\n'
         '        return None;\n    }\n'
         '    #[cfg(any(target_os = "linux", target_os = "windows"))]\n    if args.is_empty() {')

    edit("src/server/connection.rs",
         '    pub fn is_permission_enabled_locally(enable_prefix_option: &str) -> bool {\n',
         '    pub fn is_permission_enabled_locally(enable_prefix_option: &str) -> bool {\n'
         '        #[cfg(feature = "thinkpasser")]\n'
         '        if !crate::product_policy::allows_permission(enable_prefix_option) {\n'
         '            return false;\n        }\n')
    edit("src/server/connection.rs", '        if self.authorized {\n            #[cfg(feature = "thinkpasser")]\n',
         '        #[cfg(feature = "thinkpasser")]\n'
         '        if let Some(message::Union::LoginRequest(login)) = msg.union.as_ref() {\n'
         '            if !crate::product_policy::accepts_login(login) {\n'
         '                self.send_login_error("Feature disabled by product policy").await;\n'
         '                return false;\n            }\n        }\n'
         '        if self.authorized {\n            #[cfg(feature = "thinkpasser")]\n')
    edit("src/server/connection.rs", '                        ipc::Data::VoiceCallResponse(accepted) => {\n',
         '                        ipc::Data::VoiceCallResponse(accepted) => {\n'
         '                            #[cfg(feature = "thinkpasser")]\n'
         '                            if accepted && !crate::product_policy::allows_voice_call() {\n'
         '                                continue;\n                            }\n')
    edit("src/server/connection.rs", '                        ipc::Data::SwitchSidesBack => {\n',
         '                        ipc::Data::SwitchSidesBack => {\n'
         '                            #[cfg(feature = "thinkpasser")]\n'
         '                            if !crate::product_policy::allows_switch_sides() { continue; }\n')

    # Check below the generated FFI wrapper, before a forbidden session can be
    # inserted. Prevents a direct bridge caller bypassing Dart menus/windows.
    edit("src/flutter.rs", ') -> ResultType<FlutterSession> {\n    let conn_type = if is_file_transfer {',
         ') -> ResultType<FlutterSession> {\n'
         '    #[cfg(feature = "thinkpasser")]\n'
         '    if is_view_camera || is_port_forward || is_rdp || is_terminal || !switch_uuid.is_empty() {\n'
         '        bail!("Feature disabled by product policy");\n    }\n'
         '    let conn_type = if is_file_transfer {')
    edit("src/flutter.rs", ') -> ResultType<()> {\n    let conn_type = if is_view_camera {',
         ') -> ResultType<()> {\n'
         '    #[cfg(feature = "thinkpasser")]\n'
         '    if is_view_camera {\n        bail!("Feature disabled by product policy");\n    }\n'
         '    let conn_type = if is_view_camera {')

    # UI buttons are not the recording boundary: auto-record also calls here.
    edit("src/client.rs", '    pub fn record_screen(&mut self, start: bool, id: String, display_idx: usize, camera: bool) {\n',
         '    pub fn record_screen(&mut self, start: bool, id: String, display_idx: usize, camera: bool) {\n'
         '        #[cfg(feature = "thinkpasser")]\n'
         '        if start && !crate::product_policy::allows_recording() { return; }\n')
    edit("src/server/video_service.rs", ') -> Arc<Mutex<Option<Recorder>>> {\n',
         ') -> Arc<Mutex<Option<Recorder>>> {\n'
         '    #[cfg(feature = "thinkpasser")]\n'
         '    if !crate::product_policy::allows_recording() { return Default::default(); }\n')

    # Both retained desktop platforms capture system output, never an input
    # device chosen via audio-input or voice-call state. No failure fallback.
    audio = "src/server/audio_service.rs"
    before = ('        let audio_input = super::get_audio_input();\n'
              '        if !audio_input.is_empty() {\n'
              '            return get_audio_input(&audio_input);\n        }\n')
    after = ('        #[cfg(not(feature = "thinkpasser"))]\n        {\n'
             + ''.join('    ' + line for line in before.splitlines(keepends=True)) + '        }\n')
    edit(audio, before, after, 2)
    edit(audio, '        if !is_screen_capture_kit_available() {\n            return get_audio_input("");\n        }',
         '        if !is_screen_capture_kit_available() {\n'
         '            #[cfg(feature = "thinkpasser")]\n'
         '            return Err(anyhow!("System audio capture is unavailable; microphone fallback is disabled"));\n'
         '            #[cfg(not(feature = "thinkpasser"))]\n'
         '            return get_audio_input("");\n        }')
    # Mac product builds without screencapturekit fail closed for audio only;
    # video/input continue. Do not add a Mac-only feature to Windows builds.
    edit(audio, '    #[cfg(not(any(windows, feature = "screencapturekit")))]\n',
         '    #[cfg(all(feature = "thinkpasser", target_os = "macos", not(feature = "screencapturekit")))]\n'
         '    fn get_device() -> ResultType<(Device, SupportedStreamConfig)> {\n'
         '        Err(anyhow!("Product system audio requires screencapturekit"))\n    }\n\n'
         '    #[cfg(all(not(any(windows, feature = "screencapturekit")),\n'
         '        not(all(feature = "thinkpasser", target_os = "macos"))))]\n')

    common = "flutter/lib/common.dart"
    edit(common, 'final globalKey = GlobalKey<NavigatorState>();\n',
         "// Reserved compiled marker, supplied by the Rust product feature.\n"
         "bool get isThinkpasserProduct =>\n"
         "    bind.mainGetBuildinOption(key: 'thinkpasser-product') == 'Y';\n\n"
         'final globalKey = GlobalKey<NavigatorState>();\n')
    edit(common, 'bool handleUriLink({List<String>? cmdArgs, Uri? uri, String? uriString}) {\n',
         'bool handleUriLink({List<String>? cmdArgs, Uri? uri, String? uriString}) {\n'
         '  if (isThinkpasserProduct) return false;\n')
    edit(common, 'List<String>? urlLinkToCmdArgs(Uri uri) {\n',
         'List<String>? urlLinkToCmdArgs(Uri uri) {\n'
         '  if (isThinkpasserProduct) return null;\n')
    edit(common, '    bool? isSharedPassword}) async {\n  if (isFileTransfer) {',
         '    bool? isSharedPassword}) async {\n'
         '  if (isThinkpasserProduct &&\n'
         '      (isViewCamera || isTerminal || isTcpTunneling || isRDP)) return;\n'
         '  if (isFileTransfer) {')
    edit(common, "  if (id == '') return;\n",
         '  if (isThinkpasserProduct &&\n'
         '      (isViewCamera || isTerminal || isTcpTunneling || isRDP)) return;\n'
         "  if (id == '') return;\n")

    # Window creation is reachable from IPC without common.connect().
    windows = "flutter/lib/utils/multi_window_manager.dart"
    edit(windows, '    final windowController = await DesktopMultiWindow.createWindow(msg);\n',
         '    if (isThinkpasserProduct &&\n'
         '        type != WindowType.RemoteDesktop && type != WindowType.FileTransfer) {\n'
         "      throw StateError('Feature disabled by product policy');\n    }\n"
         '    final windowController = await DesktopMultiWindow.createWindow(msg);\n')
    # newTerminal can reuse an existing window before it calls newSessionWindow.
    edit(windows, '    // Iterate through terminal windows in reverse order to prioritize\n',
         '    if (isThinkpasserProduct) {\n'
         "      throw StateError('Feature disabled by product policy');\n    }\n"
         '    // Iterate through terminal windows in reverse order to prioritize\n')

    peers = "flutter/lib/common/widgets/peer_card.dart"
    edit(peers, '      BuildContext context) async {\n    final List<MenuEntryBase<String>> menuItems = [',
         '      BuildContext context) async {\n'
         '    if (isThinkpasserProduct) {\n'
         '      return [_connectAction(context), _transferFileAction(context)];\n    }\n'
         '    final List<MenuEntryBase<String>> menuItems = [', 5)
    # Entire generic peer-ID/history/address-book page is excluded. The assigned
    # resource view is separate work; this patch does not fabricate authorization.
    page = "flutter/lib/desktop/pages/connection_page.dart"
    edit(page, '    final isOutgoingOnly = bind.isOutgoingOnly();\n    return Column(',
         '    if (isThinkpasserProduct) return const SizedBox.shrink();\n'
         '    final isOutgoingOnly = bind.isOutgoingOnly();\n    return Column(')

    toolbar = "flutter/lib/common/widgets/toolbar.dart"
    start = "    v.add(\n      TTextMenu(\n          child: Text(translate('View camera')),"
    end = '          onPressed: () => connectWithToken(isTcpTunneling: true)),\n    );'
    text = changed[toolbar]
    a, b = text.index(start), text.index(end) + len(end)
    edit(toolbar, text[a:b], '    if (!isThinkpasserProduct) {\n'
         + '\n'.join('  ' + line for line in text[a:b].splitlines()) + '\n    }')
    for before in (
        "  if (isDefaultConn &&\n      ffi.ffiModel.keyboard &&",
        "  if (isDefaultConn &&\n      isDesktop &&\n      ffiModel.keyboard &&",
        "  if (!(isDesktop || isWeb) &&\n      bind.mainGetLocalOption(key: kOptionHideRecordingButton)",
    ):
        edit(toolbar, before, before.replace('  if (', '  if (!isThinkpasserProduct && ', 1))
    edit(toolbar, '    RxString privacyModeState, BuildContext context, String id, FFI ffi) {\n',
         '    RxString privacyModeState, BuildContext context, String id, FFI ffi) {\n'
         '  if (isThinkpasserProduct) return [];\n')
    remote = "flutter/lib/desktop/widgets/remote_toolbar.dart"
    before = ('    toolbarItems.add(_ChatMenu(id: widget.id, ffi: widget.ffi));\n'
              '    if (!isWeb) {\n'
              '      toolbarItems.add(_VoiceCallMenu(id: widget.id, ffi: widget.ffi));\n'
              '    }\n    if (!isWeb) toolbarItems.add(_RecordMenu());')
    edit(remote, before, '    if (!isThinkpasserProduct) {\n'
         + '\n'.join('  ' + line for line in before.splitlines()) + '\n    }')

    # Legacy persisted shortcuts must not reactivate hidden actions. Apply to
    # registration AND dispatch, and filter them out of settings capability data.
    shortcuts = "flutter/lib/models/shortcut_model.dart"
    disallowed = ('kShortcutActionToggleChat, kShortcutActionToggleVoiceCall,\n'
                  '          kShortcutActionToggleRecording, kShortcutActionSwitchSides,\n'
                  '          kShortcutActionToggleBlockInput,')
    for anchor in ('  void register(String actionId, ShortcutCallback callback) {\n',
                   '  void onTriggered(String actionId) {\n'):
        edit(shortcuts, anchor, anchor + '    if (isThinkpasserProduct && <String>{\n'
             '          ' + disallowed + '\n        }.contains(actionId)) return;\n')
    edit(shortcuts, '      excludedActions: Set.unmodifiable({\n',
         '      excludedActions: Set.unmodifiable({\n'
         '        if (isThinkpasserProduct) ...[\n          ' + disallowed + '\n        ],\n')
    chat = "flutter/lib/models/chat_model.dart"
    for anchor in ('  showChatIconOverlay({Offset offset = const Offset(200, 50)}) {\n',
                   '      {Offset? chatInitPos, bool requestSoftKeyboard = true}) {\n',
                   '  showChatPage(MessageKey key) async {\n',
                   '  toggleCMChatPage(MessageKey key) async {\n',
                   '  send(ChatMessage message) {\n'):
        edit(chat, anchor, anchor + '    if (isThinkpasserProduct) return;\n')

    settings = "flutter/lib/desktop/pages/desktop_setting_page.dart"
    for before in ('    if (!isWeb &&\n        !bind.isOutgoingOnly()',
                   '    if (!bind.isDisableSettings() &&\n',
                   '    if (isWindows &&\n        !bind.isDisableSettings() &&\n'):
        edit(settings, before, before.replace('    if (', '    if (!isThinkpasserProduct && ', 1))
    edit(settings, '    if (!bind.isDisableAccount()) SettingsTabKey.account,',
         '    if (!isThinkpasserProduct && !bind.isDisableAccount()) SettingsTabKey.account,')
    for before in ('        if (!isWeb) service(),', '        if (!isWeb) audio(context),',
                   '        if (!isWeb) record(context),', '        if (!isWeb) WaylandCard(),'):
        edit(settings, before, before.replace('if (!isWeb)', 'if (!isThinkpasserProduct && !isWeb)'))
    edit(settings, '        other(),\n', '        if (!isThinkpasserProduct) other(),\n')

    # Packaging overlay adds this marker. Do not query microphone permission
    # after its usage-description key is intentionally removed from the bundle.
    swift = "flutter/macos/Runner/MainFlutterWindow.swift"
    edit(swift, '                case "canRecordAudio":\n',
         '                case "canRecordAudio":\n'
         '                    if Bundle.main.object(forInfoDictionaryKey: "ThinkpasserProduct") as? Bool == true {\n'
         '                        result(-1)\n                        break\n                    }\n')
    edit(swift, '                case "requestRecordAudio":\n',
         '                case "requestRecordAudio":\n'
         '                    if Bundle.main.object(forInfoDictionaryKey: "ThinkpasserProduct") as? Bool == true {\n'
         '                        result(false)\n                        break\n                    }\n')
