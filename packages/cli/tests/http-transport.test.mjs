import assert from 'node:assert/strict';
import { after, before, test } from 'node:test';
import { spawn } from 'node:child_process';
import http from 'node:http';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { prioritizeAddresses, rotateAddresses } from '../bin/http-transport.js';

const root = resolve(import.meta.dirname, '../../..');
const cli = join(root, 'packages/cli/bin/videosays.js');
const home = mkdtempSync(join(tmpdir(), 'videosays-doctor-test-'));
let server;
let apiUrl;

before(async () => {
  server = http.createServer((_request, response) => {
    response.statusCode = 401;
    response.setHeader('Content-Type', 'application/json');
    response.end(JSON.stringify({ error: 'authentication required' }));
  });
  await new Promise((resolvePromise) => server.listen(0, '127.0.0.1', resolvePromise));
  apiUrl = `http://127.0.0.1:${server.address().port}`;
});

after(async () => {
  await new Promise((resolvePromise) => server.close(resolvePromise));
  rmSync(home, { recursive: true, force: true });
});

test('address rotation advances without dropping resolved addresses', () => {
  const addresses = [
    { address: '192.0.2.1', family: 4 },
    { address: '2001:db8::1', family: 6 },
    { address: '192.0.2.2', family: 4 },
  ];
  assert.deepEqual(rotateAddresses(addresses, 1), [addresses[1], addresses[2], addresses[0]]);
  assert.deepEqual(rotateAddresses(addresses, 4), [addresses[1], addresses[2], addresses[0]]);
});

test('resolved addresses alternate IP families when both are available', () => {
  const addresses = [
    { address: '192.0.2.1', family: 4 },
    { address: '192.0.2.2', family: 4 },
    { address: '2001:db8::1', family: 6 },
    { address: '2001:db8::2', family: 6 },
  ];
  assert.deepEqual(prioritizeAddresses(addresses), [addresses[0], addresses[2], addresses[1], addresses[3]]);
});

test('doctor treats an unauthenticated HTTP response as reachable', async () => {
  const result = await new Promise((resolvePromise) => {
    const child = spawn(process.execPath, [cli, 'doctor'], {
      env: { ...process.env, HOME: home, VIDEOSAYS_API_URL: apiUrl, NO_COLOR: '1' },
    });
    let stdout = '';
    let stderr = '';
    child.stdout.on('data', (chunk) => { stdout += chunk; });
    child.stderr.on('data', (chunk) => { stderr += chunk; });
    child.on('close', (status) => resolvePromise({ status, stdout, stderr }));
  });

  assert.equal(result.status, 0, result.stderr);
  assert.match(result.stdout, /OK\s+IPv4 127\.0\.0\.1 http\/1\.1 HTTP 401/);
  assert.match(result.stdout, /all 1 resolved addresses are reachable/);
});
