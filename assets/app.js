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
  function price(cents, suffix = '') { const [whole, decimals] = money(cents).split('.'); return `<span class="price"><span class="currency">¥</span>${whole}<span class="decimals">.${decimals}</span>${suffix ? `<small>${h(suffix)}</small>` : ''}</span>`; }
  function date(value, time = false) { return new Intl.DateTimeFormat('zh-CN', { year: 'numeric', month: '2-digit', day: '2-digit', ...(time ? { hour: '2-digit', minute: '2-digit', hour12: false } : {}) }).format(new Date(value)); }
  const modeNote = mode => ({ private: '独立使用，交付账号登录信息。是否可修改密码或邮箱，以商品说明为准。', shared: '多人按席位使用，请遵守商品约定的设备与使用规则。', topup: '为你已有的账号开通或续费，订单中确认接收与开通方式。' }[mode]);
  const VALUE = {
    claude: ['长文写作与代码工作，值得有一个专注的工作区。', '适合经常写作、读文档与处理代码的人；如果只是偶尔问答，可以先从轻量方案开始。'],
    chatgpt: ['把日常问答，变成持续的工作习惯。', '适合频繁处理写作、资料整理与日常创作的人。先确认自己的使用频率，再选择期限。'],
    cursor: ['在写代码的地方，使用 AI。', '适合每天需要阅读和修改代码的开发者；如果很少写代码，不必为了工具而付费。'],
    gemini: ['给多种形式的工作，留一个统一入口。', '适合已有相关工具使用习惯的用户。请先确认商品权益与自己的地区和设备是否匹配。'],
    midjourney: ['为持续的视觉创作，准备一套工具。', '适合经常探索画面与视觉方案的创作者；购买前确认套餐额度和自己的产出频率。'],
    perplexity: ['把找资料这件事，做得更有条理。', '适合反复搜索、整理资料与开展研究的人；关键材料仍需要自己核查来源。'],
    notion: ['在整理知识的地方，减少重复工作。', '适合已经使用 Notion 管理文档的人。先有明确的工作流，再为工具投入预算。'],
    copilot: ['让工具的价值，落在每天的工作里。', '适合频繁处理办公文档的人。请先确认商品对应的客户端与基础订阅要求。']
  };
  function art(p, extra = '') { const b = brand(p.brand); return `<div class="product-art ${extra}" style="--brand-color:${b.color};--brand-bg:${b.bg}"><span class="art-category">THINKPASSER / ${h(p.category.toUpperCase())}</span>${logo(p.brand)}<span class="art-wordmark">${h(b.name)}<small>${h(p.tier.toUpperCase())} ACCOUNT</small></span><span class="art-tier">${h(p.tier)}</span></div>`; }
  function card(p) { return `<article class="product-card"><button class="favorite ${state.favorites.includes(p.id) ? 'active' : ''}" data-action="favorite" data-id="${p.id}" aria-label="${state.favorites.includes(p.id) ? '取消收藏' : '收藏'} ${h(p.name)}" aria-pressed="${state.favorites.includes(p.id)}">${icon('heart')}</button><a href="#/product/${p.id}" aria-label="查看 ${h(p.name)}">${art(p)}</a><div class="product-content"><a href="#/product/${p.id}"><h3>${h(p.name)}</h3></a><p class="product-desc" title="${h(p.desc)}">${h(p.desc)}</p><div class="product-tags"><span class="tag">1 个月起</span><span class="tag ${p.mode === 'private' ? 'blue' : ''}">${h(MODES[p.mode])}</span><span class="tag ${p.delivery === 'instant' ? 'green' : 'orange'}">${icon(p.delivery === 'instant' ? 'bolt' : 'clock')}${p.delivery === 'instant' ? '即时交付' : '人工交付'}</span></div><div class="product-bottom"><a href="#/product/${p.id}" aria-label="${h(p.name)} 示例月价 ${money(p.price)} 元">${price(p.price, '/ 月起')}</a><a class="product-cta" href="#/product/${p.id}" aria-label="选购 ${h(p.name)}">${icon('arrow')}</a></div><div class="product-footnote"><span><i class="stock-dot ${p.stock ? '' : 'out'}"></i>${p.stock ? '示例库存可选' : '暂时售罄'}</span><span>模型平权自营</span></div></div></article>`; }
  const faq = (items, firstOpen = false) => `<div class="faq-grid">${items.map(([q, a], i) => `<details ${firstOpen && i === 0 ? 'open' : ''}><summary>${h(q)}</summary><p>${h(a)}</p></details>`).join('')}</div>`;
  const commonFAQs = [['购买后会收到什么？', '成品账号会展示账号邮箱、密码、登录入口、有效期和使用说明。代充商品会展示对应的开通信息。当前演示交付使用随机生成的数据，不可用于真实登录。'], ['独享账号与共享账号怎么选？', '独享适合持续使用与独立管理；共享适合轻量体验。请结合设备约定、使用频率与具体交付权限选择，不建议只比较价格。'], ['我已有账号，可以续费吗？', '可以在商品列表选择“账号代充”，再核对商品支持的套餐与开通要求。具体支持情况以对应商品说明为准。'], ['支付和交付流程是什么？', '选商品、确认套餐和收件邮箱后创建订单，进入收银台。当前前台演示支持模拟支付，完成后立即展示演示账号与交付信息，不会真实扣款。']];
  function crumbs(items) { return `<div class="breadcrumbs"><a href="#/">首页</a>${items.map(([label, href]) => `${icon('chevron')}${href ? `<a href="${href}">${h(label)}</a>` : `<span>${h(label)}</span>`}`).join('')}</div>`; }
  function empty(title, desc, label = '去挑选账号', href = '#/accounts', name = 'bag') { return `<div class="empty-state">${icon(name)}<h2>${h(title)}</h2><p>${h(desc)}</p><a href="${href}" class="button primary">${h(label)} ${icon('arrow')}</a></div>`; }
  function principleBand() { return `<section class="principle-band"><div><div class="eyebrow">OUR PRINCIPLE / 选品原则</div><h2>为能力付费，<br>也为自己的判断留一点空间。</h2><p>好工具的价值，最终要落在真实工作里。我们把账号、权益与使用边界说清楚，让你为需要的能力付费。</p><a class="text-link" href="#/value">认识我们的选品标准 ${icon('arrow')}</a></div><div class="principle-points">${[['01', '技术有用，才值得推荐', '从具体任务出发，说明工具适合做什么。'], ['02', '权益清楚，再决定购买', '独享还是共享，期限与交付方式，提前看清。'], ['03', '按需要选，不为参数堆预算', '轻量体验、日常使用、持续创作，各有合适的方案。']].map(([n, title, desc]) => `<div class="principle-point"><span class="point-index">${n}</span><div><b>${title}</b><p>${desc}</p></div></div>`).join('')}</div></section>`; }
  function home(query) {
    const category = query.get('category') || '';
    const featured = filterProducts({ category }).filter(p => p.mode === 'private').slice(0, 8);
    const floating = ['chatgpt-plus-private', 'claude-pro-private', 'cursor-pro-private'].map((id, i) => { const p = product(id); return `<div class="floating-account ${['one', 'two', 'three'][i]}"><div class="fa-top">${logo(p.brand)}<span class="tag">${h(p.tier)}</span></div><b>${h(brand(p.brand).name)} ${h(p.tier)}</b><p>独享账号 · 1 个月方案</p><div class="fa-bottom"><span>THINKPASSER SELECT</span><span>AVAILABLE ↗</span></div></div>`; }).join('');
    return `<div class="hero-layout"><section class="hero"><div class="hero-copy"><div class="eyebrow"><span class="live-dot"></span> GOOD TOOLS. FAIR ACCESS.</div><h1>让好用的 AI，<br>成为你的<em>日常。</em></h1><p>精选 AI 账号与订阅。把价格、权益和交付说清楚，<br>让每一份投入，都用在值得的能力上。</p><div class="hero-actions"><a class="button primary" href="#/accounts">选购 AI 账号 ${icon('arrow')}</a><a class="button ghost" href="#/value">为什么值得付费 ${icon('link')}</a></div></div><div class="hero-art" aria-hidden="true"><div class="orbit"></div>${floating}</div></section><div class="hero-side"><section class="mini-hero"><div class="eyebrow">CLAUDE / 精选专区</div><h2>专注你的<br>下一次好想法。</h2><a href="#/accounts/claude">挑选 Claude 账号 ${icon('arrow')}</a>${logo('claude')}</section><section class="mini-hero dark"><div class="eyebrow">BUILT FOR BUILDERS</div><h2>为下一行代码，<br>配好装备。</h2><a href="#/accounts?category=code">探索开发者工具 ${icon('arrow')}</a>${logo('cursor')}</section></div></div>
    <div class="service-strip">${[['layers', '精选工具', '从真实工作场景出发'], ['shield', '权益透明', '套餐与交付方式提前看清'], ['package', '自营交付', '账号与订单集中管理'], ['headphones', '购买有据', '使用说明与售后入口随单可查']].map(([i, t, d]) => `<div class="service-item">${icon(i)}<div><b>${t}</b><span>${d}</span></div></div>`).join('')}</div>
    <section class="section"><div class="section-heading"><div><h2>值得入手的好工具<small>CURATED PICKS</small></h2><p>从每天都会用到的能力开始，选择适合自己的账号方案。</p></div><a class="text-link" href="#/accounts">浏览全部商品 ${icon('arrow')}</a></div><div class="category-tabs">${[['', '全部精选'], ['assistant', '对话与写作'], ['code', '编程开发'], ['creative', '视觉创作'], ['office', '知识与办公']].map(([id, name]) => `<a class="category-tab ${category === id ? 'active' : ''}" href="#/${id ? '?category=' + id : ''}">${name}</a>`).join('')}</div><div class="product-grid home-products">${featured.map(card).join('')}</div></section>
    ${principleBand()}<section class="section"><div class="section-heading"><div><h2>找到你的工作搭档<small>EXPLORE BY TOOL</small></h2><p>按熟悉的工具，直接找到对应的账号与订阅。</p></div></div><div class="brands-grid">${BRANDS.map(b => `<a class="brand-tile" href="#/accounts/${b.id}">${logo(b.id)}<b>${b.name}</b><small>${b.label}</small></a>`).join('')}</div></section><section class="section"><div class="section-heading"><div><h2>购买前，把疑问说清楚<small>GOOD TO KNOW</small></h2></div><a class="text-link" href="#/help">前往帮助中心 ${icon('arrow')}</a></div>${faq(commonFAQs)}</section>`;
  }
  function catalog(bid, query) {
    const b = brand(bid);
    const filters = Object.fromEntries(query); if (b) filters.brand = b.id;
    const options = { ...filters, min: query.has('min') ? Number(query.get('min')) * 100 : '', max: query.has('max') ? Number(query.get('max')) * 100 : '' };
    const list = filterProducts(options).filter(p => !filters.favorites || state.favorites.includes(p.id));
    const group = (title, key, choices) => `<div class="filter-section"><h3>${title}</h3>${choices.map(([value, label, count]) => `<label class="filter-choice"><input type="radio" name="${key}" value="${value}" data-filter="${key}" ${String(filters[key] || '') === value ? 'checked' : ''}><span>${h(label)}</span>${count == null ? '' : `<span>${count}</span>`}</label>`).join('')}</div>`;
    const base = PRODUCTS.filter(p => !(b?.id || filters.brand) || p.brand === (b?.id || filters.brand));
    const chips = Object.entries(filters).filter(([k, v]) => v && k !== 'sort' && !(k === 'brand' && b)).map(([k, v]) => { const label = k === 'q' ? `搜索：${v}` : k === 'mode' ? MODES[v] : k === 'brand' ? brand(v)?.name : k === 'min' ? `最低 ¥${v}` : k === 'max' ? `最高 ¥${v}` : k === 'favorites' ? '我的收藏' : k === 'category' ? ({ code: '编程开发', assistant: '对话写作', creative: '视觉创作', office: '知识办公' }[v]) : k === 'delivery' ? (v === 'instant' ? '即时交付' : '人工交付') : v; return `<button class="active-chip" data-action="remove-filter" data-key="${h(k)}">${h(label || v)} ${icon('close')}</button>`; }).join('');
    return `${crumbs([[b ? b.name + ' 专区' : '账号商城']])}${b ? `<div class="catalog-banner" style="background:${b.bg};border-color:${b.bg}"><div><div class="eyebrow">${h(b.id.toUpperCase())} ACCOUNTS</div><h1>${b.name} 账号专区<small>SELECT YOUR PLAN</small></h1><p>${h(VALUE[b.id][0])}</p></div>${logo(b.id)}</div>` : `<div class="page-header"><div class="eyebrow">THE ACCOUNT STORE</div><h1>把合适的工具，带进工作里。</h1><p>按工具、账号方式与预算挑选，每一份权益都说清楚。</p></div>`}<div class="catalog-layout"><div class="filter-backdrop" data-action="close-filter"></div><aside class="filter-sidebar" id="filter-sidebar" aria-label="商品筛选"><div class="filter-title"><h2>筛选商品</h2><button class="clear-filter" data-action="reset-filters">重置</button><button class="icon-button mobile-filter-close" data-action="close-filter" aria-label="关闭筛选">${icon('close')}</button></div>${!b ? group('工具品牌', 'brand', [['', '全部品牌', PRODUCTS.length], ...BRANDS.map(x => [x.id, x.name, PRODUCTS.filter(p => p.brand === x.id).length])]) : ''}${group('账号方式', 'mode', [['', '全部方式', base.length], ...Object.entries(MODES).map(([v, label]) => [v, label, base.filter(p => p.mode === v).length])])}<div class="filter-section"><h3>价格范围 · 元 / 月</h3><form id="price-filter"><div class="price-range"><input type="number" min="0" step="0.01" name="min" aria-label="最低价格" placeholder="最低价" value="${h(query.get('min') || '')}"><span>—</span><input type="number" min="0" step="0.01" name="max" aria-label="最高价格" placeholder="最高价" value="${h(query.get('max') || '')}"></div><button class="price-filter-button" type="submit">应用价格</button></form></div>${group('交付方式', 'delivery', [['', '不限', null], ['instant', '即时交付', base.filter(p => p.delivery === 'instant').length], ['manual', '人工交付', base.filter(p => p.delivery === 'manual').length]])}<div class="filter-section"><a class="text-link" href="#/accounts?favorites=1">${icon('heart')} 我的收藏 (${state.favorites.length})</a></div></aside><section><div class="catalog-toolbar"><button class="filter-toggle" data-action="open-filter">${icon('filter')} 筛选</button><span>找到 <b>${list.length}</b> 件商品</span><select class="sort-select" id="catalog-sort" aria-label="商品排序">${[['recommended', '精选推荐'], ['price-asc', '价格：从低到高'], ['price-desc', '价格：从高到低'], ['stock', '库存优先']].map(([v, label]) => `<option value="${v}" ${filters.sort === v ? 'selected' : ''}>${label}</option>`).join('')}</select></div>${chips ? `<div class="active-filters">${chips}</div>` : ''}${list.length ? `<div class="product-grid catalog-grid">${list.map(card).join('')}</div><p class="catalog-bottom">— 已展示全部 ${list.length} 件商品 · 按实际需要选择就好 —</p>` : empty('暂时没有匹配的商品', '试试调整账号方式、价格范围，或换一个关键词。', '重置筛选', b ? '#/accounts/' + b.id : '#/accounts', 'search')}</section></div>`;
  }
  let selection = { id: '', months: 1, qty: 1 };
  function detail(id) {
    const p = product(id); if (!p) return notFound();
    if (selection.id !== id) selection = { id, months: 1, qty: 1 };
    const related = PRODUCTS.filter(x => x.brand === p.brand);
    const amount = p.stock ? quote(id, selection.months, selection.qty).total : p.price;
    return `${crumbs([['账号商城', '#/accounts'], [brand(p.brand).name, '#/accounts/' + p.brand], [p.tier + ' · ' + MODES[p.mode]]])}<div class="detail-layout"><div>${art(p, 'detail-art')}<div class="detail-assurances"><div>${icon('shield')} 自营商品</div><div>${icon('receipt')} 订单可查</div><div>${icon('headphones')} 售后入口随单</div></div></div><section class="detail-purchase"><div class="eyebrow">THINKPASSER SELECT / ${p.id.toUpperCase()}</div><h1>${h(p.name)}</h1><p class="description">${h(p.desc)}</p><div class="detail-price-box"><div>${price(amount)}<div class="detail-price-caption">${selection.months} 个月 · ${selection.qty} 个账号<span class="tag blue">示例价格</span></div></div><span>套餐、期限与交付<br>选清楚，再下单</span></div><div class="option-label"><strong>账号方案</strong><span>${h(MODES[p.mode])}</span></div><div class="option-group">${related.map(x => `<a class="option-button ${x.id === p.id ? 'selected' : ''}" href="#/product/${x.id}">${h(x.tier)} · ${h(MODES[x.mode])}</a>`).join('')}</div><div class="option-label"><strong>使用期限</strong></div><div class="option-group">${p.terms.map(months => `<button class="option-button ${selection.months === months ? 'selected' : ''}" data-action="term" data-months="${months}">${months} 个月${months === 3 ? '<small>长周期方案</small>' : ''}</button>`).join('')}</div><div class="option-label"><strong>购买数量</strong><span>${p.stock ? `演示库存 ${p.stock} 个` : '暂时售罄'}</span></div><div class="quantity"><button data-action="quantity" data-delta="-1" aria-label="减少购买数量" ${selection.qty <= 1 ? 'disabled' : ''}>−</button><span>${selection.qty}</span><button data-action="quantity" data-delta="1" aria-label="增加购买数量" ${selection.qty >= p.stock ? 'disabled' : ''}>+</button></div><div class="buy-row"><button class="button secondary large" data-action="add-cart" data-id="${p.id}" ${!p.stock ? 'disabled' : ''}>${icon('bag')} 加入购物车</button><button class="button primary large" data-action="buy" data-id="${p.id}" ${!p.stock ? 'disabled' : ''}>${p.stock ? '立即购买' : '暂时售罄'} ${icon('arrow')}</button></div><p class="buy-note">${icon('info')} 当前支持完整模拟购买，演示过程不会扣款。</p></section></div><div class="detail-description"><section class="white-panel"><h2>买到什么，先说清楚。</h2><table class="detail-specs"><tbody>${[['商品名称', p.name], ['账号方式', MODES[p.mode]], ['使用期限', selection.months + ' 个月'], ['交付内容', p.mode === 'topup' ? '开通结果、接收信息与使用说明' : '账号邮箱、登录密码、恢复信息与登录入口'], ['交付方式', p.delivery === 'instant' ? '交付信息可在订单中查看' : '由商店人工处理，结果记录在订单中'], ['使用说明', modeNote(p.mode)]].map(([k, v]) => `<tr><th scope="row">${h(k)}</th><td>${h(v)}</td></tr>`).join('')}</tbody></table><div class="value-callout"><h3>${icon('code')} 为什么它值得考虑</h3><p>${h(VALUE[p.brand][1])}</p></div><h3>购买与使用</h3><p>请先核对账号方式、使用期限与交付内容。账号对应的产品功能、可用地区、设备和用量规则由服务提供方决定；套餐名称不代表无限使用或所有功能均可用。</p><p>付款与交付记录集中保存在订单页。遇到无法登录、套餐不符等问题，可从对应订单发起售后并提供必要的错误信息。</p><h3>常见问题</h3>${faq(commonFAQs.slice(0, 2))}</section><aside class="white-panel"><div class="eyebrow">YOUR NEXT STEPS</div><h2 style="margin-top:10px">从挑选到开始使用</h2><ol class="steps-vertical"><li><b>选好账号方案</b>确认套餐、期限和账号方式。</li><li><b>确认订单并付款</b>收件信息与订单金额一并核对。</li><li><b>查看账号交付</b>账号与使用说明随订单可查。</li></ol><p class="subtle-note">演示商品使用示例价格与随机账号。你可以完整体验付款后查看交付的流程。</p></aside></div><section class="section"><div class="section-heading"><h2>也可以看看<small>MORE OPTIONS</small></h2><a class="text-link" href="#/accounts/${p.brand}">查看全部方案 ${icon('arrow')}</a></div><div class="product-grid">${PRODUCTS.filter(x => x.id !== id && (x.brand === p.brand || x.category === p.category)).slice(0, 4).map(card).join('')}</div></section>`;
  }

  function checkoutSteps(current) { return `<div class="checkout-steps">${[['确认商品', 1], ['填写订单', 2], ['支付与交付', 3]].map(([name, n], index) => `${index ? icon('chevron') : ''}<span class="${n === current ? 'current' : ''}"><i>${n < current ? '✓' : n}</i>${name}</span>`).join('')}</div>`; }
  function summary(items, cta = '') {
    const lines = items.map(line => ({ ...line, ...quote(line.id, line.months, line.qty) }));
    const total = lines.reduce((sum, line) => sum + line.total, 0);
    return `<aside class="white-panel summary-panel"><h2>订单汇总</h2>${lines.map(line => `<div class="checkout-item">${logo(line.product.brand)}<div><b>${h(line.product.name)}</b><small>${line.months} 个月 × ${line.qty}</small></div><span class="item-price">¥${money(line.total)}</span></div>`).join('')}<div class="summary-line"><span>商品金额</span><b>¥${money(total)}</b></div><div class="summary-line"><span>交付费用</span><b>¥0.00</b></div><div class="summary-total"><span>合计</span>${price(total)}</div>${cta}<p class="subtle-note">示例价格 · 当前为模拟购买体验</p></aside>`;
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
    return `${crumbs([['购物车', '#/cart'], ['确认订单']])}${checkoutSteps(2)}<div class="page-header"><h1>确认你的这一次选择</h1><p>账号与交付信息会集中展示在订单中，请妥善保存。</p></div><div class="checkout-layout"><form class="white-panel checkout-panel" id="checkout-form"><h2>接收信息</h2><div class="form-field"><label for="checkout-email">接收邮箱 *</label><input id="checkout-email" name="email" type="email" autocomplete="email" required maxlength="254" placeholder="you@example.com"><small>用于标记订单接收信息；演示模式不会发送邮件。</small></div><div class="form-field"><label for="checkout-note">订单备注 <span>（选填）</span></label><textarea id="checkout-note" name="note" maxlength="300" rows="3" placeholder="如有使用方式等需要确认，可以在这里备注。请勿填写真实账号密码。"></textarea></div><h2>支付方式</h2><div class="payment-options"><label class="payment-option"><input type="radio" name="payment" value="alipay" checked><span class="payment-mark">支</span><span>支付宝</span></label><label class="payment-option"><input type="radio" name="payment" value="wechat"><span class="payment-mark wechat">微</span><span>微信支付</span></label></div><div class="value-callout"><h3>${icon('info')} 完整前台体验，无实际扣款</h3><p>提交订单后进入模拟收银台。完成模拟支付，即可查看随机生成的账号、密码、恢复信息和使用说明。</p></div><label class="consent"><input type="checkbox" name="agreed" required><span>我已确认商品、账号方式与使用期限，并阅读 <a href="#/policy/terms" target="_blank" rel="noopener">购买须知</a> 与 <a href="#/policy/privacy" target="_blank" rel="noopener">隐私说明</a>。</span></label><p class="form-error" id="checkout-error" role="alert"></p></form>${summary(items, '<button class="button primary full large" type="submit" form="checkout-form">创建订单，前往支付 ' + icon('arrow') + '</button>')}</div>`;
  }
  const STATUS = { pending: ['待支付', 'orange'], completed: ['已交付', 'green'], cancelled: ['已取消', ''] };
  function orderList(query) {
    const status = query.get('status') || '';
    const search = (query.get('q') || '').trim().toLowerCase();
    const list = state.orders.filter(o => (!status || o.status === status) && (!search || `${o.id} ${o.email} ${o.lines.map(l => l.name).join(' ')}`.toLowerCase().includes(search)));
    return `${crumbs([['我的订单']])}<div class="page-header"><div class="eyebrow">YOUR TOOLKIT / ORDERS</div><h1>每一次选择，都在这里。</h1><p>订单状态、账号交付与使用说明，随时回来查看。</p></div><div class="orders-toolbar"><div class="order-tabs">${[['', '全部订单'], ['pending', '待支付'], ['completed', '已交付'], ['cancelled', '已取消']].map(([id, label]) => `<a class="${status === id ? 'active' : ''}" href="#/orders${id ? '?status=' + id : ''}">${label}<small>${state.orders.filter(o => !id || o.status === id).length}</small></a>`).join('')}</div><form id="order-search" class="order-search"><input name="q" aria-label="搜索订单" placeholder="订单号、商品或接收邮箱" value="${h(query.get('q') || '')}"><button aria-label="搜索订单">${icon('search')}</button></form></div>${list.length ? list.map(o => `<article class="order-list-card"><div class="order-list-head"><span class="mono">${h(o.id)}</span><span>${date(o.createdAt, true)}</span><span class="tag ${STATUS[o.status][1]}">${STATUS[o.status][0]}</span></div><div class="order-list-body">${logo(o.lines[0].brand || product(o.lines[0].id).brand)}<div class="order-name"><b>${h(o.lines[0].name)}${o.lines.length > 1 ? ` 等 ${o.lines.length} 种商品` : ''}</b><small>${o.lines[0].months} 个月 · 共 ${o.lines.reduce((sum, l) => sum + l.qty, 0)} 个账号${o.ticket ? ' · 已提交演示售后' : ''}</small></div>${price(o.total)}<a class="button ${o.status === 'pending' ? 'primary' : 'secondary'} small" href="#/order/${o.id}">${o.status === 'pending' ? '前往支付' : o.status === 'completed' ? '查看账号' : '订单详情'} ${icon('arrow')}</a></div></article>`).join('') : empty(state.orders.length ? '没有找到对应的订单' : '期待你的第一件好工具', state.orders.length ? '试试切换订单状态或搜索条件。' : '挑选适合自己的账号，订单和交付会保存在这里。', state.orders.length ? '查看全部订单' : '去挑选账号', state.orders.length ? '#/orders' : '#/accounts', 'receipt')}<p class="catalog-bottom">演示订单保存在当前浏览器，请勿将此页面用于存放真实账号。</p>`;
  }
  function credentialRow(label, text, dIndex, field, extra = '') { return `<div class="credential-field"><span>${label}</span><code ${field === 'password' ? `data-password="${dIndex}"` : ''}>${field === 'password' ? '••••••••••••••••' : h(text)}</code>${extra}<button data-action="copy-field" data-delivery="${dIndex}" data-field="${field}" aria-label="复制${label}">${icon('copy')} 复制</button></div>`; }
  function deliveryCard(d, index) {
    const topup = d.mode === 'topup';
    return `<section class="delivery-card"><div class="delivery-head">${logo(d.brand)}<b>${h(d.name)}</b><span class="tag green">${topup ? '演示开通完成' : '演示账号已交付'}</span></div>${credentialRow(topup ? '接收账号' : '账号邮箱', d.email, index, 'email')}${credentialRow('登录密码', d.password, index, 'password', `<button data-action="toggle-password" data-delivery="${index}" aria-label="显示或隐藏密码">${icon('eye')}</button>`)}${credentialRow(topup ? '开通凭证' : '恢复代码', d.recoveryCode, index, 'recoveryCode')}<div class="credential-field"><span>登录入口</span><a class="login-url" href="${h(Store.LOGIN_URLS[d.brand])}" target="_blank" rel="noopener noreferrer">${h(new URL(Store.LOGIN_URLS[d.brand]).hostname)} ${icon('link')}</a></div><div class="credential-field"><span>有效期至</span><code>${date(d.expiresAt)}</code><span class="credential-term">${d.months} 个月方案</span></div><div class="credential-actions"><button class="button secondary small" data-action="copy-account" data-delivery="${index}">${icon('copy')} 复制整套信息</button><a class="button secondary small" href="#/help?tab=usage">${icon('info')} 查看使用说明</a></div></section>`;
  }
  function orderDetail(id) {
    const o = state.orders.find(x => x.id === id); if (!o) return notFound('这笔订单还不在当前设备上', '演示订单保存在创建它的浏览器中。请从“我的订单”中选择已有订单。');
    const complete = o.status === 'completed', cancelled = o.status === 'cancelled';
    const title = complete ? '好工具，已经准备好了。' : cancelled ? '这笔订单已取消' : '再一步，开始你的新体验。';
    return `${crumbs([['我的订单', '#/orders'], ['订单详情']])}${!complete && !cancelled ? checkoutSteps(3) : ''}<div class="order-banner ${o.status}"><div class="banner-left"><span class="status-icon">${icon(complete ? 'check' : cancelled ? 'close' : 'clock')}</span><div><h1>${title}</h1><p>${complete ? '模拟支付已完成，账号与使用信息如下，请妥善保存。' : cancelled ? '没有发生扣款，你可以继续挑选其他商品。' : '订单已创建，核对金额后完成模拟支付。'}</p></div></div>${price(o.total)}</div><div class="order-layout"><div><section class="white-panel"><div class="section-heading"><h2>${complete ? '你的账号与交付' : cancelled ? '订单已关闭' : '选择已确认，准备付款'}</h2><span class="tag ${STATUS[o.status][1]}">${STATUS[o.status][0]}</span></div>${complete ? `${o.deliveries.map(deliveryCard).join('')}<div class="delivery-warning">当前为前台演示：账号、密码和恢复信息随机生成，邮箱使用 .test 测试域名，不可用于真实登录；订单未产生实际扣款。</div><div class="order-quick-actions"><button class="button secondary small" data-action="download-order" data-id="${o.id}">${icon('download')} 下载交付信息</button><button class="button secondary small" data-action="ticket" data-id="${o.id}">${icon('headphones')} ${o.ticket ? '查看售后申请' : '申请售后'}</button></div>${o.ticket ? `<div class="value-callout"><h3>演示售后已记录 · ${h(o.ticket.id)}</h3><p>${h(o.ticket.message)}</p><p>提交时间：${date(o.ticket.createdAt, true)}。当前记录仅保存在本设备，尚未发送给客服。</p></div>` : ''}` : cancelled ? `<p>你已取消这笔待支付订单。如仍需要对应商品，可重新选择期限和套餐后下单。</p><a class="button primary" style="margin-top:20px" href="#/product/${h(o.lines[0].id)}">重新选购 ${icon('arrow')}</a>` : `<div class="payment-preview"><div class="demo-pay-symbol"><span class="payment-mark ${o.payment === 'wechat' ? 'wechat' : ''}">${o.payment === 'wechat' ? '微' : '支'}</span><span class="demo-ribbon">DEMO</span></div><h3>${o.payment === 'wechat' ? '微信' : '支付宝'} · 模拟收银台</h3><p>应付金额 <b>¥${money(o.total)}</b><br>点击后模拟付款成功，立即生成账号交付。<br>不会打开支付软件，也不会实际扣款。</p><button class="button primary full large" data-action="pay" data-id="${o.id}">${icon('shield')} 模拟支付并查看账号</button><button class="cancel-order" data-action="cancel-order" data-id="${o.id}">暂时不需要了，取消订单</button></div>`}</section>${complete ? `<section class="white-panel" style="margin-top:20px"><h2>开始之前，花一分钟看这里。</h2><ol class="steps-vertical"><li><b>核对收到的商品与期限</b>确认套餐、账号方式与购买时的说明一致。</li><li><b>通过交付入口开始使用</b>请按商品说明操作，演示账号无法真实登录。</li><li><b>遇到问题，从订单发起售后</b>保留必要错误信息，不要公开发布账号密码。</li></ol></section>` : ''}</div><aside class="white-panel"><h2>订单信息</h2><dl class="order-metadata"><div><dt>订单编号</dt><dd class="mono">${h(o.id)}</dd></div><div><dt>创建时间</dt><dd>${date(o.createdAt, true)}</dd></div><div><dt>接收邮箱</dt><dd>${h(o.email)}</dd></div><div><dt>支付方式</dt><dd>${o.payment === 'wechat' ? '微信支付' : '支付宝'} · 演示</dd></div>${complete ? `<div><dt>支付时间</dt><dd>${date(o.paidAt, true)}</dd></div><div><dt>演示流水号</dt><dd class="mono">${h(o.paymentRef)}</dd></div>` : ''}</dl>${o.note ? `<p class="subtle-note">订单备注：${h(o.note)}</p>` : ''}<div class="summary-total"><span>订单金额</span>${price(o.total)}</div><p class="subtle-note">${o.lines.map(l => h(l.name) + ' × ' + l.qty).join('<br>')}</p><a class="button secondary full" style="margin-top:22px" href="#/orders">${icon('receipt')} 返回我的订单</a></aside></div>`;
  }
  function valuePage() {
    return `${crumbs([['我们的选品原则']])}<section class="editorial-hero"><div class="eyebrow">THE THINKPASSER STANDARD</div><h1>技术，应该解决问题。<br>付费，应该<em>有所值得。</em></h1><p>我们经营 AI 账号与订阅，也认真对待每一次购买的理由。参数、热度和新鲜感只是起点；一个工具能否进入你的日常工作，才是它的价值所在。</p></section><div class="value-grid">${[['01 / USEFUL TECHNOLOGY', '先看任务，<br>再看工具。', '写作、代码、研究、图像、知识管理。我们按具体任务组织商品，让你更快找到适合自己的账号，而不是被一长串参数淹没。', 'TASK → TOOL → WORKFLOW'], ['02 / CLEAR OWNERSHIP', '把权益说清楚，<br>选择才有依据。', '独享、共享、代充分别是什么，买多久，收到什么，如何使用。商品页先把这些说明白，再让你决定要不要购买。', 'PLAN / ACCESS / DELIVERY'], ['03 / PAY FOR YOUR NEEDS', '用得上，<br>才值得付费。', '如果只是偶尔试用，轻量方案就足够作为起点。如果工具已成为每天的工作搭档，再考虑持续投入。我们希望你买得合适。', 'LESS GUESSING. BETTER CHOICES.']].map(([n, title, desc, foot]) => `<article class="value-panel"><div class="eyebrow">${n}</div><h2>${title}</h2><p>${desc}</p><div class="value-footer">${foot}</div></article>`).join('')}</div><section class="section"><div class="section-heading"><div><h2>从你正在做的事情开始</h2><p>选择工具的第一步，是说清楚你希望它帮你完成什么。</p></div></div><div class="use-case-grid">${[['pen', '写作与资料整理', '经常需要梳理长文、组织想法、整理材料。先选择自己使用顺手的对话工具。', 'assistant'], ['code', '阅读与编写代码', '希望 AI 出现在现有开发流程中。请先确认编辑器、账号与工作方式是否匹配。', 'code'], ['layers', '把想法变成画面', '持续寻找视觉方向与创作素材。购买前先了解套餐的额度与使用约定。', 'creative']].map(([i, title, desc, cat]) => `<article class="use-case">${icon(i)}<div><h3>${title}</h3><p>${desc}</p><a href="#/accounts?category=${cat}">查看对应商品 ${icon('arrow')}</a></div></article>`).join('')}</div></section>${principleBand()}<section class="section"><div class="section-heading"><h2>挑选一件，真正用起来。</h2><a class="button primary" href="#/accounts">前往账号商城 ${icon('arrow')}</a></div></section>`;
  }
  const HELP = {
    buying: ['购买与套餐', commonFAQs],
    delivery: ['支付与交付', [['支持哪些支付方式？', '收银台按支付宝与微信支付设计。当前版本只做前端，按钮触发模拟支付，不会向官方支付平台发起交易。'], ['付款后在哪里查看账号？', '在“我的订单”中打开已交付订单，可以查看账号邮箱、密码、恢复信息、登录入口和有效期，也可以复制或下载。'], ['演示账号是真实可用的吗？', '不是。演示账号通过随机数生成，邮箱使用专门的 .test 测试域名，只用于检查完整购买与交付体验。'], ['刷新页面后交付会变吗？', '不会。同一笔订单的账号会保存在本浏览器中，刷新页面或重复打开订单会展示同一套交付信息。清除浏览器存储会移除演示订单。']]],
    usage: ['账号使用', [['账号收到后先做什么？', '核对套餐、账号方式和使用期限。真实运营时应按照商品说明完成登录与必要设置；当前演示账号不可真实登录。'], ['共享账号有哪些约定？', '共享商品可能涉及设备数量、使用时段与登录方式约定。下单前查看具体商品描述，不要在共享环境存放敏感数据。'], ['使用期从什么时候算起？', '本演示从模拟支付完成时起计算使用期限，并显示具体到期日期。正式商品的起算方式应以实际销售条款为准。'], ['密码和恢复代码如何保存？', '可以在订单里复制或下载交付文本。当前只适合保存演示数据，不要在此前端版本中录入真实账号密码。']]],
    after: ['订单与售后', [['如何发起售后？', '打开已交付订单，点击“申请售后”，填写问题描述。演示申请保存在本设备，不会发送给实际客服。'], ['可以取消订单吗？', '待支付订单可在详情页直接取消。取消后无法继续模拟支付，需要重新下单。'], ['为什么换设备看不到订单？', '当前仅实现前端，订单与交付保存在创建订单的浏览器中，没有跨设备账号同步。'], ['收不到邮件怎么办？', '当前演示不会发送邮件，接收邮箱只用来标记订单。交付信息可以直接在当前设备的订单页查看。']]]
  };
  function help(query) { const tab = Object.hasOwn(HELP, query.get('tab')) ? query.get('tab') : 'buying'; return `${crumbs([['帮助中心']])}<div class="page-header"><div class="eyebrow">A LITTLE HELP GOES A LONG WAY</div><h1>有疑问，先在这里找找。</h1><p>把购买、交付和使用中的问题，一件件说清楚。</p></div><div class="help-layout"><nav class="help-nav" aria-label="帮助分类">${Object.entries(HELP).map(([id, [label]]) => `<a class="${id === tab ? 'active' : ''}" href="#/help?tab=${id}">${label} ${icon('chevron')}</a>`).join('')}</nav><section class="white-panel help-content"><h2>${HELP[tab][0]}</h2>${faq(HELP[tab][1], true)}</section></div>`; }
  function documentPage(kind) {
    const docs = {
      about: ['关于模型平权', [['我们经营什么', '模型平权是一家自营 AI 账号与订阅商城，销售具体的账号与订阅方案。我们把套餐、价格、期限、交付内容与使用方式放在清楚的位置，让用户根据实际需要选择。'], ['我们的原则', '技术应该解决问题，付费应该有所值得。我们按真实任务组织商品，说明适用场景与使用边界，避免让用户为了参数与热度盲目投入。'], ['当前体验范围', '这个版本完成商城前台、购物车、订单、模拟支付、随机演示账号交付与本地售后流程。商品价格和库存为示例；没有接入真实支付、真实账号库存或后台服务。'], ['独立经营', '本站为独立商城，与所提及的各产品服务提供方无隶属关系。产品名称与商标归相应所有者所有。']]],
      privacy: ['隐私说明', [['当前保存哪些信息', '你输入的订单接收邮箱、订单备注、演示售后描述，以及购物车、收藏与演示订单，保存在当前浏览器的 localStorage 中。'], ['信息如何使用', '这些信息用于呈现本地购买与交付体验。当前页面不会向后台、支付机构或邮件系统发送订单资料。请使用示例信息，不要输入真实账号密码或敏感内容。'], ['复制与下载', '你主动使用复制或下载功能时，演示交付内容将写入系统剪贴板或下载至设备。'], ['保存与移除', '清除本网站的浏览器存储会移除本地购物车、收藏和演示订单；当前版本没有跨设备恢复功能。']]],
      terms: ['购买须知', [['核对商品', '购买前确认商品名称、套餐、账号方式、使用期限、数量和交付内容。独享、共享和代充是不同商品方式，不应仅根据价格选择。'], ['演示交易说明', '当前仅实现商城前端，所有价格与库存均为示例。创建订单与模拟支付不会产生真实交易、实际扣款或真实账号交付。随机生成的 .test 邮箱、密码和恢复代码不可用于真实登录。'], ['套餐与使用边界', '真实产品的功能、额度、适用地区、设备要求和使用约定由各服务提供方决定；购买前应核对实际商品说明。当前示例不构成官方价格、授权或功能承诺。'], ['交付与售后', '演示交付可在订单中复制、查看和下载。演示售后只保存在当前设备。真实运营所需的支付、账号库存、通知和售后处理尚需后端接入。']]]
    };
    const doc = docs[kind]; if (!doc) return notFound();
    return `${crumbs([[doc[0]]])}<article class="white-panel text-document"><div class="eyebrow">THINKPASSER / INFORMATION</div><h1>${doc[0]}</h1>${doc[1].map(([title, desc]) => `<h2>${h(title)}</h2><p>${h(desc)}</p>`).join('')}<a class="text-link" href="#/accounts" style="margin-top:28px">返回账号商城 ${icon('arrow')}</a></article>`;
  }
  function notFound(title = '这一页，暂时没有找到。', desc = '商品或页面可能已经调整，去商城重新挑选吧。') { return `${crumbs([['页面未找到']])}${empty(title, desc, '返回账号商城', '#/accounts', 'search')}`; }
  function currentRoute() { const raw = location.hash.slice(1) || '/'; const mark = raw.indexOf('?'); return { path: mark < 0 ? raw : raw.slice(0, mark), query: new URLSearchParams(mark < 0 ? '' : raw.slice(mark + 1)) }; }
  let lastPath = '';
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
    $('#main').innerHTML = `<div class="animate-in">${content}</div>`;
    const active = route === 'product' ? 'accounts' : route;
    document.querySelectorAll('[data-nav]').forEach(el => { el.classList.toggle('active', el.dataset.nav === active); if (el.dataset.nav === active) el.setAttribute('aria-current', 'page'); else el.removeAttribute('aria-current'); });
    $('.primary-nav').classList.remove('open'); $('#menu-toggle').setAttribute('aria-expanded', 'false');
    document.body.classList.remove('filters-open');
    if (keepFilterOpen && $('#filter-sidebar')) filterDrawer(true);
    $('#global-search input').value = route === 'accounts' ? query.get('q') || '' : '';
    document.querySelectorAll('#brand-strip a').forEach(el => el.classList.toggle('active', el.getAttribute('href') === '#/accounts/' + segments[1]));
    const title = { accounts: brand(segments[1]) ? brand(segments[1]).name + ' 账号专区' : '账号商城', product: product(segments[1])?.name, cart: '购物车', checkout: '确认订单', orders: '我的订单', order: '订单与账号交付', value: '为什么值得付费', help: '帮助中心', about: '关于我们', policy: '商店说明' }[route];
    document.title = title ? `${title} · 模型平权` : '模型平权 · 为值得的能力付费';
    updateCartCount();
    if (path !== lastPath) { window.scrollTo({ top: 0, behavior: 'instant' }); if (lastPath) $('#main').focus({ preventScroll: true }); }
    lastPath = path;
  }
  function setFilter(key, value) { const { path, query } = currentRoute(); if (value === '' || value == null) query.delete(key); else query.set(key, value); go('#' + path + (query.size ? '?' + query : '')); }
  function filterDrawer(open) { const sidebar = $('#filter-sidebar'); if (!sidebar) return; sidebar.classList.toggle('open', open); $('.filter-backdrop').classList.toggle('open', open); document.body.classList.toggle('filters-open', open); $('.filter-toggle')?.setAttribute('aria-expanded', String(open)); if (open) { sidebar.setAttribute('role', 'dialog'); sidebar.setAttribute('aria-modal', 'true'); sidebar.querySelector('button').focus(); } else { sidebar.removeAttribute('role'); sidebar.removeAttribute('aria-modal'); $('.filter-toggle')?.focus(); } }
  async function copy(text) { try { await navigator.clipboard.writeText(text); toast('已复制'); } catch (_) { toast('浏览器限制了复制，请选中账号信息手动复制'); } }
  const accountText = d => `${d.name}\n账号：${d.email}\n密码：${d.password}\n恢复代码：${d.recoveryCode}\n登录入口：${Store.LOGIN_URLS[d.brand]}\n有效期至：${date(d.expiresAt)}\n演示账号不可真实登录。`;
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
      if (action === 'pay') { button.disabled = true; button.textContent = '正在生成演示交付…'; if (await mutate(s => { const i = s.orders.findIndex(o => o.id === id); if (i < 0) throw new Error('订单不存在，请返回我的订单'); s.orders[i] = completeDemoOrder(s.orders[i]); })) { render(); toast('模拟支付完成，演示账号已交付'); } else { button.disabled = false; button.innerHTML = icon('shield') + ' 模拟支付并查看账号'; } }
      if (action === 'copy-field' || action === 'copy-account') { const d = currentOrder()?.deliveries?.[Number(delivery)]; if (d) await copy(action === 'copy-account' ? accountText(d) : ['email', 'password', 'recoveryCode'].includes(field) ? d[field] : ''); }
      if (action === 'toggle-password') { const d = currentOrder()?.deliveries?.[Number(delivery)], el = $(`[data-password="${Number(delivery)}"]`); if (d && el) { const reveal = el.textContent.startsWith('•'); el.textContent = reveal ? d.password : '••••••••••••••••'; button.setAttribute('aria-pressed', String(reveal)); } }
      if (action === 'download-order') { const o = state.orders.find(o => o.id === id); if (!o?.deliveries) return; const blob = new Blob([`模型平权 · 演示交付\n订单号：${o.id}\n\n${o.deliveries.map(accountText).join('\n\n')}\n\n此文件仅包含随机演示信息。`], { type: 'text/plain;charset=utf-8' }); const url = URL.createObjectURL(blob), anchor = document.createElement('a'); anchor.href = url; anchor.download = `thinkpasser-${o.id}.txt`; anchor.click(); setTimeout(() => URL.revokeObjectURL(url), 1000); toast('已下载演示交付信息'); }
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
    if (form.id === 'price-filter') { const { path, query } = currentRoute(), min = String(data.get('min') || ''), max = String(data.get('max') || ''); if (min && max && Number(min) > Number(max)) { toast('最低价格不能高于最高价格'); return; } for (const [k, v] of [['min', min], ['max', max]]) v ? query.set(k, v) : query.delete(k); go('#' + path + (query.size ? '?' + query : '')); }
    if (form.id === 'checkout-form') {
      if (checkoutSubmitting) return;
      checkoutSubmitting = true;
      const submitButton = document.querySelector('[form="checkout-form"]'); submitButton.disabled = true;
      try { const query = currentRoute().query; let order; if (await mutate(s => { const items = query.has('id') ? checkoutItems(query) : s.cart; if (JSON.stringify(items) !== checkoutSnapshot) throw new Error('购物车已变化，请重新打开确认订单'); order = createOrder(items, { email: data.get('email'), note: data.get('note'), payment: data.get('payment'), agreed: data.get('agreed') === 'on' }); s.orders.unshift(order); if (!query.has('id')) s.cart = []; })) go('#/order/' + order.id); }
      catch (error) { $('#checkout-error').textContent = error.message; }
      finally { checkoutSubmitting = false; submitButton.disabled = false; }
    }
    if (form.id === 'ticket-form') { const message = String(data.get('message') || '').trim(), id = String(data.get('order') || ''); if (message.length < 8) { $('#ticket-error').textContent = '请至少填写 8 个字，描述遇到的问题。'; return; } try { if (await mutate(s => { const o = s.orders.find(o => o.id === id); if (o?.status !== 'completed') throw new Error('此订单不能申请售后'); o.ticket = { id: 'AS' + Date.now().toString(36).toUpperCase(), message: message.slice(0, 600), createdAt: Date.now(), status: 'pending' }; })) { $('#ticket-dialog').close(); render(); toast('演示售后已记录在当前设备'); } } catch(error) { $('#ticket-error').textContent = error.message; } }
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
