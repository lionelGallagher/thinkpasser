# RustDesk 产品能力裁剪准备

本目录提供固定版本源码核查、能力与入口裁剪补丁、构建/安装/签名集成，以及登录和收银回跳接口。补丁已在隔离副本应用核对，Python 构建选择和 MSI 源变换已执行检查；尚未编译原生客户端，不能作为可发布客户端。构建步骤见 [BUILD_INTEGRATION.md](BUILD_INTEGRATION.md)。

## 文件

| 文件 | 用途 |
| --- | --- |
| capability-policy.json | 本产品允许的原生能力、排除项、已核对的设置名称和未完成的发布条件 |
| upstream-lock.json | 客户端和服务端来源版本，以及补丁涉及源文件的摘要 |
| product_policy.rs.in | 为原生 fork 生成的能力限制模块模板 |
| prepare_trim_patch.py | 验证输入源文件后生成补丁，保持源目录只读 |
| entry_trim.py | 锚定原生会话、菜单、快捷键、CLI、深链接及系统声音采集路径的最小修改 |
| distribution_trim.py / compiled_profile.py | 反向消息、固定配置、EXE/MSI、签名和受限回跳的源码与构建接入 |
| patches/0001-product-capability-boundary.patch | 已生成的 opt-in 源码补丁 |
| prepare_macos_profile.py / macos-profile/ | 生成产品版 Info.plist 和 entitlements，由产品 build.py 接入 |
| verify_trim_patch.py / verify_source_structure.py | 隔离副本应用、静态守卫位置、plist 解析、版本漂移与只读约束检查 |
| verify_build_integration.py | 执行修改后 Python 的构建选择、环境拒绝、排除文件与 MSI XML 变换检查 |
| verify_product_artifact.py | 原生构建后检查真实程序策略摘要与包内文件，本次尚未对原生程序运行 |
| product_policy_tests.rs.in / product_return_router_test.dart.in | 原生协议策略与回跳回归测试，已准备但未执行 |
| ci/native-build.yml.in | 未启用的手动 CI 模板，不发布产物 |
| verification.json | 本次检查结果，明确列出未执行的原生与浏览器验证 |

## 使用固定源码生成补丁

客户端基线为 RustDesk 1.5.1，commit 为 `23e5bb471a040d62f0a6ad52591fb30784265b73`。完整构建仍需该版本的子模块和上游构建工具链。

```powershell
python client/rustdesk/prepare_macos_profile.py --source D:\forks\rustdesk --output-directory client/rustdesk/macos-profile
python client/rustdesk/prepare_trim_patch.py --source D:\forks\rustdesk --output client/rustdesk/patches/0001-product-capability-boundary.patch
python client/rustdesk/verify_trim_patch.py --source D:\forks\rustdesk --report client/rustdesk/verification.json
git -C D:\forks\rustdesk apply --check D:\workSpace\thinkpasser\client\rustdesk\patches\0001-product-capability-boundary.patch
```

生成器要求所涉及源文件匹配基线摘要；检测到变更时拒绝生成，避免将旧补丁静默用于新版本。它拒绝把补丁写入输入源目录，也不自动应用补丁。

审查后在自己的开源 fork 中应用补丁，并在原有原生 Rust 构建特性上增加 `thinkpasser`。未启用该特性时，上游执行路径不变。沿用上游固定的 Flutter、Rust bridge 和打包流程；不要直接运行不匹配版本的 bridge codegen。

推荐通过补丁后的 `build.py --thinkpasser --flutter` 选择产品构建。它检查明确的部署服务器和公钥，禁止跳过 Cargo，Mac 自动使用产品权限输入；详见构建说明。

Flutter 通过既有 `mainGetBuildinOption` 接口读取 Rust 编译标记 `thinkpasser-product`，不新增桥接签名或单独的 Dart 开关。保留 Windows 原有构建特性；Mac 还需要 `screencapturekit`。不要将这个 Mac 音频特性加入 Windows 构建。

产品特性强制使用 `flutter` 且仅允许 Windows/Mac 编译目标，避免旧 Sciter 或被排除平台的界面入口进入产品包。独立 Server OSS 的 Linux 构建不受此客户端限制影响。

