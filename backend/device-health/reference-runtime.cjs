'use strict';

// A loopback-only reference transport. No shell, OS service or provider SDK is used.
const { createHash, createHmac, randomBytes, randomUUID, timingSafeEqual } = require('node:crypto');
const { createServer } = require('node:http');
const { DatabaseSync } = require('node:sqlite');
const { authorize, evaluateHealth, planRecovery, ContractError } = require('./health-contract.cjs');

const MAX_SKEW_MS = 30_000;
const ACTIVE = new Set(['queued', 'delivered', 'accepted', 'unknown']);
const RESULTS = new Set(['not_configured', 'rejected', 'failed', 'unknown', 'effect_reported']);
const fail = code => { throw new ContractError(code); };
const check = (condition, code) => { if (!condition) fail(code); };
const text = value => typeof value === 'string' && value.length > 0 && value.length <= 512;

function canonical(value) {
  if (value === null || ['string', 'boolean'].includes(typeof value)) return JSON.stringify(value);
  if (typeof value === 'number') {
    check(Number.isSafeInteger(value), 'UNSUPPORTED_CANONICAL_NUMBER');
    return JSON.stringify(value);
  }
  check(typeof value === 'object', 'UNSUPPORTED_CANONICAL_VALUE');
  if (Array.isArray(value)) return `[${value.map(canonical).join(',')}]`;
  const keys = Object.keys(value).sort();
  check(keys.every(key => /^[\x20-\x7e]+$/.test(key)), 'UNSUPPORTED_CANONICAL_KEY');
  return `{${keys.map(key => `${JSON.stringify(key)}:${canonical(value[key])}`).join(',')}}`;
}
const hash = value => createHash('sha256').update(canonical(value)).digest('hex');
const mac = (key, value) => createHmac('sha256', key).update(canonical(value)).digest('hex');

function signEnvelope(key, deviceId, route, payload, now, replyTo = null) {
  const body = { version: 1, deviceId, route, issuedAt: now, nonce: randomBytes(16).toString('hex'), replyTo, payload };
  return { ...body, signature: mac(key, body) };
}

function verifyEnvelope(key, envelope, deviceId, route, now, replyTo = null) {
  check(typeof key === 'string' && key.length >= 32, 'DEVICE_KEY_NOT_CONFIGURED');
  check(envelope?.version === 1 && envelope.deviceId === deviceId && envelope.route === route &&
    envelope.replyTo === replyTo && /^[a-f0-9]{32}$/.test(envelope.nonce || '') &&
    Number.isFinite(envelope.issuedAt) && Math.abs(now - envelope.issuedAt) <= MAX_SKEW_MS,
  'INVALID_SIGNED_ENVELOPE');
  const { signature, ...body } = envelope;
  check(typeof signature === 'string' && /^[a-f0-9]{64}$/.test(signature), 'INVALID_SIGNATURE');
  check(timingSafeEqual(Buffer.from(signature, 'hex'), Buffer.from(mac(key, body), 'hex')), 'INVALID_SIGNATURE');
  return envelope.payload;
}

class Journal {
  constructor(filename = ':memory:') {
    this.db = new DatabaseSync(filename, { timeout: 2_000 });
    this.db.exec('PRAGMA journal_mode=WAL; PRAGMA synchronous=FULL; CREATE TABLE IF NOT EXISTS entries (kind TEXT, id TEXT, value TEXT NOT NULL, PRIMARY KEY(kind,id));');
  }
  get(kind, id) {
    const row = this.db.prepare('SELECT value FROM entries WHERE kind=? AND id=?').get(kind, id);
    return row ? JSON.parse(row.value) : null;
  }
  set(kind, id, value) {
    this.db.prepare('INSERT INTO entries VALUES (?,?,?) ON CONFLICT(kind,id) DO UPDATE SET value=excluded.value').run(kind, id, JSON.stringify(value));
  }
  list(kind) {
    return this.db.prepare('SELECT value FROM entries WHERE kind=? ORDER BY rowid').all(kind).map(row => JSON.parse(row.value));
  }
  remove(kind, id) { this.db.prepare('DELETE FROM entries WHERE kind=? AND id=?').run(kind, id); }
  transaction(fn) {
    this.db.exec('BEGIN IMMEDIATE');
    try {
      const result = fn();
      this.db.exec('COMMIT');
      return result;
    } catch (error) {
      this.db.exec('ROLLBACK');
      throw error;
    }
  }
  close() { this.db.close(); }
}

