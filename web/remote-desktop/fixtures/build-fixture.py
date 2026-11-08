"""Build immutable synthetic fixtures from FFmpeg IVF; no screen/audio capture."""
from pathlib import Path
import hashlib
import json
import struct

ROOT = Path(__file__).resolve().parent

def vint(value):
    result = bytearray()
    while value > 127:
        result.append((value & 127) | 128)
        value >>= 7
    result.append(value)
    return bytes(result)

def field(number, data):
    return vint(number * 8 + 2) + vint(len(data)) + data

def integer(number, value):
    return vint(number * 8) + vint(value)

source = (ROOT / 'synthetic-vp8.ivf').read_bytes()
assert source[:4] == b'DKIF' and source[8:12] == b'VP80'
rate, scale = struct.unpack_from('<II', source, 16)
offset, packets, frames = 32, bytearray(), []
while offset < len(source):
    size, timestamp = struct.unpack_from('<IQ', source, offset)
    offset += 12
    frame = source[offset:offset+size]
    assert len(frame) == size
    offset += size
    pts = round(timestamp * scale * 1000 / rate)
    key = not (frame[0] & 1)
    encoded = field(1, frame) + integer(2, int(key)) + integer(3, pts)
    packet = field(6, field(12, field(1, encoded)) + integer(14, 0))
    length = len(packet)
    prefix_len = 1 if length <= 0x3f else 2 if length <= 0x3fff else 3 if length <= 0x3fffff else 4
    packets.extend((length * 4 + prefix_len - 1).to_bytes(prefix_len, 'little'))
    packets.extend(packet)
    frames.append({'pts_ms': pts, 'key': key, 'bytes': size, 'sha256': hashlib.sha256(frame).hexdigest()})
(ROOT / 'synthetic-video.rdtcp').write_bytes(packets)
(ROOT / 'manifest.json').write_text(json.dumps({
    'source': 'FFmpeg lavfi testsrc2; synthetic, not a real desktop',
    'command': 'ffmpeg -f lavfi -i testsrc2=size=640x360:rate=5:duration=1 -c:v libvpx -g 5 -f ivf synthetic-vp8.ivf',
    'rustdesk_client_commit': '23e5bb471a040d62f0a6ad52591fb30784265b73',
    'fixture_sha256': hashlib.sha256(packets).hexdigest(), 'frames': frames,
}, indent=2) + '\n', encoding='utf-8')
print(f'Created {len(frames)} synthetic frames, {len(packets)} bytes')
