# 原生构建与打包集成

当前提供固定源码补丁、可运行的 Python 集成检查和未启用的 CI 模板。没有安装 Rust/Flutter 工具链，没有原生编译、证书签名、公证、MSI 安装或外部 CI 运行记录。

## 固定依赖与工作目录

完整检出 RustDesk `23e5bb471a040d62f0a6ad52591fb30784265b73` 及递归子模块。按该提交的 `.github/workflows/flutter-build.yml` 准备对应平台原生依赖：Flutter `3.24.5`、Mac Rust `1.81`、Windows 工作流 Rust `1.75`，以及其 VCPKG 提交 `9e593bb18ea69cc5095e012465dcd675a822ed0d`。这些是上游声明值，尚未在本产品实编验证；版本调整要记录实际构建结果。复用上游 bridge 生成文件及依赖修补步骤，不跨版本重新生成 bridge。

源文件快照只能用于本仓库的补丁验证，不能代替完整检出。构建与 MSI 预处理均在单独工作树进行；上游 MSI 预处理会就地改写文件，每次使用干净的打包工作树，避免重置其他人在编辑的文件。

## 单一产品构建入口

补丁给上游 `build.py` 增加 `--thinkpasser`。该参数同时选择 Cargo `thinkpasser,flutter`，在 Mac 自动加 `screencapturekit`，并把产品 Info.plist 与 entitlements 作为 Flutter/Xcode 构建设置输入。产品版禁止 `--skip-cargo`，避免将普通客户端旧 DLL/dylib 装进产品包。

实际编译前需要三个部署变量：`THINKPASSER_RENDEZVOUS_SERVER`、`THINKPASSER_RELAY_SERVER`、`THINKPASSER_SERVER_KEY`。前两个是 RustDesk 的 `host[:port]`，第三个是对应的 32 字节 Ed25519 公钥的 Base64 文本。缺少时构建失败；`env!` 也阻止手工 Cargo 编译悄悄退回公共服务器。不要把平台商城 API 填进 RustDesk Pro 的 `api-server` 字段。

Windows 复用上游命令并增加产品参数：

```powershell
python build.py --thinkpasser --flutter --portable --skip-portable-pack --hwcodec
$features = python build.py --thinkpasser --flutter --hwcodec --print-features
cargo test --locked --release --lib product_policy --features "$features"
```

Mac 使用本机架构的工作树，复用上游原生依赖和构建方式：

```bash
python3 build.py --thinkpasser --flutter --hwcodec --unix-file-copy-paste
features=$(python3 build.py --thinkpasser --flutter --hwcodec --unix-file-copy-paste --print-features)
cargo test --locked --release --lib product_policy --features "$features"
```

两端都需在 `flutter/` 中运行 `flutter test test/product_return_router_test.dart`。Rust 测试验证音频方向、普通文件与打印任务区分、正常关闭和排除功能清理；Dart 测试验证状态匹配、重放、超时和旧 URI 拒绝。这里仅准备测试，尚未执行。

构建后调用 `verify_product_artifact.py`，由真实原生程序的 `--product-policy` 回报精确策略摘要，同时检查包内排除文件。这个自描述检查用于发现错装产物，不能代替真实远控行为验证。诊断明确回报 `businessConnectionGrantEnforced=false`，当前构建不能当成完成了租户鉴权的发布版本。

## Windows 安装器

EXE 安装、静默安装和更新路径都拒绝安装打印机；安装向导不展示打印选项。原生 `main_set_common(install-printer)`、打印响应和两向文件任务处理另有不可由配置打开的限制。旧打印机卸载保留作清理。

MSI 使用打好补丁的 `res/msi/preprocess.py --thinkpasser`，其他参数沿用上游。它先运行分发目录中真实 EXE 的 `--product-policy`，核对精确摘要，拒绝打印驱动目录或 `printer_driver_adapter.dll`；随后移除安装打印动作、相关属性、复选框与旧任意连接注册。即使命令行传 `PRINTER=1`，产品变换后的 MSI 源也没有打印安装调度。服务创建、停止与卸载，以及旧打印机卸载调度保持。

未运行 WiX/MSBuild，也未做 `PRINTER=1` 的 MSI 实装验证。不要复制上游工作流下载打印驱动的步骤；如果供应链中混入这些文件，产品包检查必须失败。

旧 RustDesk URI 与 `--play` 文件连接入口不再注册。产品只注册独立回跳 scheme；旧机器上已经存在的官方或其他安装的注册表状态没有在此工作区修改。迁移时需按安装所有权处理，不能删除别的应用注册。

## Mac 签名

产品构建从 `res/thinkpasser/macos-profile/` 取 Info.plist 和 entitlements，保留屏幕采集与辅助功能路径，禁止麦克风用途说明和 audio-input entitlement。上游签名脚本原来强制 audio-input=true；补丁增加产品分支，签名前拒绝不合规输入，签后再检查实际签名 entitlement。普通上游构建仍走原检查。

有证书时调用上游 `.github/scripts/sign-macos-app.sh`，第三个参数传产品 `Release.entitlements`。签名顺序仍是内部 Mach-O/框架、service、外层 app，随后 `codesign --verify`。实际 Developer ID、钥匙串、时间戳、公证和 DMG 步骤沿用受控发布环境；本次没有调用这些工具或服务。

产品最终名称、Bundle ID、Windows 安装产品标识与签名身份尚未确定。当前临时产物路径沿用上游文件名，不能拿原厂命名的开发产物对外分发。

## 登录与收银回跳

scheme 从能力策略编译并同步进 Windows 注册和 Mac plist。只有 `auth/return` 与 `checkout/return`，参数限 `code,state`；不接受 peer、命令、密码、价格、权益或订单状态。`productReturnRouter.begin(...)` 为发起流程登记 32 随机字节状态、超时和服务端兑换回调；匹配后在等待兑换前一次性消费状态，未知、重复和过期返回无效。

主项目在登录/收银流程发起时登记此接口；待返回流程须绑定发起账号和租户，兑换时再次核对，避免账号切换后套用旧流程。兑换回调必须由平台服务端验证 code、账号和订单，不能直接修改权益。收银入口与服务端都需执行主账号可购买、子账号不可购买的规则。此模块没有支付、账号切换或订单实现。当前状态只存在本进程，退出后回跳会失败；若要恢复跨重启流程，主项目须用系统安全存储接入等价的一次性状态校验。

## CI 模板与发布条件

`ci/native-build.yml.in` 只有手动入口，位于非工作流目录，使用预装依赖的 Windows/Mac 专用工作节点，不发布或上传产物。未推送或触发。它使用同一构建脚本的 feature 查询跑 Rust 测试，单独跑回跳测试，再核查真实编译产物。

发布仍需真实 Windows/Mac 对接测试、权限与声音拒绝路径、打印安装拒绝、更新/卸载、中文/文件/剪贴板、正常断开与接管验证，以及平台设备绑定授权和品牌/证书集成。网页内核由独立专项继续处理。