## 补丁已经覆盖的原生路径

- 被控端在 `Connection::permission` 中先检查产品白名单，再进入上游本地模式及 Control Role 逻辑。`access-mode=full` 或控制角色不能越过该白名单。
- 被控端拒绝非产品用途的摄像头、终端、打印、隧道、录像等权限；未知权限默认拒绝。
- 对已经认证的控制端，拦截语音请求、反向音频、独立终端操作、聊天、打印文件任务、切换控制方向、隐私模式及启用录像状态等消息。
- 连接管理器不能通过动态权限切换重新打开排除能力；其聊天发送路径也被限制。
- 原生控制端的会话接口阻止开始录像、发送内置聊天及发起麦克风语音通话。结束已有录像或通话的清理路径仍保留。
- `flutter::session_add` 在创建会话前拒绝摄像头、独立终端、隧道、RDP 和控制方向交换；Dart 菜单及多窗口创建也有对应收口。
- 被控端登录请求与旧版 `OptionMessage` 路径同样检查，不能通过旧选项启用隐私模式、输入阻断或终端持久化。自动录像在控制端 `VideoHandler::record_screen` 和被控端 `get_recorder` 创建路径受限。
- Flutter 对五类通用 peer card 仅保留连接和传文件菜单；会话工具栏去掉聊天、通话、录像及不需要的控制项。快捷键设置、注册和触发均排除聊天、通话、录像、方向交换、阻断输入，防止旧配置恢复入口。
- 产品版关闭通用 ID/历史/地址簿页面，并关闭原有网络、账号、打印和安全配置页；通用音频输入选择、自动录像设置不展示。客户的已分配电脑视图和平台账号界面仍待实现，当前补丁不提供一个完整可用的客户控制台。
- 产品版外部 CLI 和深链接暂不允许发起任何连接或导入服务配置。服务、托盘和安装生命周期仍保留。后续由平台连接授权链路开放指定设备入口；不能直接重新放开 `--connect <任意 ID>`。
- 控制端实际 I/O 分发也拦截主机发来的打印任务与语音开启消息；系统声音的 AudioFrame/AudioFormat 在此方向保留。语音关闭、拒绝、录像停止和正常断开不被当成越权请求。排除的可选功能消息被丢弃，不因此断开整个桌面。
- 主窗口左侧原本机 ID/密码区、连接管理器聊天/通话/录像/方向交换等控件和安装器打印选项已裁剪。文件日志、正常断开、允许的权限控件和服务生命周期保留。
- EXE 安装/更新和直接 FFI 打印安装均有硬限制；MSI 产品预处理核对实际 EXE 的编译策略，拒绝驱动资源并移除打印安装调度、属性、复选框与旧连接注册。旧打印机卸载保留作清理。

上述是源码修改范围。菜单、MSI/EXE 安装和远控尚未实际运行；业务连接授权仍需接入。不能将源变换、静态守卫位置或 `git apply` 成功视为原生功能修复证明。

## 设置候选的正确用途

`capability-policy.json` 是本产品的描述格式。`upstreamSettingCandidates` 中的名称已核对源码，但该 JSON 不是 RustDesk 可直接加载的配置文件。

上游 `custom.txt` 包含签名验证；普通 JSON 放入该文件不会生效。产品补丁由 `compiled_profile.py` 生成固定配置，在产品启动时写入对应覆盖范围，跳过原厂签名配置加载器；普通上游构建仍走原加载器。这里没有取得 Pro 管理后台或官方 Web V2 的源码与授权。

产品配置还固定禁用原厂更新检查/自动更新；自家受控更新源仍待接入。独立权限与实际消息守卫继续存在，不能只依靠设置值限制排除能力。

`access-mode` 使用 `custom`，显式保留键鼠、剪贴板、文件、系统声音和远程重启。禁用 `enable-tunnel` 仅表示排除通用端口转发功能，不应关闭远控连接所需的 TCP、UDP、WebRTC、ID 或中继路径。

会话内 keep-awake 不能保证无人连接时电脑仍全天在线；平台供机还需要独立的系统电源配置和管理心跳。

## 设备连接密码与平台授权

