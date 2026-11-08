import { decodeMessage } from './protocol.mjs';
// Boundary for a future native adapter. It deliberately cannot start an OS session.
// The native provider must close its RustDesk connection when close() is called.
export class GatewaySession {
  constructor({ authority, grant, deviceId, clientKey, nativeProvider }) {
    if (typeof nativeProvider?.send !== 'function' || typeof nativeProvider?.close !== 'function') throw new Error('NATIVE_PROVIDER_REQUIRED');
    this.claims = authority.consume(grant, { deviceId, clientKey });
    this.session = { id: this.claims.sid, actorId: this.claims.sub, deviceId, epoch: this.claims.epoch };
    this.authority = authority; this.provider = nativeProvider; this.closed = false;
  }
  input(bytes) {
    if (this.closed) throw new Error('SESSION_CLOSED');
    try {
      this.authority.validateSession(this.session);
      const message = decodeMessage(bytes);
      const capability = { key: 'desktop.input', mouse: 'desktop.input', clipboard: 'clipboard.text' }[message.type];
      if (!capability || !this.claims.capabilities.includes(capability)) throw new Error('MESSAGE_DENIED');
      // Only the parsed strict subset is forwarded. No arbitrary protobuf pass-through.
      const result = this.provider.send(bytes);
      if (result?.then) return Promise.resolve(result).catch(error => { this.close(error.message); throw error; });
      return result;
    } catch (error) { this.close(error.message); throw error; }
  }
  checkLease() {
    try { this.authority.validateSession(this.session); }
    catch (error) { this.close(error.message); throw error; }
  }
  close(reason = 'CLIENT_CLOSED') {
    if (this.closed) return;
    this.closed = true; this.provider.close(reason);
  }
}
