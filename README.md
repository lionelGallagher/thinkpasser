# Thinkpasser · 独享远程电脑平台

面向个人开发者、跨境办公团队和企业开发团队，提供可从网页及 Windows／Mac 客户端使用的独享电脑。电脑是基础商品，Claude Code、Codex 是必须关联电脑的可选权益。

仓库按四个端和一个后端划分。

开发设计入口：[技术架构总览](docs/architecture.md)，统一说明五个模块、供货与订单、机器连接密码、远控授权、租期、售后和回收，以及已有实现与待接入能力。

[详细设计与开发交接](docs/design/README.md)进一步给出数据、事务、接口、权限、页面和难点验证。业务后端采用Java／Spring Boot＋MySQL及Maven；原生与网页远控按各自适合的技术实现。仅提供Windows／Mac桌面客户端，无手机App。

## 五个目录

```text
thinkpasser/
├── client/                   客户端：Windows／Mac 控制端及被控端集成
│   └── rustdesk/             固定版本裁剪、构建准备、原生回跳接口
├── web/                      网页端：购买、客户控制台、浏览器远控
│   └── remote-desktop/       协议与浏览器合成验证工程
├── admin/                    管理端：平台内部运营
├── supplier/                 供应商端：电脑和卡／订阅侧供货
├── backend/                  后端：四端共用的业务和控制服务
│   ├── domain/               租期、保留期、AI 加购报价规则
│   └── device-health/        设备健康与恢复参考链路
├── docs/                     需求确认、供货研究与技术验证记录
├── package.json              当前验证工程的统一命令
└── README.md
```

| 目录 | 职责 | 当前状态 |
| --- | --- | --- |
| [client](client/README.md) | 平台登录、账号切换、独享电脑和远控界面；被控端集成 | 已有[桌面界面交互预览](client/preview/README.md)及RustDesk裁剪准备，原生安装包和真实接入待完成 |
| [web](web/README.md) | 商品、购买续费、客户控制台与浏览器远控 | 已有可交互演示前端及协议验证，尚未连接真实Windows／Mac |
| [admin](admin/README.md) | 机器、账号、商品、供方、交付、售后和结算 | 已有本地演示前端，生产业务接口待接入 |
| [supplier](supplier/README.md) | 两类供方的资源、接单、回报、验收及成本 | 已有本地演示前端，真实供应能力待接入 |
| [backend](backend/README.md) | 四端统一业务、权限、租约、资金与生命周期 | Java／MySQL详细设计和API契约已整理；现有纯规则与健康参考代码，生产实现待开发 |

`web/remote-desktop/` 中的会话授权和网关是验证工程的参考模块，不是已经上线的后端。正式身份、库存、支付及授权以 `backend/` 的服务端实现为准。

## 商品与供货关系

支持以下组合：

| 商品 | 支持 |
| --- | --- |
| 只买电脑 | 是 |
| 电脑＋Claude Code | 是 |
| 电脑＋Codex | 是 |
| 电脑＋Claude Code＋Codex | 是 |
| 脱离电脑单买平台 AI 权益 | 否 |

电脑可以不购买 AI，Claude 与 Codex 不互相强制搭配。客户可以首单购买组合，也可以给已有电脑加购。普通客户不接入自己的私人电脑。

供应链按两类角色组织：

- **电脑供应商**：提供 Windows／Mac、初始环境及机器侧维护。
- **卡／订阅供应商**：提供约定的卡／订阅侧资源，按实际能力承接指定账号开通、续订及供货售后。
- **平台**：统一订单、商品、派单、机器与权益关联、验收、客户交付、售后和结算。

自营和合作方使用同一供应商端。供应商账号可由平台创建，也可自行申请，审核后才能供货；资源还需单独验收。AI 开通是卡／订阅侧的任务，不固定增加第三类供应商。有卡或付款成功不代表 AI 已经可用。

## 核心流程与边界

