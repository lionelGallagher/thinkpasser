# 文档索引

## 技术架构入口

- [四端前端交接](design/07-frontend-handoff.md)：运行入口、演示操作链路和验证范围。
- [详细设计与开发交接](design/README.md)：数据、事务、API、远控、供货、资金、售后、四端页面和难点验证；Java／MySQL按业务适配，保留Windows／Mac桌面客户端，不做手机App。
- [技术架构总览](architecture.md)：五个模块、领域对象、两类供方、交付与资金、设备连接凭据、会话授权、租期生命周期、恢复和验收；区分业务确认、推荐实现和当前实际能力。

## 当前需求依据

- [需求与实现范围](plans/2026-11-08-remote-computer-requirements.md)：四端、两类供应商、商品、租约、权限和售后。
- [原始答卷及确认记录](questionnaires/远程电脑平台完整需求确认表.md)：保留用户原始回答，顶部为最终规则。
- [确认数据](questionnaires/remote-platform-questionnaire-data.json)：结构化规则及确认历史，不是已上线产品配置。

## 供货与技术研究

- [Claude 交付与身份核验](plans/2026-11-08-claude-delivery-and-verification.md)
- [原生能力裁剪](plans/2026-11-08-rustdesk-feature-trim.md)
- [Mac 长期运行可靠性](plans/2026-11-08-mac-connection-reliability.md)
- [网页远控适配](plans/2026-11-08-web-remote-adapter.md)

研究中的历史候选方案不覆盖后续已确认规则；真实供应、支付和远控能力仍以对接验收为准。
