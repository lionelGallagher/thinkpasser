import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { TcpParser, RtcParser, frameTcp, fragmentRtc, concat, fields, decodeMessage, encodeText, encodeMouse } from '../protocol.mjs';
const read = name => readFileSync(new URL(name, import.meta.url));

test('pinned upstream evidence retains recorded hashes and expected protocol fields', () => {
  for (const entry of JSON.parse(read('../upstream/manifest.json'))) {
    assert.equal(createHash('sha256').update(read(`../upstream/${entry.file}`)).digest('hex'), entry.sha256, entry.file);
  }
  const schema = read('../upstream/message.proto').toString();
  for (const field of ['EncodedVideoFrames vp8s = 12;', 'VideoFrame video_frame = 6;', 'KeyEvent key_event = 15;', 'string seq = 6;', 'KeyboardMode mode = 9;', 'Text = 0;']) assert.ok(schema.includes(field), field);
});

test('classic TCP headers match published length layout at all boundaries', () => {
  for (const [length, expected] of [[0, '00'], [63, 'fc'], [64, '0101'], [16383, 'fdff'], [16384, '020001'], [4194303, 'feffff'], [4194304, '03000001']]) {
    const packet = frameTcp(new Uint8Array(length));
    assert.equal(Buffer.from(packet.subarray(0, expected.length / 2)).toString('hex'), expected);
    const parser = new TcpParser();
    assert.equal(parser.push(packet)[0].length, length);
  }
});

test('partial headers, fragmented payloads and coalesced packets do not lose bytes', () => {
  const wire = concat([frameTcp(Uint8Array.of(8, 1)), frameTcp(new Uint8Array(70000).fill(42)), frameTcp(new Uint8Array())]);
  const parser = new TcpParser(), messages = [];
  for (let offset = 0; offset < wire.length; offset += 13) messages.push(...parser.push(wire.subarray(offset, offset + 13)));
  assert.deepEqual(messages.map(value => value.length), [2, 70000, 0]);
  assert.equal(messages[1][69999], 42); assert.equal(parser.pending.length, 0);
  assert.throws(() => new TcpParser(100).push(Uint8Array.of(0xff, 0xff, 0xff, 0xff)), /too large/);
});

test('WebRTC uses per-SCTP-message 0/1 markers and a 60000-byte payload limit', () => {
  const payload = new Uint8Array(130001).map((_, index) => index % 251);
  const parts = fragmentRtc(payload), parser = new RtcParser();
  assert.deepEqual(parts.map(part => [part[0], part.length]), [[1, 60001], [1, 60001], [0, 10002]]);
  assert.equal(parser.push(parts[0]), null); assert.equal(parser.push(parts[1]), null);
  assert.deepEqual(parser.push(parts[2]), payload);
  assert.deepEqual(new RtcParser().push(fragmentRtc(new Uint8Array())[0]), new Uint8Array());
  assert.throws(() => new RtcParser().push(Uint8Array.of(2)), /Invalid/);
  const small = new RtcParser(1); assert.throws(() => small.push(Uint8Array.of(0, 1, 2)), /too large/);
});

test('fixed hand-audited UTF-8 key and negative mouse coordinate wire vectors', () => {
  // Message.key_event(field15) -> press=1, seq="中文", mode=Translate(2).
  const text = Buffer.from('7a0c10013206e4b8ade696874802', 'hex');
  assert.deepEqual(encodeText('中文'), new Uint8Array(text));
  assert.equal(decodeMessage(text).text, '中文');
  const mouse = Buffer.from('5206080910011804', 'hex');
  assert.deepEqual(encodeMouse(9, -1, 2), new Uint8Array(mouse));
  assert.deepEqual(decodeMessage(mouse), { type: 'mouse', mask: 9, x: -1, y: 2 });
});

test('independent Python-built protobuf fixture matches actual FFmpeg VP8 payload hashes', () => {
  const fixture = read('../fixtures/synthetic-video.rdtcp');
  const manifest = JSON.parse(read('../fixtures/manifest.json'));
  assert.equal(createHash('sha256').update(fixture).digest('hex'), manifest.fixture_sha256);
  const messages = new TcpParser().push(fixture);
  assert.equal(messages.length, 5);
  messages.forEach((message, index) => {
    const parsed = decodeMessage(message);
    assert.equal(parsed.codec, 'vp8'); assert.equal(parsed.display, 0);
    assert.equal(parsed.frames.length, 1);
    const frame = parsed.frames[0], expected = manifest.frames[index];
    assert.equal(frame.key, expected.key); assert.equal(frame.pts, expected.pts_ms);
    assert.equal(createHash('sha256').update(frame.data).digest('hex'), expected.sha256);
  });
});

test('malformed, ambiguous, excluded and compressed unsupported messages fail closed', () => {
  for (const hex of ['00', '3280', 'ffffffffffffffffffff02', '7a043201ff00', 'ba0100', 'fa0100', '82010408011000']) {
    assert.throws(() => decodeMessage(Buffer.from(hex, 'hex')), undefined, hex);
  }
  assert.throws(() => decodeMessage(concat([encodeText('a'), encodeText('b')])), /one supported/);
  assert.throws(() => fields(Uint8Array.of(10, 12, 1)), /Truncated/);
});