1. 主账号选择电脑和可选 AI，向平台付款；系统按同一交付单元准备电脑和指定账号权益。
2. 首次整套准备好、验收并开放使用时开始租期；一单多台可以分批交付，各自计时。
3. 主账号直接创建子账号并分配电脑。每个使用账号同时最多分配一台独享电脑；管理团队不自动获得进入子账号桌面的权限。
4. 网页与客户端共用服务端授权。电脑有效期决定完整远控权限；AI 是否购买或到期不应锁住仍有效的电脑。到期拒绝新远控并断开已有远控。
5. 到期原环境保留三天，期间仅开放受限文件导出和续费入口；期满清理客户数据与凭据，恢复最新初始环境，验收后回库。
6. AI 加购沿用已确认的三十天标准价及实际期限披露。电脑补时不自动延长 AI，不重写原 AI 承诺期限。
7. 正常已交付后主动不用或换购，旧剩余费用不退不抵；主动换机按新订单购买，AI 仍为可选项。故障替代机按售后履约处理。
8. 故障工单、电脑补时和已购 AI 的现金赔付按已确认规则处理。纯电脑不产生 AI 费用；结束电脑服务同时结束关联 AI 的平台交付，AI 单项结束不反向结束有效电脑。
9. 目标收款方式为支付宝、微信支付、国际银行卡及 PayPal。尚未接通真实收款、退款或供应商开通接口。
10. 平台租期约束的是本平台电脑入口；第三方账号的真实订阅、付款状态和认证独立记录，不将撤销远控说成已取消官方订阅。

完整金额、期限和售后边界以[需求与实现范围](docs/plans/2026-11-08-remote-computer-requirements.md)及[确认记录](docs/questionnaires/远程电脑平台完整需求确认表.md)为准。规格、售价、供应报价及数值化处理时限由后台配置。

## 本地验证

前端使用Vue 3＋TypeScript，先安装依赖再运行。已验证环境为Node.js 22.22.2、Python 3.12.10；规则和协议参考仍使用Node内置模块，设备健康参考使用`node:sqlite`。

```powershell
npm install
npm run dev
```

入口：[客户网页](http://127.0.0.1:5180/web/)、[管理端](http://127.0.0.1:5180/admin/)、[供应商端](http://127.0.0.1:5180/supplier/)、[桌面界面预览](http://127.0.0.1:5180/client/preview/)。演示数据仅保存本机，页面明确标识不会产生真实付款、开通或远控操作。

```powershell
npm run test:ui
npm run build
npm run verify:design
```

构建输出到`.preview/dist/`。完整操作链路、Python契约校验及当前验收边界见[前端交接](docs/design/07-frontend-handoff.md)。原有参考验证：

```powershell
npm test
npm run test:backend
npm run test:web
npm run test:product-domain
```

这些命令验证租期规则、远控会话边界、协议和设备健康参考链路，不会调用真实支付、开通订阅或重启真实机器。

网页合成验证：

```powershell
npm run demo:web-remote
```

打开 <http://127.0.0.1:4187>。画面来自合成素材，页面只验证本地协议与浏览器回环；它不是产品网站，也不是真实远程桌面。

设备健康参考演示：

```powershell
npm run demo:device-health
```

演示仅使用本地虚构设备，真实执行器返回 `not_configured`。原生源码与构建准备见 [client/rustdesk/README.md](client/rustdesk/README.md)，需要固定版本完整上游源码及对应 Windows／Mac 工具链。

## 当前实现状态

四端交互前端、统一详细设计、API及状态契约已建立；桌面客户端当前为网页界面预览。可复用的租期计算、原生裁剪准备、网页协议和设备健康参考继续保留。生产Java后端、真实供应支付、完整原生客户端和真机网页远控尚未接入。

类型检查、构建、规则和DOM组件交互测试分别验证其覆盖范围。实际浏览器截图未完成，不能将DOM模拟测试当成像素、焦点和跨浏览器验收。

真实交付、权限、收退款、Windows／Mac 远控、长期运行和清理回库仍需端到端验收。不得将本地参考实现或测试通过当成生产能力已经完成。

## 需求与许可资料

- [技术架构总览](docs/architecture.md)
- [需求与实现范围](docs/plans/2026-11-08-remote-computer-requirements.md)
- [原始答卷及最终确认](docs/questionnaires/远程电脑平台完整需求确认表.md)
- [文档索引](docs/README.md)
- [Claude 交付与身份核验](docs/plans/2026-11-08-claude-delivery-and-verification.md)
- [RustDesk 裁剪方案](docs/plans/2026-11-08-rustdesk-feature-trim.md)
- [Mac 长期运行可靠性](docs/plans/2026-11-08-mac-connection-reliability.md)
- [网页远控适配研究](docs/plans/2026-11-08-web-remote-adapter.md)

RustDesk 的来源、固定提交和许可证随对应目录保留。复用及修改按随附许可履行相应义务；官方 Pro 后台和付费 Web V2 不作为本仓库已取得的组件。当前不提供完整原生构建产物。
