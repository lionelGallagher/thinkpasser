'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const { DAY_MS, RETENTION_MS, leasePhase, quoteAiAddon, extendLease } = require('./lease-policy.cjs');
const EXPIRES = Date.UTC(2026, 10, 20, 12);
const rejects = (fn, code) => assert.throws(fn, error => error.code === code);

test('desktop expiry and the exact three-day export deadline are distinct boundaries', () => {
  assert.equal(leasePhase({ expiresAt: EXPIRES, at: EXPIRES - 1 }).phase, 'active');
  assert.equal(leasePhase({ expiresAt: EXPIRES, at: EXPIRES }).phase, 'export_only');
  assert.equal(leasePhase({ expiresAt: EXPIRES, at: EXPIRES + RETENTION_MS - 1 }).phase, 'export_only');
  assert.equal(leasePhase({ expiresAt: EXPIRES, at: EXPIRES + RETENTION_MS }).phase, 'reset_required');
});

test('three-day retention uses elapsed time across calendar month boundaries', () => {
  const expiresAt = Date.UTC(2026, 10, 30, 23, 59);
  assert.equal(leasePhase({ expiresAt, at: expiresAt }).retentionEndsAt, Date.UTC(2026, 11, 3, 23, 59));
});

test('twenty remaining days cost the full supplied thirty-day reference price', () => {
  const quote = quoteAiAddon({ expiresAt: EXPIRES, at: EXPIRES - 20 * DAY_MS, thirtyDayPriceMinor: 10000, currency: 'CNY' });
  assert.equal(quote.amountMinor, 10000);
  assert.equal(quote.remainingMs, 20 * DAY_MS);
  assert.equal(quote.validUntil, EXPIRES);
  assert.equal(quote.prorated, false);
  assert.equal(quote.requiresDurationDisclosure, true);
});

test('one day and less than one day remain purchasable without overstating the duration', () => {
  for (const remainingMs of [DAY_MS, 60_000, 1]) {
    const quote = quoteAiAddon({ expiresAt: EXPIRES, at: EXPIRES - remainingMs, thirtyDayPriceMinor: 12345, currency: 'USD' });
    assert.equal(quote.amountMinor, 12345);
    assert.equal(quote.remainingMs, remainingMs);
    assert.equal(quote.validUntil - quote.validFrom, remainingMs);
  }
});

test('AI add-ons are refused at expiry even while original files are retained', () => {
  for (const at of [EXPIRES, EXPIRES + DAY_MS, EXPIRES + RETENTION_MS]) {
    rejects(() => quoteAiAddon({ expiresAt: EXPIRES, at, thirtyDayPriceMinor: 10000, currency: 'CNY' }), 'COMPUTER_EXPIRED');
  }
});

test('renewal during retention extends the old deadline rather than payment time', () => {
  const result = extendLease({ expiresAt: EXPIRES, at: EXPIRES + 2 * DAY_MS, extensionMs: 30 * DAY_MS });
  assert.equal(result.renewalAnchor, EXPIRES);
  assert.equal(result.expiresAt, EXPIRES + 30 * DAY_MS);
});

test('an early renewal preserves the unused computer period', () => {
  assert.equal(extendLease({ expiresAt: EXPIRES, at: EXPIRES - 10 * DAY_MS, extensionMs: 30 * DAY_MS }).expiresAt, EXPIRES + 30 * DAY_MS);
});

test('expired retention or an already-started reset cannot promise the original environment', () => {
  rejects(() => extendLease({ expiresAt: EXPIRES, at: EXPIRES + RETENTION_MS, extensionMs: 30 * DAY_MS }), 'RETENTION_ENDED');
  rejects(() => extendLease({ expiresAt: EXPIRES, at: EXPIRES + DAY_MS, extensionMs: 30 * DAY_MS, resetStarted: true }), 'RESET_ALREADY_STARTED');
});

test('prices cannot become negative, fractional or lose integer precision', () => {
  for (const thirtyDayPriceMinor of [-1, 0, 0.5, Number.MAX_SAFE_INTEGER + 1, NaN]) {
    rejects(() => quoteAiAddon({ expiresAt: EXPIRES, at: EXPIRES - DAY_MS, thirtyDayPriceMinor, currency: 'CNY' }), 'INVALID_PRICE');
  }
});

test('timestamps, currency and renewal periods are validated before producing a result', () => {
  rejects(() => leasePhase({ expiresAt: EXPIRES, at: '2026-11-01' }), 'INVALID_INSTANT');
  rejects(() => leasePhase({ expiresAt: 8_640_000_000_000_000, at: EXPIRES }), 'INVALID_INSTANT');
  rejects(() => quoteAiAddon({ expiresAt: EXPIRES, at: EXPIRES - DAY_MS, thirtyDayPriceMinor: 10000, currency: '' }), 'INVALID_CURRENCY');
  for (const extensionMs of [0, -1, 0.5, Number.MAX_SAFE_INTEGER]) {
    rejects(() => extendLease({ expiresAt: EXPIRES, at: EXPIRES, extensionMs }), extensionMs === Number.MAX_SAFE_INTEGER ? 'INVALID_INSTANT' : 'INVALID_EXTENSION');
  }
});
