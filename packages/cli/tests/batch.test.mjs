import assert from 'node:assert/strict';
import { after, before, test } from 'node:test';
import { mkdtempSync, rmSync, writeFileSync } from 'node:fs';
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
let statusGetCount = 0;
let fullGetCount = 0;
let continueCount = 0;
const duplicatePolicies = [];

before(async () => {
  writeFileSync(links, 'https://v.douyin.com/one/\nhttps://v.douyin.com/two/\nhttps://v.douyin.com/one/\n', 'utf-8');
  server = http.createServer((request, response) => {
    response.setHeader('Content-Type', 'application/json');
    if (request.method === 'POST' && request.url === '/api/v1/batches') {
      postCount += 1;
      assert.match(request.headers['idempotency-key'], /^[0-9a-f-]{36}$/i);
      let raw = '';
      request.on('data', (chunk) => { raw += chunk; });
      request.on('end', () => {
        const body = JSON.parse(raw);
        assert.equal(body.clientBatchId, undefined);
        assert.deepEqual(body.items, [
          'https://v.douyin.com/one/',
          'https://v.douyin.com/two/',
          'https://v.douyin.com/one/',
        ]);
        duplicatePolicies.push(body.options.duplicatePolicy);
        response.statusCode = 202;
        response.end(JSON.stringify({
          batchId: 'server-batch',
          status: 'pending',
          summary: { total: 3, waiting: 3, completed: 0 },
          retryAfterSeconds: 1,
        }));
      });
      return;
    }
    if (request.method === 'GET' && request.url === '/api/v1/batches/server-batch?view=status') {
      statusGetCount += 1;
      response.end(JSON.stringify({
        batchId: 'server-batch',
        status: 'completed',
        summary: { total: 3, completed: 3 },
        items: [],
      }));
      return;
    }
    if (request.method === 'GET' && request.url === '/api/v1/batches/server-batch') {
      fullGetCount += 1;
      response.end(JSON.stringify({
        batchId: 'server-batch',
        status: 'completed',
        summary: { total: 3, completed: 3 },
        items: [{ taskId: 'task-1', task: { result: { text: 'done' } } }],
      }));
      return;
    }
    if (request.method === 'GET' && request.url === '/api/v1/batches/credit-batch?view=status') {
      statusGetCount += 1;
      response.end(JSON.stringify({
        batchId: 'credit-batch',
        status: 'partial',
        stopReason: 'insufficient_credits',
        continuation: { required: true, reason: 'insufficient_credits', resumableItems: 2 },
        summary: { total: 3, completed: 1, failed: 1, skipped: 1 },
        items: [],
      }));
      return;
    }
    if (request.method === 'POST' && request.url === '/api/v1/batches/server-batch/continue?view=status') {
      continueCount += 1;
      response.end(JSON.stringify({
        batchId: 'server-batch',
        status: 'processing',
        resumedItems: 1,
        summary: { total: 3, completed: 1, waiting: 2 },
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

test('batch submission returns the server batch id immediately', async () => {
  const first = await run(['batch', links]);
  assert.equal(first.status, 0, first.stderr);
  assert.match(first.stdout, /"batchId": "server-batch"/);
  assert.match(first.stdout, /"next": "videosays batch status server-batch"/);
  assert.equal(postCount, 1);
  assert.equal(statusGetCount, 0);
  assert.equal(fullGetCount, 0);
  assert.equal(duplicatePolicies[0], 'reuse');
});

test('batch status polls lightly and loads full results once after completion', async () => {
  const status = await run(['batch', 'status', 'server-batch']);
  assert.equal(status.status, 0, status.stderr);
  assert.match(status.stdout, /"status": "completed"/);
  assert.match(status.stdout, /"text": "done"/);
  assert.equal(statusGetCount, 1);
  assert.equal(fullGetCount, 1);
});

test('batch status exposes a resumable pause without loading full results', async () => {
  const status = await run(['batch', 'status', 'credit-batch']);
  assert.equal(status.status, 0, status.stderr);
  assert.match(status.stdout, /"status": "paused"/);
  assert.match(status.stdout, /"next": "videosays batch continue credit-batch"/);
  assert.match(status.stdout, /"rechargeUrl":/);
  assert.equal(statusGetCount, 2);
  assert.equal(fullGetCount, 1);
});

test('batch continue resumes once and returns without polling', async () => {
  const continued = await run(['batch', 'continue', 'server-batch']);
  assert.equal(continued.status, 0, continued.stderr);
  assert.match(continued.stdout, /"next": "videosays batch status server-batch"/);
  assert.equal(continueCount, 1);
  assert.equal(statusGetCount, 2);
  assert.equal(fullGetCount, 1);
});

test('batch wait remains an explicit opt-in', async () => {
  const previousPostCount = postCount;
  const waited = await run(['batch', links, '--wait', '--timeout', '3']);
  assert.equal(waited.status, 0, waited.stderr);
  assert.match(waited.stdout, /"status": "completed"/);
  assert.match(waited.stdout, /"text": "done"/);
  assert.equal(postCount, previousPostCount + 1);
  assert.equal(statusGetCount, 3);
  assert.equal(fullGetCount, 2);
});

test('batch --force-new requests fresh billed transcriptions', async () => {
  const result = await run(['batch', links, '--force-new']);
  assert.equal(result.status, 0, result.stderr);
  assert.equal(duplicatePolicies.at(-1), 'force_new');
});
