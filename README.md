# 模型平权 · Thinkpasser

自营 AI 账号与订阅商城。用户按工具、套餐等级、账号方式和使用周期选择商品，由商店统一定价与交付。

**技术应该解决问题，付费应该有所值得。** 商店覆盖写作、研究、编程、图像与办公。采用明亮的冷白与电蓝配色，首屏直接呈现商品、价格与购买入口；透明材质、立体悬浮、细边线与克制的交互体现技术氛围。完整目录沿用相同商品卡片，提供品牌、套餐与账号方式筛选。

> 当前只做前端。浏览、筛选、下单、订单与交付流程可完整操作；尚未接入真实支付、服务端库存、邮件或客服。收银台不会扣款，随机生成的 `.test` 账号不可真实登录。前端验收完成不代表已具备真实收款运营能力。

## 本地运行

静态 HTML、CSS 和 JavaScript，没有运行时依赖，无需安装 npm 包或构建。需要 Python：

```powershell
cd D:\selfProject\myself\thinkpasser
npm run preview
```

也可以直接运行 `python -m http.server 4173 --bind 127.0.0.1`，浏览器打开 **http://127.0.0.1:4173/**。复制、下载与多标签同步建议通过 HTTP 服务检查。

## 页面与功能

| 地址 | 内容 |
| --- | --- |
| `#/` | 立体悬浮商品展示、品牌入口、场景分类与常用套餐 |
| `#/accounts` | 全量目录；搜索、品牌、套餐、授权方式、价格、交付、排序与分页 |
| `#/accounts/claude` | 品牌专区；包括 Pro、Max 5x / 20x、Team 与 Enterprise |
| `#/accounts?favorites=1` | 收藏的商品 |
| `#/product/claude-max20-private` | 规格、周期、数量与购买 |
| `#/cart` | 购物车、数量调整、移除与金额汇总 |
| `#/checkout` | 接收邮箱、备注、支付宝/微信选择与购买须知 |
| `#/order/<id>` | 收银台、账号交付、密码显示/隐藏、复制、下载与本地售后记录 |
| `#/orders` | 订单状态筛选与搜索 |
| `#/value` | 使用量、权限、完整成本与账号方式对照 |
| `#/help`、`#/about` | 帮助中心与自营商店说明 |
| `#/policy/terms`、`#/policy/privacy` | 交易范围与信息保存说明 |

目录统一采用商品卡片，每页 12 件，翻页后定位到结果区域。改变筛选会重置页码，切换品牌会清除旧套餐条件。旧版 `#/models`、`#/m/<brand>`、`#/mine` 等入口保留兼容跳转。

### 首页与完整目录

首页以三款常用套餐和八个品牌入口组织首屏，品牌、套餐、价格与购买入口可直接看到；手机通过横向滑动查看首屏套餐，后续商品按场景分类。

完整目录沿用首页相同的商品卡片、导航、配色和页面宽度，不使用表格或侧边规格预览。点击商品进入详情，选择1 / 3个月周期、数量并确认订单。场景、工具、套餐、账号方式、价格和交付条件可组合筛选。手机通过筛选抽屉调整条件。

Linux 与终端只曾作为视觉讨论参考，页面不提供控制台、命令输入或仿操作系统。首页的透明材质与立体悬浮构图、细分隔线、等宽价格和轻微悬停反馈体现技术氛围，遵循系统 `prefers-reduced-motion` 设置。`Ctrl / ⌘ + K` 聚焦搜索。

## 商品范围

当前收录 **8 个品牌、47 个套餐条目、53 个账号方案**，包含明确标识的存量套餐。

| 品牌 | 套餐范围 |
| --- | --- |
| Claude | Pro、Max 5x / 20x、Team Standard / Premium、Enterprise |
| ChatGPT | Go、Plus、Pro $100 / $200 / $500、Business、Enterprise |
| Google AI / Gemini | AI Plus、AI Pro、AI Ultra 5x / 20x |
| Cursor | Plus、Premium、Super、Ultra、Teams 三档、Enterprise；Start / Pro / Pro+ 存量套餐 |
| Midjourney | Basic、Standard、Pro、Mega |
| Perplexity | Pro、Max、Enterprise Pro / Max |
| Notion | Plus、Business、Enterprise |
| Microsoft Copilot | Microsoft 365 个人/家庭/进阶订阅、企业附加许可和组合套餐、旧版 Copilot Pro |

**49 个商品已配置人民币售价**，4 个 Enterprise 定制方案按组织配置询价，不用零元占位。Notion Plus 的 AI 试用、家庭订阅的 AI 权益和存量套餐资格分别说明。来源和差异见 [商品核对记录](docs/catalog-audit-2026-10-23.md)。

## 店铺定价与配置

