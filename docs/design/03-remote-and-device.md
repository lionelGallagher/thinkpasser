# 远控、机器密码与设备生命周期

## 凭据和纳管

平台登录、RustDesk连接、OS登录和Claude/Codex登录是四套凭据。deviceId 是平台稳定机器标识，RustDesk ID 是底层寻址信息，二者均不是密码。每台电脑绑定已验证的管理身份、供方机器引用、当前 allocation／assignment、credentialVersion 和受控 secretRef。

供应商申请纳管 → 平台批准资源 → 发短时单次 enrollment 令牌 → 设备本机生成管理密钥并注册 → 核验供方归属与身份 → 测试远控、恢复、只读导出和重置能力 → 可售。enrollment 令牌只用于指定资源注册，不能开放任意机器自报已有客户归属。

## 密码生命周期

备机生成至少128位随机熵的每机独立秘密，存受控凭据服务，device_credentials 为 pending。通过受限设备通道下发目标版本；设备写入本机持久操作日志后执行原生设置接口，回报实际认证验证结果。服务器收到可信回执且核验后才将该版本设 active，旧版 retired。

推荐主流程是客户在已分配电脑列表一键连接，普通界面不展示长期密码；此为实施建议，不是用户已经确认的展示规则。设备密码不是平台登录密码，不能按账号复制给多台机器。

设置结果未知时不得假定旧密码或新密码已生效，阻止新交付／换人，进入恢复核验。同一轮换 operationId 只执行一次；旧版本命令不能覆盖新版本。不要将明文密码作为CLI参数、URL、日志、共享镜像内容；首选固定fork的受保护原生接口。本机 --password 参数的存在不证明已实现远程批量改密。

## T07 连接与接管

1. 当前登录账号提交 machineId、client 类型和临时公钥；服务器从身份系统获取 actor，不接受自报主体。
2. 锁 lease／allocation／assignment／当前 session，校验账号有效、实际分配、设备身份与能力、已交付、now < expiresAt、当前凭据已核验。AI不是此判断条件。
3. 有有效旧会话返回409 TAKEOVER_REQUIRED＋旧sessionId。确认绑定当前session和版本，旧确认不能作用于后来产生的会话。
4. 旧会话进入 closing，增加 allocation.sessionEpoch，发送撤销；设备释放键鼠，关闭画面、输入、声音、剪贴板和文件通道。确认关闭前不创建另一个可激活控制会话。
5. 旧会话 closed 后创建 pending；服务端发短时签名授权。被控适配层验证签名、device、lease／assignment／credential版本、epoch、有效期、单次jti及客户端临时密钥持有。
6. 密钥挑战绑定服务端nonce、session、epoch、双方通道身份与当前设备身份。验证成功并完成RustDesk底层认证后，设备签名回报SessionReady；后端重核提交后发送SessionActivated，设备确认开放并回报SessionActivationAck，前端收到就绪及首帧才显示已连接。
7. 每10秒续租、最长30秒控制授权是工程初值，授权截止取 min(now＋30秒,computer.expiresAt)。签名时刻和被控端的租期上限均需校验；断线重新授权，不缓存永久业务资格。
8. 平台停用、到期、解绑或接管时主动撤销；通知失败也不得超过设备已验证的本地授权期限。离线恢复先同步epoch与当前绑定，不能重放旧grant。

生产授权消息采用标准JWS、明确Ed25519算法标识（RFC 9864），含 kid、iss、aud、sub、tenantId、deviceId、leaseId、leaseVersion、assignmentId／version、credentialVersion、sid、epoch、jti、iat／exp、cnf和capabilities。JWT时间字段按标准使用秒，业务API毫秒需显式转换并向下取整，避免混用。现有 reference grant 是独立参考编码，不能直接当最终JWS实现。不得自制加密协议或将业务grant塞进上游password字段。

## 原生接入端口