用户提出将 RustDesk 被控电脑的连接密码对应购后电脑；它与平台账号、操作系统及 AI 登录密码分开。建议每机独立凭据，通过稳定机器 ID 关联当前交付单元、租约、使用账号及凭据版本；客户端一键连接时同时满足平台授权与底层认证。

受控设备密码可以保留，但不能成为绕过租期、分配和会话撤销的连接入口。到期必须关闭已有通道，改密和断连分别取得确认；换使用者和回收时轮换并验证。当前补丁没有实现真实密码设置、轮换或原生租约强制，仍需固定 fork 的受保护本机接口／认证钩子。完整设计见[技术架构总览](../../docs/architecture.md)和[会话契约](../../web/remote-desktop/gateway-contract.md)。

## macOS 权限与声音

产品特性下，Windows 保留 WASAPI 默认输出设备采集，Mac 保留 ScreenCaptureKit 系统音频设备。`audio-input` 和通话设备配置不能再选择麦克风。ScreenCaptureKit 不可用时返回音频采集错误，不回退到普通输入设备；Mac 未编入该特性时同样关闭音频采集。画面与输入路径不依赖这项音频回退。

`macos-profile/` 从固定上游文件生成，移除麦克风用途说明、audio-input entitlement 和原有 RustDesk URI 注册，加入 `ThinkpasserProduct` 标记。Swift 权限方法检测此标记后不再请求麦克风。上游原文件本就没有摄像头用途说明；不能把“不存在摄像头字段”当作运行时禁用证明。

产品 `build.py` 通过 Flutter/Xcode 环境构建设置，将生成的 Info.plist 和 Release entitlements 设为 Runner 构建输入；签名脚本增加产品分支，签前/签后拒绝麦克风 entitlement，避免上游原有 audio-input=true 检查冲突。没有运行签名、公证或替换已签名 app。屏幕采集与辅助功能路径保持；仍需在真实签名 app 验证声音和无麦克风采集。Windows Win32 manifest 字段缺失同样不是禁止采集的证明。

这些裁剪不影响在远程桌面内打开操作系统 Terminal、Claude Code 和 Codex。

## 自家登录和收银回跳

旧 RustDesk 连接、配置与 `--play` 注册关闭；仅注册独立的产品回跳 scheme。`productReturnRouter.begin(...)` 为登录或收银发起流程保存随机状态、超时和服务端兑换回调，返回时只接受 `auth/return`、`checkout/return` 与 `code,state`，一次性匹配后交给兑换回调。没有待返回流程时不会消费。该路由不会进入 `connect()`，也不信任 URI 中的账号、订单金额或权益。

原生端主账号购买/续费/加购、子账号禁止购买，以及回跳 code 的平台验证由主项目实现；本目录没有支付逻辑。当前仅保存本进程中的待返回状态，退出后需重新发起流程。

## 网页远控缺口

固定版本的 `AGENTS.md` 说明，网页端依赖未包含在公开仓库中的 `flutter/web/js/` 手写会话内核；根 `.gitignore` 排除了 `flutter/web/`。公开 Dart bridge 不足以独立运行网页远控，原生 Rust 会话代码也不是现成的 wasm 网页客户端。

需要在保留网页入口要求的前提下，选择具备授权的现成网页内核，或为本产品的白名单能力实现可复用协议/网关及浏览器会话内核。具体工作和路线见裁剪报告。原生客户端先打通不等于网页要求被取消。

## 上线前实际验证

使用完整 fork 编译 Windows、Mac 的控制端和被控端，核对保留功能、被排除的正常入口与原始协议请求、`full` 模式和控制角色覆盖、断线恢复及接管。包内权限和驱动需要另验。

已执行八类检查：版本/适用性、隔离应用核对、守卫相对位置、Python 构建与 MSI 变换、签名脚本 Bash 语法、产品 plist、版本漂移拒绝、只读源目录保护。结果见 `verification.json`。Rust/Dart 测试已准备但未运行；没有原生、MSI 安装、实际 codesign 或远控验证。

账号、租户、设备归属、电脑有效期、短时连接凭据及接管撤销必须由本产品服务端和被控端共同执行。隐藏任意 ID 输入框不能替代这些校验，Server OSS 的 ID 和中继服务也不自动提供上述业务规则。
