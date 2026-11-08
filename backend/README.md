# 后端

四个端共用的业务与控制服务目录。前端不能单独确认到账、发放租约、判断库存或授予远控权限。

业务后端设计采用Java／Spring Boot＋MySQL InnoDB，以Maven构建；现有Node模块承担规则与协议验证。详细字段、事务、包职责和API见[开发交接](../docs/design/README.md)及[接口契约](contracts/openapi.json)，当前尚未创建生产Java应用。

## 业务职责

- 身份、租户、主子账号、供应商角色及资源权限。
- 商品配置、价格快照、电脑库存、AI 可选项与订单。
- 电脑侧和卡／订阅侧派单、结果核对、验收及分批交付。
- 租约、电脑分配、有效期、接管和撤权。
- 每机 RustDesk 连接凭据的安全引用及版本、设置／轮换任务和真实回执，与平台登录凭据分开。
- 支付宝、微信、国际银行卡、PayPal 的收款与退款适配。
- 工单、电脑补时、AI 故障赔付、售后及供应结算。
- 到期保留、受限导出、清理重置和验收入库。
- 设备健康、受限恢复请求和必要审计。

AI 订单项必须绑定电脑交付单元或租约。电脑可不含 AI；结束电脑服务时结束关联 AI 的平台交付，结束单项 AI 不反向结束有效电脑。

整体对象关系、接口边界和开发顺序见[技术架构总览](../docs/architecture.md)。设备连接密码只是底层认证，完整远控仍检查当前账号、机器分配、租约与会话。到期断连、凭据轮换及回收清理分别验证，现有后端参考模块尚无真实改密适配器。

## 现有模块

| 目录 | 内容 | 当前边界 |
| --- | --- | --- |
| [contracts/](contracts/openapi.json) | OpenAPI字段、状态机、事务归属、正反案例和校验脚本 | 设计契约，尚非生产API或MySQL迁移 |
| [domain/](domain/README.md) | 租期阶段、三天保留、AI 加购报价、续费锚点 | 纯计算，不授予权限、不操作机器或资金 |
| [device-health/](device-health/README.md) | 健康契约、本地服务端／Agent 参考链路、恢复状态验证 | 真实采集、重启、带外提供商与生产身份未接入 |

网页适配工程的会话授权和网关参考见 [web/remote-desktop/](../web/remote-desktop/README.md)；正式后端接入时统一纳入本目录的鉴权与控制服务。

```powershell
npm run test:backend
npm run test:product-domain
npm run demo:device-health
```

在仓库根目录运行。参考代码使用 Node.js 内置模块，健康运行时使用 `node:sqlite`。尚无生产 HTTP API、支付商户接入、数据库迁移或真实供应商适配器，不把测试回调视作这些功能已完成。
