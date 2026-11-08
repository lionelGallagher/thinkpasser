# 设备健康与恢复契约原型

此目录包含独立健康契约与可运行的本地服务端/Agent 参考链路，尚未接入产品。参考链路只监听回环地址，使用签名消息和 SQLite 日志；真实采集器、重启执行器与托管商连接均未接入。默认适配器明确返回 `not_configured`；测试通过不代表已恢复任何真实机器。

技术调查与实施方案见 [Mac 长期运行失联调查](../../docs/plans/2026-11-08-mac-connection-reliability.md)。

运行验证：

```powershell
node --test backend/device-health/health-contract.test.cjs
node backend/device-health/reference-demo.cjs
node --test backend/device-health/health-contract.test.cjs backend/device-health/reference-runtime.test.cjs
```

协议、端点、身份握手、命令去重和结果状态详见 [protocol-v1.md](protocol-v1.md)。Demo 只用虚构机器身份，明确输出未接入，不执行本机或远端系统动作。

## 边界与身份

“管理端”是平台内部运营后台；“客户控制台”是客户的电脑列表与操作入口。客户控制台不能访问内部管理 API 或托管商凭据。已确认客户权限为：主账号可重启旗下电脑，子账号可重启分配给自己的电脑。内部运营人员必须同时具有 `devices:recover` 权限及相应租户范围。

`principal` 必须由服务端认证模块产生，`device` 必须从当前设备分配和可信库存读取，不能直接采用请求 JSON。`authenticated: true` 只是本原型的输入约定，不能代替真正的登录验证。每次派发重新授权；不得凭客户端角色、电脑 ID 或设备自己上报的租户信息授权。

## 健康输入

管理 Agent 独立于 RustDesk 进程，通过平台自己的受认证 HTTPS/mTLS 连接发送心跳。与 RustDesk 分进程、分服务、分后端入口，但仍可能共用整机、网卡和公网，无法解决整机或网络彻底故障。

输入由服务端校验并归一化，例如：

```json
{
  "schemaVersion": 1,
  "deviceId": "mac-1",
  "bootId": "os-boot-identity",
  "agentInstanceId": "agent-start-identity",
  "sequence": 100,
  "serverReceivedAt": 1800000000000,
  "remote": {
    "sampleAgeMs": 0,
    "process": "running",
    "processInstanceId": "remote-process-start-identity",
    "ipc": "ok",
    "registration": "ok",
    "sessionProbe": "unknown"
  }
}
```

时间均为毫秒。`serverReceivedAt` 是服务端接收时间，不能由设备自由填写。`bootId` 来自操作系统启动身份；不能在 Agent 自己重启时重新生成。`agentInstanceId`、`processInstanceId` 分别表示各自一次启动，不能仅用可复用的 PID。停止的远控进程可由 Agent 提供持久保存的最近启动身份，作为带条件的启动目标；从未观察到身份时本原型拒绝派发，需要接入层先完成基线采集。

建议心跳周期为 15 秒；45 秒标记 `stale`，120 秒标记 `unreachable`。这些是待压测的产品参数，不是上游默认配置，也不是故障原因判断。远控采样本身过期时，即使管理心跳在线，远控状态也回到 `unknown`。

`process` 只说明进程状态；`ipc` 是本机带超时的协议应答；`registration` 是真实 ID 服务注册应答；`sessionProbe` 是受权限控制、不会接管客户会话的访问验证结果。尚未实现这种验证时必须填 `unknown`。本原型只有四项均正常才报告 `reachable`，其余分别为 `degraded`、`unverified` 或 `unknown`，不把 PID 存在或 TCP 端口通当作桌面可用。

生产接入必须为每台设备持久化最近 `(bootId, agentInstanceId, sequence)`，拒绝同一实例中的重复和倒序心跳，并在接入握手时验证新实例身份；不能让旧心跳覆盖新状态。本地参考链路已实现 SQLite 持久化、HMAC 握手和会话轮换，但未接入生产注册/证书服务。未采集真实 CPU、内存、FD、连接、睡眠或权限指标；这些观测字段及采集方案写在调查文档中。

## 恢复调用

`planRecovery` 校验权限、能力、在线状态、30 秒内命令期限、启动身份及中断确认，返回不可变命令。全部恢复请求当前仅接受人工发起。`dispatchRecovery` 每次重新生成计划，然后调用注入的适配器，不自动升级到另一恢复层。

