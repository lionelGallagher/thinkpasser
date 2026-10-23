const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');
const root = path.join(__dirname, '..');
const index = path.join(root, 'index.html');
const html = fs.readFileSync(index, 'utf8').replace(/((?:src|href)=")(assets\/[^"?]+\.(?:css|js))(?:\?v=[^"&]+)?(")/g, (_, prefix, file, suffix) => {
  const version = crypto.createHash('sha256').update(fs.readFileSync(path.join(root, file), 'utf8').replace(/\r\n/g, '\n')).digest('hex').slice(0, 12);
  return `${prefix}${file}?v=${version}${suffix}`;
});
fs.writeFileSync(index, html);
console.log('Updated CSS and JavaScript content versions.');
