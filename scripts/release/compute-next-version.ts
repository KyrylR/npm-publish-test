#!/usr/bin/env node

import fs from 'fs';
import path from 'path';

type Level = 'major' | 'minor' | 'patch' | 'none' | 'major-rc' | 'minor-rc' | 'patch-rc' | 'rc' | 'release';

function readJSON<T = any>(p: string): T {
  return JSON.parse(fs.readFileSync(p, 'utf8')) as T;
}

function bumpBase(version: string, level: 'major' | 'minor' | 'patch' | 'none'): string {
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

function parseRc(version: string): { base: string; rc: number | null } {
  const m = version.match(/^(\d+)\.(\d+)\.(\d+)(?:-rc\.(\d+))?$/);
  if (!m) throw new Error(`Invalid semver in package.json: ${version}`);
  const base = `${m[1]}.${m[2]}.${m[3]}`;
  const rc = m[4] ? parseInt(m[4], 10) : null;
  return { base, rc };
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

  const { base, rc } = parseRc(pkg.version);
  const isRc = rc !== null;

  const allowedWhenNotRc: Set<Level> = new Set(['patch', 'minor', 'major', 'none', 'patch-rc', 'minor-rc', 'major-rc']);
  const allowedWhenRc: Set<Level> = new Set(['rc', 'release', 'none']);
  if ((isRc && !allowedWhenRc.has(level)) || (!isRc && !allowedWhenNotRc.has(level))) {
    throw new Error(`Invalid top H2 tag: ${level} for current version ${pkg.version}`);
  }

  let next: string;
  if (!isRc) {
    switch (level) {
      case 'none':
        next = base;
        break;
      case 'major':
      case 'minor':
      case 'patch':
        next = bumpBase(base, level);
        break;
      case 'major-rc':
        next = `${bumpBase(base, 'major')}-rc.0`;
        break;
      case 'minor-rc':
        next = `${bumpBase(base, 'minor')}-rc.0`;
        break;
      case 'patch-rc':
        next = `${bumpBase(base, 'patch')}-rc.0`;
        break;
      case 'rc':
      case 'release':
        throw new Error(`Tag ${level} is only valid when current version is an RC`);
    }
  } else {
    switch (level) {
      case 'rc':
        next = `${base}-rc.${rc + 1}`;
        break;
      case 'release':
        next = base;
        break;
      case 'none':
        next = `${base}-rc.${rc}`;
        break;
      default:
        throw new Error(`Tag ${level} is not valid while in RC`);
    }
  }
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


