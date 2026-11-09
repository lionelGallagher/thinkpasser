# 本轮验证记录

日期：2026-11-09。范围为生产实施设计、接口／消息／状态契约及本地演示前端；不代表生产平台已接通。本轮复核起点为 `b4a3af2`，本轮没有重新执行 npm ci 或安装 Java／MySQL 生产环境。

| 检查 | 实际结果 |
| --- | --- |
| npm run build | TypeScript 检查和 Vite 构建通过，生成四个 HTML 入口；共享 JS 约224KB、CSS约54KB（未压缩传输体积） |
| npm run test:ui | 67项通过；新增个人／团队路径、保留期分配与导出、旧报价拒绝、迟到验收、账号与机器确认绑定、原账号续订等回归场景 |
| npm test | 44项现有参考测试通过，含固定上游文件哈希校验；参考协议不是新生产协议的实现证明 |
| validate_design.py --full | OpenAPI格式、902个引用、91个接口、122个Schema、19个状态机、16组事务归属通过 |
| 字段／消息案例 | 43组HTTP字段正反例、12组远控消息正反例通过；21份消息Schema与OpenAPI定义一致 |
| 原始需求 | git diff确认 docs/questionnaires 未修改；原13题原始回答继续通过校验 |
| Markdown链接 | 校验范围内全部本地文档链接有效 |
| npm audit | 当前锁定依赖0个已报告漏洞 |
| 构建产物HTTP入口 | /web/、/admin/、/supplier/、/client/preview/ 均返回200且包含对应portal标识；检查后已停止本次本地HTTP服务 |
| git diff --check | 通过；部分文件的Git换行转换提示不属于空白错误 |

前端测试使用 Vue 实际挂载与 happy-dom。DOM 驱动只负责选取元素、输入和触发事件，不模拟布局、焦点、媒体传输或真实设备执行。HTTP200也不等于浏览器渲染验证。

## 最新全面复核

[复核与个人路径](11-review-and-personal-workspace.md)记录16类问题及处理方式。默认演示为个人空间，个人首单自动交付本人；团队开通保留既有数据。首批6个新增复现用例在原代码全部失败，修正后通过。后端新增部分为设计／契约，不是已实现API。

## 已修正的闭环

- 客户首页以自己的电脑和连接入口为中心，移除广告欢迎块、立体硬件装饰和侧栏推广；各端共用中性界面规则。
- 纯卡商是上游，不向客户卖卡；供卡资源与AI开通能力、任务及验收分开，纯卡任务不显示客户AI邮箱。
- 每笔AI权益有精确ID，交付按订单单元处理，前一笔同provider续费不能激活后一笔。电脑等待按区间并集补，AI原承诺截止不变。
- 换人先进入交接和账号预留，演示验收后才开放；停留桌面跨过电脑到期时自动撤下预览。
- Windows／Mac桌面入口有主账号选购、订单和团队入口；网页及桌面子账号都禁止购买页。
- 生产设计补齐采购、真实资金事实、多收／迟到款、服务分段、单元异常决策、上游迟到结果及供应结算。
- 远控设计补齐ConnectionAttempt、物理关闭与撤权分离、设备注册、签名消息、精确命令载荷、受限凭据读取、版本栅栏及导出截止；复核补齐服务端激活回执、续租挑战／resume入口、库存零版本回报和采购报价哈希。

## 尚未完成的生产验收

- 真实浏览器视觉、键盘焦点和跨浏览器验收。先前直接启动Edge截图被自动审批拒绝，仅返回“blocked by policy”；未绕过。当前缺少Computer Use要求的node_repl。
- Windows／Mac签名安装包、RustDesk全入口grant守卫、真实改密／轮换、网页媒体适配、长期连接和睡眠唤醒。
- Java业务API、真实MySQL迁移与双连接竞争、供卡／开通接口及真实身份核验、收退款与结算。
- 独立外部隔离、只读文件导出及截止中断、真实恢复、镜像清理和无残留回库。
- 生产部署、容量压测、主备故障切换、备份恢复及密钥轮换演练。

消息Schema只验证解码结构；没有执行生产JWS密码学验证、重放消费或设备通道绑定。文档中的SLO／RPO／RTO是待验证工程目标。

## 核对文件

以下SHA-256按内容规范化LF计算，避免Git换行转换造成歧义。它们绑定本轮检查的契约内容，不证明外部能力。

| 文件 | SHA-256（LF规范化） |
| --- | --- |
| backend/contracts/openapi.json | 25f3fd902c354fa2c3c9a66462f55bb80e0e062a264bd22225d771457fe6e7ee |
| backend/contracts/state-machines.json | bd2a700543683ea0171403762dd08e87ada1781079bf3fce2f6e00c42c530889 |
| backend/contracts/remote-signaling.schema.json | e74aa6098f43ca2d16181f917ffc4c87ea9b904fa7d8c738a76e2192862f7b5d |
| package-lock.json | 94688181ad528088f4fb9b61778382a7be9715a24d04fa1ae5fc26292471191b |

实施入口见[生产蓝图](08-production-implementation.md)、[端到端矩阵](09-end-to-end-matrix.md)、[远控协议](10-remote-protocol.md)；复现命令见[前端交接](07-frontend-handoff.md)。