| 动作 | 路径与前提 | 必需确认 |
| --- | --- | --- |
| `restart_remote` | 独立 Agent 在线；目标远控启动身份匹配；有受限服务控制权限 | `acknowledgeSessionDisconnect` |
| `reboot_os` | 独立 Agent 在线；OS 和 Agent 启动身份匹配；有整机重启权限 | `acknowledgeTaskInterruption` |
| `provider_reboot` | 平台供机；已实际接入提供商；可信库存绑定 adapter/machineRef；保存最近 OS 启动身份 | `acknowledgeTaskInterruption` |

客户“重启电脑”应转成经过服务端选择和授权的整机重启请求，不得悄悄解释为仅重启 RustDesk。运营后台可单独提供修复远控服务动作。此处定义能力，未实现任一界面。

适配器唯一接受成功回执格式为 `{ status: 'accepted', operationId: '...' }`；其含义仅为执行端接单。`rejected`、`not_configured` 原样呈现；超时/异常返回 `unknown`，因为命令有可能已经发出，不能直接重试造成二次整机重启。适配器直接返回 `completed` 会被判为无效回执。

`verifyRecovery` 只接收已接单操作与新的可信心跳。远控重启需要相同 OS 内远控进程启动身份变化，OS/带外重启需要 OS 启动身份变化。观察到重启效果与恢复桌面访问分别记录；只有新的访问验证通过才给出 `verification: recovered`。这是观测证据，不声称排除了同时发生的人工重启。观察窗口结束仍无证据应由接入层记为 `unknown` 并提示人工检查，不能填成功。

## 上线前必须补齐的执行层

本原型有意不持有执行凭据，不发送 shell 命令。真实 Agent 和提供商适配器必须实现以下边界后才能启用能力：

- 客户入口建议 `POST /v1/devices/{id}/recovery-requests`，内部入口建议 `POST /internal/v1/devices/{id}/recovery-commands`；二者分别认证，统一在服务端按最新分配授权。返回操作 ID 和 `GET .../recovery-operations/{operationId}` 状态，不同步返回“已恢复”。
- 准备阶段把基线、目标、动作、中断提示生成短时一次性确认令牌；执行阶段验证令牌绑定当前登录、设备、分配版本、动作和 OS/进程启动身份。本目录没有签发确认令牌，布尔确认字段须由该服务端确认流程产生，不能视为安全令牌。
- 在数据库事务中保存命令、审计和设备级恢复互斥锁；同一幂等键重放返回同一操作，参数变化拒绝；请求/派发均校验最新分配；回收或权限撤销取消未执行命令。不与远控会话接管锁混用。
- Agent 验证设备专属签名、命令 ID、到期时间、当前 OS/进程启动身份和窄权限动作白名单；记录已执行命令 ID 后执行。禁止过期离线命令在恢复联网后补执行，禁止任意 shell。执行过程中状态不明时不自动换层或重试。
- 真实适配器固定绑定设备库存中的服务标签/提供商机器 ID；受限特权 helper 只允许已安装、已签名的服务与重启动作，拒绝任意可执行路径。提供商 API 必须有独立凭据和真实接单/查询实现，未接入保持 `configured: false`。
- 在设备上保存待重启命令的审计标记和启动前基线；服务端记录请求、授权、派发、接单、效果观测、访问验证、失败/不确定状态及操作者。日志脱敏，不携带开发任务内容或账号密钥。

参考链路已实现本地持久化、HMAC 签名、防重放、命令去重、失联/执行超时及回报重传；一次性确认令牌、生产身份/证书、真实采集与特权执行、独立访问验证及提供商控制仍未接入。不可直接作为生产恢复控制面部署。本参考链路不提供产品页面，不修改真实 RustDesk 运行路径或执行实际机器动作。

供应商门户的硬件所有权与客户使用分配必须分别记录；供应商身份默认无客户远控或恢复权限。客户有 OS 管理权时，机内 Agent 不是到期强隔离/擦盘的独立信任边界。租赁全生命周期能力要求及公开供机 API 核查见调查文档；[提供商能力示例](provider-capabilities.example.json) 所有适配器均为 `configured: false`，文档中存在 API 不代表我们已接入。
