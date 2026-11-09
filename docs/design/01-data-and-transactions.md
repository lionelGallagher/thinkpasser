# 数据关系与事务详细设计

## 个人与团队空间

customer tenant增加workspace_kind(personal/team)，默认personal。accounts.role的main在个人模式是内部拥有者权限，界面不称主账号；personal禁止新增sub。开通团队同一tenant内更新模式／版本，保留全部订单、租约和AI。T12个人首次交付锁原付款人控制位并自动绑定本人；已有机则走显式personalActivation，不自动销毁旧环境。详见[个人路径与复核](11-review-and-personal-workspace.md)。

## 数据约定

MySQL InnoDB，UTF-8。UUID 在 API 为字符串；数据库首期用 CHAR(36) ASCII，避免跨语言二进制排序歧义。金额 BIGINT 最小货币单位＋三字母币种；Java 运算使用 long／BigInteger，累计分摊先算整数分子后统一取整。时间 BIGINT UTC 毫秒，与现有租期纯规则一致；区间统一左闭右开，恰好到期即禁止完整远控。

业务状态用受约束字符串，版本 BIGINT；HTTP 字段 camelCase，数据库 snake_case。所有租户资源查询同时限制可信 tenantId；客户不可提交 actor／supplier／tenant 覆盖认证身份。历史记录停用或结束，不物理删除资金、租约和分配历史。

## 表与关键字段

以下是逻辑表设计，不是已经执行的迁移。ID 默认主键；有租户的数据保留 tenant_id，审计数据保留 created_at。敏感凭据字段只保存安全引用。

| 表 | 必要字段与关系 |
| --- | --- |
| tenants | id、kind(customer/supplier/platform)、name |
| accounts | tenant_id、role(main/sub/supplier/admin)、parent_id、email、password_hash、must_change_password、enabled、auth_version、version；sub 的父账号必须是同租户 main |
| login_sessions | account_id、refresh_hash、family_id、auth_version、expires_at、revoked_at；保存轮换与重放状态 |
| auth_challenges | purpose、subject_hash、code_hash、expires_at、attempts、consumed_at；邮件码与原生回跳码不同 purpose |
| suppliers | tenant_id、status、computer_supply、subscription_supply、self_operated、capabilities、version |
| supplier_resources | supplier_id、kind(computer/card_subscription)、external_ref、safe_metadata、capabilities、quote_currency、cost_minor、lead_time_ms、state、version |
| computers | supplier_id、supplier_machine_ref、os、country、cpu、memory_gb、disk_gb、inventory_state、template_version、rustdesk_id、identity_key_ref、boot_id、last_seen_at、version |
| products | 名称、OS／地区／硬件选择条件、period_ms、currency、computer_price_minor、可选 Claude/Codex 标准价、供应匹配条件、enabled、version |
| quotes | tenant_id、payer_id、kind、目标 product 或 lease、选择 AI、数量、价格／条款／实际期限 snapshot、disclosure_hash、expires_at、consumed_at |
| orders | tenant_id、payer_id、quote_id、kind(new/renewal/ai_addon)、status、amount_minor、currency、snapshot、version |
| delivery_units | order_id、ordinal、status、required_ai、computer_ready、验证证据引用、delivered_at、version；一台一单元 |
| order_items | order_id、unit_id、kind(computer/claude/codex)、amount_minor；同单元同种项目唯一 |
| leases | tenant_id、首次 unit_id、state、starts_at、expires_at、reset_started_at、auto_renew、renewal_selection、version |
| lease_events | lease_id、kind、source_id、old_expires_at、new_expires_at、reason；同来源只应用一次 |
| lease_allocations | lease_id、computer_id、allocated_at、released_at、version、session_epoch；物理机与租约分开，故障换机更换 allocation |
| assignments | allocation_id、account_id、assigned_at、released_at、version；同租户账户分配，保留历史 |
| ai_accounts | tenant_id、provider、指定 email、source(platform/customer)、auth_secret_ref；不是平台账号 |
| ai_entitlements | unit_id、order_item_id、lease_id、ai_account_id、provider、state、promised_from／until、original_paid_minor、refunded_minor、upstream_until、verified_at、version |
| supplier_tasks | supplier_id、supplier_resource_id、unit_id、可选 ai_entitlement_id、kind、state、cost_minor／currency、external_ref、evidence_ref、deadline_at、version |
| payments | order_id、provider、provider_ref、state、amount_minor／currency、reserved_refund_minor、refunded_minor |
| provider_events | provider、event_ref、payload_hash、verified_at、processed_at；渠道事件去重 |
| refunds / refund_items | 原 payment、ticket、原因、幂等键、amount_minor、state、provider_ref；每项分摊到原 order_item |
| tickets | tenant_id、lease_id、reporter_id、可选 AI 项、kind、state、reported_at、verified_from／until、repair_deadline_at、version |
| compensation_intervals | ticket_id、lease_id、可选 AI 项、kind(computer_time/ai_cash)、starts_at／ends_at、approved_at |
| device_credentials | computer_id、version、state、secret_ref、operation_id、verified_at；不保存可展示的明文列 |
| remote_sessions / used_grants | assignment、allocation、account、lease_version、credential_version、epoch、client_key_thumbprint、state、expires_at；单次 jti 消费记录 |
| device_identities | computer_id、证书／公钥安全引用、enrollment_version、status、valid_until；供方归属不可由设备自报 |
| operations / confirmations | 目标、动作、操作者、预期租约／分配／凭据／启动版本、状态、截止、证据；确认令牌保存哈希及消费时间 |
| export_jobs | lease_id、allocation_id、requested_by、state、路径清单／结果安全引用、expires_at |
| idempotency_keys / outbox | actor＋operation＋key＋request_hash＋已定响应；topic＋aggregate＋version＋载荷＋投递次数 |
| audit_events / supplier_ledger | 关联 trace、行为与脱敏结果；供方 task、成本／付款／调整、币种和外部凭证 |