class ReferenceControl {
  constructor({ journal = new Journal(), deviceKeys = new Map(), principals = new Map(), now = Date.now } = {}) {
    this.journal = journal;
    this.deviceKeys = deviceKeys;
    this.principals = principals;
    this.now = now;
  }
  putDevice(device) {
    check(text(device?.id) && text(device.tenantId) && Number.isSafeInteger(device.assignmentVersion), 'INVALID_INVENTORY');
    this.journal.set('device', device.id, device);
  }
  currentPrincipal(subjectId) {
    const principal = [...this.principals.values()].find(value => value.subjectId === subjectId && value.authenticated === true);
    check(principal, 'AUTHORIZATION_REVOKED');
    return principal;
  }
  sweep(now) {
    for (const operation of this.journal.list('operation')) {
      if ((operation.status === 'queued' || operation.status === 'delivered') && operation.command.expiresAt <= now) {
        operation.status = operation.status === 'queued' ? 'expired' : 'unknown';
        operation.code = 'COMMAND_DELIVERY_EXPIRED';
        this.journal.set('operation', operation.command.commandId, operation);
      } else if (operation.status === 'accepted' && operation.executionDeadline <= now) {
        operation.status = 'unknown';
        operation.code = 'EXECUTION_OUTCOME_UNKNOWN';
        this.journal.set('operation', operation.command.commandId, operation);
      }
    }
  }
  createOperation(principal, deviceId, request) {
    const now = this.now();
    return this.journal.transaction(() => {
      const device = this.journal.get('device', deviceId);
      authorize(principal, device);
      this.sweep(now);
      const fingerprint = hash({ deviceId, subjectId: principal.subjectId, request });
      const existing = this.journal.get('operation', request.commandId);
      if (existing) {
        check(existing.fingerprint === fingerprint, 'IDEMPOTENCY_CONFLICT');
        return existing;
      }
      const command = planRecovery({ principal, device, request, heartbeat: this.journal.get('heartbeat', deviceId), now });
      check(command.layer === 'agent', 'PROVIDER_ADAPTER_NOT_CONFIGURED');
      check(!this.journal.list('operation').some(op => op.command.deviceId === deviceId && ACTIVE.has(op.status)), 'RECOVERY_ALREADY_PENDING');
      const operation = { command: { ...command, assignmentVersion: device.assignmentVersion }, fingerprint,
        status: 'queued', deliveryToken: null, executionDeadline: null, result: null };
      this.journal.set('operation', command.commandId, operation);
      return operation;
    });
  }
  getOperation(principal, commandId) {
    return this.journal.transaction(() => {
      this.sweep(this.now());
      const operation = this.journal.get('operation', commandId);
      check(operation, 'OPERATION_NOT_FOUND');
      authorize(principal, this.journal.get('device', operation.command.deviceId));
      return operation;
    });
  }
  handleAgent(route, envelope) {
    const now = this.now();
    const deviceId = envelope?.deviceId;
    const key = this.deviceKeys.get(deviceId);
    const payload = verifyEnvelope(key, envelope, deviceId, route, now);
    check(this.journal.get('device', deviceId), 'DEVICE_NOT_PROVISIONED');
    this.journal.transaction(() => {
      for (const nonce of this.journal.list('nonce')) {
        if (nonce.seenAt < now - 2 * MAX_SKEW_MS) this.journal.remove('nonce', nonce.id);
      }
      const id = `${deviceId}:${envelope.nonce}`;
      check(!this.journal.get('nonce', id), 'ENVELOPE_REPLAY');
      this.journal.set('nonce', id, { id, seenAt: now });
    });
    const result = this.journal.transaction(() => this.agentMessage(deviceId, route, payload, now));
    return signEnvelope(key, deviceId, route, result, now, envelope.nonce);
  }
  agentMessage(deviceId, route, payload, now) {
    this.sweep(now);
    const current = this.journal.get('session', deviceId);
    if (route === 'session') {
      check(text(payload?.bootId) && text(payload.agentInstanceId) && text(payload.handshakeId), 'INVALID_SESSION');
      if (current?.handshakeId === payload.handshakeId) {
        check(current.bootId === payload.bootId && current.agentInstanceId === payload.agentInstanceId &&
          current.previousTokenHash === hash(payload.previousSessionToken ?? null), 'SESSION_ROTATION_DENIED');
        return { sessionToken: current.token };
      }
      check(!current || payload.previousSessionToken === current.token, 'SESSION_ROTATION_DENIED');
      const session = { deviceId, bootId: payload.bootId, agentInstanceId: payload.agentInstanceId,
        token: randomBytes(32).toString('hex'), sequence: -1, handshakeId: payload.handshakeId,
        previousTokenHash: hash(payload.previousSessionToken ?? null) };
      this.journal.set('session', deviceId, session);
      return { sessionToken: session.token };
    }
    check(current && payload?.sessionToken === current.token, 'STALE_AGENT_SESSION');
    if (route === 'heartbeat') {
      const heartbeat = { ...payload.heartbeat, deviceId, serverReceivedAt: now };
      check(heartbeat.bootId === current.bootId && heartbeat.agentInstanceId === current.agentInstanceId &&
        heartbeat.sequence > current.sequence, 'HEARTBEAT_ORDER_REJECTED');
      const health = evaluateHealth(heartbeat, now);
      current.sequence = heartbeat.sequence;
      this.journal.set('session', deviceId, current);
      this.journal.set('heartbeat', deviceId, heartbeat);
      const device = this.journal.get('device', deviceId);
      this.journal.set('device', deviceId, { ...device, lastKnownBootId: heartbeat.bootId });
      return { receivedAt: now, health };
    }
    if (route === 'commands') {
      const device = this.journal.get('device', deviceId);
      const operation = this.journal.list('operation').find(op => op.command.deviceId === deviceId &&
        ['queued', 'delivered'].includes(op.status));
      if (!operation) return { command: null };
      const command = operation.command;
      try {
        authorize(this.currentPrincipal(command.requestedBy), device);
        check(command.assignmentVersion === device.assignmentVersion, 'ASSIGNMENT_CHANGED');
        check(device.recoveryCapabilities?.[command.action] === true, 'CAPABILITY_REVOKED');
        check(command.expectedBootId === current.bootId && command.expectedAgentInstanceId === current.agentInstanceId, 'AGENT_GENERATION_CHANGED');
      } catch (error) {
        operation.status = 'rejected';
        operation.code = error.code || 'AUTHORIZATION_REVOKED';
        this.journal.set('operation', command.commandId, operation);
        return { command: null, rejectedCommandId: command.commandId };
      }
      operation.status = 'delivered';
      operation.deliveryToken ||= randomBytes(32).toString('hex');
      this.journal.set('operation', command.commandId, operation);
      return { command, deliveryToken: operation.deliveryToken, executionTimeoutMs: 10_000 };
    }
    if (route === 'results') {
      const operation = this.journal.get('operation', payload.commandId);
      check(operation?.command.deviceId === deviceId && text(payload.deliveryToken) &&
        payload.deliveryToken === operation.deliveryToken, 'RESULT_TARGET_REJECTED');
      const result = payload.result;
      check(text(result?.code) && (result.status === 'accepted' || RESULTS.has(result.status)), 'INVALID_RESULT');
      if (operation.result) {
        check(hash(operation.result) === hash(result), 'RESULT_CONFLICT');
        return { recorded: true, duplicate: true };
      }
      if (result.status === 'accepted') {
        check(['delivered', 'accepted'].includes(operation.status), 'COMMAND_NOT_DELIVERED');
        if (operation.status !== 'accepted') operation.executionDeadline = now + 10_000;
        operation.status = 'accepted';
      } else {
        check(['delivered', 'accepted', 'unknown'].includes(operation.status), 'COMMAND_NOT_DELIVERED');
        operation.status = result.status;
        operation.result = result;
      }
      this.journal.set('operation', payload.commandId, operation);
      return { recorded: true };
    }
    fail('ROUTE_NOT_ALLOWED');
  }
  httpServer() {
    return createServer(async (req, res) => {
      try {
        check(req.method === 'POST', 'METHOD_NOT_ALLOWED');
        const chunks = [];
        let length = 0;
        for await (const chunk of req) {
          length += chunk.length;
          check(length <= 65_536, 'PAYLOAD_TOO_LARGE');
          chunks.push(chunk);
        }
        const body = JSON.parse(Buffer.concat(chunks).toString('utf8'));
        let value;
        const agentRoute = /^\/agent\/v1\/(session|heartbeat|commands|results)$/.exec(req.url);
        if (agentRoute) value = this.handleAgent(agentRoute[1], body);
        else {
          const token = /^Bearer ([^ ]+)$/.exec(req.headers.authorization || '')?.[1];
          const principal = this.principals.get(token);
          check(principal?.authenticated === true && principal.kind === 'operator', 'UNAUTHENTICATED');
          if (req.url === '/internal/v1/recovery-commands') value = this.createOperation(principal, body.deviceId, body.request);
          else if (req.url === '/internal/v1/recovery-operation') value = this.getOperation(principal, body.commandId);
          else fail('ROUTE_NOT_ALLOWED');
        }
        res.writeHead(200, { 'content-type': 'application/json', 'cache-control': 'no-store' });
        res.end(JSON.stringify(value));
      } catch (error) {
        res.writeHead(400, { 'content-type': 'application/json', 'cache-control': 'no-store' });
        res.end(JSON.stringify({ error: error.code || 'INVALID_REQUEST' }));
      }
    });
  }
}

