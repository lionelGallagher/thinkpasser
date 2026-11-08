'use strict';

const { randomBytes, randomUUID } = require('node:crypto');
const { mkdtempSync } = require('node:fs');
const { tmpdir } = require('node:os');
const { join } = require('node:path');
const { Journal, ReferenceControl, ReferenceAgent, loopbackTransport, listenLoopback } = require('./reference-runtime.cjs');

async function main() {
  const directory = mkdtempSync(join(tmpdir(), 'thinkpasser-health-reference-'));
  const serverJournal = new Journal(join(directory, 'control.sqlite'));
  const agentJournal = new Journal(join(directory, 'agent.sqlite'));
  const key = randomBytes(32).toString('hex');
  const token = randomBytes(32).toString('hex');
  const principal = { authenticated: true, subjectId: 'reference-operator', kind: 'operator',
    permissions: ['devices:recover'], tenantIds: ['reference-tenant'] };
  const control = new ReferenceControl({ journal: serverJournal,
    deviceKeys: new Map([['reference-device', key]]), principals: new Map([[token, principal]]) });
  control.putDevice({ id: 'reference-device', tenantId: 'reference-tenant', assignmentVersion: 1,
    source: 'platform', recoveryCapabilities: { reboot_os: true } });
  const server = control.httpServer();
  try {
    const origin = await listenLoopback(server);
    const agent = new ReferenceAgent({ deviceId: 'reference-device', key, journal: agentJournal,
      transport: loopbackTransport(origin), snapshot: () => ({ bootId: 'reference-fixture-boot',
        remote: { sampleAgeMs: 0, process: 'unknown', ipc: 'unknown', registration: 'unknown', sessionProbe: 'unknown' } }) });
    await agent.start();
    await agent.runOnce();
    const heartbeat = serverJournal.get('heartbeat', 'reference-device');
    const request = { commandId: randomUUID(), action: 'reboot_os', initiation: 'manual', expiresAt: Date.now() + 20_000,
      reason: 'Reference protocol exercise; no actual reboot executor', acknowledgeTaskInterruption: true,
      expectedBootId: heartbeat.bootId, expectedAgentInstanceId: heartbeat.agentInstanceId };
    const response = await fetch(`${origin}/internal/v1/recovery-commands`, { method: 'POST',
      headers: { authorization: `Bearer ${token}`, 'content-type': 'application/json' },
      body: JSON.stringify({ deviceId: 'reference-device', request }) });
    if (!response.ok) throw new Error('Reference command was rejected');
    const created = await response.json();
    const result = await agent.runOnce();
    const recorded = control.getOperation(principal, created.command.commandId);
    console.log(JSON.stringify({ referenceOnly: true, transport: 'loopback HTTP', heartbeatIdentityAccepted: true,
      commandStatus: recorded.status, executorResult: result, journals: directory,
      actualDeviceActionsExecuted: false }, null, 2));
  } finally {
    await new Promise(resolve => server.close(resolve));
    agentJournal.close();
    serverJournal.close();
  }
}

if (require.main === module) main().catch(error => { console.error(error.code || error.message); process.exitCode = 1; });
