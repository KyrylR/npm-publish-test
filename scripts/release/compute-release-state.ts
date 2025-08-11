import {execSync} from 'node:child_process';

import extractReleaseNotes from "./extract-release-notes";

import type {Core} from "./types";

export default async function computeReleaseState(core: Core) {
  const isReleaseCommit = /^chore\(release\):/m.test(execSync('git log -1 --pretty=%B', {encoding: 'utf8'}));

  const version = require('./package.json').version;
  const notes = extractReleaseNotes({version}) || '';

  core.setOutput('is_release_commit', String(isReleaseCommit));
  core.setOutput('local_version', version);
  core.setOutput('notes', notes);
}