class ReferenceAgent {
  constructor({ deviceId, key, journal = new Journal(), transport, snapshot, now = Date.now, executor = async () =>
    ({ status: 'not_configured', code: 'RECOVERY_EXECUTOR_NOT_CONFIGURED' }) }) {
    check(text(deviceId) && typeof key === 'string' && key.length >= 32 && typeof snapshot === 'function' && typeof transport === 'function', 'INVALID_AGENT_CONFIG');
    Object.assign(this, { deviceId, key, journal, transport, snapshot, now, executor });
    this.agentInstanceId = randomUUID();
    for (const entry of journal.list('execution')) {
      if (entry.phase === 'claimed') journal.set('execution', entry.commandId, { ...entry, phase: 'terminal',
        result: { status: 'unknown', code: 'AGENT_INTERRUPTED_EXECUTION' } });
    }
  }
  async post(route, payload) {
    const requestStarted = performance.now();
    const envelope = signEnvelope(this.key, this.deviceId, route, payload, this.now());
    const response = await this.transport(route, envelope);
    const verified = verifyEnvelope(this.key, response, this.deviceId, route, this.now(), envelope.nonce);
    if (route === 'commands' && verified.command) {
      // Subtract the entire round trip from the signed server-side remaining TTL.
      return { ...verified, localDeadline: requestStarted + Math.max(0, verified.command.expiresAt - response.issuedAt) };
    }
    return verified;
  }
  async start() {
    const snapshot = this.snapshot();
    // Finish a response-lost handshake before rotating to this new process identity.
    const pending = this.journal.get('local', 'handshake');
    if (pending) {
      const recovered = await this.post('session', pending);
      this.journal.set('local', 'session', { token: recovered.sessionToken, bootId: pending.bootId, sequence: -1 });
      this.journal.remove('local', 'handshake');
    }
    const previous = this.journal.get('local', 'session');
    const hello = { bootId: snapshot.bootId, agentInstanceId: this.agentInstanceId,
      handshakeId: randomUUID(), previousSessionToken: previous?.token ?? null };
    this.journal.set('local', 'handshake', hello);
    const response = await this.post('session', hello);
    this.journal.set('local', 'session', { token: response.sessionToken, bootId: snapshot.bootId, sequence: -1 });
    this.journal.remove('local', 'handshake');
  }
  async sessionPost(route, payload) {
    const session = this.journal.get('local', 'session');
    check(session && session.bootId === this.snapshot().bootId, 'AGENT_SESSION_REQUIRED');
    return this.post(route, { ...payload, sessionToken: session.token });
  }
  async report(entry) {
    await this.sessionPost('results', { commandId: entry.commandId, deliveryToken: entry.deliveryToken, result: entry.result });
    this.journal.set('execution', entry.commandId, { ...entry, reported: true });
  }
  async execute(delivery) {
    const { command, deliveryToken } = delivery;
    const existing = this.journal.get('execution', command.commandId);
    if (existing) {
      check(existing.commandHash === hash(command), 'COMMAND_ID_CONFLICT');
      if (existing.phase === 'claimed') fail('COMMAND_ALREADY_IN_PROGRESS');
      await this.report(existing);
      return existing.result;
    }
    let result = this.validateCommand(command, delivery.localDeadline);
    const entry = { commandId: command.commandId, commandHash: hash(command), deliveryToken,
      phase: result ? 'terminal' : 'claimed', result: result ?? null, reported: false };
    this.journal.set('execution', command.commandId, entry);
    if (!result) {
      await this.sessionPost('results', { commandId: command.commandId, deliveryToken,
        result: { status: 'accepted', code: 'AGENT_ACCEPTED' } });
      result = this.validateCommand(command, delivery.localDeadline);
      const abort = new AbortController();
      let timer;
      try {
        result ||= await Promise.race([
          Promise.resolve().then(() => this.executor(command, { signal: abort.signal })),
          new Promise(resolve => { timer = setTimeout(() => {
            abort.abort(); resolve({ status: 'unknown', code: 'EXECUTOR_TIMEOUT' });
          }, Math.min(delivery.executionTimeoutMs || 10_000, 10_000)); }),
        ]);
        if (!RESULTS.has(result?.status) || !text(result.code)) result = { status: 'unknown', code: 'INVALID_EXECUTOR_RESULT' };
      } catch {
        result = { status: 'unknown', code: 'EXECUTOR_OUTCOME_UNKNOWN' };
      } finally { clearTimeout(timer); }
    }
    const finished = { ...entry, phase: 'terminal', result };
    this.journal.set('execution', command.commandId, finished);
    await this.report(finished);
    return result;
  }
  validateCommand(command, localDeadline) {
    const current = this.snapshot();
    if (command.schemaVersion !== 1 || command.layer !== 'agent' || command.deviceId !== this.deviceId ||
      !['restart_remote', 'reboot_os'].includes(command.action)) return { status: 'rejected', code: 'ACTION_NOT_ALLOWED' };
    if (!Number.isFinite(command.issuedAt) || !Number.isFinite(command.expiresAt) || command.expiresAt <= command.issuedAt ||
      command.expiresAt - command.issuedAt > 30_000 || !Number.isFinite(localDeadline) || localDeadline <= performance.now()) {
      return { status: 'rejected', code: 'COMMAND_EXPIRED' };
    }
    if (command.expectedBootId !== current.bootId || command.expectedAgentInstanceId !== this.agentInstanceId ||
      (command.action === 'restart_remote' && command.expectedRemoteInstanceId !== current.remote.processInstanceId)) {
      return { status: 'rejected', code: 'GENERATION_CHANGED' };
    }
    return null;
  }
  async runOnce() {
    for (const entry of this.journal.list('execution')) if (entry.phase === 'terminal' && !entry.reported) await this.report(entry);
    const session = this.journal.get('local', 'session');
    check(session, 'AGENT_SESSION_REQUIRED');
    session.sequence += 1;
    this.journal.set('local', 'session', session);
    const snapshot = this.snapshot();
    await this.sessionPost('heartbeat', { heartbeat: { schemaVersion: 1, deviceId: this.deviceId, bootId: snapshot.bootId,
      agentInstanceId: this.agentInstanceId, sequence: session.sequence, remote: snapshot.remote } });
    const delivery = await this.sessionPost('commands', {});
    return delivery.command ? this.execute(delivery) : null;
  }
}

function loopbackTransport(origin) {
  check(/^http:\/\/127\.0\.0\.1:\d+$/.test(origin), 'LOOPBACK_TRANSPORT_ONLY');
  return async (route, body) => {
    const response = await fetch(`${origin}/agent/v1/${route}`, { method: 'POST', redirect: 'error',
      headers: { 'content-type': 'application/json' }, body: JSON.stringify(body), signal: AbortSignal.timeout(5_000) });
    const value = await response.json();
    check(response.ok, value.error || 'TRANSPORT_ERROR');
    return value;
  };
}

async function listenLoopback(server) {
  await new Promise((resolve, reject) => { server.once('error', reject); server.listen(0, '127.0.0.1', resolve); });
  return `http://127.0.0.1:${server.address().port}`;
}

module.exports = { Journal, ReferenceControl, ReferenceAgent, signEnvelope, verifyEnvelope, loopbackTransport, listenLoopback };
