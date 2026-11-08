'use strict';

// Input identities, device inventory and receipt times must come from trusted server code.
// This module has no network, shell, credential store or durable command queue.
const ACTIONS = new Set(['restart_remote', 'reboot_os', 'provider_reboot']);
const DEFAULT_THRESHOLDS = Object.freeze({ staleMs: 45_000, unreachableMs: 120_000 });

class ContractError extends Error {
  constructor(code) {
    super(code);
    this.name = 'ContractError';
    this.code = code;
  }
}

function requireValue(condition, code) {
  if (!condition) throw new ContractError(code);
}

function nonempty(value) {
  return typeof value === 'string' && value.trim().length > 0;
}

function validateHeartbeat(heartbeat, now) {
  requireValue(Number.isFinite(now), 'INVALID_TIME');
  requireValue(heartbeat?.schemaVersion === 1, 'INVALID_HEARTBEAT');
  for (const field of ['deviceId', 'bootId', 'agentInstanceId']) {
    requireValue(nonempty(heartbeat[field]), 'INVALID_HEARTBEAT');
  }
  requireValue(Number.isSafeInteger(heartbeat.sequence) && heartbeat.sequence >= 0, 'INVALID_HEARTBEAT');
  requireValue(Number.isFinite(heartbeat.serverReceivedAt) && heartbeat.serverReceivedAt <= now, 'INVALID_RECEIPT_TIME');
  requireValue(Number.isFinite(heartbeat.remote?.sampleAgeMs) && heartbeat.remote.sampleAgeMs >= 0, 'INVALID_REMOTE_SAMPLE');
  requireValue(['running', 'stopped', 'unknown'].includes(heartbeat.remote.process), 'INVALID_REMOTE_SAMPLE');
  for (const field of ['ipc', 'registration', 'sessionProbe']) {
    requireValue(['ok', 'failed', 'unknown'].includes(heartbeat.remote[field]), 'INVALID_REMOTE_SAMPLE');
  }
}

function evaluateHealth(heartbeat, now, thresholds = DEFAULT_THRESHOLDS) {
  requireValue(Number.isFinite(now), 'INVALID_TIME');
  requireValue(Number.isFinite(thresholds.staleMs) && thresholds.staleMs > 0 &&
    Number.isFinite(thresholds.unreachableMs) && thresholds.unreachableMs > thresholds.staleMs,
  'INVALID_THRESHOLDS');
  if (!heartbeat) return { agent: 'unknown', remote: 'unknown', ageMs: null };
  validateHeartbeat(heartbeat, now);
  const ageMs = now - heartbeat.serverReceivedAt;
  const agent = ageMs >= thresholds.unreachableMs ? 'unreachable' : ageMs >= thresholds.staleMs ? 'stale' : 'online';
  if (agent !== 'online' || ageMs + heartbeat.remote.sampleAgeMs >= thresholds.staleMs) {
    return { agent, remote: 'unknown', ageMs };
  }
  const remote = heartbeat.remote;
  const failed = remote.process === 'stopped' || [remote.ipc, remote.registration, remote.sessionProbe].includes('failed');
  const verified = remote.process === 'running' && remote.ipc === 'ok' && remote.registration === 'ok' && remote.sessionProbe === 'ok';
  return { agent, remote: failed ? 'degraded' : verified ? 'reachable' : 'unverified', ageMs };
}

function authorize(principal, device) {
  requireValue(principal?.authenticated === true && nonempty(principal.subjectId), 'UNAUTHENTICATED');
  requireValue(nonempty(device?.id) && nonempty(device.tenantId), 'INVALID_DEVICE');
  if (principal.kind === 'operator') {
    requireValue(Array.isArray(principal.permissions) && principal.permissions.includes('devices:recover') &&
      Array.isArray(principal.tenantIds) && principal.tenantIds.includes(device.tenantId), 'FORBIDDEN');
    return;
  }
  requireValue(principal.kind === 'customer' && principal.tenantId === device.tenantId, 'FORBIDDEN');
  requireValue(nonempty(principal.accountId), 'FORBIDDEN');
  const owns = principal.role === 'main' && principal.accountId === device.mainAccountId;
  const assigned = principal.role === 'sub' && principal.accountId === device.assignedAccountId;
  requireValue(owns || assigned, 'FORBIDDEN');
}

