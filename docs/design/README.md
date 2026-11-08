# 开发交接与详细设计

更新：2026-11-08。本文档包整理业务逻辑和实施契约；常规功能按接口清单实现，难点按专项设计和验收场景实现。当前没有生产 Java 后端、真实供应与支付接入。手机 App 不在范围内，Windows／Mac 桌面客户端保留。

## 阅读顺序

1. [架构总览](../architecture.md)：五模块、业务不变量、已有证据。
2. [数据与事务](01-data-and-transactions.md)：对象字段、MySQL 约束、交付与并发。
3. [API 与权限](02-api-and-permissions.md)：角色、身份、错误和接口约束。
4. [远控与设备](03-remote-and-device.md)：设备密码、授权、接管、撤权、恢复与导出。
5. [供货、资金与售后](04-supplier-payments-aftersale.md)：两类供方、开通、订单异常、费用计算。
6. [四端页面与任务](05-ui-and-delivery-plan.md)：页面、动作、接口和实现归属。
7. [难点与验证](06-difficulties-and-validation.md)：风险、验证方法、证据及通过标准。
8. [前端交接](07-frontend-handoff.md)：四个入口、本地演示链路、验证命令及接入边界。

本轮已运行的检查、结果与未验证项见[验证记录](verification.md)。

字段契约：[OpenAPI](../../backend/contracts/openapi.json)。状态与事务编号：[状态契约](../../backend/contracts/state-machines.json)。字段与状态冲突时先修订契约再实现，不能在四端分别发明规则。用户原始回答以[确认记录](../questionnaires/远程电脑平台完整需求确认表.md)为准；设计默认值不是追加的用户答卷。

## 技术安排

| 部分 | 实施基线 | 原因 |
| --- | --- | --- |
| 业务 API、供货与售后编排、调度 | Java 17+、Spring Boot、Maven；模块化单体，API 与 worker 可分别运行 | 适合订单、事务、运营和用户熟悉的开发方式 |
| 业务数据库 | MySQL InnoDB；开发环境已发现 8.0.44，生产建议经验证的 8.4 LTS | 所有权、金额、幂等与任务需要事务和持久化 |
| 三个网页产品 | Vue 3＋TypeScript，公共样式、组件和类型复用 | 网页端、管理端、供应商端独立入口 |
| 桌面客户端与被控端 | 固定 RustDesk Rust 核心及其桌面界面集成 | Windows／Mac 原生权限、采集、输入和编码 |
| 网页远控 | TypeScript 浏览器会话层＋受控原生适配器 | 需真机证明；不把 Java 业务 API 当媒体转码服务 |
| 设备管理 | 独立受限 Agent／特权 helper；Rust 等系统技术按实际集成 | 与 OS 采集、恢复和凭据设置关联，不强制 Java |
| 队列与定时任务 | 首期 MySQL outbox＋持久任务；缓存可选 | 数据库提交与任务发布保持一致，无需先引入微服务集群 |

本地已核实 Java 17.0.21、Maven 3.9.14，Maven 路径为 `D:\workSoftware\apache-maven-3.9.14`；本地 MySQL 为8.0.44。版本探测不代表 Java 项目已创建或构建。当前 Node 工程承担规则、协议与健康验证，不是生产后端语言决定。

Spring Boot 4.1.2 的官方要求包含 Java 17+ 和 Maven 3.6.3+；实现时锁定经构建验证的正式版本及依赖，不使用 snapshot。[系统要求](https://docs.spring.io/spring-boot/system-requirements.html)、[Maven 插件](https://docs.spring.io/spring-boot/maven-plugin/index.html)

## 交给下一位 AI 的工作方式

先读取上述文档和目标目录 README，再选择[任务清单](05-ui-and-delivery-plan.md)中的一项。每项提交说明对应接口、状态、异常分支及实际验证结果；业务、第三方 API 或不可行的原生接口出现新证据时同步改设计。只有收到真实验收证据才能将“准备、已回报、待验证”改为“已交付、已退款、已恢复、已清理”。

前端可用明确标识的演示适配器先实现完整交互；真实模式失败时显示错误，不自动回退成演示成功。演示购买、AI 开通、机器恢复和桌面画面都不能混入真实业务记录。
