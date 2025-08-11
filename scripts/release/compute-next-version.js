#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

function readJSON(p) {
  return JSON.parse(fs.readFileSync(p, 'utf8'));
}

function bump(version, level) {
  const [major, minor, patch] = version.split('.').map((n) => parseInt(n, 10));
  if (Number.isNaN(major) || Number.isNaN(minor) || Number.isNaN(patch)) {
    throw new Error(`Invalid semver in package.json: ${version}`);
  }
  switch (level) {
    case 'major':
      return `${major + 1}.0.0`;
    case 'minor':
      return `${major}.${minor + 1}.0`;
    case 'patch':
      return `${major}.${minor}.${patch + 1}`;
    case 'none':
      return version;
    default:
      throw new Error(`Unknown bump level: ${level}`);
  }
}

function main() {
  const pkgPath = path.resolve(process.cwd(), 'package.json');
  const changelogPath = path.resolve(process.cwd(), 'CHANGELOG.md');
  const pkg = readJSON(pkgPath);
  if (!fs.existsSync(changelogPath)) {
    throw new Error('CHANGELOG.md not found');
  }
  const changelog = fs.readFileSync(changelogPath, 'utf8');
  const match = changelog.match(/^##\s*\[(.+?)\]\s*$/m);
  if (!match) {
    throw new Error('Could not find top H2 tag in CHANGELOG.md');
  }
  const level = match[1].trim().toLowerCase();
  const allowed = new Set(['patch', 'minor', 'major', 'none']);
  if (!allowed.has(level)) {
    throw new Error(`Invalid top H2 tag: ${level}`);
  }
  const next = bump(pkg.version, level);
  process.stdout.write(JSON.stringify({ current: pkg.version, level, next }));
}

main();


