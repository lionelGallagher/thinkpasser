# RustDesk 专用远程电脑产品功能裁剪

产品复用 RustDesk 开源远控底座，为海外独享开发和办公电脑提供网页、Windows、Mac 入口。功能范围按需求白名单收敛。客户控制台提供电脑使用和主子账号管理；平台内部运营后台负责机器、账号、商品和交付，内部高级管理能力不作为客户功能开放。卡业务另行讨论。

本阶段完成固定版本源码核查，准备原生能力、Flutter、CLI、回跳和安装器裁剪，并在隔离副本实际应用。产品构建、配置初始化、MSI 源变换及 Mac 签名检查已接入上游流程源码，另提供未启用的 CI 模板。尚未编译完整原生客户端；客户已分配电脑、账号与购买界面、网页内核和业务授权仍需主项目实现。

## 固定源码基线

| 组件 | 核查版本 |
| --- | --- |
| RustDesk 客户端 | 1.5.1，commit `23e5bb471a040d62f0a6ad52591fb30784265b73` |
| hbb_common 子模块 | 客户端该版本指向 `fae47e024dd83cef6aaecde0aa7d11731df11649` |
| CPAL 音频依赖 | Cargo.lock 指向 `rustdesk-org/cpal` 的 `96d4da121b7d949677ac5b6887413a9185fd7f39` |
| Server OSS | commit `0415b0e05702a0a7cbdf90e16d274955ba186d35` |

版本锁保存 39 个源文件的规范化 SHA256；补丁修改其中 30 个，新增八个策略、构建、回跳、测试和权限文件，其余基线文件用于权限与 MSI 源变换核查。版本漂移时拒绝生成旧补丁。完整构建还需取得固定子模块和上游工具链。客户端及 Server OSS 按其 AGPL 许可证使用和提供对应源码。

