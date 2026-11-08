import { test } from 'node:test';
import assert from 'node:assert/strict';
import { SessionAuthority } from '../authority.mjs';
import { GatewaySession } from '../gateway-session.mjs';
import { encodeText, encodeVideo } from '../protocol.mjs';
const key = 'x'.repeat(43), otherKey = 'y'.repeat(43);
function setup() {
  let now = 1000000;
  const authority = new SessionAuthority({ now: () => now,
    accounts: [
      { id: 'main', tenantId: 'a', role: 'main', active: true },
      { id: 'child', tenantId: 'a', parentId: 'main', role: 'child', active: true },
      { id: 'outsider', tenantId: 'b', role: 'main', active: true }],
    devices: [{ id: 'pc1', tenantId: 'a', leaseUntil: now + 1000000 }, { id: 'pc2', tenantId: 'a', leaseUntil: now + 1000000 }] });
  authority.bind('main', 'child', 'pc1');
  return { authority, advance: delta => { now += delta; } };
}
const code = value => error => error.code === value;

test('single account/device assignment, tenant isolation, management and desktop rights differ', () => {
  const { authority: a } = setup();
  assert.throws(() => a.bind('main', 'child', 'pc2'), code('ACCOUNT_ALREADY_BOUND'));
  assert.throws(() => a.bind('main', 'main', 'pc1'), code('DEVICE_ALREADY_BOUND'));
  assert.throws(() => a.connect('main', 'pc1', { clientKey: key }), code('DESKTOP_NOT_ASSIGNED'));
  assert.throws(() => a.connect('outsider', 'pc1', { clientKey: key }), code('TENANT_MISMATCH'));
  assert.equal(a.manage('main', 'pc1', 'restart'), true); assert.equal(a.manage('child', 'pc1', 'restart'), true);
  assert.equal(a.manage('main', 'pc1', 'reinstall'), true);
  assert.throws(() => a.manage('child', 'pc1', 'reinstall'), code('MANAGEMENT_DENIED'));
  assert.throws(() => a.manage('child', 'pc2', 'restart'), code('MANAGEMENT_DENIED'));
});

test('takeover requires confirmation of exactly the currently active session', () => {
  const { authority: a } = setup();
  const first = a.connect('child', 'pc1', { clientKey: key });
  assert.throws(() => a.connect('child', 'pc1', { clientKey: otherKey }), code('TAKEOVER_REQUIRED'));
  const second = a.connect('child', 'pc1', { clientKey: otherKey, takeoverSessionId: first.session.id });
  assert.equal(second.revokedSessionId, first.session.id);
  assert.throws(() => a.validateSession(first.session), code('SESSION_REVOKED'));
  assert.throws(() => a.connect('child', 'pc1', { clientKey: key, takeoverSessionId: first.session.id }), code('TAKEOVER_REQUIRED'));
  assert.throws(() => a.consume(first.grant, { deviceId: 'pc1', clientKey: key }), code('SESSION_REVOKED'));
});

test('signed grant rejects tampering, wrong audience/key, replay and expiration', () => {
  const { authority: a, advance } = setup();
  const { grant } = a.connect('child', 'pc1', { clientKey: key });
  assert.throws(() => a.consume(`x${grant}`, { deviceId: 'pc1', clientKey: key }), code('INVALID_GRANT'));
  assert.throws(() => a.consume(grant, { deviceId: 'pc2', clientKey: key }), code('INVALID_GRANT'));
  assert.throws(() => a.consume(grant, { deviceId: 'pc1', clientKey: otherKey }), code('INVALID_GRANT'));
  assert.equal(a.consume(grant, { deviceId: 'pc1', clientKey: key }).sub, 'child');
  assert.throws(() => a.consume(grant, { deviceId: 'pc1', clientKey: key }), code('GRANT_REPLAY'));
  advance(30001);
  assert.throws(() => a.consume(grant, { deviceId: 'pc1', clientKey: key }), code('INVALID_GRANT'));
});

test('heartbeat fails on suspension, assignment recall and device lease expiration', () => {
  for (const action of ['suspend', 'recall', 'lease']) {
    const { authority: a, advance } = setup();
    const first = a.connect('child', 'pc1', { clientKey: key });
    if (action === 'suspend') a.accounts.get('child').active = false;
    if (action === 'recall') a.unbind('main', 'child');
    if (action === 'lease') advance(1000001);
    assert.throws(() => a.renew('child', first.session.id, key));
  }
});

test('renew retains one session, issues fresh one-use grant and has a bounded lease', () => {
  const { authority: a, advance } = setup();
  const first = a.connect('child', 'pc1', { clientKey: key });
  advance(20000);
  const renewal = a.renew('child', first.session.id, key);
  assert.equal(a.consume(renewal, { deviceId: 'pc1', clientKey: key }).sid, first.session.id);
  advance(30001);
  assert.throws(() => a.renew('child', first.session.id, key), code('SESSION_REVOKED'));
});

test('gateway boundary stops old input on takeover and rejects video-to-host injection', () => {
  const { authority: a } = setup();
  const first = a.connect('child', 'pc1', { clientKey: key });
  let sent = 0, closed = 0;
  const gate = new GatewaySession({ authority: a, grant: first.grant, deviceId: 'pc1', clientKey: key,
    nativeProvider: { send() { sent++; }, close() { closed++; } } });
  gate.input(encodeText('中文')); assert.equal(sent, 1);
  a.connect('child', 'pc1', { clientKey: otherKey, takeoverSessionId: first.session.id });
  assert.throws(() => gate.input(encodeText('旧连接')), code('SESSION_REVOKED'));
  assert.equal(sent, 1); assert.equal(closed, 1);
  const second = a.sessions.get('pc1');
  const fresh = new GatewaySession({ authority: a, grant: a.issue(second), deviceId: 'pc1', clientKey: otherKey,
    nativeProvider: { send() { sent++; }, close() { closed++; } } });
  assert.throws(() => fresh.input(encodeVideo({ codec: 'vp8', data: Uint8Array.of(0) })), /MESSAGE_DENIED/);
  assert.equal(sent, 1); assert.equal(closed, 2);
});

test('native provider asynchronous failures close the guarded connection', async () => {
  const { authority: a } = setup();
  const first = a.connect('child', 'pc1', { clientKey: key });
  let closed = 0;
  const gate = new GatewaySession({ authority: a, grant: first.grant, deviceId: 'pc1', clientKey: key,
    nativeProvider: { send: async () => { throw new Error('native disconnected'); }, close() { closed++; } } });
  await assert.rejects(gate.input(encodeText('test')), /native disconnected/);
  assert.equal(closed, 1); assert.equal(gate.closed, true);
});
