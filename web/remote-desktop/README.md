# 网页远控适配研究与可运行验证

本目录交付固定 RustDesk 1.5.1 公开协议的最小适配、会话授权参考状态机和浏览器合成验证。**没有接入真实 Windows/Mac，也没有完整网页远控内核。** 网页真实控制仍是必需能力；本目录为其工程起点。

在仓库根目录运行，无需安装 npm 依赖：

```powershell
node --test web/remote-desktop/test/*.test.mjs
node web/remote-desktop/fixture-server.mjs
```

打开 `http://127.0.0.1:4187`，点击“开始本地验证”。仅监听本机环回地址；不安装服务，不使用公网信令、STUN/TURN、屏幕录制、摄像头或麦克风。测试服务器没有设备入口或生产登录 API。

| 文件 | 已有能力 | 范围限制 |
| --- | --- | --- |
| `protocol.mjs` | TCP 长度头、WebRTC 60 KB 分片；protobuf 的压缩视频帧、鼠标、部分控制键、UTF-8 文本、非压缩文本剪贴板 | 输入必须是已解密消息；严格子集，不能直接替换完整 RustDesk 消息内核；默认上限 8 MiB |
| `authority.mjs` | 单账号单设备、独享绑定、主子权限分离、确认接管、Ed25519 签名短时授权、重放拒绝、续租和撤销 | 进程内参考实现；没有身份认证、数据库、真实设备、公钥轮换或浏览器密钥持有证明 |
| `gateway-session.mjs` | 每次转发前验证有效会话，接管后旧输入被拒绝，未知/越权消息关闭会话 | `nativeProvider` 为待实现接口；测试仅用 stub，没有启动系统会话 |
| `browser/` | 实际 WebRTC DataChannel + VP8 WebCodecs 解码、中文与输入消息本地回执 | 同一页面内两个 PeerConnection；不是网络穿透、RustDesk 加密握手、真实 IME/系统键盘或真机验证 |
| `fixtures/` | FFmpeg 生成的 VP8 测试画面，Python 独立组装 RustDesk protobuf/TCP 帧 | 素材是合成图案，声音/文件传输未实现 |
| `upstream/` | 未修改的固定版本公开源码和 SHA256 | 审查证据与协议定义，不是可编译的完整客户端/服务端 |

浏览器只支持原型中的 VP8；真实产品需动态协商并检测解码器，不能据此承诺所有浏览器/系统支持 VP9、AV1、H.264、H.265。文件、系统声音、重连、完整快捷键和真实系统输入仍须补齐。

合成素材可用现有 FFmpeg 和 Python 重新生成：

```powershell
ffmpeg -hide_banner -loglevel error -f lavfi -i testsrc2=size=640x360:rate=5:duration=1 -c:v libvpx -g 5 -f ivf -y web/remote-desktop/fixtures/synthetic-vp8.ivf
python web/remote-desktop/fixtures/build-fixture.py
```

fixture 的 protobuf 由 Python 生成，JS 测试另行解析并核对原始编码帧的 SHA256，避免只验证 JS 自编码自解码。已有二进制 fixture 随目录提供，不要求运行时安装 FFmpeg。

架构选择、信任边界和业务契约见 [gateway-contract.md](gateway-contract.md)；完整核查结论和实施次序见 [研究报告](../../docs/plans/2026-11-08-web-remote-adapter.md)；本次实际结果见 [verification.json](verification.json)。

上游来源和许可：`upstream/manifest.json` 记录逐文件公开 URL、固定 commit 和哈希；RustDesk 客户端的原始 AGPLv3 许可保存在 `upstream/LICENSE-client`，Server OSS 的原始许可保存在 `upstream/LICENSE-server`。hbb_common 文件来自客户端固定的子模块，不另行声称存在宽松许可。未复制官方未公开的 `flutter/web/js/`、Server Pro 或付费 Web V2 组件。
