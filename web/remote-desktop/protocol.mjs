// RustDesk 1.5.1 / hbb_common fae47e0. Only the documented fixture subset.
// Input is an already decrypted logical Message, never arbitrary encrypted traffic.
export const MAX_PACKET = 8 * 1024 * 1024;
const utf8 = new TextEncoder();
const text = new TextDecoder('utf-8', { fatal: true });
export function concat(parts) {
  const out = new Uint8Array(parts.reduce((n, part) => n + part.length, 0));
  let offset = 0;
  for (const part of parts) { out.set(part, offset); offset += part.length; }
  return out;
}
function varint(value) {
  let n = BigInt(value);
  if (n < 0n || n > 0xffffffffffffffffn) throw new Error('Invalid uint64');
  const bytes = [];
  do { bytes.push(Number(n & 127n) | (n > 127n ? 128 : 0)); n >>= 7n; } while (n);
  return Uint8Array.from(bytes);
}
function uint(field, value) { return concat([varint(field * 8), varint(value)]); }
function bytes(field, value) { return concat([varint(field * 8 + 2), varint(value.length), value]); }
function str(field, value) { return bytes(field, utf8.encode(value)); }
function readVarint(data, cursor) {
  let n = 0n;
  for (let i = 0; i < 10; i++) {
    if (cursor.i >= data.length) throw new Error('Truncated varint');
    const b = data[cursor.i++];
    if (i === 9 && b > 1) throw new Error('Overflow varint');
    n |= BigInt(b & 127) << BigInt(i * 7);
    if (!(b & 128)) return n;
  }
  throw new Error('Overflow varint');
}
function safeNumber(n) {
  if (n > BigInt(Number.MAX_SAFE_INTEGER)) throw new Error('Unsafe integer');
  return Number(n);
}
export function fields(data) {
  if (!(data instanceof Uint8Array) || data.length > MAX_PACKET) throw new Error('Packet too large or invalid');
  const cursor = { i: 0 }, out = [];
  while (cursor.i < data.length) {
    if (out.length >= 100000) throw new Error('Too many fields');
    const tag = safeNumber(readVarint(data, cursor));
    const field = Math.floor(tag / 8), wire = tag % 8;
    if (!field || field > 0x1fffffff) throw new Error('Invalid field');
    let value;
    if (wire === 0) value = readVarint(data, cursor);
    else if (wire === 2 || wire === 1 || wire === 5) {
      const length = wire === 2 ? safeNumber(readVarint(data, cursor)) : wire === 1 ? 8 : 4;
      if (length > data.length - cursor.i) throw new Error('Truncated field');
      value = data.subarray(cursor.i, cursor.i + length); cursor.i += length;
    } else throw new Error('Unsupported wire type');
    out.push({ field, wire, value });
  }
  return out;
}
function only(data, allowed) {
  const parsed = fields(data);
  for (const item of parsed) {
    if (allowed[item.field] !== item.wire) throw new Error('Unsupported field or wire type');
  }
  return parsed;
}
function one(parsed, number) {
  const matches = parsed.filter(item => item.field === number);
  if (matches.length > 1) throw new Error('Duplicate singular field');
  return matches[0]?.value;
}
const number = (parsed, field, fallback = 0) => {
  const value = one(parsed, field); return value === undefined ? fallback : safeNumber(value);
};
export const CODECS = Object.freeze({ vp9: 6, h264: 10, h265: 11, vp8: 12, av1: 13 });
export function encodeVideo({ codec, data, key = true, pts = 0, display = 0 }) {
  if (!Object.hasOwn(CODECS, codec)) throw new Error('Unsupported codec');
  const frame = concat([bytes(1, data), uint(2, +key), uint(3, pts)]);
  return bytes(6, concat([bytes(CODECS[codec], bytes(1, frame)), uint(14, display)]));
}
export function encodeText(value) {
  if (!value || utf8.encode(value).length > 16384) throw new Error('Invalid text length');
  return bytes(15, concat([uint(2, 1), str(6, value), uint(9, 2)]));
}
export function encodeKey(controlKey, down, modifiers = []) {
  if (!Number.isInteger(controlKey) || controlKey < 1 || controlKey > 101) throw new Error('Invalid control key');
  return bytes(15, concat([uint(1, +down), uint(3, controlKey), ...modifiers.map(key => uint(8, key)), uint(9, 2)]));
}
function zigzag(n) {
  if (!Number.isInteger(n) || n < -0x80000000 || n > 0x7fffffff) throw new Error('Invalid coordinate');
  return (BigInt(n) << 1n) ^ (BigInt(n) >> 31n);
}
export function encodeMouse(mask, x, y) {
  if (!Number.isInteger(mask) || mask < 0 || mask > 0x7fffffff) throw new Error('Invalid mask');
  return bytes(10, concat([uint(1, mask), uint(2, zigzag(x)), uint(3, zigzag(y))]));
}
export function encodeClipboard(value) {
  if (utf8.encode(value).length > 1024 * 1024) throw new Error('Clipboard too large');
  return bytes(16, concat([uint(1, 0), str(2, value), uint(5, 0)]));
}
// Strict subset: no auth, Misc, arbitrary file actions, microphone or terminal pass-through.
export function decodeMessage(data) {
  const top = only(data, { 6: 2, 10: 2, 15: 2, 16: 2 });
  if (top.length !== 1) throw new Error('Expected exactly one supported message');
  const { field, value } = top[0];
  if (field === 6) {
    const video = only(value, { 6: 2, 10: 2, 11: 2, 12: 2, 13: 2, 14: 0 });
    const encoded = video.filter(item => item.field !== 14);
    if (encoded.length !== 1) throw new Error('Expected one video codec');
    const codec = Object.keys(CODECS).find(name => CODECS[name] === encoded[0].field);
    const batch = only(encoded[0].value, { 1: 2 });
    if (batch.length > 120) throw new Error('Too many video frames');
    return { type: 'video', codec, display: number(video, 14), frames: batch.map(item => {
      const frame = only(item.value, { 1: 2, 2: 0, 3: 0 });
      return { data: one(frame, 1) ?? new Uint8Array(), key: number(frame, 2) === 1, pts: number(frame, 3) };
    }) };
  }
  if (field === 10) {
    const mouse = only(value, { 1: 0, 2: 0, 3: 0, 4: 0 });
    const unzig = n => Number((n >> 1n) ^ -(n & 1n));
    return { type: 'mouse', mask: number(mouse, 1), x: unzig(one(mouse, 2) ?? 0n), y: unzig(one(mouse, 3) ?? 0n) };
  }
  if (field === 15) {
    const key = only(value, { 1: 0, 2: 0, 3: 0, 6: 2, 8: 0, 9: 0 });
    if (one(key, 3) !== undefined && one(key, 6) !== undefined) throw new Error('Conflicting key union');
    return { type: 'key', down: number(key, 1) === 1, press: number(key, 2) === 1,
      controlKey: number(key, 3), text: text.decode(one(key, 6) ?? new Uint8Array()), mode: number(key, 9) };
  }
  const clipboard = only(value, { 1: 0, 2: 2, 5: 0 });
  if (number(clipboard, 1) || number(clipboard, 5)) throw new Error('Only uncompressed text clipboard supported');
  return { type: 'clipboard', text: text.decode(one(clipboard, 2) ?? new Uint8Array()) };
}
// Classic TCP/KCP framing only. A WebSocket binary message has NO such prefix.
export function frameTcp(payload) {
  if (payload.length > MAX_PACKET) throw new Error('Packet too large');
  const n = payload.length;
  const size = n <= 0x3f ? 1 : n <= 0x3fff ? 2 : n <= 0x3fffff ? 3 : 4;
  let head = n * 4 + size - 1;
  const prefix = new Uint8Array(size);
  for (let i = 0; i < size; i++) { prefix[i] = head % 256; head = Math.floor(head / 256); }
  return concat([prefix, payload]);
}
export class TcpParser {
  constructor(limit = MAX_PACKET) {
    this.limit = limit; this.buffer = new Uint8Array(Math.min(4096, limit + 4)); this.start = 0; this.end = 0;
  }
  get pending() { return this.buffer.subarray(this.start, this.end); }
  push(part) {
    // Callers must bound individual read sizes. Total buffered allocation stays bounded.
    if (part.length > this.limit + 4 || this.pending.length + part.length > this.limit * 2 + 8) throw new Error('Read buffer too large');
    const needed = this.pending.length + part.length;
    if (needed > this.buffer.length) {
      const replacement = new Uint8Array(Math.max(needed, Math.min(this.buffer.length * 2, this.limit * 2 + 8)));
      replacement.set(this.pending); this.end -= this.start; this.start = 0; this.buffer = replacement;
    } else if (this.end + part.length > this.buffer.length) {
      this.buffer.copyWithin(0, this.start, this.end); this.end -= this.start; this.start = 0;
    }
    this.buffer.set(part, this.end); this.end += part.length;
    const buffer = this.buffer, out = [];
    let offset = this.start;
    while (offset < this.end) {
      const size = (buffer[offset] & 3) + 1;
      if (this.end - offset < size) break;
      let head = 0;
      for (let i = 0; i < size; i++) head += buffer[offset + i] * 2 ** (8 * i);
      const length = Math.floor(head / 4);
      if (length > this.limit) throw new Error('Packet too large');
      if (this.end - offset - size < length) break;
      out.push(buffer.slice(offset + size, offset + size + length)); offset += size + length;
    }
    this.start = offset;
    if (this.start === this.end) this.start = this.end = 0;
    return out;
  }
}
export function fragmentRtc(payload) {
  if (payload.length > MAX_PACKET) throw new Error('Packet too large');
  const out = [];
  for (let offset = 0; offset < payload.length || !out.length; offset += 60000) {
    const end = Math.min(offset + 60000, payload.length);
    out.push(concat([Uint8Array.of(end < payload.length ? 1 : 0), payload.subarray(offset, end)]));
  }
  return out;
}
export class RtcParser {
  constructor(limit = MAX_PACKET) { this.limit = limit; this.parts = []; this.size = 0; }
  push(fragment) {
    if (!fragment.length || fragment.length > 60001 || fragment[0] > 1) throw new Error('Invalid RTC fragment');
    this.size += fragment.length - 1;
    if (this.size > this.limit || this.parts.length > 1024) throw new Error('RTC packet too large');
    this.parts.push(fragment.slice(1));
    if (fragment[0] === 1) return null;
    const result = concat(this.parts); this.parts = []; this.size = 0; return result;
  }
}
