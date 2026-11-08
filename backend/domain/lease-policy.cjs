'use strict';

const DAY_MS = 24 * 60 * 60 * 1000;
const RETENTION_MS = 3 * DAY_MS;
const MAX_DATE_MS = 8_640_000_000_000_000;

class PolicyError extends Error {
  constructor(code, message) {
    super(message);
    this.name = 'PolicyError';
    this.code = code;
  }
}

function instant(value, field) {
  if (!Number.isSafeInteger(value) || Math.abs(value) > MAX_DATE_MS) {
    throw new PolicyError('INVALID_INSTANT', `${field} must be an epoch millisecond integer`);
  }
  return value;
}

function retentionEndsAt(expiresAt) {
  instant(expiresAt, 'expiresAt');
  return instant(expiresAt + RETENTION_MS, 'retentionEndsAt');
}

// Time policy only. Callers must separately validate identity, allocation,
// provisioning and reset state before granting access or running any operation.
function leasePhase({ expiresAt, at }) {
  instant(at, 'at');
  const holdEndsAt = retentionEndsAt(expiresAt);
  if (at < expiresAt) return { phase: 'active', retentionEndsAt: holdEndsAt };
  if (at < holdEndsAt) return { phase: 'export_only', retentionEndsAt: holdEndsAt };
  return { phase: 'reset_required', retentionEndsAt: holdEndsAt };
}

function quoteAiAddon({ expiresAt, at, thirtyDayPriceMinor, currency }) {
  if (leasePhase({ expiresAt, at }).phase !== 'active') {
    throw new PolicyError('COMPUTER_EXPIRED', 'AI add-ons require an active computer lease');
  }
  if (!Number.isSafeInteger(thirtyDayPriceMinor) || thirtyDayPriceMinor <= 0) {
    throw new PolicyError('INVALID_PRICE', 'The fixed price must be a positive safe integer in minor units');
  }
  if (typeof currency !== 'string' || !/^[A-Z]{3}$/.test(currency)) {
    throw new PolicyError('INVALID_CURRENCY', 'Specify a three-letter currency code');
  }
  return Object.freeze({
    amountMinor: thirtyDayPriceMinor,
    currency,
    chargeBasis: 'fixed_30_day_price',
    validFrom: at,
    validUntil: expiresAt,
    remainingMs: expiresAt - at,
    prorated: false,
    requiresDurationDisclosure: true,
  });
}

// extensionMs comes from the chosen product's period calculator. The computer
// billing calendar is not assumed to be 30 days by this independent module.
function extendLease({ expiresAt, at, extensionMs, resetStarted = false }) {
  const phase = leasePhase({ expiresAt, at });
  if (resetStarted === true) {
    throw new PolicyError('RESET_ALREADY_STARTED', 'Do not promise restoration after a reset has started');
  }
  if (resetStarted !== false) {
    throw new PolicyError('INVALID_RESET_STATE', 'resetStarted must be a boolean');
  }
  if (phase.phase === 'reset_required') {
    throw new PolicyError('RETENTION_ENDED', 'The original-environment renewal window has ended');
  }
  if (!Number.isSafeInteger(extensionMs) || extensionMs <= 0) {
    throw new PolicyError('INVALID_EXTENSION', 'The extension must be a positive safe millisecond integer');
  }
  const newExpiresAt = instant(expiresAt + extensionMs, 'newExpiresAt');
  return Object.freeze({ expiresAt: newExpiresAt, renewalAnchor: expiresAt });
}

module.exports = { DAY_MS, RETENTION_MS, PolicyError, leasePhase, quoteAiAddon, extendLease };
