import assert from 'node:assert/strict';
import { after, before, test } from 'node:test';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { spawn } from 'node:child_process';
import { createRequire } from 'node:module';
import http from 'node:http';

const root = resolve(import.meta.dirname, '../../..');
const cli = join(root, 'packages/cli/bin/videosays.js');
const require = createRequire(import.meta.url);
const { version } = require('../package.json');
const home = mkdtempSync(join(tmpdir(), 'videosays-transcribe-test-'));
let server;
let apiUrl;
let postCount = 0;
let getCount = 0;
let failNextPost = false;
let dropNextPost = false;
const submissionIds = [];

before(async () => {
  server = http.createServer((request, response) => {
    response.setHeader('Content-Type', 'application/json');
    if (request.method === 'POST' && request.url === '/api/v1/transcribe') {
      postCount += 1;
      assert.match(request.headers['idempotency-key'], /^[0-9a-f-]{36}$/i);
      assert.equal(request.headers['x-api-key'], 'test-key');
      assert.equal(request.headers['user-agent'], `Videosays-CLI/${version}`);
      submissionIds.push(request.headers['idempotency-key']);
      let raw = '';
      request.on('data', (chunk) => { raw += chunk; });
      request.on('end', () => {
        const body = JSON.parse(raw);
        assert.equal(body.options.duplicatePolicy, 'reuse');
        if (dropNextPost) {
          dropNextPost = false;
          request.socket.destroy();
          return;
        }
        if (failNextPost) {
          failNextPost = false;
          response.statusCode = 503;
          response.end(JSON.stringify({ error: 'temporary creation failure', code: 'temporary_failure' }));
          return;
        }
        response.statusCode = 202;
        response.end(JSON.stringify({ taskId: `task-${postCount}`, status: 'pending' }));
      });
      return;
    }
    if (request.method === 'GET' && request.url?.startsWith('/api/v1/transcribe/task-')) {
      getCount += 1;
      response.end(JSON.stringify({ taskId: request.url.split('/').at(-1), status: 'completed', resultText: 'transcript ready' }));
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
      env: { ...process.env, HOME: home, VIDEOSAYS_API_URL: apiUrl, VIDEOSAYS_API_KEY: 'test-key', NO_COLOR: '1' },
    });
    let stdout = '';
    let stderr = '';
    child.stdout.on('data', (chunk) => { stdout += chunk; });
    child.stderr.on('data', (chunk) => { stderr += chunk; });
    child.on('close', (status) => resolvePromise({ status, stdout, stderr }));
  });
}

test('transcribe returns a task receipt without polling by default', async () => {
  const result = await run(['transcribe', 'https://v.douyin.com/one/']);
  assert.equal(result.status, 0, result.stderr);
  assert.match(result.stdout, /VIDEOSAYS_TASK_PENDING/);
  assert.match(result.stdout, /next=videosays status task-1/);
  assert.equal(getCount, 0);
});

test('transcribe wait remains available for interactive use', async () => {
  const result = await run(['transcribe', 'https://v.douyin.com/one/', '--wait', '--poll-interval', '0.01']);
  assert.equal(result.status, 0, result.stderr);
  assert.equal(result.stdout.trim(), 'transcript ready');
  assert.equal(postCount, 2);
  assert.equal(getCount, 1);
});

test('a failed creation request is not retried automatically', async () => {
  const previousPostCount = postCount;
  failNextPost = true;
  const result = await run(['transcribe', 'https://v.douyin.com/network-error/']);
  assert.equal(result.status, 1);
  assert.match(result.stderr, /Code: temporary_failure/);
  assert.equal(postCount, previousPostCount + 1);
});

test('a disconnected creation request retries with the same submission id', async () => {
  const previousPostCount = postCount;
  const submissionId = '123e4567-e89b-42d3-a456-426614174000';
  dropNextPost = true;
  const result = await run([
    'transcribe',
    'https://v.douyin.com/disconnected/',
    '--submission-id',
    submissionId,
  ]);
  assert.equal(result.status, 0, result.stderr);
  assert.equal(postCount, previousPostCount + 2);
  assert.deepEqual(submissionIds.slice(-2), [submissionId, submissionId]);
});
