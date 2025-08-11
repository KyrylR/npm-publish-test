#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

function main() {
  const changelogPath = path.resolve(process.cwd(), 'CHANGELOG.md');
  if (!fs.existsSync(changelogPath)) {
    process.stdout.write('');
    return;
  }
  const changelog = fs.readFileSync(changelogPath, 'utf8');

  // Find section matching current package version number
  const pkg = JSON.parse(fs.readFileSync(path.resolve(process.cwd(), 'package.json'), 'utf8'));
  const version = pkg.version;
  const escapedVersion = version.replace(/\./g, '\\.');
  const header = new RegExp(`^##\\s*\\[${escapedVersion}\\]\\s*$`, 'm');

  const lines = changelog.split(/\r?\n/);
  let start = -1;
  for (let i = 0; i < lines.length; i += 1) {
    if (header.test(lines[i])) { start = i; break; }
  }
  if (start === -1) {
    process.stdout.write('');
    return;
  }
  let end = lines.length;
  const h2 = /^##\s*\[.+?\]\s*$/;
  for (let i = start + 1; i < lines.length; i += 1) {
    if (h2.test(lines[i])) { end = i; break; }
  }
  const body = lines.slice(start + 1, end).join('\n').trim();
  process.stdout.write(body);
}

main();


