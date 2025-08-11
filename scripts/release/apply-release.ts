#!/usr/bin/env node

import fs from 'fs';
import path from 'path';
import computeNextVersion from './compute-next-version';

type Core = { setOutput: (k: string, v: string) => void } | undefined;

function readJSON<T = any>(p: string): T {
  return JSON.parse(fs.readFileSync(p, 'utf8')) as T;
}

function writeJSON(p: string, obj: unknown): void {
  fs.writeFileSync(p, `${JSON.stringify(obj, null, 2)}\n`);
}

function getTopSection(changelogContent: string): { level: string | null; body: string; start: number; end: number } {
  const h2Regex = /^##\s*\[(.+?)\]\s*$/m;
  const allLines = changelogContent.split(/\r?\n/);
  let topIdx = -1;
  for (let i = 0; i < allLines.length; i += 1) {
    if (h2Regex.test(allLines[i])) {
      topIdx = i;
      break;
    }
  }
  if (topIdx === -1) return { level: null, body: '', start: -1, end: -1 };

  const level = allLines[topIdx]
    .replace(/^##\s*\[/, '')
    .replace(/\]\s*$/, '')
    .trim()
    .toLowerCase();
  let endIdx = allLines.length;
  for (let i = topIdx + 1; i < allLines.length; i += 1) {
    if (/^##\s*\[.+?\]\s*$/.test(allLines[i])) {
      endIdx = i;
      break;
    }
  }
  const body = allLines.slice(topIdx + 1, endIdx).join('\n').trim();
  return { level, body, start: topIdx, end: endIdx };
}

export default async function applyRelease({ core }: { core?: Core } = {}): Promise<{ skip: boolean; version: string; notes: string }> {
  const root = process.cwd();
  const pkgPath = path.join(root, 'package.json');
  const changelogPath = path.join(root, 'CHANGELOG.md');
  if (!fs.existsSync(changelogPath)) throw new Error('CHANGELOG.md not found');

  const pkg = readJSON<{ version: string }>(pkgPath);
  const changelog = fs.readFileSync(changelogPath, 'utf8');

  const { level, body, start } = getTopSection(changelog);
  if (!level) throw new Error('Top H2 tag not found');
  if (!['patch', 'minor', 'major', 'none'].includes(level)) throw new Error('Top H2 tag must be one of patch|minor|major|none');
  if (body.trim().length === 0) throw new Error('Release notes section is empty');

  if (level === 'none') {
    const result = { skip: true, version: pkg.version, notes: body } as const;
    if (core) {
      core.setOutput('skip', String(result.skip));
      core.setOutput('version', result.version);
      core.setOutput('notes', result.notes);
    }
    return result;
  }

  const { next } = computeNextVersion();

  // Update package.json version
  const nextPkg = { ...pkg, version: next };
  writeJSON(pkgPath, nextPkg);

  // Rewrite top section heading to the new version number
  const lines = changelog.split(/\r?\n/);
  if (start >= 0) {
    lines[start] = `## [${next}]`;
  }
  fs.writeFileSync(changelogPath, `${lines.join('\n')}\n`);

  const result = { skip: false, version: next, notes: body } as const;
  if (core) {
    core.setOutput('skip', String(result.skip));
    core.setOutput('version', result.version);
    core.setOutput('notes', result.notes);
  }
  return result;
}

if (require.main === module) {
  applyRelease()
    .then((res) => {
      process.stdout.write(JSON.stringify(res));
    })
    .catch((err: any) => {
      console.error(err?.message ?? String(err));
      process.exit(1);
    });
}


