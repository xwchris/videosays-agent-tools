import assert from 'node:assert/strict';
import { test } from 'node:test';
import { spawnSync } from 'node:child_process';
import { getApiUrl, resolveWebsiteLink } from '../bin/origins.js';

test('default API reaches the cn endpoint and preserves the API key header', () => {
  const script = `
    import assert from 'node:assert/strict';
    delete process.env.VIDEOSAYS_API_URL;
    process.env.VIDEOSAYS_API_KEY = 'test-key';
    process.argv = ['node', 'videosays', 'whoami'];
    globalThis.fetch = async (url, options) => {
      assert.equal(url, 'https://api.videosays.cn/api/v1/credits');
      assert.equal(options.headers['X-API-Key'], 'test-key');
      return new Response(JSON.stringify({ balance: 2000 }), { status: 200 });
    };
    await import(${JSON.stringify(new URL('../bin/videosays.js', import.meta.url).href)});
  `;
  const result = spawnSync(process.execPath, ['--input-type=module', '--eval', script], { encoding: 'utf8' });
  assert.equal(result.status, 0, result.stderr);
});

test('official login and billing links follow the selected API without losing parameters', () => {
  assert.equal(
    resolveWebsiteLink('https://videosays.com/cli/auth?code=ABCD-EFGH', getApiUrl('')),
    'https://videosays.cn/cli/auth?code=ABCD-EFGH',
  );
  assert.equal(
    resolveWebsiteLink('https://videosays.com/dashboard/billing?from=cli#recharge', getApiUrl('')),
    'https://videosays.cn/dashboard/billing?from=cli#recharge',
  );
  assert.equal(
    resolveWebsiteLink('https://videosays.cn/cli/auth?code=ABCD-EFGH', getApiUrl('https://api.videosays.com/')),
    'https://videosays.com/cli/auth?code=ABCD-EFGH',
  );
});

test('explicit API overrides and non-auth URLs are not rerouted', () => {
  const customApi = getApiUrl('https://api.example.test/');
  assert.equal(customApi, 'https://api.example.test');
  const login = 'https://videosays.com/cli/auth?code=ABCD-EFGH';
  assert.equal(resolveWebsiteLink(login, customApi), login);
  for (const url of [
    'https://videosays.com.example.test/cli/auth?code=ABCD-EFGH',
    'https://example.test/cli/auth?code=ABCD-EFGH',
    'https://user:password@videosays.com/cli/auth',
    'https://videosays.com/docs',
    'not-a-url',
  ]) {
    assert.equal(resolveWebsiteLink(url, getApiUrl('')), url);
  }
});
