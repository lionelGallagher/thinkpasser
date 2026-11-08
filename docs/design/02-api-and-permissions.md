# API、身份与权限详细设计

## 契约入口与公共规则

[OpenAPI](../../backend/contracts/openapi.json) 给出请求／响应字段、路径、角色和 T01—T13 事务归属；均为待实现接口。生产域名由配置提供，example.invalid 只是占位。用 Spring MVC Controller＋校验 DTO，Application Service 承担授权及事务，Repository 承担 SQL；Controller 不直接更新资金或租期。

URL 前缀 /v1；成功返回契约对象；异步动作返回 202 和真实状态，前端查询 operation。列表使用不透明 cursor、默认20、最多100条，排序为 createdAt＋id；服务端从可信身份筛选租户和供应商。版本变更比较 expectedVersion，不用最后写入覆盖竞争。

已认证写请求使用 Idempotency-Key，服务端按 actor＋operation＋key 绑定请求哈希。同键同参数返回同一业务结果；异参409。密码、token、签名及可解密秘密不写入可重放响应缓存。Cookie 写请求校验 CSRF／Origin；原生 access token 不使用浏览器 Cookie 隐式跨站授权。

| HTTP | 错误码及含义 |
| --- | --- |
| 400 | INVALID_REQUEST、AUTH_CHALLENGE_INVALID |
| 401 | LOGIN_REQUIRED、LOGIN_EXPIRED |
| 403 | ROLE_DENIED、DESKTOP_NOT_ASSIGNED、ACCOUNT_DISABLED |
| 404 | RESOURCE_NOT_FOUND；跨租户资源统一不可见 |
| 409 | VERSION_CONFLICT、ALREADY_ASSIGNED、TAKEOVER_REQUIRED、STALE_TAKEOVER、QUOTE_STALE、IDEMPOTENCY_CONFLICT、OPERATION_IN_PROGRESS |
| 422 | COMPUTER_EXPIRED、RETENTION_ENDED、RESET_ALREADY_STARTED、DISCLOSURE_REQUIRED、INVALID_SERVICE_INTERVAL |
| 429 | RATE_LIMITED，附合理重试时间 |
| 503 | PROVIDER_UNAVAILABLE、DEVICE_UNREACHABLE、ADAPTER_NOT_CONFIGURED |

Error 为 code、message、traceId、retryable；TAKEOVER_REQUIRED 的 details.sessionId 为当前旧会话，VERSION_CONFLICT 可返回 currentVersion。不向客户端返回原始数据库错误或秘密。

## 权限矩阵

| 行为 | 主账号 | 子账号 | 平台运营 | 供应商 |
| --- | --- | --- | --- | --- |
| 购买／续费／AI加购／自动续费 | 自己组织 | 无 | 查看、按审核流程处理 | 无 |
| 建子账号／重置／分配 | 自己组织 | 无 | 运营受限功能，审计 | 无 |
| 进入桌面、剪贴板、文件、声音 | 仅实际分给自己的电脑 | 仅自己的电脑 | 无自动桌面权限 | 无自动桌面权限 |
| 重启 | 自己组织电脑 | 自己电脑 | 受限恢复权限 | 仅被派发的维护任务，不获得默认入口 |
| 重装 | 自己组织电脑，二次确认 | 无 | 受审计运营流程 | 接获受限供方任务 |
| 工单 | 自己组织 | 自己电脑 | 核实与处理 | 仅供货关联任务 |
| 资源／开通结果 | 查看自己的交付 | 查看自己的权益状态 | 审核及验收 | 仅自身资源和任务 |
| 退款 | 查看原付款订单、确认售后选择 | 无资金操作 | 核定、系统执行 | 自身结算查询 |

到期不禁平台登录。主账号仍能续费、购买、提交工单；子账号仍能看自己服务状态。三天导出额外检查 lease 和路径，不能因此恢复桌面。

## T01 身份

登录支持邮箱密码或邮箱验证码，二选一；验证码绑定 email、purpose、challenge，5分钟为工程初值，单次消费、尝试次数与频率受限。注册创建一个 customer tenant 和 main。登录邮箱规范化且全局唯一，多个登录账号保存在各自独立会话槽内，切换不合并权限。供应商／平台运营账号由各自入驻和内部流程建立，不开放公众注册为 admin。

平台密码使用经库实现的自适应哈希。浏览器 token 存 HttpOnly、Secure、SameSite Cookie；原生 refresh token 存 OS 密钥库。access token 建议15分钟，refresh 最长30天为可调技术值，轮换和重放撤销按 family 记录；账号 authVersion 变化撤销旧登录并通知远控撤销。刷新凭 refresh 身份验证，不要求仍有效的 access token。

changePassword 要当前密码（首次强制修改同样验证初始密码）；resetOwnPassword 要邮箱 challengeId、code、newPassword。邮箱重置不允许子账号绕过主账号既定重置流程。成功后撤销旧登录和远控，重新登录。

原生浏览器登录／支付回跳使用一次性 code＋state，兑换绑定发起身份、PKCE verifier、purpose 和短期挑战；不把长期token放自定义URI。具体 native-start 发起页面与路由由现有回跳模板集成，兑换端点不是单独的匿名登录后门。

## T02 子账号

main 直接创建 sub，服务端写同 tenant 和 parent；主账号设置初始密码，mustChangePassword=true。首次只允许修改密码和退出，修改完成后开放正常入口。main 重置时同样强制下次修改并增加 authVersion。

停用 sub 或收回机器时，撤销其平台授权与所有有效远控、释放已按下键鼠，保持远端任务运行。停用不自动退款、清盘或取消外部订阅。

## 条件校验补充

- new quote 需 productId、quantity；renewal／addon 需 leaseId，续费目标必须归该 main 的组织。addon 至少一种 AI；同一有效区间的重复 AI 禁止重买。
- 客户提供 AI 邮箱时需 email；平台准备时生成任务后记录目标，不让供方擅自替换。
- 多台订单的AI目标按unitOrdinal＋provider对应每个单元；未指定时平台逐台准备。实施默认不自动把同一订阅账号共用到不同客户电脑，客户指定邮箱按台提供；这不限制同一付款卡按真实规则支付多个不同账号。
- reassign／unassign 需 environmentMode(preserve_files/reset) 与短时 confirmation。主账号可保留文件，远控秘密与私人登录处理独立。
- reset_machine 仅 main／被授权 admin，须确认影响和绑定版本；sub 请求永远拒绝。
- reported 供货任务必须给 evidenceRef 与 externalRef；供方报告只进入 reported，只有平台验收进入 verified。
- ticket 的 ai_fault 必须指定当前租约对应的 AI 项。computer_fault 不因前端漏带 AI 字段而丢失已购 AI 的核定。
- 自动续费必须已显式开启，且支付渠道存在有效代扣授权；无代扣能力时提示人工续费，不能反复模拟成功扣款。

## Java 代码职责

根包建议 com.thinkpasser：identity、catalog、commerce、lease、supply、payment、remote、device、aftersale、audit。每域设 api／application／domain／infrastructure；跨域通过明确服务接口调用，不在页面或 Controller 拼业务。

事务在 Application Service 的独立 Bean 方法上执行；外部支付、供方和设备调用在提交后由 worker 执行。凭据服务、PaymentProvider、SupplierProvider、RemoteHostAdapter、MachineLifecycleProvider 都是端口接口，实现未配置时返回 ADAPTER_NOT_CONFIGURED。生产默认禁止测试适配器。Spring 事务边界按[官方说明](https://docs.spring.io/spring-framework/reference/data-access/transaction/declarative/annotations.html)验证，避免同类内部调用绕过代理。
