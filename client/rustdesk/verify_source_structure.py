"""Review guard placement in applied source; this does not execute Rust or Dart."""

from pathlib import Path


def verify(root: Path) -> list[dict]:
    def read(path: str) -> str:
        return (root / path).read_text(encoding="utf-8")

    def section(path: str, start: str, end: str) -> str:
        text = read(path)
        a = text.index(start)
        return text[a:text.index(end, a + len(start))]

    def ordered(text: str, *anchors: str) -> None:
        positions = [text.index(anchor) for anchor in anchors]
        if positions != sorted(positions) or len(set(positions)) != len(positions):
            raise RuntimeError(f"Guard ordering failed: {anchors!r}")

    connection = "src/server/connection.rs"
    handler = section(connection, "    async fn on_message(", "    async fn ")
    ordered(handler, "accepts_login(login)", "self.check_login_scope(&lr)", "match lr.union")
    ordered(handler, "accepts_controller_message(&msg)", "self.authorized_scope_violation(&msg)",
            "} else if self.authorized {", "Some(message::Union::VoiceCallRequest(request))")
    permission = section(connection, "    fn permission(", "    fn update_codec_on_login(")
    ordered(permission, "allows_permission(enable_prefix_option)",
            "crate::get_control_permission(", "Self::is_permission_enabled_locally(")

    # The bridge-side function, not only the Dart/UI wrapper, must guard
    # insertion. Check exact function spans in the actual applied snapshot.
    session = section("src/flutter.rs", "pub fn session_add(\n", "    // to-do: check the same id session.")
    ordered(session, "if is_view_camera || is_port_forward || is_rdp || is_terminal",
            'bail!("Feature disabled by product policy")', "let conn_type = if is_file_transfer")
    main = section("src/core_main.rs", "pub fn core_main()", "/// invoke a new connection")
    ordered(main, "blocks_cli_argument(arg)", "if _is_flutter_invoke_new_connection")
    uri_handler = section("flutter/lib/common.dart", "bool handleUriLink(", "List<String>? urlLinkToCmdArgs(")
    ordered(uri_handler, "if (isThinkpasserProduct)", "candidate.scheme != productReturnRouter.scheme",
            "productReturnRouter.dispatch(candidate)", "  List<String>? args;")
    args_parser = section("flutter/lib/common.dart", "List<String>? urlLinkToCmdArgs(", "connectMainDesktop(")
    if "if (isThinkpasserProduct) return null;" not in "\n".join(args_parser.splitlines()[:3]):
        raise RuntimeError("Product callback can enter the legacy peer/command parser")
    incoming = section("src/client/io_loop.rs", "    async fn handle_msg_from_peer(", "    async fn handle_back_notification(")
    ordered(incoming, "accepts_host_message(&msg_in)", "match msg_in.union", "Some(message::Union::AudioFrame(frame))")
    compiled = section("src/common.rs", "pub fn load_custom_client()", "fn read_custom_client_advanced_settings(")
    ordered(compiled, "crate::product_policy::initialize_profile()", "read_custom_client(")
    native_record = section("src/client.rs", "    pub fn record_screen(&mut self,", "// The source of sent password")
    ordered(native_record, "!crate::product_policy::allows_recording()", "Recorder::new(")
    host_record = section("src/server/video_service.rs", "fn get_recorder(", "    recorder\n}")
    ordered(host_record, "!crate::product_policy::allows_recording()", "record_upload::run(rx)", "Recorder::new(")

    return [{
        "check": "applied-source-guard-order-review",
        "passed": True,
        "scope": "Static guard placement only; Rust, Dart and protocol behavior were not executed",
        "paths": ["host login and authorized message dispatch", "permission role/local precedence",
                  "native FFI session creation", "CLI dispatch and Dart URI parsing",
                  "outgoing and incoming automatic recorder construction"],
    }]
