/* Static storefront. All transactions and credentials in this build are demos. */
(() => {
  'use strict';
  const { BRANDS, PRODUCTS, MODES, product, brand, money, filterProducts, quote, normalizeCart, createOrder, completeDemoOrder } = Store;
  const $ = selector => document.querySelector(selector);
  const h = value => String(value ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const ICONS = {
    search: '<circle cx="10.5" cy="10.5" r="6.5"/><path d="m16 16 4.5 4.5"/>',
    arrow: '<path d="M5 12h14m-5-5 5 5-5 5"/>', chevron: '<path d="m9 6 6 6-6 6"/>',
    bag: '<path d="M5 7h14l1 14H4L5 7Z"/><path d="M8 8V6a4 4 0 0 1 8 0v2"/>',
    receipt: '<path d="M6 3h12v18l-3-2-3 2-3-2-3 2V3Z"/><path d="M9 7h6M9 11h6M9 15h3"/>',
    grid: '<rect x="3" y="3" width="7" height="7" rx="1"/><rect x="14" y="3" width="7" height="7" rx="1"/><rect x="3" y="14" width="7" height="7" rx="1"/><rect x="14" y="14" width="7" height="7" rx="1"/>',
    heart: '<path d="M20.3 4.9a5.1 5.1 0 0 0-7.2 0L12 6l-1.1-1.1a5.1 5.1 0 0 0-7.2 7.2L12 21l8.3-8.9a5.1 5.1 0 0 0 0-7.2Z"/>',
    check: '<path d="m5 12 4 4L19 6"/>', shield: '<path d="m12 3 8 3v6c0 4.4-8 9-8 9s-8-4.6-8-9V6l8-3Z"/><path d="m8 12 3 3 5-6"/>',
    bolt: '<path d="m13 2-9 12h7l-1 8 10-13h-7l1-7Z"/>', clock: '<circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/>',
    headphones: '<path d="M4 14v-3a8 8 0 0 1 16 0v3"/><rect x="3" y="11" width="4" height="8" rx="2"/><rect x="17" y="11" width="4" height="8" rx="2"/><path d="M19 19c0 2-3 2-7 2"/>',
    close: '<path d="m6 6 12 12M6 18 18 6"/>', menu: '<path d="M4 6h16M4 12h16M4 18h16"/>', filter: '<path d="M4 6h16M7 12h10M10 18h4"/>',
    copy: '<rect x="8" y="8" width="12" height="13" rx="2"/><path d="M16 8V3H3v13h5"/>', eye: '<path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7-10-7-10-7Z"/><circle cx="12" cy="12" r="3"/>',
    download: '<path d="M12 3v12m-4-4 4 4 4-4M4 16v5h16v-5"/>', link: '<path d="M14 3h7v7m0-7L10 14M10 3H3v18h18v-7"/>',
    code: '<path d="m8 6-6 6 6 6m8-12 6 6-6 6M14 3l-4 18"/>', pen: '<path d="m15 4 5 5L8 21H3v-5L15 4Zm0 0 2-2 5 5-2 2"/>', layers: '<path d="m12 3 10 6-10 6L2 9l10-6Zm-9 11 9 5 9-5M3 18l9 5 9-5"/>', info: '<circle cx="12" cy="12" r="9"/><path d="M12 11v6M12 7v1"/>', package: '<path d="m12 2 10 5v10l-10 5-10-5V7l10-5Zm0 10v10M2 7l10 5 10-5M7 4.5l10 5V14"/>'
  };
  function icon(name) { return `<svg aria-hidden="true" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round">${ICONS[name] || ICONS.grid}</svg>`; }
  function logo(id) {
    const b = brand(id) || BRANDS[0];
    let shape = '';
    if (id === 'claude') shape = Array.from({ length: 12 }, (_, i) => `<path d="M24 4v13" transform="rotate(${i * 30} 24 24)"/>`).join('');
    if (id === 'chatgpt') shape = Array.from({ length: 6 }, (_, i) => `<path d="M24 9c-11-8-21 6-12 14l13 8 7-4V15L24 9Z" transform="rotate(${i * 60} 24 24)"/>`).join('');
    if (id === 'gemini') shape = '<path d="M24 2C22 17 17 22 2 24c15 2 20 7 22 22 2-15 7-20 22-22C31 22 26 17 24 2Z" fill="currentColor" stroke="none"/>';
    if (id === 'cursor') shape = '<path d="m24 3 19 11-19 31L5 14 24 3Z" fill="currentColor" stroke="none"/><path d="m24 3 0 42M5 14l19 9 19-9" stroke="var(--brand-bg,#fff)" stroke-width="1.3"/>';
    if (id === 'perplexity') shape = '<path d="M24 3v42M8 7l16 10L40 7v30L24 27 8 37V7ZM5 17h38v21H5V17Z"/>';
    if (id === 'midjourney') shape = '<path d="M23 4v31M20 9 6 30h14V9Zm7 3 14 18H27V12ZM4 35h40l-7 7H11l-7-7Z"/>';
    if (id === 'notion') return `<span class="brand-logo wordmark" style="--brand-color:${b.color}" aria-hidden="true">N</span>`;
    if (id === 'copilot') shape = '<path d="M10 7h20l-9 34H4L10 7Z" fill="currentColor" opacity=".65"/><path d="M27 7h17l-7 34H17L27 7Z" fill="currentColor" opacity=".85"/>';
    return `<span class="brand-logo" style="--brand-color:${b.color}" aria-hidden="true"><svg viewBox="0 0 48 48" fill="none" stroke="currentColor" stroke-width="${id === 'claude' ? 3.2 : 2.2}" stroke-linejoin="round" stroke-linecap="round">${shape}</svg></span>`;
  }
  const KEY = 'thinkpasser-store-v1';
  let state = { cart: [], orders: [], favorites: [] }, storageWarning = false, storageLocked = false;
  function readState() {
    let raw;
    try {
      raw = localStorage.getItem(KEY);
      const result = Store.restoreState(JSON.parse(raw || 'null'));
      if (result.repaired && raw) { try { localStorage.setItem(KEY + '-recovery-' + Date.now(), raw); } catch (_) { storageLocked = true; } storageWarning = true; }
      return result.state;
    } catch (_) {
      storageWarning = true;
      if (raw) { try { localStorage.setItem(KEY + '-recovery-' + Date.now(), raw); } catch (_) { storageLocked = true; } }
      return { cart: [], orders: [], favorites: [] };
    }
  }
  state = readState();
  function persist(next) {
    if (storageLocked) { toast('原始本地数据暂时无法备份，已停止覆盖保存，请检查浏览器存储'); return false; }
    try { localStorage.setItem(KEY, JSON.stringify(next)); state = next; updateCartCount(); return true; }
    catch (_) { toast('浏览器无法保存数据，请检查存储空间或隐私设置'); return false; }
  }
  async function mutate(fn) {
    const write = () => { const next = readState(); fn(next); return persist(next); };
    return navigator.locks?.request ? navigator.locks.request(KEY, write) : write();
  }
  let toastTimer;
  function toast(message) { const el = $('#toast'); el.textContent = message; el.classList.add('show'); clearTimeout(toastTimer); toastTimer = setTimeout(() => el.classList.remove('show'), 3200); }
  function go(path) { if (location.hash === path) render(); else location.hash = path; }
  function updateCartCount() { const total = state.cart.reduce((sum, line) => sum + line.qty, 0), el = $('#cart-count'); el.textContent = total; el.hidden = total === 0; }
  function price(cents, suffix = '') {
    if (!Number.isSafeInteger(cents)) return '<span class="price-pending">企业询价<small>按席位与配置确认</small></span>';
    const [whole, decimals] = money(cents).split('.');
    return `<span class="price"><span class="currency">¥</span>${whole}<span class="decimals">.${decimals}</span>${suffix ? `<small>${h(suffix)}</small>` : ''}</span>`;
  }
  function date(value, time = false) { return new Intl.DateTimeFormat('zh-CN', { year: 'numeric', month: '2-digit', day: '2-digit', ...(time ? { hour: '2-digit', minute: '2-digit', hour12: false } : {}) }).format(new Date(value)); }
  const modeNote = mode => ({ private: '独立使用，交付账号登录信息。是否可修改密码或邮箱，以商品说明为准。', shared: '多人按席位使用，请遵守商品约定的设备与使用规则。', topup: '为你已有的账号开通或续费，订单中确认接收与开通方式。', team: '按组织成员提供席位，需确认工作区、席位类型与管理权限。', family: '家庭订阅的基础权益与 AI 权益分别确认，不代表每位成员都拥有 AI 许可。' }[mode]);
  const VALUE = {
    claude: ['写作、文档处理与编程。按 Pro、Max 和团队席位比较。', '适合经常写作、读文档与处理代码的人；如果只是偶尔问答，可以先从轻量方案开始。'],
    chatgpt: ['对话、创作与工作任务。按套餐等级与账号方式比较。', '适合频繁处理写作、资料整理与日常创作的人。先确认自己的使用频率，再选择期限。'],
    cursor: ['AI 代码编辑器。现行订阅与存量套餐分别标识。', '适合每天需要阅读和修改代码的开发者；如果很少写代码，不必为了工具而付费。'],
    gemini: ['Google AI 订阅。比较 Plus、Pro 与 Ultra 使用量档位。', '适合已有相关工具使用习惯的用户。请先确认商品权益与自己的地区和设备是否匹配。'],
    midjourney: ['图像创作订阅。比较生成配额与隐身模式权益。', '适合经常探索画面与视觉方案的创作者；购买前确认套餐额度和自己的产出频率。'],
    perplexity: ['检索与研究。个人套餐与企业席位分别计价。', '适合反复搜索、整理资料与开展研究的人；关键材料仍需要自己核查来源。'],
    notion: ['文档与协作工作区。AI 试用与完整权益分别说明。', '适合已经使用 Notion 管理文档的人。先有明确的工作流，再为工具投入预算。'],
    copilot: ['Microsoft 365 与 Copilot。核对基础订阅与 AI 许可。', '适合频繁处理办公文档的人。请先确认商品对应的客户端与基础订阅要求。']
  };
  function art(p, extra = '') {
    const b = brand(p.brand), detail = extra === 'detail-art';
    return `<div class="product-art ${extra}" style="--brand-color:${b.color};--brand-bg:${b.bg}">${detail ? `<div class="spec-sheet-head"><span>SUBSCRIPTION / ${h(b.id.toUpperCase())}</span><span>${h(p.legacy ? 'LEGACY' : 'PLAN')}</span></div>` : ''}<div class="product-identity">${logo(p.brand)}<span class="art-wordmark">${h(b.name)}<small>${h(b.label)}</small></span></div><span class="art-tier">${h(p.tier)}</span>${detail ? `<dl class="spec-sheet"><div><dt>套餐</dt><dd>${h(p.tier)}</dd></div><div><dt>账号方式</dt><dd>${h(MODES[p.mode])}</dd></div><div><dt>交付</dt><dd>${p.mode === 'team' ? '席位与授权信息' : p.mode === 'topup' ? '账号开通信息' : '账号与使用说明'}</dd></div></dl>` : ''}</div>`;
  }
  function card(p) {
    const b = brand(p.brand), custom = p.price === null;
    const status = custom ? '企业方案 · 按需报价' : p.stock ? '可选购' : '暂时缺货';
    const title = p.displayName ? p.displayName.replace(b.name + ' ', '') : p.tier;
    return `<article class="product-card" style="--card-tint:${b.bg};--card-color:${b.color}"><button class="favorite ${state.favorites.includes(p.id) ? 'active' : ''}" data-action="favorite" data-id="${p.id}" aria-label="${state.favorites.includes(p.id) ? '取消收藏' : '收藏'} ${h(p.name)}" aria-pressed="${state.favorites.includes(p.id)}">${icon('heart')}</button><a class="product-card-head" href="#/product/${p.id}" aria-label="查看 ${h(p.name)}"><span class="product-logo-wrap">${logo(p.brand)}</span><span><b>${h(b.name)}</b><small>${h(b.label)}</small></span></a><div class="product-content"><div class="product-title-row"><a href="#/product/${p.id}" aria-label="${h(p.name)}"><h3>${h(title)}</h3></a><span class="ownership-label">${h(MODES[p.mode])}</span></div><p class="product-desc">${h(p.summary || p.desc)}</p><div class="product-meta"><span>${icon('clock')}${custom ? '按组织需求' : '1 / 3 个月'}</span><span>${p.legacy ? '存量套餐' : custom ? '定制配置' : p.mode === 'team' ? '团队席位' : p.delivery === 'instant' ? '订单内交付' : '按单开通'}</span></div><div class="product-bottom"><a href="#/product/${p.id}" aria-label="${h(p.name)} ${custom ? '企业询价' : `月价 ${money(p.price)} 元`}">${price(p.price, p.mode === 'team' ? '/ 席位 / 月' : '/ 月')}</a><a class="product-cta" href="#/product/${p.id}" aria-label="查看 ${h(p.name)} 方案">查看 ${icon('arrow')}</a></div><div class="product-footnote"><span><i class="stock-dot ${p.stock ? '' : 'out'}"></i>${status}</span><span>模型平权自营</span></div></div></article>`;
  }
  const faq = (items, firstOpen = false) => `<div class="faq-grid">${items.map(([q, a], i) => `<details ${firstOpen && i === 0 ? 'open' : ''}><summary>${h(q)}</summary><p>${h(a)}</p></details>`).join('')}</div>`;
  const commonFAQs = [['购买后会收到什么？', '成品账号的交付内容包括账号邮箱、密码、登录入口、有效期和使用说明；代充商品提供对应的开通信息。具体内容以商品说明为准。'], ['独享账号与共享账号怎么选？', '独享适合持续使用与独立管理；共享适合轻量体验。请结合设备约定、使用频率与具体交付权限选择，不建议只比较价格。'], ['我已有账号，可以续费吗？', '可以在商品列表选择“账号代充”，再核对商品支持的套餐与开通要求。具体支持情况以对应商品说明为准。'], ['支付和交付流程是什么？', '选择商品、确认套餐和接收信息后创建订单，在收银台查看支付状态。交付内容集中保存在订单中，方便核对与查询。']];
  function crumbs(items) { return `<div class="breadcrumbs"><a href="#/">首页</a>${items.map(([label, href]) => `${icon('chevron')}${href ? `<a href="${href}">${h(label)}</a>` : `<span>${h(label)}</span>`}`).join('')}</div>`; }
  function empty(title, desc, label = '去挑选账号', href = '#/accounts', name = 'bag') { return `<div class="empty-state">${icon(name)}<h2>${h(title)}</h2><p>${h(desc)}</p><a href="${href}" class="button primary">${h(label)} ${icon('arrow')}</a></div>`; }
  function principleBand() {
    return `<section class="selection-notes"><div class="selection-note-title"><span class="eyebrow">SELECTION NOTES</span><h2>购买前，核对三件事。</h2><a class="text-link" href="#/value">选购原则 ${icon('arrow')}</a></div>${[['01', '套餐等级', '功能范围、使用量与额外计费项目。'], ['02', '账号权限', '独享、共享、代充与团队席位的区别。'], ['03', '交付内容', '账号、授权、使用周期和开通方式。']].map(([n, title, desc]) => `<div class="selection-note"><span>${n}</span><h3>${title}</h3><p>${desc}</p></div>`).join('')}</section>`;
  }
  function opticalArt(p, index) {
    return `<div class="optical-art optical-${p.brand}" aria-hidden="true"><div class="optical-grid"></div><span class="optical-label">${h(brand(p.brand).name.toUpperCase())}<i>0${index + 1}</i></span><div class="optical-object"><div class="optical-shadow"></div><div class="optical-orbit orbit-one"></div><div class="optical-orbit orbit-two"></div><div class="optical-slab slab-back"></div><div class="optical-slab slab-front">${logo(p.brand)}<span class="slab-etch"></span></div><span class="optical-node node-one"></span><span class="optical-node node-two"></span></div><div class="optical-coordinate"><span>AI / SUBSCRIPTION</span><span>+ ── +</span></div></div>`;
  }
  function home(query) {
    const category = query.get('category') || '';
    const featured = ['claude-pro-private', 'chatgpt-plus-private', 'cursor-premium-private'].map(product);
    const picks = category ? filterProducts({ category }).slice(0, 8) : ['claude-max20-private', 'gemini-pro-private', 'midjourney-standard-private', 'perplexity-pro-private', 'notion-business-team', 'copilot-premium-private', 'claude-pro-shared', 'chatgpt-plus-shared'].map(product).filter(Boolean);
    return `<div class="studio-home"><section class="studio-masthead"><div><span class="studio-eyebrow"><i></i> THINKPASSER — AI SUBSCRIPTIONS</span><h1>AI 工具<span>与</span>订阅<span class="heading-period">.</span></h1><p>写作、研究、编程、图像与办公。套餐、账号方式与交付规格，清楚列明。</p></div><a href="#/accounts" class="studio-directory">浏览完整目录 <span>${icon('arrow')}</span></a></section><nav class="studio-brands" aria-label="按工具浏览">${BRANDS.map(b => `<a href="#/accounts/${b.id}">${logo(b.id)}<span>${h(b.name)}</span></a>`).join('')}</nav><section class="studio-featured" aria-label="常用工具套餐">${featured.map((p, index) => `<article class="showcase-product" style="--accent:${brand(p.brand).color}"><a class="showcase-visual-link" href="#/product/${p.id}" aria-label="查看 ${h(p.name)}">${opticalArt(p, index)}</a><div class="showcase-content"><div class="showcase-name"><div><span>${h(brand(p.brand).name)}</span><h2>${h(p.tier)}</h2></div><span class="showcase-access">${h(MODES[p.mode])}</span></div><p>${h(p.summary || p.desc)}</p><div class="showcase-buy"><div>${price(p.price)}<small>/ 月</small></div><a href="#/product/${p.id}" aria-label="选择 ${h(p.name)}">选择套餐 ${icon('arrow')}</a></div><div class="showcase-caption"><span><i></i>${p.delivery === 'instant' ? '订单内交付' : '按单开通'}</span><span>1 / 3 个月可选</span></div></div></article>`).join('')}</section><section class="studio-more" tabindex="-1" aria-label="按场景浏览套餐"><div class="studio-section-title"><div><span class="studio-eyebrow">EXPLORE THE CATALOG</span><h2>浏览更多套餐<span> /</span></h2></div><a href="#/accounts">全部方案 ${icon('arrow')}</a></div><nav class="studio-categories" aria-label="按使用场景选择商品">${[['', '全部工具', 'grid'], ['assistant', '写作与研究', 'pen'], ['code', '编程开发', 'code'], ['creative', '图像创作', 'layers'], ['office', '知识与办公', 'receipt']].map(([id, name, symbol]) => `<a href="#/${id ? '?category=' + id : ''}" class="${category === id ? 'active' : ''}" ${category === id ? 'aria-current="true"' : ''}>${icon(symbol)} ${name}</a>`).join('')}</nav><div class="product-grid studio-product-grid">${picks.length ? picks.map(card).join('') : '<p class="studio-no-results">这个场景的更多套餐在完整目录中查看。</p>'}</div></section><section class="studio-service"><span>${icon('layers')} 套餐与权限，逐项列明</span><span>${icon('receipt')} 交付与使用，在订单内查看</span><a href="#/value">为需要的能力付费 ${icon('arrow')}</a></section></div>`;
  }
  function catalog(bid, query) {
    const b = brand(bid), filters = Object.fromEntries(query); if (b) filters.brand = b.id;
    const options = { ...filters, min: query.has('min') ? Number(query.get('min')) * 100 : '', max: query.has('max') ? Number(query.get('max')) * 100 : '' };
    const list = filterProducts(options).filter(p => !filters.favorites || state.favorites.includes(p.id));
    const chosenBrand = b?.id || filters.brand, plans = Store.PLAN_CATALOG[chosenBrand] || [];
    const base = PRODUCTS.filter(p => !chosenBrand || p.brand === chosenBrand);
    const group = (title, key, choices) => `<div class="filter-section"><h3>${title}</h3>${choices.map(([value, label, count]) => `<label class="filter-choice"><input type="radio" name="${key}" value="${value}" data-filter="${key}" ${String(filters[key] || '') === value ? 'checked' : ''}><span>${key === 'brand' && value ? logo(value) : ''}${h(label)}</span>${count == null ? '' : `<span>${count}</span>`}</label>`).join('')}</div>`;
    const link = changes => { const next = new URLSearchParams(query); for (const [key, value] of Object.entries(changes)) value === '' ? next.delete(key) : next.set(key, value); return '#' + currentRoute().path + (next.size ? '?' + next : ''); };
    const chips = Object.entries(filters).filter(([key, value]) => value && !['sort', 'page', 'view'].includes(key) && !(key === 'brand' && b)).map(([key, value]) => {
      const label = key === 'q' ? `搜索：${value}` : key === 'mode' ? MODES[value] : key === 'plan' ? plans.find(p => p.id === value)?.tier : key === 'brand' ? brand(value)?.name : key === 'min' ? `最低 ¥${value}` : key === 'max' ? `最高 ¥${value}` : key === 'favorites' ? '我的收藏' : key === 'category' ? ({ code: '编程开发', assistant: '写作与研究', creative: '图像创作', office: '知识与办公' }[value]) : key === 'delivery' ? (value === 'instant' ? '订单内交付' : '按单开通') : value;
      return `<button class="active-chip" data-action="remove-filter" data-key="${h(key)}">${h(label || value)} ${icon('close')}</button>`;
    }).join('');
    const pageSize = 12, pageCount = Math.max(1, Math.ceil(list.length / pageSize));
    const requestedPage = Number(query.get('page') || 1), page = Math.min(pageCount, Math.max(1, Number.isSafeInteger(requestedPage) ? requestedPage : 1));
    const visible = list.slice((page - 1) * pageSize, page * pageSize);
    const pagination = pageCount > 1 ? `<nav class="catalog-pagination" aria-label="商品分页">${page > 1 ? `<a href="${h(link({ page: String(page - 1) }))}" aria-label="上一页">←</a>` : '<span aria-disabled="true">←</span>'}${Array.from({ length: pageCount }, (_, index) => `<a class="${page === index + 1 ? 'active' : ''}" href="${h(link({ page: String(index + 1) }))}" ${page === index + 1 ? 'aria-current="page"' : ''}>${index + 1}</a>`).join('')}${page < pageCount ? `<a href="${h(link({ page: String(page + 1) }))}" aria-label="下一页">→</a>` : '<span aria-disabled="true">→</span>'}</nav>` : '';
    return `<div class="studio-catalog"><div class="catalog-location"><a href="#/">商店</a>${icon('chevron')}<span>商品目录</span>${b ? `${icon('chevron')}<span>${h(b.name)}</span>` : ''}</div><div class="studio-section-title catalog-title"><div><span class="studio-eyebrow">AI SUBSCRIPTIONS / CATALOG</span><h1>${h(b?.name || brand(chosenBrand)?.name || '全部套餐')}</h1><p>${b ? h(VALUE[b.id][0]) : '按工具、套餐与账号方式，找到适合你的方案。'}</p></div><a href="#/">${icon('arrow')} 返回商店</a></div><nav class="studio-categories" aria-label="按使用场景选择商品">${[['', '全部工具', 'grid'], ['assistant', '写作与研究', 'pen'], ['code', '编程开发', 'code'], ['creative', '图像创作', 'layers'], ['office', '知识与办公', 'receipt']].map(([value, label, symbol]) => `<a href="${h(link({ category: value, page: '' }))}" class="${(filters.category || '') === value ? 'active' : ''}" ${(filters.category || '') === value ? 'aria-current="true"' : ''}>${icon(symbol)} ${label}</a>`).join('')}</nav><div class="catalog-layout"><div class="filter-backdrop" data-action="close-filter"></div><aside class="filter-sidebar" id="filter-sidebar" aria-label="商品筛选"><div class="filter-title"><h2>筛选商品</h2><button class="clear-filter" data-action="reset-filters">重置</button><button class="icon-button mobile-filter-close" data-action="close-filter" aria-label="关闭筛选">${icon('close')}</button></div>${group('工具品牌', 'brand', [['', '全部工具', PRODUCTS.length], ...BRANDS.map(x => [x.id, x.name, PRODUCTS.filter(p => p.brand === x.id).length])])}${plans.length ? group('套餐等级', 'plan', [['', '全部套餐', base.length], ...plans.map(p => [p.id, p.tier, base.filter(x => x.plan === p.id).length])]) : ''}${group('账号方式', 'mode', [['', '全部方式', base.length], ...Object.entries(MODES).map(([value, label]) => [value, label, base.filter(p => p.mode === value).length])])}<div class="filter-section"><h3>月价范围 · 元</h3><form id="price-filter"><div class="price-range"><input type="number" min="0" step="0.01" name="min" aria-label="最低价格" placeholder="最低价" value="${h(query.get('min') || '')}"><span>–</span><input type="number" min="0" step="0.01" name="max" aria-label="最高价格" placeholder="最高价" value="${h(query.get('max') || '')}"></div><button class="price-filter-button" type="submit">应用价格范围</button></form></div>${group('交付方式', 'delivery', [['', '全部', null], ['instant', '订单内交付', null], ['manual', '按单开通', null]])}<div class="filter-section"><a class="text-link" href="#/accounts?favorites=1">${icon('heart')} 我的收藏 (${state.favorites.length})</a></div></aside><section id="catalog-results" tabindex="-1" aria-label="商品列表"><div class="catalog-toolbar"><button class="filter-toggle" data-action="open-filter" aria-expanded="false">${icon('filter')} 筛选</button><span>找到 <b>${list.length}</b> 个方案</span><select class="sort-select" id="catalog-sort" aria-label="商品排序">${[['recommended', '默认排序'], ['price-asc', '价格从低到高'], ['price-desc', '价格从高到低'], ['stock', '可选方案优先']].map(([value, label]) => `<option value="${value}" ${filters.sort === value ? 'selected' : ''}>${label}</option>`).join('')}</select></div>${chips ? `<div class="active-filters">${chips}</div>` : ''}${list.length ? `<div class="product-grid studio-product-grid catalog-grid">${visible.map(card).join('')}</div><div class="catalog-page-bottom"><p>${(page - 1) * pageSize + 1}–${Math.min(page * pageSize, list.length)} / ${list.length} 个方案</p>${pagination}</div>` : empty('没有匹配的套餐', '调整工具、账号方式或价格范围后重试。', '清除筛选', '#' + currentRoute().path, 'search')}</section></div></div>`;
  }

  let selection = { id: '', months: 1, qty: 1 };
  function detail(id) {
    const p = product(id); if (!p) return notFound();
    if (selection.id !== id) selection = { id, months: 1, qty: 1 };
    const related = PRODUCTS.filter(x => x.brand === p.brand);
    const orderable = Number.isSafeInteger(p.price) && p.stock > 0;
    const amount = orderable ? quote(id, selection.months, selection.qty).total : p.price;
    const facts = [['商品名称', p.name], ['套餐等级', p.tier], ['账号与授权方式', MODES[p.mode]], ['使用期限', orderable ? selection.months + ' 个月' : '开通前按方案确认'], ['交付内容', p.mode === 'topup' ? '开通结果、接收信息与使用说明' : p.mode === 'team' ? '席位邀请、授权范围与使用说明' : '账号信息、登录入口与使用说明'], ['交付方式', p.delivery === 'instant' ? '交付信息可在订单中查看' : '按订单约定提供开通与交付信息'], ['使用说明', modeNote(p.mode)]];
    if (p.aiAccess) facts.push(['AI 权益', p.aiAccess === 'trial' ? '仅包含试用，不等于完整 AI 订阅' : '包含对应套餐的 AI 权益；额外计费项目另行确认']);
    return `${crumbs([['账号商城', '#/accounts'], [brand(p.brand).name, '#/accounts/' + p.brand], [p.tier + ' · ' + MODES[p.mode]]])}<div class="detail-layout"><div>${art(p, 'detail-art')}<div class="detail-assurances"><div>${icon('shield')} 自营商品</div><div>${icon('receipt')} 订单可查</div><div>${icon('headphones')} 售后入口随单</div></div></div><section class="detail-purchase"><div class="eyebrow">${h(brand(p.brand).name.toUpperCase())} / SUBSCRIPTION</div><h1>${h(p.name)}</h1><p class="description">${h(p.summary || p.desc)}</p>${p.legacy ? '<div class="plan-notice">存量套餐：需先核对账号资格与续订条件。</div>' : ''}<div class="detail-price-box"><div>${price(amount)}<div class="detail-price-caption">${orderable ? `${selection.months} 个月 · ${selection.qty} 份` : p.price === null ? '企业定制方案，按席位与配置报价' : '当前暂无可选库存'}</div></div><span>账号与订阅<br>人民币结算</span></div><div class="option-label"><strong>账号方案</strong><span>${h(MODES[p.mode])}</span></div><div class="option-group">${related.map(x => `<a class="option-button ${x.id === p.id ? 'selected' : ''}" href="#/product/${x.id}">${h(x.tier)} · ${h(MODES[x.mode])}</a>`).join('')}</div>${orderable ? `<div class="option-label"><strong>使用期限</strong></div><div class="option-group">${p.terms.map(months => `<button class="option-button ${selection.months === months ? 'selected' : ''}" data-action="term" data-months="${months}">${months} 个月${months === 3 ? '<small>长周期方案</small>' : ''}</button>`).join('')}</div><div class="option-label"><strong>购买数量</strong><span>单次最多 ${p.stock} 份</span></div><div class="quantity"><button data-action="quantity" data-delta="-1" aria-label="减少购买数量" ${selection.qty <= 1 ? 'disabled' : ''}>−</button><span>${selection.qty}</span><button data-action="quantity" data-delta="1" aria-label="增加购买数量" ${selection.qty >= p.stock ? 'disabled' : ''}>+</button></div><div class="buy-row"><button class="button secondary large" data-action="add-cart" data-id="${p.id}">${icon('bag')} 加入购物车</button><button class="button primary large" data-action="buy" data-id="${p.id}">立即购买 ${icon('arrow')}</button></div>` : p.price === null ? '<div class="plan-availability"><b>企业定制方案</b><p>需要确认席位、基础许可、用量与服务周期，报价后再开通。</p><a class="button secondary full large" href="#/help?tab=buying">查看购买说明</a></div>' : '<div class="plan-availability"><b>暂时缺货</b><p>当前没有可售库存，补货后可继续选购。</p><button class="button secondary full large" disabled>等待补货</button></div>'}<p class="buy-note">${icon('shield')} 套餐权益与交付范围以商品说明为准。</p></section></div><div class="detail-description"><section class="white-panel"><h2>规格与交付</h2><table class="detail-specs"><tbody>${facts.map(([key, value]) => `<tr><th scope="row">${h(key)}</th><td>${h(value)}</td></tr>`).join('')}</tbody></table>${p.note ? `<div class="value-callout"><h3>${icon('info')} 套餐说明</h3><p>${h(p.note)}</p></div>` : ''}<div class="value-callout"><h3>${icon('code')} 适用场景</h3><p>${h(VALUE[p.brand][1])}</p></div><h3>购买与使用</h3><p>请先核对账号方式、使用期限与交付内容。账号对应的功能、可用地区、设备和用量规则由服务提供方决定；套餐名称不代表无限使用或所有功能均可用。</p><p>套餐等级与账号方式分别确认：独享、共享、代充和团队席位并不具有相同的控制权限。企业方案还需核对席位数量、基础许可与开通条件。</p><a class="text-link official-plan-link" href="${h(p.officialUrl)}" target="_blank" rel="noopener noreferrer">查看官方套餐说明 ${icon('link')}</a><h3>常见问题</h3>${faq(commonFAQs.slice(0, 2))}</section><aside class="white-panel"><div class="eyebrow">YOUR NEXT STEPS</div><h2 style="margin-top:10px">购买步骤</h2><ol class="steps-vertical"><li><b>选好套餐等级</b>区分 Pro、Max、团队与企业方案。</li><li><b>确认账号与授权方式</b>核对独享、共享、代充或席位范围。</li><li><b>查看开通与交付内容</b>套餐、期限与使用说明随订单可查。</li></ol></aside></div><section class="section"><div class="section-heading"><h2>同工具的其他方案<small>RELATED PLANS</small></h2><a class="text-link" href="#/accounts/${p.brand}">查看全部方案 ${icon('arrow')}</a></div><div class="product-grid">${PRODUCTS.filter(x => x.id !== id && x.brand === p.brand).slice(0, 4).map(card).join('')}</div></section>`;
  }
  function checkoutSteps(current) { return `<div class="checkout-steps">${[['确认商品', 1], ['填写订单', 2], ['支付与交付', 3]].map(([name, n], index) => `${index ? icon('chevron') : ''}<span class="${n === current ? 'current' : ''}"><i>${n < current ? '✓' : n}</i>${name}</span>`).join('')}</div>`; }
  function summary(items, cta = '') {
    const lines = items.map(line => ({ ...line, ...quote(line.id, line.months, line.qty) }));
    const total = lines.reduce((sum, line) => sum + line.total, 0);
    return `<aside class="white-panel summary-panel"><h2>订单汇总</h2>${lines.map(line => `<div class="checkout-item">${logo(line.product.brand)}<div><b>${h(line.product.name)}</b><small>${line.months} 个月 × ${line.qty}</small></div><span class="item-price">¥${money(line.total)}</span></div>`).join('')}<div class="summary-line"><span>商品金额</span><b>¥${money(total)}</b></div><div class="summary-line"><span>交付费用</span><b>¥0.00</b></div><div class="summary-total"><span>合计</span>${price(total)}</div>${cta}<p class="subtle-note">支付通道暂未开放，体验流程不会扣款</p></aside>`;
  }
  function cart() {
    return `${crumbs([['购物车']])}${checkoutSteps(1)}<div class="page-header"><h1>你的工具清单</h1><p>确认商品、期限与数量，准备好再下单。</p></div>${!state.cart.length ? empty('购物车还是空的', '从真正需要的工具开始，给下一次工作做个准备。') : `<div class="cart-layout"><section class="white-panel">${state.cart.map(line => { const p = product(line.id), q = quote(line.id, line.months, line.qty); return `<div class="cart-row"><a href="#/product/${p.id}" class="product-art cart-thumb" style="--brand-color:${brand(p.brand).color};--brand-bg:${brand(p.brand).bg}" aria-label="查看 ${h(p.name)}">${logo(p.brand)}</a><div><a href="#/product/${p.id}"><h3>${h(p.name)}</h3></a><p>${line.months} 个月 · ${h(MODES[p.mode])}</p><div class="quantity"><button data-action="cart-quantity" data-id="${p.id}" data-months="${line.months}" data-delta="-1" aria-label="减少 ${h(p.name)} 数量" ${line.qty === 1 ? 'disabled' : ''}>−</button><span>${line.qty}</span><button data-action="cart-quantity" data-id="${p.id}" data-months="${line.months}" data-delta="1" aria-label="增加 ${h(p.name)} 数量">+</button></div></div><div class="cart-row-price">${price(q.total)}<button data-action="remove-cart" data-id="${p.id}" data-months="${line.months}">移除商品</button></div></div>`; }).join('')}</section>${summary(state.cart, '<a class="button primary full large" href="#/checkout">前往确认订单 ' + icon('arrow') + '</a>')}</div>`}`;
  }
  function checkoutItems(query) {
    if (query.has('id')) return normalizeCart([{ id: query.get('id'), months: Number(query.get('months') || 1), qty: Number(query.get('qty') || 1) }]);
    return normalizeCart(state.cart);
  }
  let checkoutSnapshot = '';
  function checkout(query) {
    let items;
    try { items = checkoutItems(query); } catch (e) { return `${crumbs([['确认订单']])}${empty('请重新确认商品', e.message, '返回账号商城', '#/accounts', 'info')}`; }
    if (!items.length) return `${crumbs([['确认订单']])}${empty('还没有待购买商品', '先挑选一个适合自己的账号方案。')}`;
    checkoutSnapshot = JSON.stringify(items);
    return `${crumbs([['购物车', '#/cart'], ['确认订单']])}${checkoutSteps(2)}<div class="page-header"><h1>确认订单</h1><p>账号与交付信息会集中展示在订单中，请妥善保存。</p></div><div class="checkout-layout"><form class="white-panel checkout-panel" id="checkout-form"><h2>接收信息</h2><div class="form-field"><label for="checkout-email">接收邮箱 *</label><input id="checkout-email" name="email" type="email" autocomplete="email" required maxlength="254" placeholder="you@example.com"><small>用于标记订单接收信息；体验模式不会发送邮件。</small></div><div class="form-field"><label for="checkout-note">订单备注 <span>（选填）</span></label><textarea id="checkout-note" name="note" maxlength="300" rows="3" placeholder="如有使用方式等需要确认，可以在这里备注。请勿填写真实账号密码。"></textarea></div><h2>支付方式</h2><div class="payment-options"><label class="payment-option"><input type="radio" name="payment" value="alipay" checked><span class="payment-mark">支</span><span>支付宝</span></label><label class="payment-option"><input type="radio" name="payment" value="wechat"><span class="payment-mark wechat">微</span><span>微信支付</span></label></div><div class="value-callout"><h3>${icon('info')} 支付通道暂未开放</h3><p>当前未连接支付通道，不会发起真实扣款。你可以继续体验下单与交付流程，体验账号不可用于真实登录。</p></div><label class="consent"><input type="checkbox" name="agreed" required><span>我已确认商品、账号方式与使用期限，并阅读 <a href="#/policy/terms" target="_blank" rel="noopener">购买须知</a> 与 <a href="#/policy/privacy" target="_blank" rel="noopener">隐私说明</a>。</span></label><p class="form-error" id="checkout-error" role="alert"></p></form>${summary(items, '<button class="button primary full large" type="submit" form="checkout-form">创建订单，前往支付 ' + icon('arrow') + '</button>')}</div>`;
  }
  const STATUS = { pending: ['待支付', 'orange'], completed: ['已交付', 'green'], cancelled: ['已取消', ''] };
  function orderList(query) {
    const status = query.get('status') || '';
    const search = (query.get('q') || '').trim().toLowerCase();
    const list = state.orders.filter(o => (!status || o.status === status) && (!search || `${o.id} ${o.email} ${o.lines.map(l => l.name).join(' ')}`.toLowerCase().includes(search)));
    return `${crumbs([['我的订单']])}<div class="page-header"><div class="eyebrow">YOUR TOOLKIT / ORDERS</div><h1>我的订单</h1><p>订单状态、账号交付与使用说明，随时回来查看。</p></div><div class="orders-toolbar"><div class="order-tabs">${[['', '全部订单'], ['pending', '待支付'], ['completed', '已交付'], ['cancelled', '已取消']].map(([id, label]) => `<a class="${status === id ? 'active' : ''}" href="#/orders${id ? '?status=' + id : ''}">${label}<small>${state.orders.filter(o => !id || o.status === id).length}</small></a>`).join('')}</div><form id="order-search" class="order-search"><input name="q" aria-label="搜索订单" placeholder="订单号、商品或接收邮箱" value="${h(query.get('q') || '')}"><button aria-label="搜索订单">${icon('search')}</button></form></div>${list.length ? list.map(o => `<article class="order-list-card"><div class="order-list-head"><span class="mono">${h(o.id)}</span><span>${date(o.createdAt, true)}</span><span class="tag ${STATUS[o.status][1]}">${STATUS[o.status][0]}</span></div><div class="order-list-body">${logo(o.lines[0].brand || product(o.lines[0].id).brand)}<div class="order-name"><b>${h(o.lines[0].name)}${o.lines.length > 1 ? ` 等 ${o.lines.length} 种商品` : ''}</b><small>${o.lines[0].months} 个月 · 共 ${o.lines.reduce((sum, l) => sum + l.qty, 0)} 个账号${o.ticket ? ' · 已提交体验售后' : ''}</small></div>${price(o.total)}<a class="button ${o.status === 'pending' ? 'primary' : 'secondary'} small" href="#/order/${o.id}">${o.status === 'pending' ? '前往支付' : o.status === 'completed' ? '查看账号' : '订单详情'} ${icon('arrow')}</a></div></article>`).join('') : empty(state.orders.length ? '没有找到对应的订单' : '期待你的第一件好工具', state.orders.length ? '试试切换订单状态或搜索条件。' : '挑选适合自己的账号，订单和交付会保存在这里。', state.orders.length ? '查看全部订单' : '去挑选账号', state.orders.length ? '#/orders' : '#/accounts', 'receipt')}<p class="catalog-bottom">体验订单保存在当前浏览器，请勿将此页面用于存放真实账号。</p>`;
  }
  function credentialRow(label, text, dIndex, field, extra = '') { return `<div class="credential-field"><span>${label}</span><code ${field === 'password' ? `data-password="${dIndex}"` : ''}>${field === 'password' ? '••••••••••••••••' : h(text)}</code>${extra}<button data-action="copy-field" data-delivery="${dIndex}" data-field="${field}" aria-label="复制${label}">${icon('copy')} 复制</button></div>`; }
  function deliveryCard(d, index) {
    const topup = d.mode === 'topup', team = d.mode === 'team' && d.workspace && d.invitationUrl;
    return `<section class="delivery-card"><div class="delivery-head">${logo(d.brand)}<b>${h(d.name)}</b><span class="tag green">${team ? '体验席位信息' : topup ? '体验开通完成' : '体验账号已交付'}</span></div>${credentialRow(team ? '席位邮箱' : topup ? '接收账号' : '账号邮箱', d.email, index, 'email')}${team ? credentialRow('工作区', d.workspace, index, 'workspace') + credentialRow('席位角色', d.role, index, 'role') + credentialRow('邀请信息', d.invitationUrl, index, 'invitationUrl') : credentialRow('登录密码', d.password, index, 'password', `<button data-action="toggle-password" data-delivery="${index}" aria-label="显示或隐藏密码">${icon('eye')}</button>`) + credentialRow(topup ? '开通凭证' : '恢复代码', d.recoveryCode, index, 'recoveryCode')}<div class="credential-field"><span>登录入口</span><a class="login-url" href="${h(Store.LOGIN_URLS[d.brand])}" target="_blank" rel="noopener noreferrer">${h(new URL(Store.LOGIN_URLS[d.brand]).hostname)} ${icon('link')}</a></div><div class="credential-field"><span>有效期至</span><code>${date(d.expiresAt)}</code><span class="credential-term">${d.months} 个月方案</span></div><div class="credential-actions"><button class="button secondary small" data-action="copy-account" data-delivery="${index}">${icon('copy')} 复制整套信息</button><a class="button secondary small" href="#/help?tab=usage">${icon('info')} 查看使用说明</a></div></section>`;
  }
  function orderDetail(id) {
    const o = state.orders.find(x => x.id === id); if (!o) return notFound('这笔订单还不在当前设备上', '体验订单保存在创建它的浏览器中。请从“我的订单”中选择已有订单。');
    const complete = o.status === 'completed', cancelled = o.status === 'cancelled';
    const title = complete ? '账号交付信息' : cancelled ? '这笔订单已取消' : '订单待支付';
    return `${crumbs([['我的订单', '#/orders'], ['订单详情']])}${!complete && !cancelled ? checkoutSteps(3) : ''}<div class="order-banner ${o.status}"><div class="banner-left"><span class="status-icon">${icon(complete ? 'check' : cancelled ? 'close' : 'clock')}</span><div><h1>${title}</h1><p>${complete ? '体验流程已完成。以下为体验交付信息，本次没有扣款。' : cancelled ? '没有发生扣款，你可以继续挑选其他商品。' : '订单已创建。支付通道暂未开放，可继续体验交付流程。'}</p></div></div>${price(o.total)}</div><div class="order-layout"><div><section class="white-panel"><div class="section-heading"><h2>${complete ? '你的账号与交付' : cancelled ? '订单已关闭' : '选择已确认，准备付款'}</h2><span class="tag ${STATUS[o.status][1]}">${STATUS[o.status][0]}</span></div>${complete ? `${o.deliveries.map(deliveryCard).join('')}<div class="delivery-warning">本次为体验订单，没有产生实际扣款。交付信息使用 .test 测试账号，不能用于真实登录。</div><div class="order-quick-actions"><button class="button secondary small" data-action="download-order" data-id="${o.id}">${icon('download')} 下载交付信息</button><button class="button secondary small" data-action="ticket" data-id="${o.id}">${icon('headphones')} ${o.ticket ? '查看售后申请' : '申请售后'}</button></div>${o.ticket ? `<div class="value-callout"><h3>体验售后已记录 · ${h(o.ticket.id)}</h3><p>${h(o.ticket.message)}</p><p>提交时间：${date(o.ticket.createdAt, true)}。当前记录仅保存在本设备，尚未发送给客服。</p></div>` : ''}` : cancelled ? `<p>你已取消这笔待支付订单。如仍需要对应商品，可重新选择期限和套餐后下单。</p><a class="button primary" style="margin-top:20px" href="#/product/${h(o.lines[0].id)}">重新选购 ${icon('arrow')}</a>` : `<div class="payment-preview"><div class="demo-pay-symbol"><span class="payment-mark ${o.payment === 'wechat' ? 'wechat' : ''}">${o.payment === 'wechat' ? '微' : '支'}</span><span class="demo-ribbon">未开放收款</span></div><h3>${o.payment === 'wechat' ? '微信' : '支付宝'} · 收银台</h3><p>应付金额 <b>¥${money(o.total)}</b><br>继续体验后可查看完整交付信息。<br>不会打开支付软件，也不会实际扣款。</p><button class="button primary full large" data-action="pay" data-id="${o.id}">${icon('shield')} 体验购买并查看交付</button><button class="cancel-order" data-action="cancel-order" data-id="${o.id}">暂时不需要了，取消订单</button></div>`}</section>${complete ? `<section class="white-panel" style="margin-top:20px"><h2>使用步骤</h2><ol class="steps-vertical"><li><b>核对收到的商品与期限</b>确认套餐、账号方式与购买时的说明一致。</li><li><b>通过交付入口开始使用</b>请按商品说明操作，体验账号无法真实登录。</li><li><b>遇到问题，从订单发起售后</b>保留必要错误信息，不要公开发布账号密码。</li></ol></section>` : ''}</div><aside class="white-panel"><h2>订单信息</h2><dl class="order-metadata"><div><dt>订单编号</dt><dd class="mono">${h(o.id)}</dd></div><div><dt>创建时间</dt><dd>${date(o.createdAt, true)}</dd></div><div><dt>接收邮箱</dt><dd>${h(o.email)}</dd></div><div><dt>支付方式</dt><dd>${o.payment === 'wechat' ? '微信支付' : '支付宝'} · 体验</dd></div>${complete ? `<div><dt>支付时间</dt><dd>${date(o.paidAt, true)}</dd></div><div><dt>体验流水号</dt><dd class="mono">${h(o.paymentRef)}</dd></div>` : ''}</dl>${o.note ? `<p class="subtle-note">订单备注：${h(o.note)}</p>` : ''}<div class="summary-total"><span>订单金额</span>${price(o.total)}</div><p class="subtle-note">${o.lines.map(l => h(l.name) + ' × ' + l.qty).join('<br>')}</p><a class="button secondary full" style="margin-top:22px" href="#/orders">${icon('receipt')} 返回我的订单</a></aside></div>`;
  }
  function valuePage() {
    return `${crumbs([['选购原则']])}<section class="editorial-hero"><div class="eyebrow">DOCUMENTATION / SELECTION</div><h1>先确定任务，<br>再确定订阅。</h1><p>技术应该解决问题，付费应该有所值得。比较商品时，先核对使用量、账号权限和交付范围。</p></section><div class="value-grid">${[['01', '看实际使用量', '偶尔问答、每天写作和持续编程，需要的用量不同。先看套餐限制与自己的工作频率，再决定是否升级。'], ['02', '区分账号权限', '独享账号、共享方案、代充与团队席位的控制权限不同。查看账号归属、工作区管理和使用约定。'], ['03', '确认完整成本', '订阅价格不一定包含 API、额外用量或基础许可。官方年付折合月价与按月订阅也应分别比较。']].map(([n, title, desc]) => `<article class="value-panel"><div class="eyebrow">${n} / CHECK</div><h2>${title}</h2><p>${desc}</p></article>`).join('')}</div><section class="section white-panel"><h2>账号方式对照</h2><table class="detail-specs"><tbody>${Object.entries(MODES).map(([id, label]) => `<tr><th scope="row">${h(label)}</th><td>${h(modeNote(id))}</td></tr>`).join('')}</tbody></table><a class="text-link" href="#/accounts" style="margin-top:22px">返回商品目录 ${icon('arrow')}</a></section>`;
  }
  const HELP = {
    buying: ['购买与套餐', commonFAQs],
    delivery: ['支付与交付', [['支持哪些支付方式？', '收银台按支付宝与微信支付设计。当前支付通道暂未开放，体验流程不会向支付平台发起交易。'], ['付款后在哪里查看账号？', '在“我的订单”中打开已交付订单，可以查看账号邮箱、密码、恢复信息、登录入口和有效期，也可以复制或下载。'], ['体验账号是真实可用的吗？', '不是。体验账号通过随机数生成，邮箱使用专门的 .test 测试域名，只用于检查完整购买与交付体验。'], ['刷新页面后交付会变吗？', '不会。同一笔订单的账号会保存在本浏览器中，刷新页面或重复打开订单会展示同一套交付信息。清除浏览器存储会移除体验订单。']]],
    usage: ['账号使用', [['账号收到后先做什么？', '核对套餐、账号方式和使用期限。真实运营时应按照商品说明完成登录与必要设置；当前体验账号不可真实登录。'], ['共享账号有哪些约定？', '共享商品可能涉及设备数量、使用时段与登录方式约定。下单前查看具体商品描述，不要在共享环境存放敏感数据。'], ['使用期从什么时候算起？', '本体验从体验购买完成时起计算使用期限，并显示具体到期日期。正式商品的起算方式应以实际销售条款为准。'], ['密码和恢复代码如何保存？', '可以在订单里复制或下载交付文本。请勿在体验订单或问题描述中输入真实账号密码。']]],
    after: ['订单与售后', [['如何发起售后？', '打开已交付订单，点击“申请售后”，填写问题描述。体验申请保存在本设备，不会发送给实际客服。'], ['可以取消订单吗？', '待支付订单可在详情页直接取消。取消后无法继续体验购买，需要重新下单。'], ['为什么换设备看不到订单？', '当前订单记录保存在创建订单的浏览器中，请在同一设备与浏览器查询。'], ['收不到邮件怎么办？', '当前体验不会发送邮件，接收邮箱只用来标记订单。交付信息可以直接在当前设备的订单页查看。']]]
  };
  function help(query) { const tab = Object.hasOwn(HELP, query.get('tab')) ? query.get('tab') : 'buying'; return `${crumbs([['帮助中心']])}<div class="page-header"><div class="eyebrow">DOCUMENTATION / HELP</div><h1>帮助中心</h1><p>把购买、交付和使用中的问题，一件件说清楚。</p></div><div class="help-layout"><nav class="help-nav" aria-label="帮助分类">${Object.entries(HELP).map(([id, [label]]) => `<a class="${id === tab ? 'active' : ''}" href="#/help?tab=${id}">${label} ${icon('chevron')}</a>`).join('')}</nav><section class="white-panel help-content"><h2>${HELP[tab][0]}</h2>${faq(HELP[tab][1], true)}</section></div>`; }
  function documentPage(kind) {
    const docs = {
      about: ['关于模型平权', [['我们经营什么', '模型平权是一家自营 AI 账号与订阅商城，销售具体的账号与订阅方案。我们把套餐、价格、期限、交付内容与使用方式放在清楚的位置，让用户根据实际需要选择。'], ['我们的原则', '技术应该解决问题，付费应该有所值得。我们按真实任务组织商品，说明适用场景与使用边界，避免让用户为了参数与热度盲目投入。'], ['我们的商品', '按具体套餐组织商品，提供个人账号、共享方案、代充与团队席位等不同选择；购买前核对可售状态、店铺报价与授权范围。'], ['独立经营', '本站为独立商城，与所提及的各产品服务提供方无隶属关系。产品名称与商标归相应所有者所有。']]],
      privacy: ['隐私说明', [['当前保存哪些信息', '你输入的订单接收邮箱、订单备注、体验售后描述，以及购物车、收藏与体验订单，保存在当前浏览器中。'], ['信息如何使用', '这些信息用于呈现本地购买与交付体验。当前页面不会向后台、支付机构或邮件系统发送订单资料。请使用非敏感信息，不要输入真实账号密码或敏感内容。'], ['复制与下载', '你主动使用复制或下载功能时，体验交付内容将写入系统剪贴板或下载至设备。'], ['保存与移除', '清除本网站的浏览器存储会移除本地购物车、收藏和体验订单；当前版本没有跨设备恢复功能。']]],
      terms: ['购买须知', [['核对商品', '购买前确认商品名称、套餐、账号方式、使用期限、数量和交付内容。独享、共享和代充是不同商品方式，不应仅根据价格选择。'], ['体验交易说明', '支付通道暂未开放。体验订单不会产生扣款，随机生成的 .test 账号不可用于真实登录；实际交易须以支付渠道到账与真实交付记录为准。'], ['套餐与使用边界', '真实产品的功能、额度、适用地区、设备要求和使用约定由各服务提供方决定；购买前应核对实际商品说明。店铺报价与官方订阅价分别展示和确认，套餐名称不代表官方授权关系。'], ['交付与售后', '体验交付可在订单中复制、查看和下载。体验售后只保存在当前设备。当前客服通道尚未连接，保存问题记录不会自动发送给客服。']]]
    };
    const doc = docs[kind]; if (!doc) return notFound();
    return `${crumbs([[doc[0]]])}<article class="white-panel text-document"><div class="eyebrow">THINKPASSER / INFORMATION</div><h1>${doc[0]}</h1>${doc[1].map(([title, desc]) => `<h2>${h(title)}</h2><p>${h(desc)}</p>`).join('')}<a class="text-link" href="#/accounts" style="margin-top:28px">返回账号商城 ${icon('arrow')}</a></article>`;
  }
  function notFound(title = '这一页，暂时没有找到。', desc = '商品或页面可能已经调整，去商城重新挑选吧。') { return `${crumbs([['页面未找到']])}${empty(title, desc, '返回账号商城', '#/accounts', 'search')}`; }
  function currentRoute() { const raw = location.hash.slice(1) || '/'; const mark = raw.indexOf('?'); return { path: mark < 0 ? raw : raw.slice(0, mark), query: new URLSearchParams(mark < 0 ? '' : raw.slice(mark + 1)) }; }
  let lastPath = '', lastQuery = '';
  function render() {
    const { path, query } = currentRoute(), segments = path.split('/').filter(Boolean);
    const keepFilterOpen = path === lastPath && document.body.classList.contains('filters-open');
    const aliases = { models: '#/accounts', compare: '#/value', advisor: '#/value', mine: '#/orders', business: '#/accounts', m: '#/accounts/' + (segments[1] || ''), book: '#/accounts/' + (segments[1] || ''), doc: segments[1] === 'about' ? '#/about' : '#/policy/' + (segments[1] === 'disclaimer' ? 'terms' : segments[1] || '') };
    if (aliases[segments[0]]) { go(aliases[segments[0]]); return; }
    const route = segments[0] || 'home';
    let content;
    try {
      switch (route) {
        case 'home': content = home(query); break;
        case 'accounts': content = segments[1] && !brand(segments[1]) ? notFound() : catalog(segments[1], query); break;
        case 'product': content = detail(segments[1]); break;
        case 'cart': content = cart(); break;
        case 'checkout': content = checkout(query); break;
        case 'orders': content = orderList(query); break;
        case 'order': content = orderDetail(segments[1]); break;
        case 'value': content = valuePage(); break;
        case 'help': content = help(query); break;
        case 'about': content = documentPage('about'); break;
        case 'policy': content = documentPage(segments[1]); break;
        default: content = notFound();
      }
    } catch (error) { content = empty('这一步需要重新确认', error.message, '返回商城', '#/accounts', 'info'); }
    $('#main').classList.toggle('is-catalog', route === 'accounts');
    $('#main').classList.toggle('is-studio', route === 'home');
    $('#main').innerHTML = `<div class="animate-in">${content}</div>`;
    const active = ['home', 'product'].includes(route) ? 'accounts' : route;
    document.querySelectorAll('[data-nav]').forEach(el => { el.classList.toggle('active', el.dataset.nav === active); if (el.dataset.nav === active) el.setAttribute('aria-current', 'page'); else el.removeAttribute('aria-current'); });
    $('.primary-nav').classList.remove('open'); $('#menu-toggle').setAttribute('aria-expanded', 'false');
    document.body.classList.remove('filters-open');
    if (keepFilterOpen && $('#filter-sidebar')) filterDrawer(true);
    $('#global-search input').value = ['accounts', 'home'].includes(route) ? query.get('q') || '' : '';
    document.querySelectorAll('#brand-strip a').forEach(el => el.classList.toggle('active', el.getAttribute('href') === '#/accounts/' + segments[1]));
    const title = { accounts: brand(segments[1]) ? brand(segments[1]).name + ' 账号专区' : '账号商城', product: product(segments[1])?.name, cart: '购物车', checkout: '确认订单', orders: '我的订单', order: '订单与账号交付', value: '为什么值得付费', help: '帮助中心', about: '关于我们', policy: '商店说明' }[route];
    document.title = title ? `${title} · 模型平权` : '模型平权 · AI 账号与订阅';
    updateCartCount();
    if (path !== lastPath) { window.scrollTo({ top: 0, behavior: 'instant' }); $('#main').scrollTo({ top: 0, behavior: 'instant' }); if (lastPath) $('#main').focus({ preventScroll: true }); }
    else if (['accounts', 'home'].includes(route) && query.toString() !== lastQuery && !keepFilterOpen) {
      const results = route === 'home' ? $('.studio-more') : $('#catalog-results');
      results?.scrollIntoView({ block: 'start', behavior: 'instant' });
      results?.focus({ preventScroll: true });
    }
    lastPath = path; lastQuery = query.toString();
  }
  function setFilter(key, value) { const { path, query } = currentRoute(); query.delete('page'); if (key === 'brand') query.delete('plan'); if (value === '' || value == null) query.delete(key); else query.set(key, value); const target = key === 'brand' && path.startsWith('/accounts/') ? '/accounts' : path; go('#' + target + (query.size ? '?' + query : '')); }
  function filterDrawer(open) { const sidebar = $('#filter-sidebar'); if (!sidebar) return; sidebar.classList.toggle('open', open); $('.filter-backdrop').classList.toggle('open', open); document.body.classList.toggle('filters-open', open); $('.filter-toggle')?.setAttribute('aria-expanded', String(open)); if (open) { sidebar.setAttribute('role', 'dialog'); sidebar.setAttribute('aria-modal', 'true'); sidebar.querySelector('button').focus(); } else { sidebar.removeAttribute('role'); sidebar.removeAttribute('aria-modal'); $('.filter-toggle')?.focus(); } }
  async function copy(text) { try { await navigator.clipboard.writeText(text); toast('已复制'); } catch (_) { toast('浏览器限制了复制，请选中账号信息手动复制'); } }
  const accountText = d => `${d.name}\n账号：${d.email}\n${d.mode === 'team' && d.workspace ? `工作区：${d.workspace}\n席位角色：${d.role}\n邀请信息：${d.invitationUrl}` : `密码：${d.password}\n恢复代码：${d.recoveryCode}`}\n登录入口：${Store.LOGIN_URLS[d.brand]}\n有效期至：${date(d.expiresAt)}\n体验信息不可用于真实登录或加入工作区。`;
  function currentOrder() { return state.orders.find(o => o.id === currentRoute().path.split('/')[2]); }
  document.addEventListener('click', async event => {
    const skip = event.target.closest('a[href="#main"]'); if (skip) { event.preventDefault(); $('#main').focus(); return; }
    const close = event.target.closest('[data-close-dialog]'); if (close) $('#support-dialog').close();
    const button = event.target.closest('[data-action]'); if (!button) return;
    const { action, id, index, delta, months, key, delivery, field } = button.dataset;
    try {
      if (action === 'favorite') { if (await mutate(s => { s.favorites = s.favorites.includes(id) ? s.favorites.filter(x => x !== id) : [...s.favorites, id]; })) { button.classList.toggle('active', state.favorites.includes(id)); button.setAttribute('aria-pressed', String(state.favorites.includes(id))); button.setAttribute('aria-label', `${state.favorites.includes(id) ? '取消收藏' : '收藏'} ${product(id).name}`); toast(state.favorites.includes(id) ? '已加入收藏' : '已取消收藏'); if (currentRoute().query.has('favorites')) render(); } }
      if (action === 'term') { selection.months = Number(months); render(); }
      if (action === 'quantity') { selection.qty = Math.max(1, Math.min(product(selection.id).stock, selection.qty + Number(delta))); render(); }
      if (action === 'add-cart') { const line = { id, months: selection.months, qty: selection.qty }; if (await mutate(s => { s.cart = normalizeCart([...s.cart, line]); })) toast('已加入购物车，可继续挑选'); }
      if (action === 'buy') { quote(id, selection.months, selection.qty); go(`#/checkout?id=${id}&months=${selection.months}&qty=${selection.qty}`); }
      if (action === 'cart-quantity') { if (await mutate(s => { const line = s.cart.find(l => l.id === id && l.months === Number(months)); if (!line) throw new Error('购物车已变化，请重新确认'); line.qty += Number(delta); s.cart = normalizeCart(s.cart); })) render(); }
      if (action === 'remove-cart') { if (await mutate(s => { s.cart = s.cart.filter(l => !(l.id === id && l.months === Number(months))); })) render(); }
      if (action === 'remove-filter') setFilter(key, '');
      if (action === 'reset-filters') go('#' + currentRoute().path);
      if (action === 'open-filter') filterDrawer(true);
      if (action === 'close-filter') filterDrawer(false);
      if (action === 'cancel-order') { if (await mutate(s => { const o = s.orders.find(o => o.id === id); if (!o || o.status !== 'pending') throw new Error('订单状态已变化，无法取消'); o.status = 'cancelled'; })) { render(); toast('订单已取消'); } }
      if (action === 'pay') { button.disabled = true; button.textContent = '正在生成体验交付…'; if (await mutate(s => { const i = s.orders.findIndex(o => o.id === id); if (i < 0) throw new Error('订单不存在，请返回我的订单'); s.orders[i] = completeDemoOrder(s.orders[i]); })) { render(); toast('体验交付已生成，本次没有扣款'); } else { button.disabled = false; button.innerHTML = icon('shield') + ' 体验购买并查看交付'; } }
      if (action === 'copy-field' || action === 'copy-account') { const d = currentOrder()?.deliveries?.[Number(delivery)]; if (d) await copy(action === 'copy-account' ? accountText(d) : ['email', 'password', 'recoveryCode', 'workspace', 'role', 'invitationUrl'].includes(field) ? d[field] : ''); }
      if (action === 'toggle-password') { const d = currentOrder()?.deliveries?.[Number(delivery)], el = $(`[data-password="${Number(delivery)}"]`); if (d && el) { const reveal = el.textContent.startsWith('•'); el.textContent = reveal ? d.password : '••••••••••••••••'; button.setAttribute('aria-pressed', String(reveal)); } }
      if (action === 'download-order') { const o = state.orders.find(o => o.id === id); if (!o?.deliveries) return; const blob = new Blob([`模型平权 · 体验交付\n订单号：${o.id}\n\n${o.deliveries.map(accountText).join('\n\n')}\n\n此文件仅包含随机体验信息。`], { type: 'text/plain;charset=utf-8' }); const url = URL.createObjectURL(blob), anchor = document.createElement('a'); anchor.href = url; anchor.download = `thinkpasser-${o.id}.txt`; anchor.click(); setTimeout(() => URL.revokeObjectURL(url), 1000); toast('已下载体验交付信息'); }
      if (action === 'ticket') { const o = state.orders.find(o => o.id === id); if (o?.ticket) { toast('售后申请记录已在当前订单下方展示'); return; } $('#ticket-order').value = id; $('#ticket-message').value = ''; $('#ticket-error').textContent = ''; $('#ticket-dialog').showModal(); }
    } catch (error) { toast(error.message || '操作暂时无法完成，请重试'); button.disabled = false; }
  });
  document.addEventListener('change', event => {
    if (event.target.matches('[data-filter]')) setFilter(event.target.dataset.filter, event.target.value);
    if (event.target.id === 'catalog-sort') setFilter('sort', event.target.value);
  });
  let checkoutSubmitting = false;
  document.addEventListener('submit', async event => {
    const form = event.target;
    if (!['global-search', 'price-filter', 'checkout-form', 'order-search', 'ticket-form'].includes(form.id)) return;
    event.preventDefault();
    const data = new FormData(form);
    if (form.id === 'global-search') { const q = String(data.get('q') || '').trim(); go('#/accounts' + (q ? '?q=' + encodeURIComponent(q) : '')); }
    if (form.id === 'order-search') setFilter('q', String(data.get('q') || '').trim());
    if (form.id === 'price-filter') { const { path, query } = currentRoute(), min = String(data.get('min') || ''), max = String(data.get('max') || ''); if (min && max && Number(min) > Number(max)) { toast('最低价格不能高于最高价格'); return; } query.delete('page'); for (const [k, v] of [['min', min], ['max', max]]) v ? query.set(k, v) : query.delete(k); go('#' + path + (query.size ? '?' + query : '')); }
    if (form.id === 'checkout-form') {
      if (checkoutSubmitting) return;
      checkoutSubmitting = true;
      const submitButton = document.querySelector('[form="checkout-form"]'); submitButton.disabled = true;
      try { const query = currentRoute().query; let order; if (await mutate(s => { const items = query.has('id') ? checkoutItems(query) : s.cart; if (JSON.stringify(items) !== checkoutSnapshot) throw new Error('购物车已变化，请重新打开确认订单'); order = createOrder(items, { email: data.get('email'), note: data.get('note'), payment: data.get('payment'), agreed: data.get('agreed') === 'on' }); s.orders.unshift(order); if (!query.has('id')) s.cart = []; })) go('#/order/' + order.id); }
      catch (error) { $('#checkout-error').textContent = error.message; }
      finally { checkoutSubmitting = false; submitButton.disabled = false; }
    }
    if (form.id === 'ticket-form') { const message = String(data.get('message') || '').trim(), id = String(data.get('order') || ''); if (message.length < 8) { $('#ticket-error').textContent = '请至少填写 8 个字，描述遇到的问题。'; return; } try { if (await mutate(s => { const o = s.orders.find(o => o.id === id); if (o?.status !== 'completed') throw new Error('此订单不能申请售后'); o.ticket = { id: 'AS' + Date.now().toString(36).toUpperCase(), message: message.slice(0, 600), createdAt: Date.now(), status: 'pending' }; })) { $('#ticket-dialog').close(); render(); toast('体验售后已记录在当前设备'); } } catch(error) { $('#ticket-error').textContent = error.message; } }
  });
  $('#menu-toggle').addEventListener('click', () => { const open = $('.primary-nav').classList.toggle('open'); $('#menu-toggle').setAttribute('aria-expanded', String(open)); });
  $('#support-button').addEventListener('click', () => $('#support-dialog').showModal());
  $('#ticket-close').addEventListener('click', () => $('#ticket-dialog').close());
  document.addEventListener('keydown', event => { if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === 'k') { event.preventDefault(); $('#global-search input').focus(); } if (event.key === 'Escape') filterDrawer(false); if (event.key === 'Tab' && document.body.classList.contains('filters-open')) { const nodes = [...$('#filter-sidebar').querySelectorAll('a,button,input,select')].filter(el => !el.disabled && el.getClientRects().length), first = nodes[0], last = nodes[nodes.length - 1]; if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last.focus(); } else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first.focus(); } } });
  document.querySelectorAll('dialog').forEach(dialog => dialog.addEventListener('click', event => { if (event.target === dialog) { const box = dialog.getBoundingClientRect(); if (event.clientX < box.left || event.clientX > box.right || event.clientY < box.top || event.clientY > box.bottom) dialog.close(); } }));
  document.querySelectorAll('[data-icon]').forEach(el => { el.innerHTML = icon(el.dataset.icon); });
  $('#search-icon').innerHTML = icon('search');
  $('#brand-strip').innerHTML = `<a class="all-category" href="#/accounts">${icon('grid')} 全部账号</a>${BRANDS.map(b => `<a href="#/accounts/${b.id}">${logo(b.id)}${b.name}</a>`).join('')}`;
  window.addEventListener('hashchange', render);
  window.addEventListener('storage', event => { if (event.key === KEY || event.key === null) { state = readState(); render(); } });
  render();
  if (storageWarning) toast(storageLocked ? '本地数据异常且暂时无法备份，已停止覆盖保存' : '已恢复可用的本地数据，异常原始内容已保留备份');
})();
