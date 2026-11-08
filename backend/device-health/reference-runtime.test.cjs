'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const { randomUUID, randomBytes } = require('node:crypto');
const { mkdtempSync, existsSync, unlinkSync, rmdirSync } = require('node:fs');
const { tmpdir } = require('node:os');
const { join } = require('node:path');
const { Journal, ReferenceControl, ReferenceAgent, signEnvelope, loopbackTransport, listenLoopback } = require('./reference-runtime.cjs');

function fixture(t, options = {}) {
  let time = Date.now();
  const now = () => time;
  const key = randomBytes(32).toString('hex');
  const token = randomBytes(32).toString('hex');
  const principal = { authenticated: true, subjectId: 'operator', kind: 'operator', permissions: ['devices:recover'], tenantIds: ['tenant'] };
  const serverJournal = options.serverJournal || new Journal();
  const agentJournal = new Journal();
  const config = { journal: serverJournal, deviceKeys: new Map([['device', key]]), principals: new Map([[token, principal]]), now };
  const control = new ReferenceControl(config);
  const device = { id: 'device', tenantId: 'tenant', assignmentVersion: 1, source: 'customer', recoveryCapabilities: { restart_remote: true, reboot_os: true } };
  control.putDevice(device);
  const snapshot = { bootId: 'boot-1', remote: { process: 'running', processInstanceId: 'remote-1', sampleAgeMs: 0,
    ipc: 'unknown', registration: 'unknown', sessionProbe: 'unknown' } };
  const agentConfig = { deviceId: 'device', key, journal: agentJournal, now, snapshot: () => snapshot,
    transport: async (route, envelope) => control.handleAgent(route, envelope) };
  const agent = new ReferenceAgent(agentConfig);
  t.after(() => { agentJournal.close(); if (!options.serverJournal) serverJournal.close(); });
  const request = action => ({ commandId: randomUUID(), action: action || 'restart_remote', initiation: 'manual',
    expiresAt: time + 20_000, reason: 'test fixture', expectedBootId: 'boot-1', expectedAgentInstanceId: agent.agentInstanceId,
    expectedRemoteInstanceId: 'remote-1', acknowledgeSessionDisconnect: true, acknowledgeTaskInterruption: true });
  return { control, config, agent, agentConfig, principal, token, key, snapshot, device, serverJournal, agentJournal, now,
    advance: ms => { time += ms; }, request };
}
async function ready(f) { await f.agent.start(); await f.agent.runOnce(); }
const code = expected => error => error.code === expected;

test('loopback HTTP carries authenticated heartbeat and returns explicit unconfigured execution', async t => {
  const f = fixture(t);
  const server = f.control.httpServer();
  const origin = await listenLoopback(server);
  t.after(() => new Promise(resolve => server.close(resolve)));
  f.agent.transport = loopbackTransport(origin);
  await ready(f);
  const response = await fetch(`${origin}/internal/v1/recovery-commands`, { method: 'POST',
    headers: { authorization: `Bearer ${f.token}` }, body: JSON.stringify({ deviceId: 'device', request: f.request() }) });
  assert.equal(response.status, 200);
  const operation = await response.json();
  assert.equal((await f.agent.runOnce()).status, 'not_configured');
  assert.equal(f.control.getOperation(f.principal, operation.command.commandId).status, 'not_configured');
  const denied = await fetch(`${origin}/internal/v1/recovery-commands`, { method: 'POST', body: '{}' });
  assert.equal(denied.status, 400);
  assert.throws(() => loopbackTransport('https://example.com'), code('LOOPBACK_TRANSPORT_ONLY'));
});

