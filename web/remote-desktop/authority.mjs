import { generateKeyPairSync, randomUUID, sign, verify } from 'node:crypto';
export class Denied extends Error {
  constructor(code, details = {}) { super(code); this.code = code; this.details = details; }
}
const deny = code => { throw new Denied(code); };
const CAPABILITIES = Object.freeze(['desktop.view', 'desktop.input', 'clipboard.text', 'file.transfer', 'audio.system']);
// Reference state machine, not an identity provider, durable database or deployed API.
// actorId must come from an authenticated server-side login. Never trust a request's actorId.
export class SessionAuthority {
  constructor({ accounts, devices, now = Date.now, keys = generateKeyPairSync('ed25519') }) {
    this.accounts = new Map(accounts.map(x => [x.id, structuredClone(x)]));
    this.devices = new Map(devices.map(x => [x.id, { epoch: 0, ...structuredClone(x) }]));
    this.bindings = new Map(); this.sessions = new Map(); this.used = new Map();
    this.now = now; this.keys = keys;
  }
  account(id) {
    const account = this.accounts.get(id);
    if (!account?.active) deny('ACCOUNT_DISABLED');
    return account;
  }
  manage(actorId, deviceId, operation) {
    const actor = this.account(actorId), device = this.devices.get(deviceId);
    if (!device || device.tenantId !== actor.tenantId) deny('TENANT_MISMATCH');
    const owner = this.bindings.get(actorId) === deviceId;
    if (operation === 'restart' && (owner || actor.role === 'main')) return true;
    if (['assign', 'reinstall'].includes(operation) && actor.role === 'main') return true;
    deny('MANAGEMENT_DENIED');
  }
  bind(actorId, accountId, deviceId) {
    this.manage(actorId, deviceId, 'assign');
    const actor = this.account(actorId), target = this.account(accountId);
    if (actor.tenantId !== target.tenantId || (accountId !== actorId && target.parentId !== actorId)) deny('ACCOUNT_OUT_OF_SCOPE');
    if (this.bindings.has(accountId)) deny('ACCOUNT_ALREADY_BOUND');
    if ([...this.bindings.values()].includes(deviceId)) deny('DEVICE_ALREADY_BOUND');
    this.bindings.set(accountId, deviceId);
  }
  unbind(actorId, accountId) {
    const deviceId = this.bindings.get(accountId);
    if (!deviceId) deny('NOT_BOUND');
    this.manage(actorId, deviceId, 'assign');
    const target = this.account(accountId);
    if (target.tenantId !== this.account(actorId).tenantId || (accountId !== actorId && target.parentId !== actorId)) deny('ACCOUNT_OUT_OF_SCOPE');
    this.bindings.delete(accountId); this.revokeDevice(deviceId);
  }
  desktop(actorId, deviceId) {
    const actor = this.account(actorId), device = this.devices.get(deviceId);
    if (!device || device.tenantId !== actor.tenantId) deny('TENANT_MISMATCH');
    if (this.bindings.get(actorId) !== deviceId) deny('DESKTOP_NOT_ASSIGNED');
    if (device.leaseUntil <= this.now()) deny('DEVICE_LEASE_EXPIRED');
    return device;
  }
  connect(actorId, deviceId, { clientKey, takeoverSessionId } = {}) {
    const device = this.desktop(actorId, deviceId);
    if (typeof clientKey !== 'string' || !/^[A-Za-z0-9_-]{43}$/.test(clientKey)) deny('CLIENT_KEY_REQUIRED');
    const old = this.sessions.get(deviceId);
    const active = old && old.until > this.now();
    if (active && takeoverSessionId !== old.id) throw new Denied('TAKEOVER_REQUIRED', { sessionId: old.id });
    if (takeoverSessionId && (!active || takeoverSessionId !== old.id)) deny('STALE_TAKEOVER');
    device.epoch++;
    const session = { id: randomUUID(), actorId, deviceId, epoch: device.epoch, clientKey,
      until: Math.min(this.now() + 30000, device.leaseUntil) };
    this.sessions.set(deviceId, session);
    return { session: { ...session }, revokedSessionId: active ? old.id : null, grant: this.issue(session) };
  }
  issue(session) {
    const claims = { v: 1, iss: 'thinkpasser-session', aud: `device:${session.deviceId}`, sub: session.actorId,
      tenantId: this.account(session.actorId).tenantId,
      sid: session.id, epoch: session.epoch, jti: randomUUID(), cnf: session.clientKey,
      iat: this.now(), exp: session.until, capabilities: CAPABILITIES };
    const payload = Buffer.from(JSON.stringify(claims)).toString('base64url');
    return `${payload}.${sign(null, Buffer.from(payload), this.keys.privateKey).toString('base64url')}`;
  }
  validateSession(session) {
    const device = this.desktop(session.actorId, session.deviceId), current = this.sessions.get(session.deviceId);
    if (current?.id !== session.id || current.epoch !== session.epoch || device.epoch !== session.epoch || current.until <= this.now()) deny('SESSION_REVOKED');
    return current;
  }
  // In production the device proves possession of clientKey on the bound channel, and verifies
  // the platform signature locally. This comparison alone is NOT proof of key possession.
  consume(grant, { deviceId, clientKey }) {
    if (typeof grant !== 'string' || grant.length > 8192) deny('INVALID_GRANT');
    const parts = grant.split('.');
    if (parts.length !== 2 || !verify(null, Buffer.from(parts[0]), this.keys.publicKey, Buffer.from(parts[1], 'base64url'))) deny('INVALID_GRANT');
    let claims;
    try { claims = JSON.parse(Buffer.from(parts[0], 'base64url').toString()); } catch { deny('INVALID_GRANT'); }
    if (claims.v !== 1 || claims.iss !== 'thinkpasser-session' || claims.aud !== `device:${deviceId}` || claims.cnf !== clientKey ||
      claims.exp <= this.now() || claims.iat > this.now() || claims.exp - claims.iat > 30000) deny('INVALID_GRANT');
    const session = this.sessions.get(deviceId);
    if (!session || session.id !== claims.sid || session.actorId !== claims.sub || session.epoch !== claims.epoch || session.clientKey !== claims.cnf || this.devices.get(deviceId)?.tenantId !== claims.tenantId) deny('SESSION_REVOKED');
    this.validateSession(session);
    for (const [id, exp] of this.used) if (exp <= this.now()) this.used.delete(id);
    if (this.used.has(claims.jti)) deny('GRANT_REPLAY');
    this.used.set(claims.jti, claims.exp);
    return claims;
  }
  renew(actorId, sessionId, clientKey) {
    const old = [...this.sessions.values()].find(session => session.id === sessionId);
    if (!old || old.actorId !== actorId || old.clientKey !== clientKey) deny('SESSION_REVOKED');
    this.validateSession(old);
    old.until = Math.min(this.now() + 30000, this.devices.get(old.deviceId).leaseUntil);
    return this.issue(old);
  }
  revokeDevice(deviceId) {
    const device = this.devices.get(deviceId);
    if (device) device.epoch++;
    this.sessions.delete(deviceId);
  }
}