新增 AI 加购单元可以引用已有 lease；不能用“AI 单元引用的租约必须由本单元首次创建”这种约束，误拒已有电脑加购。换故障机保留 lease，切换 allocation；主动换购创建新 lease。

## MySQL 约束和锁

- 账号邮箱按规范化登录标识唯一；子账号不得跨租户指定父账号。父角色和权限在服务事务内核对。
- order_item 必须关联同一 order／tenant 的 unit。AI 项还必须关联同租户、同 provider、同 unit 的 AI 类型 order_item；不能拿 computer 项充当 AI 付款依据。
- 同时只允许一个未结束的账号分配、机器 allocation、租约 allocation 和当前机器凭据。MySQL 用生成列：有效时为 account_id／computer_id／lease_id，结束后为 NULL，再建 UNIQUE。不能直接搬用带 WHERE 的部分索引。
- 一个电脑／账号同时最多一个 pending、active 或 closing 控制会话。生成列包含这些状态；接管先关闭旧会话，再建立新 pending，不用短暂双 active 绕过唯一约束。
- 支付渠道交易号、回调事件号、quote 消费、补时来源、退款幂等键分别唯一。退款预留＋已退款不超过原 payment 金额；每项分摊也不能超过对应原实付。
- AI 原实付及首次承诺区间一旦确定不可随补时改写。上游期限独立可更新。数据库 CHECK 只处理本行条件；跨行合计需锁定聚合根后校验。
- 推荐事务隔离 READ COMMITTED，并显式锁行。共享锁顺序：order → unit → lease → allocation → computer → account/assignment → AI 项 → payment/refund；同类按 ID 排序。发现死锁只重试完整无外部副作用事务。
- 所有扫描都使用索引、有限批次；expiry(state,expires_at)、outbox(delivered_at,available_at)、task(supplier_id,state)、operation(computer_id,state)。