来源：[客户端固定版本](https://github.com/rustdesk/rustdesk/tree/23e5bb471a040d62f0a6ad52591fb30784265b73)、[Server OSS 固定版本](https://github.com/rustdesk/rustdesk-server/tree/0415b0e05702a0a7cbdf90e16d274955ba186d35)。

## 可以复用的底座与实际边界

保留原生画面采集与编码、键鼠、剪贴板、文件传输、声音播放、加密连接、ID 注册和中继。原生界面使用上游 Flutter 和 Rust bridge。平台的客户隔离、主子账号、单账号单电脑、电脑租期、连接凭据和交付规则需要自己的业务服务；Server OSS 的 ID 和中继不能替代这些规则。

RustDesk Pro 的管理后台和官方自托管 Web V2 分别按其授权处理。将开源客户端改成自己的品牌，不会自动得到这些商业组件。设备 ID 保留作内部标识，客户界面只展示已分配的电脑。

## 三项影响裁剪正确性的源码事实

### 完整桌面不能映射为 full 权限模式

`Connection::is_permission_enabled_locally` 在 `access-mode=full` 时直接返回 true；调用它的权限函数还可能优先按 Control Role 覆盖本地设置。只把 `enable-camera` 等写成 N，不能作为最终的产品能力限制。

本产品用 `custom` 表达完整桌面操作，显式允许键鼠、剪贴板、文件、系统声音及远程重启。生成补丁在 Control Role 和本地模式之前执行产品白名单，未知权限默认拒绝。

来源：[connection.rs](https://github.com/rustdesk/rustdesk/blob/23e5bb471a040d62f0a6ad52591fb30784265b73/src/server/connection.rs#L2700)。

### 配置名称可复用但 custom.txt 不是普通 JSON

已核对配置键在 `libs/base/src/config/keys.rs` 的声明及 settings、local、display、built-in 分类。`common::read_custom_client` 对 custom.txt 做 Base64 解码及签名校验，直接放入普通 JSON 不会成为有效配置。

`compiled_profile.py` 现将这份映射生成到产品模块；产品启动时写入准确的设置覆盖范围，跳过原厂 custom.txt 加载器。普通上游构建仍走原签名加载器。部署服务器与公钥由三个明确的编译环境输入提供，缺少即失败，不悄悄连接公共服务器。没有移除商业组件授权检查来取得 Pro 功能。

来源：[配置键及分类](https://github.com/rustdesk/rustdesk/blob/23e5bb471a040d62f0a6ad52591fb30784265b73/libs/base/src/config/keys.rs)、[签名配置读取路径](https://github.com/rustdesk/rustdesk/blob/23e5bb471a040d62f0a6ad52591fb30784265b73/src/common.rs#L2593)。

### 系统声音与麦克风需要分别限制

1.5.1 的音频服务有 ScreenCaptureKit 系统声音路径，也有普通输入设备回退；macOS 包含麦克风用途描述和 audio-input entitlement。保留远端声音播放时，不能直接删除全部音频权限后宣称完成裁剪。

补丁已在产品特性下跳过 `audio-input` 和通话设备选择：Windows 走 WASAPI 默认输出设备，Mac 走 ScreenCaptureKit。Mac 采集不可用、权限不足或未编入 `screencapturekit` 时返回声音采集错误，不回退麦克风；仍需验证错误重试对画面和长期资源占用的影响。CPAL 固定依赖配置的是系统 Audio 输出，产品不开放麦克风选择和语音通话。不能据此宣称已经真机证明不会采集麦克风。

生成的 `macos-profile/Info.plist` 移除麦克风用途说明和原有 RustDesk URL 注册，加入产品标记；Debug/Release entitlements 移除 audio-input。Swift 权限调用在检测产品标记后拒绝请求麦克风。其他 plist 键逐项保持，屏幕采集与辅助功能授权路径未裁剪。上游这些 plist 本来就没有摄像头用途说明，字段缺失不构成运行时功能禁用证明。

上游 `build.py --thinkpasser` 现通过 Flutter/Xcode 构建设置传入产品 Info.plist 和 entitlements；Mac 同时自动选择 ScreenCaptureKit。上游签名脚本原来强制 audio-input=true，补丁增加产品分支，在签名前后拒绝麦克风 entitlement。尚未真正构建或签名，需要在目标系统验证声音与屏幕。Apple 将设备麦克风授权和屏幕/系统声音采集分开描述，不能将屏幕录制许可当成产品会话录像开关。

来源：[audio_service.rs](https://github.com/rustdesk/rustdesk/blob/23e5bb471a040d62f0a6ad52591fb30784265b73/src/server/audio_service.rs#L378)、[Info.plist](https://github.com/rustdesk/rustdesk/blob/23e5bb471a040d62f0a6ad52591fb30784265b73/flutter/macos/Runner/Info.plist)、[Release.entitlements](https://github.com/rustdesk/rustdesk/blob/23e5bb471a040d62f0a6ad52591fb30784265b73/flutter/macos/Runner/Release.entitlements)。

权限与采集依据：[CPAL 固定版本系统音频实现](https://github.com/rustdesk-org/cpal/blob/96d4da121b7d949677ac5b6887413a9185fd7f39/src/host/screencapturekit/mod.rs#L213)、[Apple 设备媒体授权](https://developer.apple.com/documentation/avfoundation/requesting-authorization-to-capture-and-save-media)、[Apple capturesAudio](https://developer.apple.com/documentation/screencapturekit/scstreamconfiguration/capturesaudio)、[Apple captureMicrophone](https://developer.apple.com/documentation/screencapturekit/scstreamconfiguration/capturemicrophone)。

## 裁剪清单与落点

| 能力 | 已核对的控制点 | 本阶段结果与后续工作 |
| --- | --- | --- |
| 桌面键鼠、剪贴板、文件、声音 | 相应 enable 权限和原生会话服务 | 列入白名单，保留原有路径 |
| 摄像头 | enable-camera；ViewCamera 登录类型；peer_card 的 View camera 操作 | 权限、登录、原生创建和界面入口均有源码限制；打包依赖与实机行为待验证 |
| 独立远程终端 | enable-terminal；Terminal 登录类型和 TerminalAction | 补丁拒绝该协议能力；不影响在远程桌面里打开操作系统终端 |
| 打印 | 权限；两向 Printer 文件任务；原生安装 FFI；EXE/MSI 安装器 | 源码限制两向打印和直接安装；MSI 产品变换去掉安装动作并拒绝驱动资源，实装与升级待测 |
| 通用 TCP 隧道与 RDP 工具 | enable-tunnel；PortForward 登录类型与原生创建 | 权限、登录、原生创建、CLI/深链接和菜单受限。保留远控自身 TCP 打洞与中继 |
| 麦克风转发与语音通话 | VoiceCallRequest、VoiceCallResponse、反向 AudioFrame；request_voice_call | 补丁限制协议和会话 API；音频源与 macOS 权限仍需真机验证 |
| 内置聊天 | Misc.ChatMessage；send_chat；连接管理器 ChatMessage | 限制协议和发送 API，菜单、快捷键、浮层与聊天页入口受限 |
| 会话录像 | enable-record-session；record_screen；ClientRecordStatus；两端 recorder 创建 | 限制手动和自动创建，去掉按钮与快捷键；停止清理保留，构建与原始请求待测 |
| 隐私模式、阻断本地输入、交换控制方向 | 对应权限、动态权限和 Misc 消息 | 不在本产品白名单；保留连接正常结束与清理路径 |
| 任意 ID、局域网发现、通用地址簿与跨组共享 | connection_page、peer_card、toolbar、group/discovery 选项 | 通用连接页在产品版隐藏；本人电脑视图尚未实现，底层 ID/API 仍需业务授权 |
| 普通用户的服务端和网络设置 | 原有设置页、CLI 配置导入、固定编译配置 | 页面与外部配置导入受限；部署服务器和公钥显式输入，内部运营维护，不复用 Pro 账号后台 |
| 原生手机和 Linux 桌面端 | 构建目标和平台条件 | 仅构建 Windows 与 Mac 客户端和被控端；不误删 Linux 服务端支持 |

产品版通过既有 `mainGetBuildinOption` 从 Rust 读取不可由配置覆盖的 `thinkpasser-product` 编译标记；Dart 不维护另一个可失配的开关。五类 peer card 的产品分支仅返回连接与传文件菜单；会话工具栏去掉摄像头、终端、隧道、聊天、通话、录像、方向交换、输入阻断与隐私模式入口。保留显示、键鼠、文件、剪贴板和声音开关。快捷键设置、注册和触发均排除对应功能，防止旧绑定重新开启入口。

`core_main.rs` 在旧 CLI/URL 分发前拒绝公共连接与配置导入，服务、托盘和安装生命周期保留。Dart 连接方法、多窗口创建与 Rust `flutter::session_add` 分别限制会话类型。独立的自家登录/收银 scheme 只转给专用回跳路由，不能进入旧 peer/命令解析器；远控启动仍须接入设备绑定短时授权。

回跳只接受 `auth/return`、`checkout/return` 和 `code,state`；发起流程登记 32 随机字节状态、用途、超时和服务端兑换回调，匹配后先消费状态再等待兑换。没有待返回流程或已经消费/过期的状态不会执行。不能从 URI 直接设账号、价格、订单结果或权益。主项目负责兑换、绑定发起账号与租户，并校验主账号可购买、子账号不可购买。当前只保存在本进程，跨重启恢复另需安全存储；没有加入支付逻辑。

当前仍未完成平台用户、租户、电脑分配和租期校验。允许的默认桌面/文件会话底层 API 仍可指定设备 ID；客户列表隐藏不能替代被控端和服务端验证。消息策略仅针对排除能力做限制，并非完整协议字段白名单；后续升级仍需重新审查。

连接认证、加密、撤销和必要诊断持续保留。关闭产品空闲自动断连，不代表关闭协议失活检测或失败会话清理。无人连接时仍全天在线需要独立系统电源策略，不能只依赖会话内 wake lock。

## 已生成的补丁与验证

文件位于 [client/rustdesk](../../client/rustdesk/README.md)。补丁通过新特性 `thinkpasser` 启用，未启用时保留上游原有运行路径。

产品构建强制使用 `flutter`，且仅允许 Windows/Mac 目标，避免未经审查的旧 Sciter、手机或 Linux 桌面入口被误打包。这个限制只在客户端产品特性下生效，不修改独立 Server OSS 的 Linux 构建。

补丁修改现有文件的范围：

- `Cargo.toml`：增加独立构建特性。
- `src/lib.rs`：仅在该特性下引入产品策略模块。
- `src/server/connection.rs`：权限覆盖前白名单、登录类型和选项、认证后消息及连接管理器权限/聊天/通话/方向交换限制。
- `src/ui_session_interface.rs`：限制控制端开始录像、发送内置聊天和发起语音请求。
- `src/flutter.rs`：在原生会话插入之前限制类型及方向交换，覆盖直接 bridge 调用。
- `src/client.rs`、`src/server/video_service.rs`：限制两端录像创建，覆盖自动录像。
- `src/server/audio_service.rs`：固定系统声音来源，禁止麦克风选择和故障回退。
- `src/ui_interface.rs`、`src/core_main.rs`：编译标记及公共 CLI/URI 入口限制。
- `src/client/io_loop.rs`：真实控制端收发消息、反向打印、直接文件任务、语音创建及旧隐私自动请求。
- `src/flutter_ffi.rs`、`src/platform/windows.rs`：直接打印安装 FFI 与 EXE 安装/静默安装/更新、旧连接注册。
- `build.py`、`src/common.rs`、MSI 预处理和 Mac 签名脚本：单一产品构建入口、固定配置、分发与签名检查。
- 十二个现有 Flutter Dart 文件及 Mac Runner Swift：本机信息、连接管理器、安装向导、通用连接页、菜单、设置、快捷键、窗口和麦克风权限请求。
- 新增 `src/product_policy.rs`：集中保存能力限制，不修改协议定义或桥接签名。
- 新增产品构建/MSI 辅助脚本、三份 Mac 权限文件，以及独立回跳模块与回归测试。

已经通过八类检查：固定基线与适用性；隔离副本应用逐文件核对；真实函数守卫位置；执行修改后的 Python 构建选择、部署缺失/旧产物拒绝和 MSI XML 变换；签名脚本 `bash -n`；产品 plist 解析及无关键保持；版本漂移拒绝；只读源目录保护。Python 文件也通过语法检查。检查结果见 [verification.json](../../client/rustdesk/verification.json)。

真实消息路径已核对为网络字节解析后调用 `Connection::on_message`，再进入登录或已授权消息处理。产品登录守卫位于登录 scope 检查与类型处理前；已授权消息守卫位于上游范围检查和具体 VoiceCall/Terminal/PortForward/Misc 分支之前。只在隔离源文件上检查了这些位置，没有执行真实协议请求。

原生 Rust 和 Flutter 尚未编译，当前环境未检测到 cargo 或 flutter；Windows/Mac 真机功能、包签名、权限提示、非产品能力原始请求及网页端均未验证。当前成果是可应用的第一阶段补丁，不是可发布客户端。

原生主窗口左侧本机 ID/密码区、连接管理器聊天/通话/录像/输入阻断/方向交换以及安装向导打印选项已裁剪，保留文件日志、正常断开和必要生命周期。产品专属客户首页、平台账号和购买入口仍待实现；上游打印库与旧卸载实现仍保留，不能声称所有打印相关源代码已删除。完整品牌文案、安装标识和最终包还需审查。

## 绕过与误杀复核

本轮发现并补上“主机向控制端发打印任务”和“直接 FFI 安装打印机”路径，限制放在实际解析/创建之前。系统声音的 AudioFrame/AudioFormat 在主机到控制端方向保留，反方向音频仅用于被排除的语音而受限。普通文件任务继续允许，两端 Printer 类型被拒绝。

语音关闭/拒绝、录像停止、隐私关闭和正常 CloseReason 放行；排除的可选消息现在丢弃，不因此关闭正常桌面。旧 peer 配置自动发起隐私模式的路径也被限制，避免一连上就触发排除功能。`Data::Close`、被控端 CloseReason 提前处理、on_close 和释放路径未替换；平台确认接管应撤销旧连接并走这些关闭路径，与 RustDesk 交换控制方向不同。本专项没有实现平台接管业务或验证远端任务持续运行。

新增 Rust 方向/文件/清理规则测试和 Dart 回跳重放/超时测试，但因工具链缺失尚未执行。源码位置、XML 或关键词检查不能代替这些真实运行测试。

## 网页控制端的确定缺口

固定版本 [AGENTS.md](https://github.com/rustdesk/rustdesk/blob/23e5bb471a040d62f0a6ad52591fb30784265b73/AGENTS.md#L84) 明确说明，网页会话内核是单独手写的 TypeScript/JavaScript，位于未包含在公开仓库中的 `flutter/web/js/`；根 [.gitignore](https://github.com/rustdesk/rustdesk/blob/23e5bb471a040d62f0a6ad52591fb30784265b73/.gitignore) 排除了 `flutter/web/`。公开 Dart bridge 只是边界层。原生代码改动不会自动成为网页功能，原生 Rust 也不是现成可用的 wasm 网页客户端。

网页要求继续保留，可选择以下路线：

1. 对接获得适当授权的现成网页会话内核，包括评估官方 Web V2 的可用授权及对外运营范围。仍需实现本产品身份、设备分配、短时连接凭据、接管、到期撤销和界面裁剪。普通 Pro 购买是否覆盖客户独立使用场景需按实际授权确定。
2. 自行实现兼容 RustDesk 的白名单浏览器会话内核，或使用隔离的原生协议网关连接远端，再向浏览器提供画面和控制通道。需完成协议、认证、密钥、编解码、键鼠输入、中文、剪贴板、文件、音频和重连，以及与原生客户端相同的业务授权。采用网关时，必须明确网关可接触明文的信任范围，不宣称仍具备端点间不可见的加密边界。

第二条可继续复用公开原生协议代码和组件，但仍是独立实现工作。主线需确定网页实现的授权与工程投入，不能将这部分计作已复用完成。

## Mac 长期运行后无法连接的用户反馈

用户报告的确认症状为：Mac 长期运行或长连接后直接无法连接，手动重启后恢复。没有原始错误、端口号、版本或日志；先前提到的端口占用属于猜测，不能据此认定 socket 泄漏或已知上游缺陷。

独立专项的官方修复、源码生命周期、管理心跳和恢复分层见 [Mac 连接可靠性方案](2026-11-08-mac-connection-reliability.md)。本次能力裁剪补丁不声称修复这一症状，也不以开放端口或修改系统 TCP 参数作为默认措施。

## 后续实施顺序

构建步骤与未启用 CI 模板见 [构建集成说明](../../client/rustdesk/BUILD_INTEGRATION.md)。`--thinkpasser` 禁止跳过 Cargo，部署输入缺失即失败；MSI 产品模式还运行真实 EXE 的 `--product-policy` 核对策略，拒绝夹带打印资源，移除打印安装调度和旧 scheme，仅注册受限自家回跳。签名脚本也有产品输入/结果校验。以上 Python/源变换已检查，真实 EXE 诊断、WiX、MSI 安装和签名尚未运行。

原始上游确实含打印安装步骤和必须带麦克风 entitlement 的签名检查，不能原样套用。来源：[MSI 动作](https://github.com/rustdesk/rustdesk/blob/23e5bb471a040d62f0a6ad52591fb30784265b73/res/msi/Package/Fragments/CustomActions.wxs#L20)、[签名脚本](https://github.com/rustdesk/rustdesk/blob/23e5bb471a040d62f0a6ad52591fb30784265b73/.github/scripts/sign-macos-app.sh)、[上游构建流水线](https://github.com/rustdesk/rustdesk/blob/23e5bb471a040d62f0a6ad52591fb30784265b73/.github/workflows/flutter-build.yml)。

接下来在完整工作树和原生工作节点实编、运行已准备测试，再验证安装、升级和签名。并行接入客户电脑/账号/主账号购买界面、平台连接授权、自家更新源与网页内核。原厂更新检查/自动更新已在编译覆盖配置中关闭；现有机器上的其他应用 scheme 注册没有在本次工作区操作。最终品牌、Bundle ID、Windows 产品标识和证书尚未确定，临时原厂命名路径的开发产物不能对外分发。

真机覆盖：Windows/Mac 控制端互连；中文和快捷键；剪贴板与文件；默认/多显示器、画质和全屏；系统声音可用/权限拒绝/设备切换；系统麦克风持续无采集且不弹请求；手动和自动录像无输出；禁用功能菜单、旧快捷键、原始 FFI/协议、CLI 和 URI 均受限；full/控制角色覆盖不能重新启用；断线、重连、接管及 24 小时以上任务持续。Mac 另测升级后旧配置、签名与公证、屏幕采集/辅助功能授权和不支持系统声音的版本。上述项目当前均未完成实机验证。