test('tampering, replay and retired Agent sessions are rejected', async t => {
  const f = fixture(t);
  const hello = signEnvelope(f.key, 'device', 'session', { bootId: 'boot-1', agentInstanceId: 'old', handshakeId: 'h1' }, f.now());
  f.control.handleAgent('session', hello);
  assert.throws(() => f.control.handleAgent('session', hello), code('ENVELOPE_REPLAY'));
  const tampered = signEnvelope(f.key, 'device', 'session', { bootId: 'boot-1', agentInstanceId: 'old', handshakeId: 'h2' }, f.now());
  tampered.payload.bootId = 'tampered';
  assert.throws(() => f.control.handleAgent('session', tampered), code('INVALID_SIGNATURE'));
  const old = f.serverJournal.get('session', 'device');
  f.agentJournal.set('local', 'session', { token: old.token, bootId: old.bootId, sequence: -1 });
  await f.agent.start();
  const retired = signEnvelope(f.key, 'device', 'commands', { sessionToken: old.token }, f.now());
  assert.throws(() => f.control.handleAgent('commands', retired), code('STALE_AGENT_SESSION'));
});

test('heartbeat arrival time is server-owned and sequence cannot go backwards', async t => {
  const f = fixture(t);
  await ready(f);
  const heartbeat = { schemaVersion: 1, deviceId: 'invented', bootId: 'boot-1', agentInstanceId: f.agent.agentInstanceId,
    sequence: 1, serverReceivedAt: f.now() + 99_999, remote: f.snapshot.remote };
  await f.agent.sessionPost('heartbeat', { heartbeat });
  assert.equal(f.serverJournal.get('heartbeat', 'device').deviceId, 'device');
  assert.equal(f.serverJournal.get('heartbeat', 'device').serverReceivedAt, f.now());
  await assert.rejects(f.agent.sessionPost('heartbeat', { heartbeat }), code('HEARTBEAT_ORDER_REJECTED'));
});

test('queued command idempotency survives SQLite reopen; changed payload is rejected', async t => {
  const directory = mkdtempSync(join(tmpdir(), 'thinkpasser-health-test-'));
  const filename = join(directory, 'journal.sqlite');
  let journal = new Journal(filename);
  const f = fixture(t, { serverJournal: journal });
  t.after(() => { journal.close(); for (const suffix of ['', '-wal', '-shm']) if (existsSync(filename + suffix)) unlinkSync(filename + suffix); rmdirSync(directory); });
  await ready(f);
  const request = f.request();
  const original = f.control.createOperation(f.principal, 'device', request);
  journal.close();
  journal = new Journal(filename);
  const restarted = new ReferenceControl({ ...f.config, journal });
  assert.deepEqual(restarted.createOperation(f.principal, 'device', request), original);
  assert.throws(() => restarted.createOperation(f.principal, 'device', { ...request, reason: 'different' }), code('IDEMPOTENCY_CONFLICT'));
});

test('dispatch rechecks assignment and current operator authorization', async t => {
  const f = fixture(t);
  await ready(f);
  const first = f.control.createOperation(f.principal, 'device', f.request());
  f.control.putDevice({ ...f.device, assignmentVersion: 2 });
  assert.equal((await f.agent.sessionPost('commands', {})).command, null);
  assert.equal(f.control.getOperation(f.principal, first.command.commandId).code, 'ASSIGNMENT_CHANGED');
  f.control.putDevice(f.device);
  const second = f.control.createOperation(f.principal, 'device', f.request());
  f.control.principals.clear();
  assert.equal((await f.agent.sessionPost('commands', {})).command, null);
  assert.equal(f.serverJournal.get('operation', second.command.commandId).code, 'AUTHORIZATION_REVOKED');
});

test('undelivered expiry is safe, delivered expiry is uncertain and blocks another recovery', async t => {
  const f = fixture(t);
  await ready(f);
  const first = f.control.createOperation(f.principal, 'device', f.request());
  f.advance(20_001);
  assert.equal(f.control.getOperation(f.principal, first.command.commandId).status, 'expired');
  await f.agent.runOnce();
  const second = f.control.createOperation(f.principal, 'device', f.request());
  await f.agent.sessionPost('commands', {});
  f.advance(20_001);
  assert.equal(f.control.getOperation(f.principal, second.command.commandId).status, 'unknown');
  await f.agent.runOnce();
  assert.throws(() => f.control.createOperation(f.principal, 'device', f.request()), code('RECOVERY_ALREADY_PENDING'));
});

