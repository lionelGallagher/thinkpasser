# 套餐核对记录 · 2026-10-23

本次覆盖商城已展示的 8 个品牌，核对付费套餐家族与关键权益差异。收录套餐不代表店铺已有库存或取得品牌授权；免费方案、API 计费与独立插件不作为账号商品混入。店铺售价由经营者配置，不由官方外币价格推算。

| 品牌 | 已收录的套餐 | 官方来源 |
| --- | --- | --- |
| Claude | Pro、Max 5x、Max 20x、Team Standard、Team Premium、Enterprise | [Pricing](https://claude.com/pricing) |
| ChatGPT | Go、Plus、Pro、Business、Enterprise | [Pricing](https://learn.chatgpt.com/docs/pricing) |
| Google AI / Gemini | AI Plus、AI Pro、AI Ultra 5x、AI Ultra 20x | [Google AI plans](https://one.google.com/about/google-ai-plans/) |
| Cursor | Plus、Premium、Super、Ultra、Teams、Enterprise；保留 Start、Pro、Pro+ 存量套餐 | [Pricing](https://cursor.com/pricing)、[Models & Pricing](https://cursor.com/docs/models-and-pricing) |
| Midjourney | Basic、Standard、Pro、Mega | [Comparing plans](https://docs.midjourney.com/hc/en-us/articles/27870484040333-Comparing-Midjourney-Plans) |
| Perplexity | Pro、Max、Enterprise Pro、Enterprise Max | [Pricing](https://www.perplexity.ai/hub/pricing)、[Enterprise billing](https://www.perplexity.ai/help-center/en/articles/10352986-enterprise-pricing-and-billing-frequently-asked-questions) |
| Notion | Plus、Business、Enterprise | [Pricing](https://www.notion.com/pricing) |
| Microsoft Copilot | Microsoft 365 Personal、Family、Premium、Pro，Copilot Business 附加许可、Business Standard + Copilot、Business Premium + Copilot；保留旧版 Copilot Pro | [Individuals](https://www.microsoft.com/en-us/copilot/pricing/individuals)、[Business](https://www.microsoft.com/en-us/copilot/pricing/business) |

共 43 个套餐条目、49 个商品。不同账号方式是不同店铺商品，不表示品牌官方提供“共享账号”等销售方式。企业与团队方案需要进一步核对基础许可、席位、地区与开通条件。

## 需要在商品页说清楚的差异

- Claude Max 5x / 20x 是相对 Pro 的使用量档位，不能描述成无限使用或性能倍数。
- ChatGPT Pro 存在不同使用量档位，本次按 Pro 家族收录，具体额度在开通前确认，不臆造子档位名称。
- Cursor 当前套餐和存量 Pro / Pro+ 等分开标识。当前 Plus 的可用模型范围有限；第三方模型计费与订阅权益需分别核对。已有 Pro 商品保留 ID，新增开通前须确认存量资格。
- Notion Plus 只含有限的 AI 试用，不是完整 Notion AI 订阅；Business / Enterprise 的 AI 权益单独说明。
- Microsoft 365 Family 的办公 AI 权益归订阅所有者，不能按家庭人数宣称每人拥有 Copilot 席位。Microsoft 365 Pro 与旧版 Copilot Pro 分开列出。
- Perplexity 企业套餐与 API 额度分别计费，不暗示账号订阅包含 API 余额。

## 报价与前端状态

原有 16 个商品的报价、库存和 ID 保留。新增 33 个商品尚无用户提供的具体售价与库存，使用 `price: null`，显示“售价待确认 / 上架信息待确认”；详情可浏览，购买按钮禁用，报价函数也拒绝下单。不存在用 0 元占位再进入支付的路径。

首页、商品列表和页脚移除“前台演示”“示例库存”等开发提示。确认订单、收银台与随机账号交付仍明确说明未连接真实支付、没有扣款、`.test` 账号不可真实登录。当前任务不实现后端。
