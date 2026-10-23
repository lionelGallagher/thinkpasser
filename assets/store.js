(function (root, factory) {
  const api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  else root.Store = api;
})(typeof globalThis !== 'undefined' ? globalThis : this, function () {
  'use strict';

  const BRANDS = [
    { id: 'chatgpt', name: 'ChatGPT', label: '对话与创作', color: '#087f68', bg: '#e7f4ed', mark: 'GPT' },
    { id: 'claude', name: 'Claude', label: '写作与编程', color: '#b76545', bg: '#f7ebe2', mark: '✳' },
    { id: 'gemini', name: 'Gemini', label: '多模态助手', color: '#4375da', bg: '#edf1ff', mark: '✦' },
    { id: 'cursor', name: 'Cursor', label: 'AI 代码编辑器', color: '#252832', bg: '#eceef2', mark: 'C' },
    { id: 'midjourney', name: 'Midjourney', label: '图像创作', color: '#637ca2', bg: '#eaf0f7', mark: 'MJ' },
    { id: 'perplexity', name: 'Perplexity', label: '搜索与研究', color: '#257b80', bg: '#e7f2f1', mark: 'P' },
    { id: 'notion', name: 'Notion', label: '知识与协作', color: '#292a2e', bg: '#f2efea', mark: 'N' },
    { id: 'copilot', name: 'Copilot', label: '办公助手', color: '#6156b7', bg: '#efecfb', mark: 'Co' }
  ];
  const MODES = { private: '独享账号', shared: '共享账号', topup: '账号代充', team: '团队席位', family: '家庭订阅' };
  // Merchant settlement assumptions, not a live FX quote. Public prices exclude tax.
  const PRICING = { checkedAt: '2026-10-23', fx: { USD: 7.2, INR: 0.085 }, markupBps: 1200, defaultStock: 20 };
  const PUBLIC_PRICES = {
    'claude-pro': 20, 'claude-max5': 100, 'claude-max20': 200, 'claude-team-standard': 25, 'claude-team-premium': 125,
    'chatgpt-go': 8, 'chatgpt-plus': 20, 'chatgpt-pro': 100, 'chatgpt-pro-200': 200, 'chatgpt-pro-500': 500, 'chatgpt-business': 25,
    'gemini-plus': 7.99, 'gemini-pro': 19.99, 'gemini-ultra5': 100, 'gemini-ultra20': 200,
    'cursor-plus': 8, 'cursor-premium': 30, 'cursor-super': 100, 'cursor-ultra': 200, 'cursor-teams': 30, 'cursor-teams-super': 100, 'cursor-teams-ultra': 200,
    'cursor-pro-legacy': 20, 'cursor-proplus-legacy': 60,
    'midjourney-basic': 10, 'midjourney-standard': 30, 'midjourney-pro': 60, 'midjourney-mega': 120,
    'perplexity-pro': 20, 'perplexity-max': 200, 'perplexity-enterprise-pro': 40, 'perplexity-enterprise-max': 325,
    'notion-plus': 12, 'notion-business': 24,
    'copilot-personal': 9.99, 'copilot-family': 12.99, 'copilot-premium': 19.99, 'copilot-365-pro': 99.99,
    'copilot-business': 25.2, 'copilot-business-standard': 28.2, 'copilot-business-premium': 38.4, 'copilot-pro-legacy': 20
  };
  function referencePrice(planId) {
    if (planId === 'cursor-start-legacy') return { minor: 64900, currency: 'INR' };
    return Object.hasOwn(PUBLIC_PRICES, planId) ? { minor: Math.round(PUBLIC_PRICES[planId] * 100), currency: 'USD' } : null;
  }
  function storePrice(reference) {
    if (!reference) return null;
    const cost = Math.round(reference.minor * PRICING.fx[reference.currency]);
    return Math.ceil(cost * (10000 + PRICING.markupBps) / 1000000) * 100;
  }
  const PLAN_SOURCES = {
    claude: 'https://claude.com/pricing',
    chatgpt: 'https://learn.chatgpt.com/docs/pricing',
    gemini: 'https://one.google.com/about/google-ai-plans/',
    cursor: 'https://cursor.com/pricing',
    midjourney: 'https://docs.midjourney.com/hc/en-us/articles/27870484040333-Comparing-Midjourney-Plans',
    perplexity: 'https://www.perplexity.ai/hub/pricing',
    notion: 'https://www.notion.com/pricing',
    copilot: 'https://www.microsoft.com/en-us/copilot/pricing/individuals'
  };
  // Official plan families and store offers are separate: a listed plan is not a claim of stock.
  const PLAN_CATALOG = {
    claude: [
      { id: 'claude-pro', tier: 'Pro', summary: '面向日常写作、研究与编程的个人套餐' },
      { id: 'claude-max5', tier: 'Max 5x', summary: '比 Pro 更高的使用额度，适合持续工作', note: '5x 为相对 Pro 的使用量档位，仍受官方额度与时段限制。' },
      { id: 'claude-max20', tier: 'Max 20x', summary: 'Max 高使用量档位，面向高频和重度任务', note: '20x 为相对 Pro 的使用量档位，不代表无限使用或固定性能倍数。' },
      { id: 'claude-team-standard', tier: 'Team Standard', mode: 'team', summary: '团队标准席位，集中管理成员与订阅' },
      { id: 'claude-team-premium', tier: 'Team Premium', mode: 'team', summary: '团队高级席位，按成员需要配置使用量' },
      { id: 'claude-enterprise', tier: 'Enterprise', mode: 'team', summary: '企业部署与管理方案，按组织需求确认' }
    ],
    chatgpt: [
      { id: 'chatgpt-go', tier: 'Go', summary: '个人入门付费方案，适合轻量日常使用' },
      { id: 'chatgpt-plus', tier: 'Plus', summary: '面向日常工作与创作的个人订阅' },
      { id: 'chatgpt-pro', tier: 'Pro', displayName: 'ChatGPT Pro $100 档', summary: 'Pro 入门使用量档位，官方月付参考 $100', note: '本商品对应 Pro $100 档；更高使用量请另选 $200 或 $500 档。' },
      { id: 'chatgpt-pro-200', tier: 'Pro $200', summary: 'Pro 进阶使用量档位，官方月付参考 $200' },
      { id: 'chatgpt-pro-500', tier: 'Pro $500', summary: 'Pro 高使用量档位，官方月付参考 $500' },
      { id: 'chatgpt-business', tier: 'Business', mode: 'team', summary: '团队工作区与成员管理方案', note: '新建官方 Business 工作区至少 2 人；本商品按单个团队席位计价。' },
      { id: 'chatgpt-enterprise', tier: 'Enterprise', mode: 'team', summary: '企业级工作区，按组织需求确认方案' }
    ],
    gemini: [
      { id: 'gemini-plus', tier: 'AI Plus', summary: 'Google AI 入门订阅，按实际权益选择' },
      { id: 'gemini-pro', tier: 'AI Pro', match: 'Pro', summary: 'Google AI 日常工作与创作方案' },
      { id: 'gemini-ultra5', tier: 'AI Ultra 5x', summary: 'Google AI Ultra 的 5x 使用量档位' },
      { id: 'gemini-ultra20', tier: 'AI Ultra 20x', summary: 'Google AI Ultra 的 20x 高使用量档位' }
    ],
    cursor: [
      { id: 'cursor-plus', tier: 'Plus', summary: '当前入门方案；可用模型范围需先确认', note: '当前 Plus 不包含第三方模型，具体支持范围以官方说明为准。' },
      { id: 'cursor-premium', tier: 'Premium', summary: '当前个人开发套餐，按使用规则计费', note: '第三方模型用量与订阅分开计费，具体单价和预付规则见官方说明。' },
      { id: 'cursor-super', tier: 'Super', summary: '当前高频开发使用量档位', note: '第三方模型用量与订阅分开计费，具体单价和预付规则见官方说明。' },
      { id: 'cursor-ultra', tier: 'Ultra', summary: '当前个人高使用量档位', note: '第三方模型用量与订阅分开计费，具体单价和预付规则见官方说明。' },
      { id: 'cursor-teams', tier: 'Teams', mode: 'team', summary: '团队 Premium 席位，按成员配置使用量' },
      { id: 'cursor-teams-super', tier: 'Teams Super', mode: 'team', summary: '团队 Super 席位，高频开发使用量档位' },
      { id: 'cursor-teams-ultra', tier: 'Teams Ultra', mode: 'team', summary: '团队 Ultra 席位，高使用量档位' },
      { id: 'cursor-enterprise', tier: 'Enterprise', mode: 'team', summary: '企业开发与组织管理方案' },
      { id: 'cursor-start-legacy', tier: 'Start', legacy: true, summary: '印度地区存量套餐，需核对地区与续订资格', note: '官方参考 ₹649 / 月，仅适用于印度地区符合条件的存量账号。' },
      { id: 'cursor-pro-legacy', tier: 'Pro', legacy: true, summary: '存量 Pro 套餐，开通前确认账号资格' },
      { id: 'cursor-proplus-legacy', tier: 'Pro+', legacy: true, summary: '存量 Pro+ 套餐，开通前确认账号资格' }
    ],
    midjourney: [
      { id: 'midjourney-basic', tier: 'Basic', summary: '从基础图像创作开始，按套餐额度使用' },
      { id: 'midjourney-standard', tier: 'Standard', summary: '适合持续图像创作的标准方案' },
      { id: 'midjourney-pro', tier: 'Pro', summary: '更高创作配额与隐身模式方案' },
      { id: 'midjourney-mega', tier: 'Mega', summary: '高频视觉创作方案，购买前确认配额' }
    ],
    perplexity: [
      { id: 'perplexity-pro', tier: 'Pro', summary: '面向日常检索、资料整理与研究' },
      { id: 'perplexity-max', tier: 'Max', summary: '面向持续研究与重度使用的个人方案' },
      { id: 'perplexity-enterprise-pro', tier: 'Enterprise Pro', mode: 'team', summary: '团队研究与企业管理席位' },
      { id: 'perplexity-enterprise-max', tier: 'Enterprise Max', mode: 'team', summary: '企业高使用量席位，按成员需要配置' }
    ],
    notion: [
      { id: 'notion-plus', tier: 'Plus', aiAccess: 'trial', summary: '基础协作工作区；AI 仅含试用权益', note: 'Plus 不等于完整 Notion AI 订阅。AI 长期使用权益应查看 Business 或 Enterprise。' },
      { id: 'notion-business', tier: 'Business', mode: 'team', aiAccess: 'included', summary: '包含 Notion AI 的商业工作区方案' },
      { id: 'notion-enterprise', tier: 'Enterprise', mode: 'team', aiAccess: 'included', summary: '企业工作区与 Notion AI 管理方案' }
    ],
    copilot: [
      { id: 'copilot-personal', tier: '365 Personal', displayName: 'Microsoft 365 Personal', summary: '单人办公订阅，包含对应 Copilot 权益' },
      { id: 'copilot-family', tier: '365 Family', displayName: 'Microsoft 365 Family', mode: 'family', summary: '家庭办公订阅，AI 权益归属需单独确认', note: '办公应用中的 Copilot 权益仅供订阅所有者使用，不能按家庭成员人数承诺 AI 席位。' },
      { id: 'copilot-premium', tier: '365 Premium', displayName: 'Microsoft 365 Premium', summary: '个人与家庭办公的进阶 AI 订阅' },
      { id: 'copilot-365-pro', tier: '365 Pro', displayName: 'Microsoft 365 Pro', summary: 'Microsoft 365 高使用量个人方案' },
      { id: 'copilot-business', tier: 'Copilot Business', mode: 'team', summary: '企业 Copilot 附加许可，需核对基础订阅', officialUrl: 'https://www.microsoft.com/en-us/copilot/pricing/business' },
      { id: 'copilot-business-standard', tier: 'Business Standard + Copilot', mode: 'team', summary: '办公应用与 Copilot 一体的企业标准方案', officialUrl: 'https://www.microsoft.com/en-us/copilot/pricing/business' },
      { id: 'copilot-business-premium', tier: 'Business Premium + Copilot', mode: 'team', summary: '办公、安全与 Copilot 一体的企业高级方案', officialUrl: 'https://www.microsoft.com/en-us/copilot/pricing/business' },
      { id: 'copilot-pro-legacy', tier: 'Pro', legacy: true, summary: '旧版 Copilot Pro；资格与可用性需单独确认' }
    ]
  };
  const raw = [
    ['claude-pro-private', 'claude', 'Pro', 'private', 12900, 12, 'instant', '独立使用，交付完整账号信息', '热门'],
    ['chatgpt-plus-private', 'chatgpt', 'Plus', 'private', 11900, 18, 'instant', '日常对话、写作与创作，一个账号搞定', '精选'],
    ['cursor-pro-private', 'cursor', 'Pro', 'private', 10900, 10, 'manual', '给你的开发工作流配一位 AI 搭档', '开发者之选'],
    ['gemini-pro-private', 'gemini', 'Pro', 'private', 9900, 16, 'instant', '多模态任务与日常工作，随时开始', '精选'],
    ['claude-pro-shared', 'claude', 'Pro', 'shared', 3900, 24, 'instant', '轻量体验方案，请先查看共享使用说明', '轻量体验'],
    ['chatgpt-plus-shared', 'chatgpt', 'Plus', 'shared', 2900, 30, 'instant', '适合短期体验，按约定席位使用', '入门之选'],
    ['midjourney-standard-private', 'midjourney', 'Standard', 'private', 16900, 8, 'manual', '把脑海里的灵感，变成可见的画面', '创作者之选'],
    ['perplexity-pro-private', 'perplexity', 'Pro', 'private', 8900, 15, 'instant', '为每一次搜索与资料整理准备', '精选'],
    ['claude-max-private', 'claude', 'Max 5x', 'private', 59900, 5, 'manual', '更长的工作周期，选择适合自己的方案', '进阶方案'],
    ['claude-pro-topup', 'claude', 'Pro', 'topup', 13900, 10, 'manual', '保留现有账号，按订单要求完成开通', '续费开通'],
    ['chatgpt-plus-topup', 'chatgpt', 'Plus', 'topup', 12900, 12, 'manual', '已有账号的开通与续费方案', '续费开通'],
    ['cursor-pro-shared', 'cursor', 'Pro', 'shared', 4900, 20, 'instant', '按席位使用的编程体验方案', '轻量体验'],
    ['gemini-pro-topup', 'gemini', 'Pro', 'topup', 10900, 9, 'manual', '为自己的账号选择一份订阅', '续费开通'],
    ['notion-plus-private', 'notion', 'Plus', 'private', 6900, 11, 'manual', '为笔记、文档和项目整理准备', '办公精选'],
    ['copilot-pro-private', 'copilot', 'Pro', 'private', 9900, 0, 'manual', '文档与办公场景的 AI 账号方案', '暂时售罄'],
    ['midjourney-basic-private', 'midjourney', 'Basic', 'private', 7900, 14, 'instant', '从第一张 AI 图像开始创作', '入门之选']
  ];
  function offer(bid, plan, data, rank) {
    const mode = data.mode || plan.mode || 'private';
    const reference = referencePrice(plan.id);
    return {
      ...plan, ...data, brand: bid, plan: plan.id, rank, mode, reference,
      price: mode === 'shared' ? data.price : storePrice(reference),
      tier: plan.tier, name: `${plan.displayName || `${BRANDS.find(b => b.id === bid).name} ${plan.tier}`} ${MODES[mode]}`,
      officialUrl: plan.officialUrl || (bid === 'cursor' && plan.legacy ? 'https://cursor.com/docs/account/pricing/legacy-cursor-plans' : PLAN_SOURCES[bid]), terms: [1, 3],
      category: bid === 'cursor' ? 'code' : bid === 'midjourney' ? 'creative' : ['notion', 'copilot'].includes(bid) ? 'office' : 'assistant'
    };
  }
  const PRODUCTS = raw.map(([id, bid, tier, mode, price, stock, delivery, desc, badge], rank) => {
    const plan = PLAN_CATALOG[bid].find(p => p.tier === tier || p.match === tier);
    return offer(bid, plan, { id, mode, price, stock, delivery, desc: plan.aiAccess === 'trial' || plan.legacy ? plan.summary : desc, badge }, rank);
  });
  for (const [bid, plans] of Object.entries(PLAN_CATALOG)) for (const plan of plans) {
    if (!PRODUCTS.some(p => p.plan === plan.id)) PRODUCTS.push(offer(bid, plan, {
      id: `${plan.id}-${plan.mode || 'private'}`, price: null, stock: referencePrice(plan.id) ? PRICING.defaultStock : 0, delivery: 'manual', desc: plan.summary, badge: referencePrice(plan.id) ? '' : '企业询价'
    }, PRODUCTS.length));
  }

  function product(id) { return PRODUCTS.find(p => p.id === id); }
  function brand(id) { return BRANDS.find(b => b.id === id); }
  function money(cents) { return (cents / 100).toFixed(2); }
  function filterProducts(options = {}) {
    const { q = '', mode = '', brand: bid = '', category = '', plan = '', delivery = '', sort = 'recommended' } = options;
    const min = options.min === '' || options.min == null ? 0 : Number(options.min);
    const max = options.max === '' || options.max == null ? Infinity : Number(options.max);
    const terms = String(q).trim().toLocaleLowerCase().split(/\s+/).filter(Boolean);
    const hasPriceFilter = (options.min !== '' && options.min != null) || (options.max !== '' && options.max != null);
    const list = PRODUCTS.filter(p => (!bid || p.brand === bid) && (!mode || p.mode === mode) && (!plan || p.plan === plan)
      && (!category || p.category === category) && (!delivery || p.delivery === delivery)
      && (p.price === null ? !hasPriceFilter : p.price >= min && p.price <= max)
      && terms.every(term => `${p.name} ${p.desc} ${p.mode === 'private' ? '私人 private' : ''}`.toLocaleLowerCase().includes(term)));
    if (sort === 'price-asc' || sort === 'price-desc') list.sort((a, b) => {
      if (a.price === null || b.price === null) return a.price === b.price ? a.rank - b.rank : a.price === null ? 1 : -1;
      return (sort === 'price-asc' ? a.price - b.price : b.price - a.price) || a.rank - b.rank;
    });
    else if (sort === 'stock') list.sort((a, b) => b.stock - a.stock || a.rank - b.rank);
    return list;
  }
  function quote(id, months = 1, qty = 1) {
    const p = product(id);
    if (!p) throw new Error('该商品不存在或已下架');
    if (!Number.isSafeInteger(p.price) || p.price <= 0) throw new Error('该套餐尚未设置店铺售价，请等待上架');
    if (!p.terms.includes(months)) throw new Error('请选择有效的使用期限');
    if (!Number.isSafeInteger(qty) || qty < 1) throw new Error('购买数量必须为正整数');
    if (qty > p.stock) throw new Error('购买数量超过当前库存');
    const unit = Math.round(p.price * (months === 3 ? 285 : 100) / 100);
    return { unit, total: unit * qty, months, qty, product: p };
  }
  function normalizeCart(items) {
    if (!Array.isArray(items)) throw new Error('购物车数据无效');
    const merged = new Map(), counts = new Map();
    for (const item of items) {
      quote(item.id, item.months, item.qty);
      const key = `${item.id}:${item.months}`;
      const value = merged.get(key) || { id: item.id, months: item.months, qty: 0 };
      value.qty += item.qty;
      merged.set(key, value);
      counts.set(item.id, (counts.get(item.id) || 0) + item.qty);
    }
    for (const [id, count] of counts) if (count > product(id).stock) throw new Error('购买数量超过当前库存');
    return [...merged.values()];
  }
  function createOrder(items, contact) {
    const lines = normalizeCart(items);
    if (!lines.length) throw new Error('购物车为空，请先选择商品');
    const email = String(contact.email || '').trim();
    if (!/^[^\s@<>]+@[^\s@<>]+\.[^\s@<>]+$/.test(email) || email.length > 254) throw new Error('请填写有效的接收邮箱');
    if (!contact.agreed) throw new Error('请先阅读并同意购买须知');
    if (!['alipay', 'wechat'].includes(contact.payment)) throw new Error('请选择有效的支付方式');
    const snapshots = lines.map(line => {
      const q = quote(line.id, line.months, line.qty);
      return { ...line, name: q.product.name, brand: q.product.brand, unit: q.unit, total: q.total };
    });
    return { id: `MX${Date.now().toString(36).toUpperCase()}${Math.random().toString(36).slice(2, 7).toUpperCase()}`, createdAt: Date.now(), status: 'pending', email, payment: contact.payment, note: String(contact.note || '').trim().slice(0, 300), lines: snapshots, total: snapshots.reduce((sum, line) => sum + line.total, 0) };
  }
  const LOGIN_URLS = { claude: 'https://claude.ai/', chatgpt: 'https://chatgpt.com/', cursor: 'https://www.cursor.com/', gemini: 'https://gemini.google.com/', perplexity: 'https://www.perplexity.ai/', midjourney: 'https://www.midjourney.com/', notion: 'https://www.notion.so/', copilot: 'https://copilot.microsoft.com/' };
  function randomToken(size) {
    const bytes = new Uint8Array(size);
    if (typeof globalThis.crypto?.getRandomValues === 'function') globalThis.crypto.getRandomValues(bytes);
    else if (typeof require === 'function') require('node:crypto').randomFillSync(bytes);
    else throw new Error('当前浏览器不支持生成演示账号，请使用新版浏览器');
    return Array.from(bytes, b => 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz23456789'[b % 55]).join('');
  }
  function completeDemoOrder(order) {
    if (order.status === 'completed') return order;
    if (order.status === 'cancelled') throw new Error('订单已取消，不能继续支付');
    if (order.status !== 'pending') throw new Error('订单状态无效');
    normalizeCart(order.lines);
    const paidAt = Date.now();
    const deliveries = order.lines.flatMap(line => Array.from({ length: line.qty }, () => {
      const expiration = new Date(paidAt), day = expiration.getUTCDate();
      expiration.setUTCDate(1);
      expiration.setUTCMonth(expiration.getUTCMonth() + line.months + 1);
      expiration.setUTCDate(0);
      expiration.setUTCDate(Math.min(day, expiration.getUTCDate()));
      const delivery = { id: randomToken(12), productId: line.id, name: line.name, brand: line.brand, email: `ai_${randomToken(10).toLowerCase()}@demo.thinkpasser.test`, password: `Mx!${randomToken(18)}`, recoveryCode: `DEMO-${randomToken(8)}-${randomToken(8)}`, loginUrl: LOGIN_URLS[line.brand], expiresAt: expiration.getTime(), months: line.months, mode: product(line.id).mode };
      if (delivery.mode === 'team') Object.assign(delivery, {
        workspace: `Thinkpasser ${randomToken(6).toUpperCase()}`,
        role: '成员', invitationUrl: `https://delivery.thinkpasser.test/invite/${randomToken(24)}`
      });
      return delivery;
    }));
    return { ...order, demo: true, status: 'completed', paidAt, paymentRef: `DEMO${randomToken(20)}`, deliveries };
  }
  function validOrder(o) {
    const validDate = value => Number.isFinite(value) && value > 0 && value <= 8640000000000000;
    if (!o || !/^MX[A-Z0-9]+$/.test(o.id) || !['pending', 'completed', 'cancelled'].includes(o.status)
      || !validDate(o.createdAt) || typeof o.email !== 'string' || !/^[^\s@<>]+@[^\s@<>]+\.[^\s@<>]+$/.test(o.email)
      || !['alipay', 'wechat'].includes(o.payment) || !Array.isArray(o.lines) || !o.lines.length
      || !o.lines.every(l => l && product(l.id) && product(l.id).terms.includes(l.months) && l.brand === product(l.id).brand
        && typeof l.name === 'string' && l.name.length < 200 && Number.isSafeInteger(l.qty) && l.qty > 0
        && Number.isSafeInteger(l.unit) && l.unit >= 0 && Number.isSafeInteger(l.total) && l.total === l.unit * l.qty)
      || !Number.isSafeInteger(o.total) || o.total !== o.lines.reduce((sum, l) => sum + l.total, 0)) return false;
    if (o.status === 'completed' && (!o.demo || !validDate(o.paidAt) || o.paidAt < o.createdAt || typeof o.paymentRef !== 'string'
      || !o.paymentRef.startsWith('DEMO') || !Array.isArray(o.deliveries) || o.deliveries.length !== o.lines.reduce((sum, l) => sum + l.qty, 0)
      || !o.deliveries.every(d => d && product(d.productId) && d.brand === product(d.productId).brand && typeof d.name === 'string'
        && typeof d.email === 'string' && d.email.endsWith('@demo.thinkpasser.test') && typeof d.password === 'string' && d.password.length >= 16
        && typeof d.recoveryCode === 'string' && d.recoveryCode.startsWith('DEMO-') && d.loginUrl === LOGIN_URLS[d.brand]
        && (d.workspace == null || (d.mode === 'team' && typeof d.workspace === 'string' && d.workspace.length <= 80 && d.role === '成员'
          && typeof d.invitationUrl === 'string' && /^https:\/\/delivery\.thinkpasser\.test\/invite\/[A-Za-z0-9]+$/.test(d.invitationUrl)))
        && validDate(d.expiresAt) && d.expiresAt > o.paidAt && o.lines.some(l => l.id === d.productId && l.months === d.months)))) return false;
    if (o.ticket && (typeof o.ticket.message !== 'string' || !validDate(o.ticket.createdAt) || typeof o.ticket.id !== 'string')) return false;
    return true;
  }
  function restoreState(value) {
    const state = { cart: [], orders: [], favorites: [] };
    if (value == null) return { state, repaired: false };
    if (typeof value !== 'object') return { state, repaired: true };
    let repaired = !Array.isArray(value.cart) || !Array.isArray(value.orders) || !Array.isArray(value.favorites);
    for (const line of Array.isArray(value.cart) ? value.cart : []) {
      try { state.cart = normalizeCart([...state.cart, line]); } catch (_) { repaired = true; }
    }
    for (const order of Array.isArray(value.orders) ? value.orders : []) {
      if (validOrder(order) && !state.orders.some(o => o.id === order.id)) state.orders.push(order);
      else repaired = true;
    }
    for (const id of Array.isArray(value.favorites) ? value.favorites : []) {
      if (product(id) && !state.favorites.includes(id)) state.favorites.push(id);
      else repaired = true;
    }
    return { state, repaired };
  }
  return { BRANDS, PRODUCTS, MODES, PLAN_CATALOG, PRICING, LOGIN_URLS, product, brand, money, filterProducts, quote, normalizeCart, createOrder, completeDemoOrder, restoreState };
});
