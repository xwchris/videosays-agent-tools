#!/usr/bin/env node

import { execFileSync } from 'node:child_process';
import { readFileSync, writeFileSync } from 'node:fs';

const packagePath = 'packages/cli/package.json';
const bump = process.argv[2];

function run(command, args, options = {}) {
  return execFileSync(command, args, {
    encoding: 'utf8',
    stdio: options.capture ? 'pipe' : 'inherit',
    ...options,
  })?.trim();
}

function fail(message) {
  console.error(`Release aborted: ${message}`);
  process.exit(1);
}

function nextVersion(currentVersion, requestedBump) {
  if (/^\d+\.\d+\.\d+$/.test(requestedBump ?? '')) {
    return requestedBump;
  }

  if (!['patch', 'minor', 'major'].includes(requestedBump)) {
    fail('use patch, minor, major, or an exact x.y.z version');
  }

  const parts = currentVersion.split('.').map(Number);
  if (requestedBump === 'patch') parts[2] += 1;
  if (requestedBump === 'minor') {
    parts[1] += 1;
    parts[2] = 0;
  }
  if (requestedBump === 'major') {
    parts[0] += 1;
    parts[1] = 0;
    parts[2] = 0;
  }
  return parts.join('.');
}

const branch = run('git', ['branch', '--show-current'], { capture: true });
if (branch !== 'main') fail('switch to the main branch first');

const trackedChanges = run(
  'git',
  ['status', '--porcelain', '--untracked-files=no'],
  { capture: true },
);
if (trackedChanges) fail('commit or discard tracked changes first');

run('git', ['fetch', 'origin', 'main']);
const localHead = run('git', ['rev-parse', 'HEAD'], { capture: true });
const remoteHead = run('git', ['rev-parse', 'origin/main'], { capture: true });
if (localHead !== remoteHead) fail('main must exactly match origin/main');

const packageJson = JSON.parse(readFileSync(packagePath, 'utf8'));
const version = nextVersion(packageJson.version, bump);
const tag = `v${version}`;

const tagExists = run(
  'git',
  ['tag', '--list', tag],
  { capture: true },
);
const remoteTagExists = run(
  'git',
  ['ls-remote', '--tags', 'origin', `refs/tags/${tag}`],
  { capture: true },
);
if (tagExists || remoteTagExists) fail(`tag ${tag} already exists`);

run('npm', ['test']);

packageJson.version = version;
writeFileSync(packagePath, `${JSON.stringify(packageJson, null, 2)}\n`);

try {
  run('npm', ['test']);
  run('npm', ['pack', '--dry-run', '--workspace', 'videosays']);
  run('git', ['add', packagePath]);
  run('git', ['commit', '-m', `Release videosays ${tag}`]);
  run('git', ['tag', '-a', tag, '-m', `Release videosays ${tag}`]);
  run('git', ['push', '--atomic', 'origin', 'main', tag]);
} catch (error) {
  fail(error instanceof Error ? error.message : String(error));
}

console.log(`Released ${tag}; GitHub Actions will publish it to npm.`);
