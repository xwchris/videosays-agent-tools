#!/usr/bin/env node

import { execFileSync } from 'node:child_process';
import { cpSync, mkdirSync, mkdtempSync, readFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const source = join(root, 'skills/videosays/SKILL.md');
const { version } = JSON.parse(readFileSync(join(root, 'distribution/skill-version.json'), 'utf8'));
if (!/^\d+\.\d+\.\d+$/.test(version)) {
  throw new Error('Expected a semantic version in distribution/skill-version.json');
}

const output = join(root, `dist/releases/videosays-skill-${version}.zip`);
const staging = mkdtempSync(join(tmpdir(), 'videosays-skill-'));
try {
  mkdirSync(dirname(output), { recursive: true });
  cpSync(source, join(staging, 'SKILL.md'));
  rmSync(output, { force: true });
  execFileSync('zip', ['-X', '-q', output, 'SKILL.md'], { cwd: staging });
} finally {
  rmSync(staging, { recursive: true, force: true });
}

console.log(`Portable skill archive: ${output}`);