function planRecovery({ request, principal, device, heartbeat, now }) {
  authorize(principal, device);
  requireValue(Number.isFinite(now), 'INVALID_TIME');
  requireValue(nonempty(request?.commandId) && ACTIONS.has(request.action), 'INVALID_REQUEST');
  requireValue(request.initiation === 'manual', 'MANUAL_REQUEST_REQUIRED');
  requireValue(Number.isFinite(request.expiresAt) && request.expiresAt > now && request.expiresAt <= now + 30_000,
    'INVALID_COMMAND_EXPIRY');
  requireValue(nonempty(request.reason), 'REASON_REQUIRED');
  requireValue(device.recoveryCapabilities?.[request.action] === true, 'CAPABILITY_UNAVAILABLE');
  if (heartbeat) {
    validateHeartbeat(heartbeat, now);
    requireValue(heartbeat.deviceId === device.id, 'DEVICE_MISMATCH');
  }
  const health = evaluateHealth(heartbeat, now);
  const provider = request.action === 'provider_reboot';
  if (provider) {
    requireValue(device.source === 'platform' && device.provider?.configured === true &&
      nonempty(device.provider.adapterId) && nonempty(device.provider.machineRef), 'PROVIDER_NOT_CONFIGURED');
    requireValue(nonempty(device.lastKnownBootId) && request.expectedBootId === device.lastKnownBootId, 'BASELINE_BOOT_REQUIRED');
  } else {
    requireValue(health.agent === 'online', 'AGENT_NOT_ONLINE');
    requireValue(nonempty(request.expectedBootId) && request.expectedBootId === heartbeat.bootId &&
      request.expectedAgentInstanceId === heartbeat.agentInstanceId, 'AGENT_GENERATION_CHANGED');
  }
  if (request.action === 'restart_remote') {
    requireValue(request.acknowledgeSessionDisconnect === true, 'SESSION_DISCONNECT_ACK_REQUIRED');
    requireValue(nonempty(request.expectedRemoteInstanceId) && request.expectedRemoteInstanceId === heartbeat.remote.processInstanceId,
      'REMOTE_GENERATION_CHANGED');
  } else {
    requireValue(request.acknowledgeTaskInterruption === true, 'TASK_INTERRUPTION_ACK_REQUIRED');
    requireValue(nonempty(request.expectedBootId), 'BASELINE_BOOT_REQUIRED');
    if (heartbeat) requireValue(request.expectedBootId === heartbeat.bootId, 'AGENT_GENERATION_CHANGED');
  }
  return Object.freeze({
    schemaVersion: 1,
    commandId: request.commandId,
    action: request.action,
    layer: provider ? 'provider' : 'agent',
    deviceId: device.id,
    tenantId: device.tenantId,
    requestedBy: principal.subjectId,
    principalKind: principal.kind,
    reason: request.reason,
    issuedAt: now,
    expiresAt: request.expiresAt,
    expectedBootId: request.expectedBootId,
    expectedAgentInstanceId: provider ? null : heartbeat.agentInstanceId,
    expectedRemoteInstanceId: request.action === 'restart_remote' ? request.expectedRemoteInstanceId : null,
    providerAdapterId: provider ? device.provider.adapterId : null,
    providerMachineRef: provider ? device.provider.machineRef : null,
  });
}

class UnconfiguredAdapter {
  async dispatch() {
    return { status: 'not_configured', code: 'ADAPTER_NOT_CONFIGURED' };
  }
}

// Always builds a fresh plan. Adapters must recheck expiry and generations locally.
async function dispatchRecovery(input, adapter = new UnconfiguredAdapter()) {
  const command = planRecovery(input);
  let receipt;
  try {
    receipt = await adapter.dispatch(command);
  } catch {
    return { command, status: 'unknown', code: 'DISPATCH_OUTCOME_UNKNOWN' };
  }
  if (receipt?.status === 'not_configured' || receipt?.status === 'rejected') {
    return { command, status: receipt.status, code: receipt.code || 'ADAPTER_REJECTED' };
  }
  if (receipt?.status !== 'accepted' || !nonempty(receipt.operationId)) {
    return { command, status: 'unknown', code: 'INVALID_ADAPTER_RECEIPT' };
  }
  return { command, status: 'accepted', operationId: receipt.operationId, verification: 'pending' };
}

function verifyRecovery(operation, heartbeat, now) {
  requireValue(operation?.status === 'accepted' && nonempty(operation.operationId), 'COMMAND_NOT_ACCEPTED');
  const command = operation.command;
  requireValue(command?.schemaVersion === 1 && ACTIONS.has(command.action) &&
    nonempty(command.deviceId) && nonempty(command.expectedBootId) && Number.isFinite(command.issuedAt), 'INVALID_COMMAND');
  if (command.action === 'restart_remote') requireValue(nonempty(command.expectedRemoteInstanceId), 'INVALID_COMMAND');
  if (!heartbeat) return { status: 'pending', reason: 'NO_POST_ACTION_HEARTBEAT' };
  validateHeartbeat(heartbeat, now);
  requireValue(heartbeat.deviceId === command.deviceId, 'DEVICE_MISMATCH');
  if (heartbeat.serverReceivedAt <= command.issuedAt || evaluateHealth(heartbeat, now).agent !== 'online') {
    return { status: 'pending', reason: 'NO_FRESH_POST_ACTION_HEARTBEAT' };
  }
  if (command.action === 'restart_remote' && heartbeat.serverReceivedAt - heartbeat.remote.sampleAgeMs <= command.issuedAt) {
    return { status: 'pending', reason: 'NO_POST_ACTION_REMOTE_SAMPLE' };
  }
  const changed = command.action === 'restart_remote'
    ? heartbeat.bootId === command.expectedBootId && nonempty(heartbeat.remote.processInstanceId) &&
      heartbeat.remote.processInstanceId !== command.expectedRemoteInstanceId
    : heartbeat.bootId !== command.expectedBootId;
  if (!changed) return { status: 'pending', reason: 'NO_EXPECTED_GENERATION_CHANGE' };
  const health = evaluateHealth(heartbeat, now);
  return { status: 'observed', actionEffect: 'generation_changed', remote: health.remote,
    verification: health.remote === 'reachable' ? 'recovered' : 'remote_not_yet_verified' };
}

module.exports = {
  ContractError, DEFAULT_THRESHOLDS, authorize, evaluateHealth, planRecovery,
  UnconfiguredAdapter, dispatchRecovery, verifyRecovery,
};
