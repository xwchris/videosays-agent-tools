import assert from 'node:assert/strict';
import { test } from 'node:test';
import { getApiUrl, resolveWebsiteLink } from '../bin/origins.js';

test('default API uses the cn endpoint', () => {
  assert.equal(getApiUrl(''), 'https://api.videosays.cn');
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
