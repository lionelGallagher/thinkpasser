# 网页真实远控：公开协议核查与适配起点

网页内真实控制 Windows/Mac 是必需能力。公开 RustDesk 1.5.1 能复用被控端采集、编码、键鼠、剪贴板、文件、系统声音和原生会话；它没有随仓库提供完整浏览器会话内核。当前已完成可运行的协议与授权参考模块，并在真实浏览器中跑通合成 VP8、输入和剪贴板消息链路；**没有连接真实 Windows/Mac，不能作为网页远控完成或产品发布证明。**

候选路线是自行实现浏览器内核，或增加原生协议适配。适配器可放被控电脑侧，也可放云端；客户尚未选择云端可见桌面明文的信任模型，本阶段不默认这项选择。建议先验证被控侧适配，复用编码帧，以业务平台授权和自有信令建立浏览器通道，再用实际兼容性、资源与网络结果选择最终架构。

## 固定证据与开源边界

| 项目 | 固定版本/状态 | 可复用范围 |
| --- | --- | --- |
| RustDesk 客户端 | 1.5.1，`23e5bb471a040d62f0a6ad52591fb30784265b73` | 原生会话核心、采集/编解码/输入/文件；AGPLv3 |
| hbb_common | 客户端固定子模块 `fae47e024dd83cef6aaecde0aa7d11731df11649` | rendezvous schema、传统传输、WebSocket、WebRTC 数据通道、加密实现 |
| Server OSS | `0415b0e05702a0a7cbdf90e16d274955ba186d35` | ID/注册/打洞/中继；不是本产品账号、独享分配和会话授权服务 |
| Flutter Web Dart bridge | 公开 | UI 与 JS 互操作边界；不包含完整运行时 |
| `flutter/web/js/` | 固定版本明确说明未纳入公开仓库 | 不能按已获得开源源码计入工作量 |
| 官方 Web V2 / Server Pro | 官方提供托管访问和 Pro 自托管方式 | 商业能力/托管使用方式需按实际许可评估；没有采购、下载未公开内核或绕过许可 |

