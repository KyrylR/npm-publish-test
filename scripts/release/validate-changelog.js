#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

function fail(message) {
  console.error(`CHANGELOG validation failed: ${message}`);
  process.exit(1);
}

function main() {
  const changelogPath = path.resolve(process.cwd(), 'CHANGELOG.md');
  if (!fs.existsSync(changelogPath)) {
    fail('CHANGELOG.md not found at repository root');
  }

  const content = fs.readFileSync(changelogPath, 'utf8');
  const lines = content.split(/\r?\n/);

  // Find first H2 (## [xxx])
  const h2Regex = /^##\s*\[(.+?)\]\s*$/;
  let firstH2Index = -1;
  let firstH2Tag = '';
  for (let i = 0; i < lines.length; i += 1) {
    const m = lines[i].match(h2Regex);
    if (m) {
      firstH2Index = i;
      firstH2Tag = m[1].trim();
      break;
    }
  }

  if (firstH2Index === -1) {
    fail('No H2 heading like "## [patch|minor|major|none]" found');
  }

  const allowed = new Set(['patch', 'minor', 'major', 'none']);
  const normalized = firstH2Tag.toLowerCase();
  if (!allowed.has(normalized)) {
    fail(`Top H2 tag must be one of [patch, minor, major, none], got "${firstH2Tag}"`);
  }

  // Extract section content until next H2
  let nextH2Index = lines.length;
  for (let i = firstH2Index + 1; i < lines.length; i += 1) {
    if (h2Regex.test(lines[i])) {
      nextH2Index = i;
      break;
    }
  }

  const section = lines.slice(firstH2Index + 1, nextH2Index).join('\n').trim();
  if (section.length === 0) {
    fail('Top section content is empty');
  }

  // Basic structure: must have a top-level title `# Changelog` somewhere
  const hasTitle = /^#\s+Changelog\b/i.test(content);
  if (!hasTitle) {
    fail('Missing top-level "# Changelog" title');
  }

  console.log('CHANGELOG.md validation passed');
}

main();


