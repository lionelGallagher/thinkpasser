const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');

test('published HTML requests the exact current CSS and JavaScript versions', () => {
  const root = path.join(__dirname, '..');
  const html = fs.readFileSync(path.join(root, 'index.html'), 'utf8');
  const refs = [...html.matchAll(/(?:src|href)="(assets\/[^"?]+\.(?:css|js))(?:\?v=([^"&]+))?"/g)];
  assert.ok(refs.length >= 4);
  for (const [, file, version] of refs) {
    const expected = crypto.createHash('sha256').update(fs.readFileSync(path.join(root, file), 'utf8').replace(/\r\n/g, '\n')).digest('hex').slice(0, 12);
    assert.equal(version, expected, `${file} is missing its current content version`);
  }
});
