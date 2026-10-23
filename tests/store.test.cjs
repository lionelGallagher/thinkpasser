const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const source = path.join(__dirname, '../assets/store.js');
const Store = fs.existsSync(source) ? require(source) : {};

test('commerce rules are available independently of the browser', () => {
  assert.equal(typeof Store.filterProducts, 'function');
  assert.equal(typeof Store.quote, 'function');
});

test('search, brand, ownership, price and delivery filters compose', () => {
  const list = Store.filterProducts({ brand: 'claude', q: 'pro', mode: 'private', max: 20000, delivery: 'instant' });
  assert.ok(list.length > 0);
  assert.ok(list.every(p => p.brand === 'claude' && p.mode === 'private' && p.price <= 20000 && p.delivery === 'instant'));
  assert.equal(Store.filterProducts({ q: 'no-such-account-98232' }).length, 0);
});

test('low-price sorting orders a copy and keeps the source catalog unchanged', () => {
  const original = Store.PRODUCTS.map(p => p.id);
  const sorted = Store.filterProducts({ sort: 'price-asc' });
  assert.ok(sorted.length >= 12);
  assert.ok(sorted.every((p, index) => index === 0 || p.price >= sorted[index - 1].price));
  assert.deepEqual(Store.PRODUCTS.map(p => p.id), original);
});

test('quotes use integer cents and reject unsupported duration and quantities', () => {
  const p = Store.PRODUCTS.find(p => p.id === 'claude-pro-private');
  const result = Store.quote(p.id, 3, 2);
  assert.equal(result.total, Math.round(p.price * 285 / 100) * 2);
  assert.ok(Number.isInteger(result.total));
  for (const [months, qty] of [[2, 1], [1, -1], [1, 1.5], [1, NaN], [1, Infinity]]) {
    assert.throws(() => Store.quote(p.id, months, qty));
  }
  assert.throws(() => Store.quote('missing-product', 1, 1));
});

test('cart merges matching terms and checks combined stock across durations', () => {
  const id = 'claude-pro-private';
  const p = Store.PRODUCTS.find(p => p.id === id);
  const cart = Store.normalizeCart([{ id, months: 1, qty: 1 }, { id, months: 1, qty: 2 }]);
  assert.deepEqual(cart, [{ id, months: 1, qty: 3 }]);
  assert.throws(() => Store.normalizeCart([{ id, months: 1, qty: p.stock }, { id, months: 3, qty: 1 }]));
  assert.throws(() => Store.normalizeCart([{ id: 'missing-product', months: 1, qty: 1 }]));
});

test('orders calculate current catalog totals and remain pending payment', () => {
  const items = [{ id: 'claude-pro-private', months: 1, qty: 2 }];
  const order = Store.createOrder(items, { email: 'buyer@example.com', payment: 'alipay', agreed: true });
  assert.equal(order.total, Store.quote(items[0].id, 1, 2).total);
  assert.equal(order.status, 'pending');
  assert.equal(order.email, 'buyer@example.com');
  assert.equal(order.lines[0].name, 'Claude Pro 独享账号');
  assert.ok(order.id.startsWith('MX'));
});

test('orders reject empty carts, invalid contact, missing consent and unknown payment types', () => {
  const items = [{ id: 'claude-pro-private', months: 1, qty: 1 }];
  const valid = { email: 'buyer@example.com', payment: 'alipay', agreed: true };
  assert.throws(() => Store.createOrder([], valid), /购物车/);
  assert.throws(() => Store.createOrder(items, { ...valid, email: 'broken' }), /邮箱/);
  assert.throws(() => Store.createOrder(items, { ...valid, agreed: false }), /须知/);
  assert.throws(() => Store.createOrder(items, { ...valid, payment: 'unrecognized' }), /支付方式/);
});

test('demo payment generates a complete account delivery for every purchased unit', () => {
  const pending = Store.createOrder([{ id: 'claude-pro-private', months: 1, qty: 2 }], { email: 'buyer@example.com', payment: 'wechat', agreed: true });
  const completed = Store.completeDemoOrder(pending);
  assert.equal(completed.status, 'completed');
  assert.equal(completed.demo, true);
  assert.equal(completed.deliveries.length, 2);
  assert.notEqual(completed.deliveries[0].email, completed.deliveries[1].email);
  assert.ok(completed.deliveries.every(d => d.email.endsWith('@demo.thinkpasser.test') && d.password.length >= 16 && d.loginUrl.startsWith('https://') && d.expiresAt > completed.paidAt));
  assert.equal(pending.status, 'pending');
});

test('repeating demo payment preserves the same credentials and rejects cancelled orders', () => {
  const pending = Store.createOrder([{ id: 'claude-pro-private', months: 1, qty: 1 }], { email: 'buyer@example.com', payment: 'alipay', agreed: true });
  const completed = Store.completeDemoOrder(pending);
  assert.deepEqual(Store.completeDemoOrder(completed), completed);
  assert.throws(() => Store.completeDemoOrder({ ...pending, status: 'cancelled' }), /取消/);
});

test('state recovery preserves paid orders when a cart entry is invalid', () => {
  const pending = Store.createOrder([{ id: 'claude-pro-private', months: 1, qty: 1 }], { email: 'buyer@example.com', payment: 'alipay', agreed: true });
  const completed = Store.completeDemoOrder(pending);
  const result = Store.restoreState({ cart: [{ id: 'not-a-product', months: 1, qty: 1 }], orders: [completed], favorites: ['claude-pro-private'] });
  assert.deepEqual(result.state.orders, [completed]);
  assert.deepEqual(result.state.cart, []);
  assert.equal(result.repaired, true);
});

test('state recovery quarantines malformed orders without breaking valid order history', () => {
  const valid = Store.createOrder([{ id: 'claude-pro-private', months: 1, qty: 1 }], { email: 'buyer@example.com', payment: 'alipay', agreed: true });
  const result = Store.restoreState({ cart: [], orders: [valid, { ...valid, createdAt: 'bad-date' }], favorites: ['missing'] });
  assert.deepEqual(result.state.orders, [valid]);
  assert.deepEqual(result.state.favorites, []);
  assert.equal(result.repaired, true);
});