用户已授权参考官方价格加价。独享、代充、团队和家庭方案统一使用：

```text
店铺月价 = 向上取整到人民币元（官方月价参考 × 店铺计价汇率 × 1.12）
```

`assets/store.js` 中集中配置：

```js
const PRICING = {
  checkedAt: '2026-10-23',
  fx: { USD: 7.2, INR: 0.085 },
  markupBps: 1200, // 12%
  defaultStock: 20
};
```

汇率是**店铺计价参数，非实时汇率**。`PUBLIC_PRICES` 保存公开月价参考，`referencePrice()` 处理币种，`storePrice()` 计算人民币价。共享商品保留独立店铺报价，不把完整账号价格当作单个共享席位的官方价格。API 或额外用量费用不默认包含在订阅售价中。

当前 Claude Pro 为 **¥162/月**，Max 5x 为 **¥807/月**，Max 20x 为 **¥1613/月**。3 个月订单按店铺月价的 2.85 倍计价。金额以整数分保存，创建订单时重新验价；历史订单保存成交快照，不随商品调价而改变。

| 配置 | 用途 |
| --- | --- |
| `BRANDS` | 品牌、类别与识别图形 |
| `PLAN_CATALOG` | 套餐名、权益、地区/存量条件与官方来源 |
| `PUBLIC_PRICES` | 官方月价参考；新增公开定价套餐时同步补充 |
| `PRICING` | 加价比例、计价汇率与新商品的前端库存默认值 |
| `raw` | 已有商品 ID、售卖方式、库存、独立共享价与交付方式 |

`raw` 每行：`[商品ID, 品牌ID, 套餐名, 账号方式, 原始店铺价或共享价（分）, 库存, 交付方式, 描述, 标签]`。除共享价外，当前售价统一由参考价与加价配置生成。原有商品 ID 保留；套餐名应匹配 `PLAN_CATALOG` 的 `tier` 或 `match`。

账号方式为 `private` 独享、`shared` 共享、`topup` 代充、`team` 团队席位、`family` 家庭订阅；交付方式为 `instant` 订单内查看、`manual` 按单开通。

有参考价的新套餐自动生成带售价及 `defaultStock` 的商品。**库存均为前端配置，不代表已连接真实库存系统。** 实际上线前需由服务端管理可售数量与授权条件。

## 购买流程验收

1. 选择有售价和库存的商品，选择周期与数量，加入购物车或立即购买。
2. 填写非敏感接收邮箱，选择支付宝或微信，确认购买须知后创建订单。
3. 收银台说明支付通道暂未开放；点击“体验购买并查看交付”。
4. 成品账号生成邮箱、密码、恢复代码、登录入口和到期时间；团队席位展示工作区、成员角色和 `.test` 邀请信息。
5. 可复制、下载或保存本地售后记录；刷新仍展示同一套交付。

流程不会真实扣款、发送邮件或向客服提交问题。

## 代码与验证

```text
index.html                 导航、页脚、全局弹窗
assets/styles.css          共享布局与响应式结构
assets/interface.css       亮色商城、商品卡与交易页面样式
assets/studio.css          亮色悬浮首页、同款卡片目录与全站视觉统一
assets/store.js            商品、参考价、店铺价、订单与交付规则
assets/app.js              路由、组件、交互与本地存储
tests/store.test.cjs        商品、定价、订单与恢复测试
tests/release.test.cjs      静态资源版本核对
scripts/version-assets.cjs  发布前更新 CSS / JS 内容版本
docs/catalog-audit-2026-10-23.md  套餐和价格来源
docs/plans/                设计记录
```

浏览器存储键为 `thinkpasser-store-v1`，保存购物车、收藏、订单和体验交付。恢复时分别校验数据；损坏内容会备份，备份失败时停止覆盖。支持存储事件同步和现代浏览器 Web Locks。清除站点存储会移除本地数据，当前不支持跨设备恢复。

Node.js 20+：

```powershell
npm run assets:version
npm test
node --check assets/store.js
node --check assets/app.js
git diff --check
```

发布前运行 `npm run assets:version`，将 CSS / JS 内容摘要写入 HTML 资源 URL，避免浏览器混用旧版资源。测试会核对这些版本；修改资源后需要重新生成。

测试覆盖套餐范围、组合筛选、排序、底层查询解析、整数金额、加价与周期价格、企业询价保护、数量/库存、订单校验、随机交付、重复支付幂等、历史价格和损坏数据恢复。页面调整另需检查桌面与手机浏览器布局。

## 后续真实运营接入

需要服务端商品与库存、验价、订单身份校验、官方商户支付、验签后的到账确认、真实凭证交付、邮件和售后处理。客户端订单状态不能作为真实到账依据。当前保留完整前端流程，不包含后端或线上部署变更。
