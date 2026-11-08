'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const { evaluateHealth, planRecovery, dispatchRecovery, verifyRecovery } = require('./health-contract.cjs');

const NOW = 1_800_000_000_000;
function fixture(action = 'restart_remote') {
  return {
    now: NOW,
    principal: { authenticated: true, subjectId: 'login-1', kind: 'customer', role: 'sub', tenantId: 'team-1', accountId: 'sub-1' },
    device: { id: 'mac-1', tenantId: 'team-1', source: 'platform', mainAccountId: 'main-1', assignedAccountId: 'sub-1',
      lastKnownBootId: 'boot-1', recoveryCapabilities: { restart_remote: true, reboot_os: true, provider_reboot: true } },
    heartbeat: { schemaVersion: 1, deviceId: 'mac-1', bootId: 'boot-1', agentInstanceId: 'agent-1', sequence: 100,
      serverReceivedAt: NOW - 1_000,
      remote: { sampleAgeMs: 0, process: 'running', processInstanceId: 'remote-1', ipc: 'ok', registration: 'ok', sessionProbe: 'unknown' } },
    request: { commandId: 'command-1', action, initiation: 'manual', expiresAt: NOW + 20_000, reason: 'manual recovery',
      expectedBootId: 'boot-1', expectedAgentInstanceId: 'agent-1', expectedRemoteInstanceId: 'remote-1',
      acknowledgeSessionDisconnect: true, acknowledgeTaskInterruption: true },
  };
}
const acceptedAdapter = { dispatch: async () => ({ status: 'accepted', operationId: 'operation-1' }) };
function rejectsCode(fn, code) {
  assert.throws(fn, error => error.code === code);
}

test('an online management agent and a running process do not prove remote desktop access', () => {
  const { heartbeat } = fixture();
  assert.equal(evaluateHealth(heartbeat, NOW).remote, 'unverified');
  heartbeat.remote.ipc = 'failed';
  assert.deepEqual(evaluateHealth(heartbeat, NOW), { agent: 'online', remote: 'degraded', ageMs: 1_000 });
  heartbeat.remote.ipc = 'ok';
  heartbeat.remote.sessionProbe = 'ok';
  assert.equal(evaluateHealth(heartbeat, NOW).remote, 'reachable');
  heartbeat.remote.sampleAgeMs = 44_000;
  assert.equal(evaluateHealth(heartbeat, NOW).remote, 'unknown');
  assert.deepEqual(evaluateHealth(heartbeat, NOW + 119_000), { agent: 'unreachable', remote: 'unknown', ageMs: 120_000 });
});

test('only the owning main account, assigned subaccount or scoped operator can recover a device', () => {
  const input = fixture();
  assert.equal(planRecovery(input).deviceId, 'mac-1');
  input.principal.accountId = 'sub-2';
  rejectsCode(() => planRecovery(input), 'FORBIDDEN');
  input.principal = { ...input.principal, role: 'main', accountId: 'main-1' };
  assert.equal(planRecovery(input).principalKind, 'customer');
  input.principal.tenantId = 'team-2';
  rejectsCode(() => planRecovery(input), 'FORBIDDEN');
  input.principal = { authenticated: true, subjectId: 'operator-1', kind: 'operator', permissions: ['devices:recover'], tenantIds: ['team-1'] };
  assert.equal(planRecovery(input).principalKind, 'operator');
  input.principal.tenantIds = ['team-2'];
  rejectsCode(() => planRecovery(input), 'FORBIDDEN');
  input.principal = { authenticated: true, subjectId: 'login-2', kind: 'customer', role: 'main', tenantId: 'team-1' };
  delete input.device.mainAccountId;
  rejectsCode(() => planRecovery(input), 'FORBIDDEN');
  input.principal = { authenticated: true, subjectId: 'supplier-login', kind: 'supplier', supplierId: 'supplier-1' };
  input.device.supplierId = 'supplier-1';
  rejectsCode(() => planRecovery(input), 'FORBIDDEN');
});

test('expired commands and stale process generations are rejected before dispatch', () => {
  const input = fixture();
  input.request.expiresAt = NOW;
  rejectsCode(() => planRecovery(input), 'INVALID_COMMAND_EXPIRY');
  input.request.expiresAt = NOW + 20_000;
  input.request.expectedRemoteInstanceId = 'remote-old';
  rejectsCode(() => planRecovery(input), 'REMOTE_GENERATION_CHANGED');
  input.request.expectedRemoteInstanceId = 'remote-1';
  input.request.expectedBootId = 'boot-old';
  rejectsCode(() => planRecovery(input), 'AGENT_GENERATION_CHANGED');
});