test('a lost terminal response is resent after Agent restart without repeating the executor', async t => {
  const f = fixture(t);
  let calls = 0;
  f.agent.executor = async () => { calls++; return { status: 'effect_reported', code: 'REFERENCE_TEST_CALLBACK' }; };
  await ready(f);
  const operation = f.control.createOperation(f.principal, 'device', f.request());
  f.agent.transport = async (route, envelope) => {
    const response = f.control.handleAgent(route, envelope);
    if (route === 'results' && envelope.payload.result.status === 'effect_reported') throw new Error('response lost');
    return response;
  };
  await assert.rejects(f.agent.runOnce());
  const restarted = new ReferenceAgent({ ...f.agentConfig, executor: async () => { calls++; throw new Error('must not rerun'); } });
  await restarted.start();
  await restarted.runOnce();
  assert.equal(calls, 1);
  assert.equal(f.agentJournal.get('execution', operation.command.commandId).reported, true);
  assert.equal(f.control.getOperation(f.principal, operation.command.commandId).status, 'effect_reported');
});

test('interruption after durable claim is reported unknown and never executed again', async t => {
  const f = fixture(t);
  let calls = 0;
  f.agent.executor = async () => { calls++; return { status: 'effect_reported', code: 'REFERENCE_TEST_CALLBACK' }; };
  await ready(f);
  const operation = f.control.createOperation(f.principal, 'device', f.request());
  f.agent.transport = async (route, envelope) => {
    const response = f.control.handleAgent(route, envelope);
    if (route === 'results' && envelope.payload.result.status === 'accepted') throw new Error('ack response lost');
    return response;
  };
  await assert.rejects(f.agent.runOnce());
  const restarted = new ReferenceAgent({ ...f.agentConfig, executor: f.agent.executor });
  await restarted.start();
  await restarted.runOnce();
  assert.equal(calls, 0);
  assert.equal(f.control.getOperation(f.principal, operation.command.commandId).result.code, 'AGENT_INTERRUPTED_EXECUTION');
});

test('expired local delivery and post-ack generation change are rejected before any effect', async t => {
  const f = fixture(t);
  let calls = 0;
  f.agent.executor = async () => { calls++; return { status: 'effect_reported', code: 'REFERENCE_TEST_CALLBACK' }; };
  await ready(f);
  f.control.createOperation(f.principal, 'device', f.request());
  const expired = await f.agent.sessionPost('commands', {});
  expired.localDeadline = performance.now() - 1;
  assert.equal((await f.agent.execute(expired)).code, 'COMMAND_EXPIRED');
  f.control.createOperation(f.principal, 'device', f.request());
  f.agent.transport = async (route, envelope) => {
    const response = f.control.handleAgent(route, envelope);
    if (route === 'results' && envelope.payload.result.status === 'accepted') f.snapshot.remote.processInstanceId = 'remote-2';
    return response;
  };
  assert.equal((await f.agent.runOnce()).code, 'GENERATION_CHANGED');
  assert.equal(calls, 0);
});

test('executor timeout has unknown outcome and is not retried', async t => {
  const f = fixture(t);
  let calls = 0;
  f.agent.executor = async () => { calls++; return new Promise(() => {}); };
  await ready(f);
  const operation = f.control.createOperation(f.principal, 'device', f.request());
  const delivery = await f.agent.sessionPost('commands', {});
  delivery.executionTimeoutMs = 10;
  assert.equal((await f.agent.execute(delivery)).code, 'EXECUTOR_TIMEOUT');
  await f.agent.execute(delivery);
  assert.equal(calls, 1);
  assert.equal(f.control.getOperation(f.principal, operation.command.commandId).status, 'unknown');
});

test('a response-lost identity handshake is recoverable after Agent restart', async t => {
  const f = fixture(t);
  f.agent.transport = async (route, envelope) => { f.control.handleAgent(route, envelope); throw new Error('response lost'); };
  await assert.rejects(f.agent.start());
  const restarted = new ReferenceAgent(f.agentConfig);
  await restarted.start();
  await restarted.runOnce();
  assert.equal(f.serverJournal.get('heartbeat', 'device').agentInstanceId, restarted.agentInstanceId);
});
