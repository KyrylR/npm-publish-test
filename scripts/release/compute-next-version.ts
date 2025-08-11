#!/usr/bin/env node

import fs from 'fs';
import path from 'path';

type Level = 'major' | 'minor' | 'patch' | 'none';

function readJSON<T = any>(p: string): T {
  return JSON.parse(fs.readFileSync(p, 'utf8')) as T;
}

function bump(version: string, level: Level): string {
  const [majorStr, minorStr, patchStr] = version.split('.');
  const major = parseInt(majorStr, 10);
  const minor = parseInt(minorStr, 10);
  const patch = parseInt(patchStr, 10);
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
  }
}

export default function computeNextVersion(): { current: string; level: Level; next: string } {
  const pkgPath = path.resolve(process.cwd(), 'package.json');
  const changelogPath = path.resolve(process.cwd(), 'CHANGELOG.md');
  const pkg = readJSON<{ version: string }>(pkgPath);
  if (!fs.existsSync(changelogPath)) {
    throw new Error('CHANGELOG.md not found');
  }
  const changelog = fs.readFileSync(changelogPath, 'utf8');
  const match = changelog.match(/^##\s*\[(.+?)\]\s*$/m);
  if (!match) {
    throw new Error('Could not find top H2 tag in CHANGELOG.md');
  }
  const level = match[1].trim().toLowerCase() as Level;
  const allowed = new Set<Level>(['patch', 'minor', 'major', 'none']);
  if (!allowed.has(level)) {
    throw new Error(`Invalid top H2 tag: ${level}`);
  }
  const next = bump(pkg.version, level);
  return { current: pkg.version, level, next };
}

if (require.main === module) {
  try {
    const res = computeNextVersion();
    process.stdout.write(JSON.stringify(res));
  } catch (err: any) {
    console.error(err?.message ?? String(err));
    process.exit(1);
  }
}