test('offline agent cannot restart its own process or OS through the missing link', () => {
  const input = fixture();
  input.heartbeat.serverReceivedAt = NOW - 120_000;
  rejectsCode(() => planRecovery(input), 'AGENT_NOT_ONLINE');
  input.request.action = 'reboot_os';
  rejectsCode(() => planRecovery(input), 'AGENT_NOT_ONLINE');
});

test('recovery never automatically escalates to an OS reboot', () => {
  const input = fixture('reboot_os');
  input.request.acknowledgeTaskInterruption = false;
  rejectsCode(() => planRecovery(input), 'TASK_INTERRUPTION_ACK_REQUIRED');
  input.request.acknowledgeTaskInterruption = true;
  input.request.initiation = 'policy';
  rejectsCode(() => planRecovery(input), 'MANUAL_REQUEST_REQUIRED');
});

test('provider reboot requires a configured provider, server baseline and platform machine', () => {
  const input = fixture('provider_reboot');
  input.heartbeat = null;
  rejectsCode(() => planRecovery(input), 'PROVIDER_NOT_CONFIGURED');
  input.device.provider = { configured: true, adapterId: 'test-provider', machineRef: 'inventory-42' };
  assert.equal(planRecovery(input).layer, 'provider');
  input.request.expectedBootId = 'invented-boot';
  rejectsCode(() => planRecovery(input), 'BASELINE_BOOT_REQUIRED');
  input.request.expectedBootId = 'boot-1';
  input.device.source = 'customer';
  rejectsCode(() => planRecovery(input), 'PROVIDER_NOT_CONFIGURED');
});

test('unconnected adapters, exceptions and invented success receipts never report recovery', async () => {
  const unavailable = await dispatchRecovery(fixture());
  assert.equal(unavailable.status, 'not_configured');
  rejectsCode(() => verifyRecovery(unavailable, fixture().heartbeat, NOW), 'COMMAND_NOT_ACCEPTED');
  const failure = await dispatchRecovery(fixture(), { dispatch: async () => { throw new Error('timeout after send'); } });
  assert.equal(failure.status, 'unknown');
  const invented = await dispatchRecovery(fixture(), { dispatch: async () => ({ status: 'completed', operationId: 'fake' }) });
  assert.equal(invented.status, 'unknown');
});

test('an accepted remote restart needs a new process and a fresh access probe', async () => {
  const input = fixture();
  const operation = await dispatchRecovery(input, acceptedAdapter);
  assert.equal(operation.status, 'accepted');
  assert.equal(verifyRecovery(operation, input.heartbeat, NOW).status, 'pending');
  const after = structuredClone(input.heartbeat);
  after.serverReceivedAt = NOW + 1_000;
  assert.equal(verifyRecovery(operation, after, NOW + 1_000).status, 'pending');
  after.remote.processInstanceId = 'remote-2';
  assert.equal(verifyRecovery(operation, after, NOW + 1_000).verification, 'remote_not_yet_verified');
  after.remote.sessionProbe = 'ok';
  assert.equal(verifyRecovery(operation, after, NOW + 1_000).verification, 'recovered');
  after.remote.sampleAgeMs = 1_500;
  assert.equal(verifyRecovery(operation, after, NOW + 1_000).reason, 'NO_POST_ACTION_REMOTE_SAMPLE');
  after.remote.sampleAgeMs = 0;
  after.bootId = 'boot-2';
  assert.equal(verifyRecovery(operation, after, NOW + 1_000).status, 'pending');
});

test('OS reboot requires a changed OS boot identity; an Agent restart alone does not qualify', async () => {
  const input = fixture('reboot_os');
  const operation = await dispatchRecovery(input, acceptedAdapter);
  const after = structuredClone(input.heartbeat);
  after.serverReceivedAt = NOW + 1_000;
  after.agentInstanceId = 'agent-2';
  assert.equal(verifyRecovery(operation, after, NOW + 1_000).status, 'pending');
  after.bootId = 'boot-2';
  assert.equal(verifyRecovery(operation, after, NOW + 1_000).actionEffect, 'generation_changed');
});