生成列、唯一索引与锁行为需要真实 MySQL 集成和双连接竞争验证，不能拿内存 Map 或另一个数据库的通过代替。[生成列](https://dev.mysql.com/doc/refman/8.4/en/create-table-generated-columns.html)、[索引](https://dev.mysql.com/doc/refman/8.4/en/create-index.html)、[锁定读取](https://dev.mysql.com/doc/refman/8.4/en/innodb-locking-reads.html)

## T03 报价与下单

主账号选择商品、数量及 AI；new 必须有 productId／quantity，renewal／ai_addon 必须有 leaseId，不能同时携带两类目标。AI 加购至少选一种且不可重复购买重叠的同 provider 平台权益。客户端只提交选择，服务端生成报价、可供货检查、实际期限和条款哈希。

消费报价时锁 quote 和匹配库存／供货容量，检查未过期、未消费、版本和所属付款人。生成订单、交付单元、项目及库存占用，同事务写 outbox。库存占用有截止；超时释放前检查真实支付状态。报价过期或版本变化返回 QUOTE_STALE，不能静默改价。

## T04 收款与退款

真实验签／渠道查询完成后，锁订单和支付，核对商户、原订单、币种、金额及事件唯一性；保存确认和后续任务同事务提交。回跳只触发查询。迟到支付遇库存失效必须重新核对，不能抢已出租机器。

续费收款需进入 T06 的同租约锁序，支付已确认但租约条件失效时保留 exception 和资金事实，进入退款／重新确认处理，不声称续费成功。外部资金事实不能因业务事务失败而被“回滚成未收款”。

退款先确定原 order、项目／服务段和 payment ID，再按统一锁序锁 order → unit／lease／项目段 → payment／refund，去重并预留额度（不得从 payment 反向锁订单），提交 outbox 后调用渠道；succeeded 将预留转已退款，明确失败释放预留，unknown 保留预留并查询。不得用新退款号盲重试结果未知的旧请求。

## T05 分配与换人

主账号管理同租户自己或子账号。首次分配要求租约有效、机器已交付、账号和机器均无有效冲突。主账号管理多台不取得多台桌面访问。

收回／换人先撤销原会话和 assignment；设备确认后更换分配／凭据版本。主账号可选保留文件软件或恢复初始环境，清理方式须确认；不能将“换人”一律理解成删除所有文件。两种方式均撤销旧远控凭据，旧使用者的私人第三方登录不能默认交给新使用者。租约专用 AI 的交接核验归供货任务处理。

## T06 续费补时和清理竞争

续费、补时、到期和清理锁同一 lease 与当前 allocation／computer。续费沿原 expires_at 增加所购时长；未到保留末尾且未开始 reset 才允许保原环境续费。每次修改增加 lease.version，写唯一 lease_event 及新到期任务。

清理任务携带 expectedLeaseVersion，执行前重新锁记录，检查当前版本、now >= expires_at＋3天、未被续费／补时、无互斥导出及重置状态；通过后先标 resetting，再发布设备动作。已开始清理的迟到付款不得承诺恢复旧环境。过期任务返回 STALE_OPERATION 而非擦盘。

## T12 首次交付

锁 order／unit／computer／所购 AI，检查付款确认、供方证据及真实电脑可达；所购 AI 须完成指定账号、登录和实际可用核验并覆盖承诺期。纯电脑无需等待 AI。

一次性记录 delivered_at=t、lease.starts_at=t、expires_at=t+所购周期；初始化 AI 承诺区间和租约专用资源，提交开放状态及通知 outbox。重复交付请求返回已有记录，不重置时间。交付后即计时，即使仍待主账号分配；多单元分别执行。

## 生产补充实体与约束

[生产蓝图](08-production-implementation.md)和新版 OpenAPI 为本节补充字段；不覆盖原订单事实。

| 表 | 必要字段与索引 |
| --- | --- |
| supplier_capabilities | supplier_id、capability、provider（供卡可空）、status、evidence_ref、valid_until、version；审核能力独立于账号状态 |
| supply_purchases / purchase_items | supplier、resource、数量、报价／合同 hash、unit_cost_minor、currency、fulfillment_state、payment_state、version；无需客户 task |
| payment_instrument_references | supplier、safe_ref、owner／holder／funder／custodian／authorized_operator、authorization_evidence_ref；无明文 PAN／CVV |
| fund_reservations | purchase／task、amount_minor、remaining_minor、currency、state、version；只代表内部资金占用 |
| upstream_operations / upstream_results | attempt、purchase／task、instrument_ref、target_account、external_operation_id、state；result 追加 event_id、outcome、实际金额币种、evidence_ref、late_result；外部结果号按供方范围唯一 |
| supplier_obligations / settlements | purchase／task、核定成本、预付抵扣、应付／实付、贷项、currency、凭证；自营不产生对自身应付 |
| payment_attempts / payment_receipts | order、provider、merchant、attempt、外部交易号、金额币种、received_at、application_state；渠道＋商户＋交易号唯一；orders.accepted_receipt_id 只接受一笔履约款 |
| service_segments | order_item、receipt、lease、kind、原实付、原承诺 from／until、refund_reserved_minor／refunded_minor、version；续费新增段，禁止覆盖旧段 |
| unit_resolutions / resolution_quotes | unit、reason、choice、fulfillment_version、逐项目退款／成本证据、disclosure_hash、expires_at、confirmation；同决策幂等 |
| supplier_task_attempts | task、ai_entitlement、target_account、resource、fulfillment_version、attempt_id、quote_snapshot、deadline、evidence；同权益同当前代际仅一执行 attempt |
| connection_attempts | actor、allocation、旧 session、state、operation_id、失败码、version；等待接管时不伪造新 session |
| remote_sessions | 原字段加 revoked_at／reason、connection_generation、connection_id、device_identity、policy_version；closing 仍占唯一控制位 |
| assignment_reservations | account、allocation、handoff_operation、state、version；当前分配和交接预留统一参与账号独占，不能分表各建唯一后仍允许各占一次 |
| export_ownership / export_files | 原使用账号、lease／allocation、job、file_id、受限相对路径、大小、chunk_size、chunk_hashes；历史导出归属独立于当前 assignment |
| enrollment_tokens / device_certificates | resource、token_hash、single_use、expires_at；device_identity、证书序列、公钥引用、有效期、撤销状态 |

账号独占的具体实现采用统一 `account_computer_slots(account_id PK, allocation_id UNIQUE, state active/pending_handoff, operation_id, version)`；与 assignments／reservation 历史在同一事务更新，不分别依赖两个表的唯一键。电脑到期撤销桌面分配后保留历史 exportOwner；保留期续费恢复分配时必须重新竞争 slot。

所有普通业务按既定全局锁序。外部收款事实先入 receipt／inbox，不持资金事实锁再反向锁 order；应用 worker 锁 order 起执行一次。纯供货事实同理异步影响交付，不能持 supplier 锁回锁 order。取消后迟到结果可记录真实成本，但旧 fulfillmentVersion 不能改变当前 unit。expectedVersion 冲突统一用 VERSION_CONFLICT。

退款跨多次续费时先读取相关 serviceSegment 的原 order／receipt ID，然后按稳定排序锁聚合根和项目，按各原区间计算、预留并分别原路退款。CHECK 只约束本行非负与单行上限，跨表归属、合计和不重叠期间由显式锁及真实 MySQL 测试保证。

remote_sessions 表示逻辑独占会话；新增 remote_connections(session_id、connection_id、generation、state、ready_at、closed_at、version) 表示每代实际传输。同 session 未关闭传输用生成列唯一约束。resume 保留逻辑 sid，只关闭旧 generation 后创建新 connection；整会话撤销时进入 session.closing，全部传输关闭后才 closed。SessionActivated／ActivationAck 记录在当前 connection，激活回执可幂等重发，不得解锁旧代次。

SupplyPurchase 返回服务端冻结 quoteHash／quoteVersion；审批回传该 hash，不让前端自行猜测序列化规范。资源报价改变必须重新生成采购快照并再次审批。
