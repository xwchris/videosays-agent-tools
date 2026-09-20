#!/usr/bin/env node

import { execFileSync } from 'node:child_process';
import { mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const source = readFileSync(join(root, 'skills/videosays/SKILL.md'), 'utf8');
const match = source.match(/^---\r?\n([\s\S]*?)\r?\n---\r?\n([\s\S]*)$/);
if (!match || !/^name: videosays$/m.test(match[1])) {
  throw new Error('Expected the canonical videosays skill');
}
const { description_zh: description } = JSON.parse(
  readFileSync(join(root, 'distribution/workbuddy.json'), 'utf8'),
);
if (typeof description !== 'string' || !description.trim()) {
  throw new Error('Missing Chinese listing description');
}
const { version } = JSON.parse(readFileSync(join(root, 'distribution/skill-version.json'), 'utf8'));
if (!/^\d+\.\d+\.\d+$/.test(version)) {
  throw new Error('Expected a semantic version in distribution/skill-version.json');
}
const output = join(root, 'dist/china/videosays');
mkdirSync(output, { recursive: true });
// Only localize the standard description. Stable name and execution body stay
// unchanged; platform-specific display_name fields are not portable.
writeFileSync(join(output, 'SKILL.md'), `---\nname: videosays\ndescription: ${JSON.stringify(description)}\n---\n${match[2]}`);
const archive = join(root, `dist/china/videosays-cn-${version}.zip`);
rmSync(archive, { force: true });
execFileSync('zip', ['-X', '-q', archive, 'SKILL.md'], { cwd: output });
console.log(`Chinese-description skill: ${output}`);
console.log(`Upload archive: ${archive}`);
