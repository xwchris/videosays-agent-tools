import assert from 'node:assert/strict';
import { after, before, test } from 'node:test';
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { spawn } from 'node:child_process';
import http from 'node:http';

const root = resolve(import.meta.dirname, '../../..');
const cli = join(root, 'packages/cli/bin/videosays.js');
const home = mkdtempSync(join(tmpdir(), 'videosays-cli-test-'));
const links = join(home, 'links.txt');
let server;
let apiUrl;
let postCount = 0;
let getCount = 0;

before(async () => {
  writeFileSync(links, 'https://v.douyin.com/one/\nhttps://v.douyin.com/two/\n', 'utf-8');
  server = http.createServer((request, response) => {
    response.setHeader('Content-Type', 'application/json');
    if (request.method === 'POST' && request.url === '/api/v1/batches') {
      postCount += 1;
      assert.equal(request.headers['idempotency-key'], 'batch:test-batch');
      response.statusCode = 202;
      response.end(JSON.stringify({
        batchId: 'server-batch',
        status: 'processing',
        summary: { total: 2, completed: 0 },
        retryAfterSeconds: 1,
      }));
      return;
    }
    if (request.method === 'GET' && request.url === '/api/v1/batches/server-batch') {
      getCount += 1;
      response.end(JSON.stringify({
        batchId: 'server-batch',
        status: 'completed',
        summary: { total: 2, completed: 2 },
        items: [],
      }));
      return;
    }
    response.statusCode = 404;
    response.end(JSON.stringify({ error: 'not found' }));
  });
  await new Promise((resolvePromise) => server.listen(0, '127.0.0.1', resolvePromise));
  apiUrl = `http://127.0.0.1:${server.address().port}`;
});

after(async () => {
  await new Promise((resolvePromise) => server.close(resolvePromise));
  rmSync(home, { recursive: true, force: true });
});

function run(args) {
  return new Promise((resolvePromise) => {
    const child = spawn(process.execPath, [cli, ...args], {
    env: {
      ...process.env,
      HOME: home,
      VIDEOSAYS_API_URL: apiUrl,
      VIDEOSAYS_API_KEY: 'test-key',
      NO_COLOR: '1',
    },
    });
    let stdout = '';
    let stderr = '';
    child.stdout.on('data', (chunk) => { stdout += chunk; });
    child.stderr.on('data', (chunk) => { stderr += chunk; });
    child.on('close', (status) => resolvePromise({ status, stdout, stderr }));
  });
}

test('batch interruption persists state and resume never resubmits', async () => {
  const first = await run(['batch', links, '--batch-id', 'test-batch', '--timeout', '0.01']);
  assert.equal(first.status, 0, first.stderr);
  assert.match(first.stdout, /"next": "videosays batch resume test-batch"/);
  const job = JSON.parse(readFileSync(join(home, '.videosays-data/jobs/test-batch.json'), 'utf-8'));
  assert.equal(job.serverBatchId, 'server-batch');
  assert.equal(postCount, 1);

  const resumed = await run(['batch', 'resume', 'test-batch', '--timeout', '1']);
  assert.equal(resumed.status, 0, resumed.stderr);
  assert.match(resumed.stdout, /"status": "completed"/);
  assert.equal(postCount, 1);
  assert.equal(getCount, 1);
});
