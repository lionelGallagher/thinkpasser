import { TcpParser, RtcParser, fragmentRtc, decodeMessage, encodeMouse, encodeText, encodeKey, encodeClipboard } from '/protocol.mjs';
const el = id => document.getElementById(id);
const canvas = el('screen'), context = canvas.getContext('2d');
const metrics = { source: 'ffmpeg-synthetic-only', realRemote: false, decoded: 0, receivedInputs: 0, text: '', clipboard: '', errors: [], open: false };
window.fixtureMetrics = metrics;
let left, right, sender, receiver, decoder, timer;
function status() { el('status').textContent = JSON.stringify(metrics, null, 2); }
function fail(error) { metrics.errors.push(String(error)); status(); }
function send(channel, bytes) {
  if (channel?.readyState !== 'open') throw new Error('Data channel is closed');
  if (channel.bufferedAmount > 2 * 1024 * 1024) throw new Error('Backpressure limit reached');
  for (const fragment of fragmentRtc(bytes)) channel.send(fragment);
}
async function start() {
  if (!window.VideoDecoder || !window.RTCPeerConnection) throw new Error('本浏览器缺少 WebCodecs 或 WebRTC');
  const support = await VideoDecoder.isConfigSupported({ codec: 'vp8', codedWidth: 640, codedHeight: 360 });
  if (!support.supported) throw new Error('本浏览器不支持 VP8 WebCodecs 解码');
  el('start').disabled = true;
  left = new RTCPeerConnection({ iceServers: [] }); right = new RTCPeerConnection({ iceServers: [] });
  left.onicecandidate = event => { if (event.candidate) right.addIceCandidate(event.candidate).catch(fail); };
  right.onicecandidate = event => { if (event.candidate) left.addIceCandidate(event.candidate).catch(fail); };
  const gotChannel = new Promise(resolve => { right.ondatachannel = event => resolve(event.channel); });
  sender = left.createDataChannel('synthetic-rustdesk', { ordered: true }); sender.binaryType = 'arraybuffer';
  await left.setLocalDescription(await left.createOffer()); await right.setRemoteDescription(left.localDescription);
  await right.setLocalDescription(await right.createAnswer()); await left.setRemoteDescription(right.localDescription);
  receiver = await gotChannel; receiver.binaryType = 'arraybuffer';
  const waitOpen = channel => channel.readyState === 'open' ? Promise.resolve() : new Promise((resolve, reject) => {
    const timeout = setTimeout(() => reject(new Error('Local ICE timeout')), 10000);
    channel.onopen = () => { clearTimeout(timeout); resolve(); };
  });
  await Promise.all([waitOpen(sender), waitOpen(receiver)]);
  decoder = new VideoDecoder({ output(frame) {
    context.drawImage(frame, 0, 0); frame.close(); metrics.decoded++; status();
  }, error: fail });
  decoder.configure(support.config);
  const incomingVideo = new RtcParser(), incomingInput = new RtcParser();
  sender.onmessage = event => {
    try {
      const payload = incomingVideo.push(new Uint8Array(event.data));
      if (!payload) return;
      const message = decodeMessage(payload);
      if (message.type !== 'video' || message.codec !== 'vp8') throw new Error('Unexpected fixture media');
      if (decoder.decodeQueueSize > 10) return;
      for (const frame of message.frames) decoder.decode(new EncodedVideoChunk({ type: frame.key ? 'key' : 'delta', timestamp: frame.pts * 1000, data: frame.data }));
    } catch (error) { fail(error); }
  };
  receiver.onmessage = event => {
    try {
      const payload = incomingInput.push(new Uint8Array(event.data));
      if (!payload) return;
      const message = decodeMessage(payload); metrics.receivedInputs++;
      if (message.type === 'key' && message.text) metrics.text += message.text;
      if (message.type === 'clipboard') metrics.clipboard = message.text;
      metrics.lastInput = { ...message }; status();
    } catch (error) { fail(error); }
  };
  const response = await fetch('/fixtures/synthetic-video.rdtcp');
  if (!response.ok) throw new Error('Video fixture unavailable');
  const source = new Uint8Array(await response.arrayBuffer());
  // Exercise streaming partial reads, rather than handing the parser one complete buffer.
  const parser = new TcpParser(), messages = [];
  for (let i = 0; i < source.length; i += 37) messages.push(...parser.push(source.subarray(i, i + 37)));
  if (!messages.length || parser.pending.length) throw new Error('Incomplete video fixture');
  let index = 0;
  timer = setInterval(() => {
    try { send(receiver, messages[index++ % messages.length]); } catch (error) { fail(error); stop(); }
  }, 200);
  metrics.open = true;
  for (const id of ['stop', 'text', 'send', 'clipboard', 'copy']) el(id).disabled = false;
  status();
}
function stop() {
  clearInterval(timer); sender?.close(); receiver?.close(); left?.close(); right?.close();
  if (decoder && decoder.state !== 'closed') decoder.close();
  metrics.open = false; el('start').disabled = false;
  for (const id of ['stop', 'text', 'send', 'clipboard', 'copy']) el(id).disabled = true;
  status();
}
el('start').onclick = () => start().catch(error => { fail(error); stop(); });
el('stop').onclick = stop;
function input(bytes) { if (metrics.open) { try { send(sender, bytes); } catch (error) { fail(error); } } }
function sendText() { const value = el('text').value; if (value) { input(encodeText(value)); el('text').value = ''; } }
el('send').onclick = sendText;
el('text').oncompositionend = sendText;
el('text').onkeydown = event => { if (event.key === 'Enter' && !event.isComposing) sendText(); };
el('copy').onclick = () => input(encodeClipboard(el('clipboard').value));
canvas.onpointerdown = event => {
  canvas.focus();
  const box = canvas.getBoundingClientRect();
  const x = Math.round((event.clientX - box.left) * canvas.width / box.width);
  const y = Math.round((event.clientY - box.top) * canvas.height / box.height);
  input(encodeMouse(9, x, y)); input(encodeMouse(10, x, y));
};
const controlKeys = { Alt: 1, Backspace: 2, CapsLock: 3, Control: 4, Delete: 5, ArrowDown: 6, End: 7,
  Escape: 8, Home: 21, ArrowLeft: 22, Meta: 23, PageDown: 25, PageUp: 26, Enter: 27, ArrowRight: 28, Shift: 29, Tab: 31, ArrowUp: 32 };
for (const kind of ['keydown', 'keyup']) canvas.addEventListener(kind, event => {
  if (!metrics.open || event.isComposing) return;
  if (controlKeys[event.key]) {
    event.preventDefault(); input(encodeKey(controlKeys[event.key], kind === 'keydown', [event.ctrlKey && 4, event.altKey && 1, event.shiftKey && 29, event.metaKey && 23].filter(Boolean)));
  } else if (kind === 'keydown' && !event.ctrlKey && !event.metaKey && event.key.length === 1) {
    event.preventDefault(); input(encodeText(event.key));
  }
});
window.addEventListener('pagehide', stop);
