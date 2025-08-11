#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

function fail(message) {
  throw new Error(message);
}

function readJSON(p) {
  return JSON.parse(fs.readFileSync(p, 'utf8'));
}

function writeJSON(p, obj) {
  fs.writeFileSync(p, `${JSON.stringify(obj, null, 2)}\n`);
}

function getTopSection(changelogContent) {
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

async function applyRelease({ core } = {}) {
  const root = process.cwd();
  const pkgPath = path.join(root, 'package.json');
  const changelogPath = path.join(root, 'CHANGELOG.md');
  if (!fs.existsSync(changelogPath)) fail('CHANGELOG.md not found');

  const pkg = readJSON(pkgPath);
  const changelog = fs.readFileSync(changelogPath, 'utf8');

  const { level, body, start } = getTopSection(changelog);
  if (!level) fail('Top H2 tag not found');
  if (!['patch', 'minor', 'major', 'none'].includes(level)) fail('Top H2 tag must be one of patch|minor|major|none');
  if (body.trim().length === 0) fail('Release notes section is empty');

  if (level === 'none') {
    const result = { skip: true, version: pkg.version, notes: body };
    if (core) {
      core.setOutput('skip', String(result.skip));
      core.setOutput('version', result.version);
      core.setOutput('notes', result.notes);
    }
    return result;
  }

  const { next } = JSON.parse(
    require('child_process').execSync('node scripts/release/compute-next-version.js', { encoding: 'utf8' })
  );

  // Update package.json version
  pkg.version = next;
  writeJSON(pkgPath, pkg);

  // Rewrite top section heading to the new version number
  const lines = changelog.split(/\r?\n/);
  if (start >= 0) {
    lines[start] = `## [${next}]`;
  }
  fs.writeFileSync(changelogPath, `${lines.join('\n')}\n`);

  const result = { skip: false, version: next, notes: body };
  if (core) {
    core.setOutput('skip', String(result.skip));
    core.setOutput('version', result.version);
    core.setOutput('notes', result.notes);
  }
  return result;
}

module.exports = applyRelease;

if (require.main === module) {
  applyRelease()
    .then((res) => {
      process.stdout.write(JSON.stringify(res));
    })
    .catch((err) => {
      console.error(err.message || String(err));
      process.exit(1);
    });
}