固定客户端的 [AGENTS.md](https://github.com/rustdesk/rustdesk/blob/23e5bb471a040d62f0a6ad52591fb30784265b73/AGENTS.md#L84) 明确区分原生 Rust 会话与网页手写 TS/JS 会话内核，说明后者不在公共仓库；[.gitignore](https://github.com/rustdesk/rustdesk/blob/23e5bb471a040d62f0a6ad52591fb30784265b73/.gitignore) 排除了 `flutter/web/`。公开 [bridge.dart](https://github.com/rustdesk/rustdesk/blob/23e5bb471a040d62f0a6ad52591fb30784265b73/flutter/lib/web/bridge.dart) 只能作为接口参考。原生 Rust 客户端不能直接编为现成 wasm 网页内核。官方 [Web V2 说明](https://rustdesk.com/blog/rustdesk-web-client-v2-preview/) 描述了托管/Pro 选项；可访问托管页面不等于取得白标再分发源码授权。

本次共用裁剪任务的固定源码快照，没有重复克隆。额外下载的未修改公开协议/源码保存在 [upstream](../../web/remote-desktop/upstream/manifest.json)，逐文件记录 URL、commit、SHA256；这不是可编译的完整 checkout。客户端与 Server OSS 原始 AGPLv3 许可随目录保留。此前的功能裁剪结论仍见 [裁剪报告](2026-11-08-rustdesk-feature-trim.md)。

## 公开传输不等于现成浏览器客户端

传统连接建立复用 ID 服务器、打洞和 relay，但浏览器没有通用 TCP/UDP socket。直接浏览器实现需要 WSS 或 WebRTC，不能把普通 WebSocket API 接到 TCP 21117 后就称为兼容。传统流的长度头、WebSocket 消息边界、WebRTC 分片是三种不同封装。

| 传输 | 固定源码已核对行为 | 浏览器适配责任 |
| --- | --- | --- |
| TCP / 传统流 | 自定义 1–4 字节小端长度头，最低 2 位为头长减 1，其余为 payload 长度 | 仅在原生网关/fixture 解析，不直接用浏览器 socket |
| WebSocket | 一个 binary message 对应一个逻辑消息，可由 stream 层先加密；不加上述 TCP 长度头 | WSS/反向代理、消息边界、加密握手、大小限制、背压 |
| WebRTC | 有序 DataChannel；逻辑消息拆为最多 60,000 字节 payload；前置 1 字节，1=后续分片、0=最后分片 | ICE/信令/身份绑定/分片、单读者重组、拥塞及断线处理 |

依据：[BytesCodec](https://github.com/rustdesk/hbb_common/blob/fae47e024dd83cef6aaecde0aa7d11731df11649/src/bytes_codec.rs#L46)、[WebSocket send/next](https://github.com/rustdesk/hbb_common/blob/fae47e024dd83cef6aaecde0aa7d11731df11649/src/websocket.rs#L373)、[WebRTC 分片](https://github.com/rustdesk/hbb_common/blob/fae47e024dd83cef6aaecde0aa7d11731df11649/src/webrtc.rs#L139)。

1.5.x 的 WebRTC 承载 RustDesk 自定义协议，**不是标准 RTP 视频/音频轨道**；不能把 DataChannel 直接赋给 `<video>`。官方 [1.5.0 说明](https://rustdesk.com/blog/rustdesk-1-5-0-webrtc-qos/) 也明确描述了该路径与原编码体系的关系。

一个额外阻塞是：客户端固定的 [rendezvous.proto](https://github.com/rustdesk/hbb_common/blob/fae47e024dd83cef6aaecde0aa7d11731df11649/protos/rendezvous.proto) 有 offer/answer/ICE 字段，但固定 Server OSS 的 [rendezvous_server.rs](https://github.com/rustdesk/rustdesk-server/blob/0415b0e05702a0a7cbdf90e16d274955ba186d35/src/rendezvous_server.rs#L777) 没有对应转发，构造 PunchHole 仅填传统字段。不能只打开客户端 `enable-webrtc` 就宣称该 OSS 组合具备完整 WebRTC 信令。需要自有授权信令，或显式扩展 OSS 的字段转发、路由、限流和兼容测试；传统 TCP/relay 复用不依赖这项改造。此结论只针对上述固定 commit。

## 握手、加密与业务授权是两层

传统路径验证签名设备身份，交换临时 box 公钥和封装的随机对称密钥；消息使用 sodium secretbox，按方向维护计数 nonce。固定版本的 `kx_version=1` 根据握手 transcript 派生两个方向的子密钥；不能照旧版教程只实现单一双向密钥。实现浏览器原生兼容路线时，应直接复用经审查的 sodium 实现与固定 KDF，不能用 AES-GCM 随意替换却仍声称协议兼容。[密钥交换助手](https://github.com/rustdesk/rustdesk/blob/23e5bb471a040d62f0a6ad52591fb30784265b73/src/common.rs#L2414)、[版本与方向密钥](https://github.com/rustdesk/hbb_common/blob/fae47e024dd83cef6aaecde0aa7d11731df11649/src/tcp.rs#L28)、[加密计数器](https://github.com/rustdesk/hbb_common/blob/fae47e024dd83cef6aaecde0aa7d11731df11649/src/tcp.rs#L384)。

WebRTC 的媒体/输入 DataChannel 由 DTLS 加密；该 transport 不再应用 secretbox。客户端把远端 DTLS 指纹与签名 IdPk 的指纹绑定后才标记 peer-verified；仅仅建立 DTLS 不能证明连接到获授权设备。公开原生代码还包含部分无可信公钥或校验失败的非安全回退，产品入口应拒绝这类状态，不能继承后对外承诺强认证。[客户端握手](https://github.com/rustdesk/rustdesk/blob/23e5bb471a040d62f0a6ad52591fb30784265b73/src/client.rs#L1685)、[WebRTC set_key](https://github.com/rustdesk/hbb_common/blob/fae47e024dd83cef6aaecde0aa7d11731df11649/src/webrtc.rs#L1245)。本目录没有实现或真机验证这些加密路径。

RustDesk 的密码 challenge/login 不能代表平台账号、租户、独享分配、租期、主子权限和接管。平台需要另签发短时设备授权，被控端和所有入口验证；主账号能管理、重启子账号电脑，也不因此得到子账号桌面连接权。[LoginRequest / Hash 定义](https://github.com/rustdesk/rustdesk/blob/23e5bb471a040d62f0a6ad52591fb30784265b73/libs/base/protos/message.proto#L68)。

本次 [authority.mjs](../../web/remote-desktop/authority.mjs) 实现上述核心业务约束的进程内参考状态机：一账号一电脑、设备独占、租户隔离、主子管理/访问分离、指定旧 session 的确认接管、session epoch、Ed25519 签名的短时 grant、单次使用、续租和撤销。`gateway-session.mjs` 每次转发输入先校验会话，接管后旧会话不能继续发输入。

它没有身份登录、数据库原子事务、真实设备验签/撤销确认、跨进程 jti 存储、设备离线时间策略或临时私钥持有证明。当前 `clientKey` 字符串比较不能作为密码学认证。接管在参考状态机中只改变内存状态；真实设备必须关闭旧通道并确认后才能激活新通道。完整契约和明确缺口见 [gateway-contract.md](../../web/remote-desktop/gateway-contract.md)。

## 帧、输入和数据能力

| 产品必需能力 | 公开源码可复用点 | 网页剩余工作 |
| --- | --- | --- |
| 真实桌面 | `Message.video_frame=6`；VP9/VP8/AV1/H.264/H.265 编码帧批次，data/key/pts；display 标识 | 解码器动态检测、codec/chroma 协商、帧时间、关键帧请求、丢帧、显示器/光标和尺寸切换 |
| 中文与快捷键 | `KeyEvent` 有 down/press、ControlKey、chr、unicode、seq、modifiers 与 KeyboardMode | compositionend/UTF-8 文本与物理快捷键分流；Windows/Mac 映射；浏览器截获不了的系统组合键用显式控制；UAC/登录屏和 Mac 辅助权限实测 |
| 鼠标 | mask、sint32 坐标、修饰键 | 视口缩放/多显示器坐标、按钮/滚轮、捕获和失焦时释放按键 |
| 剪贴板 | 文本/图片/多格式定义；可压缩内容 | 浏览器权限/手势、文本与图片兼容、zstd、大小限制；本次仅非压缩文本消息，未访问系统剪贴板 |
| 文件 | FileAction/FileResponse、job、块、摘要、断点、完成/取消；原生文件服务 | 浏览器选择/下载或文件系统 API、安全路径和哈希、背压、取消/断点；网页本次未实现 |
| 系统声音 | AudioFormat 与 Opus AudioFrame；原生采集与播放代码 | 原系统声音白名单、浏览器音频解码/排队/同步及用户手势；本次未实现，不调用 getUserMedia |
| 重连 | 原生连接/会话逻辑可供参考 | 新 grant/密钥证明、ICE restart/重建、关键帧/状态恢复、解绑/到期/接管后旧连接拒绝；本次只做本地 start/stop |

协议事实来自固定 [message.proto](https://github.com/rustdesk/rustdesk/blob/23e5bb471a040d62f0a6ad52591fb30784265b73/libs/base/protos/message.proto)。[clipboard.rs](https://github.com/rustdesk/rustdesk/blob/23e5bb471a040d62f0a6ad52591fb30784265b73/src/clipboard.rs#L848) 和 [fs.rs](https://github.com/rustdesk/rustdesk/blob/23e5bb471a040d62f0a6ad52591fb30784265b73/libs/base/src/fs.rs#L906) 使用 [hbb_common 压缩模块](https://github.com/rustdesk/hbb_common/blob/fae47e024dd83cef6aaecde0aa7d11731df11649/src/compress.rs)，其实现为 zstd。声音的 Opus 解码见 [client.rs](https://github.com/rustdesk/rustdesk/blob/23e5bb471a040d62f0a6ad52591fb30784265b73/src/client.rs#L2443)。浏览器 WebCodecs 不保证所有 codec 必须存在，必须运行时检查并准备协商/回退；依据 [W3C WebCodecs](https://www.w3.org/TR/webcodecs/)。

摄像头、麦克风转发、打印、聊天、录像、通用 TCP 隧道、独立终端等排除能力不加入浏览器白名单。原型解码器只接受一条明确支持的顶层消息；不把任意 protobuf 或 Misc 原样转给 nativeProvider。真正产品仍需在原生核心维护完整白名单和错误处理。

## 网关位置与工程成本

| 候选 | 可复用能力 | 新增工作与信任边界 |
| --- | --- | --- |
| 被控电脑侧协议适配 | 同机 RustDesk 采集/编码/输入/剪贴板/文件/系统声音，尽可能复用已编码帧 | 原生钩子或安全 IPC、WebRTC endpoint、自有授权信令、浏览器内核、打包签名；明文留在浏览器与被控机侧。业务平台只发授权/信令，TURN 可只转 DTLS 密文；尚未证明这些属性 |
| 云端原生网关 | RustDesk 原生连接、认证、解密及数据能力；浏览器不用重写全部 RustDesk 密码学 | 需要 headless 核心抽离/隔离、密钥托管和容量；网关能够看见桌面及输入/文件/剪贴板/音频。该信任边界必须被明确接受，不能称为网关不可见的端到端连接 |
| 浏览器直接兼容 RustDesk | schema、握手和算法实现参考，原生被控端 | 完整 TS/JS/局部 WASM 库实现所有公开协议与浏览器限制；缺失的手写 JS 内核不能计为已复用；还需自有信令或 OSS 信令扩展 |
| 授权现成 Web 内核 | 获得授权范围内的网页远控功能 | 付费/对外运营/白标/修改权确认；仍需本产品授权、接管和功能裁剪。当前未选择或采购 |

原生客户端没有可直接启动的稳定 headless 网关 SDK。把原生 Rust 会话核心抽离出来，或加入本机媒体/控制钩子，是实际新增工程，不是给现有 CLI 加一个参数。被控侧适配也需要安装和管理额外模块、约束本机接口，并验证 Windows 权限与 Mac 签名/屏幕及辅助功能授权。

优先保持原编码帧并在浏览器解码，可以避免先解码再编码；采用标准 RTP 时仍需 codec 格式、分包、时间戳、关键帧/拥塞反馈与协商适配，不能假定直接透传就可播放。遇到浏览器不支持的 codec 才考虑转码，其 CPU/GPU 与延迟需实测。任何节点都需要有界队列、背压和会话资源限额。

按媒体有效载荷 R Mb/s 估算，每小时单段流量约 `0.45 × R GB`；TURN 收发或云端两段链路处理总量约 `0.9 × R GB/h`，不含协议开销。直连避免媒体经过业务云；中继/云网关的结算需按供应商出入站规则另算。当前无真实流量、CPU/GPU、内存、延迟或金额测量。

## 本次实际可运行结果

代码已按五模块结构归入 [web/remote-desktop](../../web/remote-desktop/README.md)。本目录专注协议及浏览器合成验证，不代表产品网站或生产后端已完成。无 npm 依赖的本地启动命令：

```powershell
node --test web/remote-desktop/test/*.test.mjs
node web/remote-desktop/fixture-server.mjs
```

浏览器打开 `http://127.0.0.1:4187`。测试服务器仅静态本地页面，合成源是 FFmpeg `testsrc2`；页面内两个 PeerConnection 使用真实 DataChannel。链路为：独立 Python 组装的 RustDesk protobuf/TCP fixture → TCP 解析 → DataChannel 分片 → 重组 → protobuf 解析 → VP8 WebCodecs 解码。没有跳转原生客户端，没有使用屏幕抓取代替远控。

实际结果：

- 14 项 Node 测试全部通过：固定源码哈希、长度头边界/碎片/黏包、60 KB 分片、多媒体 fixture 原始帧哈希、UTF-8/负坐标、畸形/排除消息拒绝、单账号单设备、租户/主子权限、精确接管、签名/重放/到期、续租/回收、旧输入拒绝与 nativeProvider 异步故障关闭。
- Windows Edge 157 的真实浏览器里首轮 5 帧解码成功；6 条输入消息收到回执，包含 `中文输入测试`、`剪贴板 测试`、鼠标按下/释放和方向键按下/释放。
- 随后另做两轮启动/停止，累计解码 16 帧，协议/解码错误为空，最终关闭本地 PeerConnection/解码器。只证明本地资源可关闭，不证明长期无泄漏。

原始范围和结果见 [verification.json](../../web/remote-desktop/verification.json)。没有验证真实 Windows/Mac 采集或系统输入、远程 IME/组合键、真实剪贴板、文件、系统声音、身份/加密握手、跨网 ICE/TURN、真实重连、设备端强制接管与 24 小时稳定性。当前 Windows 环境没有 cargo/flutter，未编译 RustDesk。原型不能称为产品可用网页客户端。

## 接真机的实施顺序

1. 完整固定 fork 获取构建工具链；实现 nativeProvider 的最小画面输出和键鼠注入钩子，优先在被控 Windows 侧跑受保护的本机适配。保持原生能力裁剪，禁止永久密码/任意 ID 旁路；不触碰真实客户机器。
2. 接入业务认证、持久化独占事务、签名 grant、设备验签和浏览器密钥持有证明；接管必须等待设备确认旧通道关闭。将网页与原生客户端统一到相同授权入口。
3. 补自有授权信令，完成两端设备身份与 DTLS 指纹绑定；实测直连、TURN、WSS 回退，再以证据评估是否需要云端网关。若选择云端，单独明确明文信任模型。
4. 依次完成 Windows/Mac 真实画面、中文/完整快捷键、光标/多屏、剪贴板、文件、系统声音和重连，补浏览器兼容与权限拒绝测试。任何生产路由都不能继续使用 fixture/native stub。
5. 在可控测试机做接管、断线、掉电恢复、账号停用/到期/解绑、24 小时以上稳定性及资源压测；之后才能评估签名发布。购买商业内核、部署、公网服务和机器操作仍需另有明确授权。
