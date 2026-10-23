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
    { id: 'notion', name: 'Notion AI', label: '笔记与办公', color: '#292a2e', bg: '#f2efea', mark: 'N' },
    { id: 'copilot', name: 'Copilot', label: '办公助手', color: '#6156b7', bg: '#efecfb', mark: 'Co' }
  ];
  const MODES = { private: '独享账号', shared: '共享账号', topup: '账号代充' };
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
  const PRODUCTS = raw.map(([id, brand, tier, mode, price, stock, delivery, desc, badge], rank) => ({
    id, brand, tier, mode, price, stock, delivery, desc, badge, rank,
    name: `${BRANDS.find(b => b.id === brand).name} ${tier} ${MODES[mode]}`,
    terms: [1, 3],
    category: ['cursor'].includes(brand) ? 'code' : ['midjourney'].includes(brand) ? 'creative' : ['notion', 'copilot'].includes(brand) ? 'office' : 'assistant'
  }));

  function product(id) { return PRODUCTS.find(p => p.id === id); }
  function brand(id) { return BRANDS.find(b => b.id === id); }
  function money(cents) { return (cents / 100).toFixed(2); }
  function filterProducts(options = {}) {
    const { q = '', mode = '', brand: bid = '', category = '', delivery = '', sort = 'recommended' } = options;
    const min = options.min === '' || options.min == null ? 0 : Number(options.min);
    const max = options.max === '' || options.max == null ? Infinity : Number(options.max);
    const terms = String(q).trim().toLocaleLowerCase().split(/\s+/).filter(Boolean);
    const list = PRODUCTS.filter(p => (!bid || p.brand === bid) && (!mode || p.mode === mode)
      && (!category || p.category === category) && (!delivery || p.delivery === delivery)
      && p.price >= min && p.price <= max
      && terms.every(term => `${p.name} ${p.desc} ${p.mode === 'private' ? '私人 private' : ''}`.toLocaleLowerCase().includes(term)));
    if (sort === 'price-asc') list.sort((a, b) => a.price - b.price || a.rank - b.rank);
    else if (sort === 'price-desc') list.sort((a, b) => b.price - a.price || a.rank - b.rank);
    else if (sort === 'stock') list.sort((a, b) => b.stock - a.stock || a.rank - b.rank);
    return list;
  }
  function quote(id, months = 1, qty = 1) {
    const p = product(id);
    if (!p) throw new Error('该商品不存在或已下架');
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
      return { id: randomToken(12), productId: line.id, name: line.name, brand: line.brand, email: `ai_${randomToken(10).toLowerCase()}@demo.thinkpasser.test`, password: `Mx!${randomToken(18)}`, recoveryCode: `DEMO-${randomToken(8)}-${randomToken(8)}`, loginUrl: LOGIN_URLS[line.brand], expiresAt: expiration.getTime(), months: line.months, mode: product(line.id).mode };
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
  return { BRANDS, PRODUCTS, MODES, LOGIN_URLS, product, brand, money, filterProducts, quote, normalizeCart, createOrder, completeDemoOrder, restoreState };
});