| 接口 | 输入 | 结果 |
| --- | --- | --- |
| setDeviceCredential | operationId、expectedVersion、targetVersion、受控秘密 | effect_reported／unknown；需受控认证探针后verified |
| openAuthorizedSession | 已验证grant、客户端公钥与通道绑定 | pending；真实设备握手后active |
| closeAuthorizedSession | sid、epoch、reason | 全通道关闭回执，不退出远端开发任务 |
| renewAuthorizedSession | 新短时grant、挑战证明 | 更新上限，禁止超过电脑截止 |
| observeDesktop | 目标身份、boot／remote实例 | pass／fail／unknown，不能只返回进程存在 |
| exportReadOnly | exportJob、路径清单、租约版本 | 只读分块、哈希与取消，不提供shell |
| resetToTemplate | 经核验重置操作、templateVersion | effect_reported，独立验收后可回库 |

这些接口需要在固定fork中真正实现并核验守卫位置；现有裁剪补丁未实现生产授权。客户有OS管理员权限时，机内Agent可被停止，因此平台入口撤权与供方外部隔离／电源／镜像能力共同构成履约边界。

## 网页数据路径

首选验证被控侧适配器读取RustDesk已编码帧，复用自有授权信令，经WebRTC发送浏览器可解码的数据。Java负责业务与信令授权，媒体不默认经过Java业务线程。DataChannel承载编码帧时需帧号、片段序号、时间戳、关键帧、背压、过期丢帧与关键帧请求，不能无限排队。

VP8/WebCodecs只是当前合成验证起点；需要能力协商和不支持时的明确错误。键鼠、中文组合输入、剪贴板、文件和系统声音共用会话授权。只裁剪摄像头／麦克风等不需要能力，保留系统声音。

云端RustDesk网关可作候选，但会接触桌面明文，需独立选择信任模型。直连／TURN都要验证设备身份和密钥绑定；不能用“有WebRTC”代替端到端安全证明。官方Pro和Web V2不是已取得源码。详见[会话契约](../../web/remote-desktop/gateway-contract.md)。

## T08 设备命令

commandId、machineId、kind、issuedAt／expiresAt、expectedBootId、leaseVersion、assignmentVersion、credentialVersion、targetVersion、操作者和原因组成受签名命令。动作白名单为 restart_remote、reboot_os、rotate_credential、close_session、reset_machine、verify_machine，载荷按动作分别校验；不提供任意shell。

Agent执行前持久化claimed，回执丢失重发同一结果，不重复副作用；claimed后进程中断标unknown。queued到期可以expired，已经送达／接单后超时只能unknown。unknown占用破坏性动作互斥，先查询实际状态或人工核查；不自动升级到重启OS或重装。

恢复完成需要新boot／服务实例＋真实桌面探针；改密需要当前版本认证探针；清理需要镜像／数据／登录状态验收。设备说“接单”不显示“已恢复／已清理”。

## T09 仅导出

now < expiresAt 时正常文件权限；expiresAt <= now < expiresAt＋3天时只能受限只读导出。按当前实际使用账号授权，主账号团队管理权不自动得到子账号文件。主账号可续费或处理分配，不能借导出API绕过桌面访问限制。

路径由设备端按允许根目录规范化，拒绝路径穿越、符号链接越界、系统凭据与其他用户目录；清单中保留文件大小与分块哈希。短时下载授权绑定actor／lease／job，不在公开URL放长期秘密。导出到期后取消，临时包有独立删除期限。平台默认无备份。

## T13 设备上报

生产使用独立设备证书／mTLS，身份从证书映射，不接受body更改machine归属。bootId、agentInstanceId、严格递增sequence和服务端接收时间防止旧心跳续命。签名回执关联commandId和交付挑战；旧boot结果只可归档，不能覆盖新状态。

现有[健康参考协议](../../backend/device-health/protocol-v1.md)使用HMAC和SQLite验证局部状态，生产mTLS／标准签名是后续契约，不将两者混写为已接入。管理心跳、远控服务、注册链路和真实桌面探针分别显示。

## 生产消息和关闭语义

字段及签名处理顺序见[远控协议实施规范](10-remote-protocol.md)。创建连接返回 ConnectionAttempt；旧 session 撤权用 revokedAt 单独记录，传输仍为 closing 并占独占位，可信 CloseAck 后才 closed。正常续费不递增撤权 epoch；设备先同步最新策略后重连。

三天导出有独立 manifest／分块／取消接口，长流到时主动中断；只让下载 URL 过期不足以完成截止。清理先关闭导出，再执行版本栅栏和独立验收；失败或未知隔离，不回可售库存。
