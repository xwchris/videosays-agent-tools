#!/usr/bin/env node

import { execFileSync } from 'node:child_process';
import { mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const source = readFileSync(join(root, 'skills/videosays/SKILL.md'), 'utf8');
const match = source.match(/^---\r?\n([\s\S]*?)\r?\n---\r?\n([\s\S]*)$/);
if (!match || !/^name: videosays$/m.test(match[1])) {
  throw new Error('Expected the canonical videosays skill and its YAML frontmatter');
}
const listing = JSON.parse(readFileSync(join(root, 'distribution/workbuddy.json'), 'utf8'));
const { version } = JSON.parse(readFileSync(join(root, 'distribution/skill-version.json'), 'utf8'));
if (!/^\d+\.\d+\.\d+$/.test(version)) {
  throw new Error('Expected a semantic version in distribution/skill-version.json');
}
for (const field of ['display_name', 'display_name_en', 'description_zh', 'description_en', 'author']) {
  if (typeof listing[field] !== 'string' || !listing[field].trim()) {
    throw new Error(`Missing WorkBuddy listing field: ${field}`);
  }
}

// WorkBuddy has its own top-level locale fields. Keep these out of the portable
// Agent Skills file, and reuse exactly the same execution instructions.
const fields = {
  name: 'videosays',
  ...listing,
  description: listing.description_zh,
  version,
};
const frontmatter = Object.entries(fields).map(([key, value]) => `${key}: ${JSON.stringify(value)}`).join('\n');
const output = join(root, 'dist/workbuddy/videosays');
mkdirSync(output, { recursive: true });
writeFileSync(join(output, 'SKILL.md'), `---\n${frontmatter}\n---\n${match[2]}`);
const archive = join(root, `dist/workbuddy/videosays-workbuddy-${version}.zip`);
rmSync(archive, { force: true });
execFileSync('zip', ['-X', '-q', archive, 'SKILL.md'], { cwd: output });
console.log(`WorkBuddy skill: ${output}`);
console.log(`Upload archive: ${archive}`);
