#!/usr/bin/env node

import { chmodSync, existsSync, readFileSync, unlinkSync, writeFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { homedir, platform } from 'node:os';
import { join, resolve } from 'node:path';
import { spawn } from 'node:child_process';

const require = createRequire(import.meta.url);
const { version: VERSION } = require('../package.json');
const API_URL = (process.env.VIDEOSAYS_API_URL || 'https://api.videosays.com').replace(/\/$/, '');
const CONFIG_FILE = join(homedir(), '.videosays');
const DEFAULT_TRANSCRIBE_WAIT_SECONDS = 120;
const DEFAULT_POLL_INTERVAL_SECONDS = 5;
const RECHARGE_URL = 'https://videosays.com/dashboard/billing';

const colors = {
  red: (s) => `\x1b[0;31m${s}\x1b[0m`,
  green: (s) => `\x1b[0;32m${s}\x1b[0m`,
  yellow: (s) => `\x1b[1;33m${s}\x1b[0m`,
  cyan: (s) => `\x1b[0;36m${s}\x1b[0m`,
  bold: (s) => `\x1b[1m${s}\x1b[0m`,
};

function normalizeError(message, details = {}) {
  if (message && typeof message === 'object') {
    return {
      message: typeof message.message === 'string' ? message.message : JSON.stringify(message),
      ...message,
      ...details,
    };
  }

  return {
    message: String(message),
    ...details,
  };
}

function error(message, details = {}) {
  const normalizedError = normalizeError(message, details);
  if (normalizedError.code === 'insufficient_credits') {
    normalizedError.next ??= 'videosays balance';
    normalizedError.rechargeUrl ??= RECHARGE_URL;
  }
  console.error(colors.red(`Error: ${normalizedError.message}`));
  if (normalizedError.code) {
    console.error(`Code: ${normalizedError.code}`);
  }
  if (normalizedError.next) {
    console.error(`Next: ${normalizedError.next}`);
  }
  if (normalizedError.rechargeUrl) {
    console.error(`Recharge: ${normalizedError.rechargeUrl}`);
  }
  process.exit(1);
}

function taskError(task, fallbackMessage = 'Transcription failed') {
  const taskErrorValue = task?.error && typeof task.error === 'object' ? task.error : null;
  const code = taskErrorValue?.code ?? task?.errorCode ?? null;
  const message = taskErrorValue?.message ?? task?.errorMessage ?? fallbackMessage;

  return {
    message,
    code,
    ...(code === 'insufficient_credits' ? {
      next: 'videosays balance',
      rechargeUrl: RECHARGE_URL,
    } : {}),
  };
}

function success(message) {
  console.log(colors.green(message));
}

function info(message) {
  console.log(message);
}

function progress(message) {
  console.error(message);
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function readConfigFile() {
  if (!existsSync(CONFIG_FILE)) return {};

  try {
    const content = readFileSync(CONFIG_FILE, 'utf-8');
    return Object.fromEntries(
      content
        .split('\n')
        .map((line) => line.trim())
        .filter(Boolean)
        .map((line) => {
          const index = line.indexOf('=');
          return index === -1 ? [line, ''] : [line.slice(0, index), line.slice(index + 1)];
        }),
    );
  } catch {
    return {};
  }
}

function loadConfig() {
  if (process.env.VIDEOSAYS_API_KEY) {
    return {
      apiKey: process.env.VIDEOSAYS_API_KEY,
      email: process.env.VIDEOSAYS_EMAIL || null,
      source: 'env',
    };
  }

  const config = readConfigFile();
  if (!config.VIDEOSAYS_API_KEY) return null;

  return {
    apiKey: config.VIDEOSAYS_API_KEY,
    email: config.VIDEOSAYS_EMAIL || null,
    source: CONFIG_FILE,
  };
}

function saveConfig(apiKey, email = null) {
  const lines = [`VIDEOSAYS_API_KEY=${apiKey}`];
  if (email) lines.push(`VIDEOSAYS_EMAIL=${email}`);
  writeFileSync(CONFIG_FILE, `${lines.join('\n')}\n`, 'utf-8');
  try {
    chmodSync(CONFIG_FILE, 0o600);
  } catch {
    // chmod is not available on every platform.
  }
}

function getApiKey() {
  const config = loadConfig();
  if (!config?.apiKey) {
    error(`Missing API key.

  Run ${colors.bold('videosays login')} to connect your account in the browser.
  Or set: export VIDEOSAYS_API_KEY="your_api_key"`);
  }
  return config;
}

async function requestJson(method, path, body, options = {}) {
  const headers = { 'Content-Type': 'application/json', ...(options.headers || {}) };
  if (options.apiKey) headers['X-API-Key'] = options.apiKey;
  const retryableRequest = method === 'GET';
  const maxAttempts = retryableRequest ? 3 : 1;
  let lastNetworkError;
  for (let attempt = 1; attempt <= maxAttempts; attempt += 1) {
    let response;
    try {
      response = await fetch(`${API_URL}${path}`, {
        method,
        headers,
        body: body == null ? undefined : JSON.stringify(body),
        signal: AbortSignal.timeout(30_000),
      });
    } catch (networkError) {
      lastNetworkError = networkError;
      if (attempt < maxAttempts) {
        await sleep(500 * 2 ** (attempt - 1));
        continue;
      }
      error('Request failed. Check your network connection.', { code: 'network_error' });
    }

    const data = await response.json().catch(() => null);
    if (!data) error('Service returned a non-JSON response.', { status: response.status });
    if ((response.status === 429 || response.status >= 500) && attempt < maxAttempts) {
      const retryAfter = Number(response.headers.get('Retry-After') || data.retryAfter || data.error?.retryAfterSeconds || 0);
      await sleep(Math.max(500, Math.min(30_000, retryAfter * 1000 || 500 * 2 ** (attempt - 1))));
      continue;
    }
    if (!response.ok && !options.allowStatuses?.includes(response.status)) {
      const apiError = typeof data.error === 'object' ? data.error : { message: data.error };
      error(apiError?.message || `Request failed (${response.status})`, {
        code: data.code || apiError?.code,
        status: response.status,
        next: data.next || apiError?.next,
        rechargeUrl: data.rechargeUrl || apiError?.rechargeUrl,
      });
    }
    return { data, status: response.status, headers: response.headers };
  }
  error(lastNetworkError?.message || 'Request failed.', { code: 'network_error' });
}

async function apiCall(method, path, body, options = {}) {
  const config = options.apiKey ? { apiKey: options.apiKey } : getApiKey();
  const { data } = await requestJson(method, path, body, { ...options, apiKey: config.apiKey });
  if (data.error) error(data.error);
  return data;
}

function getClientTracking() {
  const surface = process.env.VIDEOSAYS_CLIENT_SURFACE || process.env.VIDEOSAYS_AGENT_SURFACE || 'agent_cli';
  return {
    clientSurface: surface,
    clientName: process.env.VIDEOSAYS_CLIENT_NAME || 'videosays-cli',
    clientVersion: VERSION,
  };
}

function openBrowser(url) {
  const command = platform() === 'darwin' ? 'open' : platform() === 'win32' ? 'cmd' : 'xdg-open';
  const args = platform() === 'win32' ? ['/c', 'start', '', url] : [url];

  try {
    const child = spawn(command, args, { detached: true, stdio: 'ignore' });
    child.unref();
    return true;
  } catch {
    return false;
  }
}

function optionValue(args, name, fallback = null) {
  const index = args.indexOf(name);
  if (index === -1 || index + 1 >= args.length) return fallback;
  return args[index + 1];
}

function hasFlag(args, name) {
  return args.includes(name);
}

function stripFlags(args, flagsWithValues = []) {
  const result = [];
  for (let index = 0; index < args.length; index += 1) {
    const arg = args[index];
    if (flagsWithValues.includes(arg)) {
      index += 1;
      continue;
    }
    if (arg.startsWith('--')) continue;
    result.push(arg);
  }
  return result;
}

async function cmdLogin(args = []) {
  if (hasFlag(args, '--help') || hasFlag(args, '-h')) {
    showHelp();
    return;
  }

  const explicitApiKey = optionValue(args, '--api-key');

  if (explicitApiKey) {
    await apiCall('GET', '/api/v1/credits', null, { apiKey: explicitApiKey });
    saveConfig(explicitApiKey);
    success('Logged in with API key.');
    success(`API key saved to ${CONFIG_FILE}`);
    return;
  }

  const { data: session } = await requestJson('POST', '/api/v1/cli/sessions');
  const opened = openBrowser(session.verificationUrl);
  const expiresAt = new Date(session.expiresAt).getTime();
  const pollIntervalMs = Math.max(1, Number(session.pollIntervalSeconds) || 2) * 1000;

  info(colors.bold('Videosays CLI login'));
  info('');
  info(`Open this URL to authorize the CLI: ${colors.cyan(session.verificationUrl)}`);
  info(`Code: ${colors.bold(session.userCode)}`);
  if (opened) info('A browser window was opened automatically.');
  info('');
  info('Waiting for authorization...');

  while (Date.now() < expiresAt) {
    await sleep(pollIntervalMs);
    const { data, status } = await requestJson(
      'POST',
      '/api/v1/cli/sessions/token',
      { deviceCode: session.deviceCode },
      { allowStatuses: [202, 409, 410] },
    );

    if (status === 202 || data.status === 'pending') continue;
    if (status === 410 || data.status === 'expired') error('Login code expired. Run videosays login again.');
    if (status === 409 || data.status === 'consumed') error('Login code was already used. Run videosays login again.');
    if (data.status === 'authorized' && data.apiKey) {
      saveConfig(data.apiKey, data.user?.email || null);
      success('Logged in.');
      success(`API key saved to ${CONFIG_FILE}`);
      if (data.user?.email) info(`Account: ${data.user.email}`);
      return;
    }

    error(data.error || 'Unexpected login response.');
  }

  error('Login code expired. Run videosays login again.');
}

async function cmdLogout() {
  const config = loadConfig();

  if (existsSync(CONFIG_FILE)) {
    unlinkSync(CONFIG_FILE);
  }

  success('Logged out from local config.');
  if (config?.source === 'env' || process.env.VIDEOSAYS_API_KEY) {
    info('VIDEOSAYS_API_KEY is still set in the environment.');
  }
}

async function cmdWhoami() {
  const config = getApiKey();
  const credits = await apiCall('GET', '/api/v1/credits');

  success('Authenticated');
  if (config.email) info(`   Account: ${config.email}`);
  info(`   Source: ${config.source}`);
  info(`   Balance: ${credits.balance}`);
  info(`   Available: ${credits.availableBalance ?? credits.balance}`);
}

function getTaskText(task) {
  return task?.result?.text ?? task?.resultText ?? '';
}

function getTaskSegments(task) {
  return task?.result?.segments ?? task?.segments ?? null;
}

function parseResultFormat(args = []) {
  const value = optionValue(args, '--format', 'text')?.toLowerCase();
  if (value === 'txt') return 'text';
  if (['text', 'timeline', 'srt', 'vtt'].includes(value)) return value;
  error(`Unsupported format: ${value}. Use text, timeline, srt, or vtt.`);
}

function formatClock(seconds, separator) {
  const totalMs = Math.max(0, Math.round(Number(seconds || 0) * 1000));
  const ms = totalMs % 1000;
  const totalSeconds = Math.floor(totalMs / 1000);
  const s = totalSeconds % 60;
  const totalMinutes = Math.floor(totalSeconds / 60);
  const m = totalMinutes % 60;
  const h = Math.floor(totalMinutes / 60);
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}${separator}${String(ms).padStart(3, '0')}`;
}

function requireSegments(task, format) {
  const segments = getTaskSegments(task);
  if (!Array.isArray(segments) || segments.length === 0) {
    error(`This task has no timeline segments, so it cannot be output as ${format}.`);
  }
  return segments;
}

function formatTaskResult(task, format) {
  if (format === 'text') return getTaskText(task) || '';

  const segments = requireSegments(task, format);

  if (format === 'timeline') {
    return segments
      .map((segment) => `[${formatClock(segment.start, '.')} - ${formatClock(segment.end, '.')}] ${segment.text ?? ''}`)
      .join('\n');
  }

  if (format === 'srt') {
    return segments
      .map((segment, index) => `${index + 1}\n${formatClock(segment.start, ',')} --> ${formatClock(segment.end, ',')}\n${segment.text ?? ''}`)
      .join('\n\n');
  }

  if (format === 'vtt') {
    return `WEBVTT\n\n${segments
      .map((segment) => `${formatClock(segment.start, '.')} --> ${formatClock(segment.end, '.')}\n${segment.text ?? ''}`)
      .join('\n\n')}`;
  }

  return getTaskText(task) || '';
}

function outputTaskResult(task, format) {
  console.log(formatTaskResult(task, format));
}

function outputPendingTask(taskId, status, format) {
  console.log(`VIDEOSAYS_TASK_PENDING
task_id=${taskId}
status=${status || 'processing'}
next=videosays status ${taskId}${format && format !== 'text' ? ` --format ${format}` : ''}`);
}

async function cmdTranscribe(input, args = []) {
  if (!input) {
    error('Please provide a video link or share text.\n  Usage: videosays transcribe <video-link-or-share-text>');
  }

  const format = parseResultFormat(args);
  const timeoutSeconds = Number(optionValue(args, '--timeout', String(DEFAULT_TRANSCRIBE_WAIT_SECONDS))) || DEFAULT_TRANSCRIBE_WAIT_SECONDS;
  const intervalSeconds = Number(optionValue(args, '--poll-interval', String(DEFAULT_POLL_INTERVAL_SECONDS))) || DEFAULT_POLL_INTERVAL_SECONDS;
  progress(`Submitting transcription: ${input.substring(0, 120)}`);

  const task = await apiCall('POST', '/api/v1/transcribe', { input, tracking: getClientTracking() });
  const taskId = task.taskId || task.id;
  if (!taskId) error('Task creation failed. No taskId returned.');

  if (task.status === 'completed') {
    outputTaskResult(task, format);
    return;
  }

  if (!hasFlag(args, '--wait')) {
    outputPendingTask(taskId, task.status, format);
    return;
  }

  const startedAt = Date.now();
  let lastStatus = task.status;
  progress(`Task ID: ${taskId}`);

  while (Date.now() - startedAt < timeoutSeconds * 1000) {
    const remainingMs = timeoutSeconds * 1000 - (Date.now() - startedAt);
    await sleep(Math.min(intervalSeconds * 1000, Math.max(250, remainingMs)));
    const elapsed = Math.round((Date.now() - startedAt) / 1000);
    const poll = await apiCall('GET', `/api/v1/transcribe/${taskId}`);
    lastStatus = poll.status;

    if (poll.status === 'completed') {
      outputTaskResult(poll, format);
      return;
    }

    if (poll.status === 'failed') {
      error(taskError(poll));
    }

    progress(`Waiting... (${elapsed}s, status: ${poll.status})`);
  }

  outputPendingTask(taskId, lastStatus, format);
}

async function cmdStatus(taskId, args = []) {
  if (!taskId) error('Please provide taskId.\n  Usage: videosays status <taskId>');

  const format = parseResultFormat(args);
  const task = await apiCall('GET', `/api/v1/transcribe/${taskId}`);

  if (task.status === 'completed') {
    outputTaskResult(task, format);
    return;
  }

  if (task.status === 'failed') {
    error(taskError(task));
  }

  outputPendingTask(task.taskId || task.id || taskId, task.status, format);
}

function isTerminalBatch(batch) {
  return ['completed', 'partial', 'failed', 'cancelled'].includes(batch?.status);
}

function outputBatch(batch, outputPath = null) {
  const rendered = `${JSON.stringify(batch, null, 2)}\n`;
  if (outputPath) writeFileSync(resolve(outputPath), rendered, 'utf-8');
  process.stdout.write(rendered);
}

function batchWithNext(batch) {
  if (!batch?.batchId || isTerminalBatch(batch)) return batch;
  return {
    ...batch,
    next: batch.stopReason === 'insufficient_credits'
      ? `videosays batch continue ${batch.batchId}`
      : `videosays batch status ${batch.batchId}`,
  };
}

async function waitForBatch(batch, rawArgs) {
  const timeoutSeconds = Number(optionValue(rawArgs, '--timeout', String(DEFAULT_TRANSCRIBE_WAIT_SECONDS))) || DEFAULT_TRANSCRIBE_WAIT_SECONDS;
  const outputPath = optionValue(rawArgs, '--output');
  if (isTerminalBatch(batch)) {
    outputBatch(batch, outputPath);
    return;
  }

  const startedAt = Date.now();
  let pollDelaySeconds = 2;
  progress(`Batch ID: ${batch.batchId}`);
  while (Date.now() - startedAt < timeoutSeconds * 1000) {
    const remainingMs = timeoutSeconds * 1000 - (Date.now() - startedAt);
    await sleep(Math.min(pollDelaySeconds * 1000, Math.max(1, remainingMs)));
    if (Date.now() - startedAt >= timeoutSeconds * 1000) break;
    batch = await apiCall('GET', `/api/v1/batches/${batch.batchId}`);
    if (isTerminalBatch(batch)) {
      outputBatch(batch, outputPath);
      return;
    }
    progress(`Waiting for batch... (${batch.summary?.completed ?? 0}/${batch.summary?.total ?? 0} completed)`);
    pollDelaySeconds = Math.min(15, Number(batch.retryAfterSeconds) || Math.ceil(pollDelaySeconds * 1.5));
  }

  outputBatch(batchWithNext(batch), outputPath);
}

async function cmdBatch(args = [], rawArgs = []) {
  const subcommand = args[0];
  if (subcommand === 'continue' || subcommand === 'status' || subcommand === 'cancel') {
    const batchId = args[1];
    if (!batchId) error(`Usage: videosays batch ${subcommand} <batch-id>`);
    if (subcommand === 'continue') {
      const continued = await apiCall('POST', `/api/v1/batches/${batchId}/continue`);
      outputBatch(batchWithNext(continued), optionValue(rawArgs, '--output'));
      return;
    }
    const method = subcommand === 'cancel' ? 'POST' : 'GET';
    const suffix = subcommand === 'cancel' ? '/cancel' : '';
    outputBatch(batchWithNext(await apiCall(method, `/api/v1/batches/${batchId}${suffix}`)), optionValue(rawArgs, '--output'));
    return;
  }

  const inputFile = subcommand;
  if (!inputFile) error('Usage: videosays batch <links.txt>');
  const absoluteInputFile = resolve(inputFile);
  if (!existsSync(absoluteInputFile)) error(`Input file not found: ${absoluteInputFile}`, { code: 'input_file_not_found' });
  const rawInput = readFileSync(absoluteInputFile, 'utf-8');
  const lines = rawInput.split(/\r?\n/).map((line) => line.trim()).filter(Boolean);
  if (!lines.length) error('Input file contains no links.', { code: 'empty_batch' });
  if (lines.length > 100) error('A batch can contain at most 100 items.', { code: 'batch_too_large' });
  const batch = await apiCall('POST', '/api/v1/batches', {
    items: lines,
    tracking: {
      ...getClientTracking(),
      clientName: process.env.VIDEOSAYS_CLIENT_NAME || 'videosays-cli-batch',
    },
  });
  if (hasFlag(rawArgs, '--wait')) await waitForBatch(batch, rawArgs);
  else outputBatch(batchWithNext(batch), optionValue(rawArgs, '--output'));
}

async function cmdBalance() {
  const response = await apiCall('GET', '/api/v1/credits');

  success('Credit balance');
  console.log(`   Balance:    ${response.balance}`);
  console.log(`   Reserved:   ${response.reservedBalance ?? 0}`);
  console.log(`   Available:  ${response.availableBalance ?? response.balance}`);
  console.log(`   Purchased:  ${response.totalPurchased ?? 0}`);
  console.log(`   Used:       ${response.totalUsed ?? 0}`);
}

async function cmdHistory(limit = 10) {
  info('Fetching transcription history...');
  const response = await apiCall('GET', '/api/v1/history');
  const tasks = (response.tasks || []).slice(0, Math.max(1, limit));

  console.log('');
  info(`Showing recent ${tasks.length} task(s):`);
  console.log('');

  if (tasks.length === 0) {
    info('   No history yet.');
    return;
  }

  for (const task of tasks) {
    const status = task.status === 'completed' ? colors.green('done') : task.status === 'failed' ? colors.red('fail') : task.status;
    const date = task.createdAt ? new Date(task.createdAt).toLocaleString() : '';
    const title = task.video?.title || task.input || '';
    const oneLineTitle = title.replace(/\s+/g, ' ').substring(0, 48);
    const platformName = task.video?.platform ? `[${task.video.platform}]` : '';
    console.log(`  ${status.padEnd(14)} ${platformName.padEnd(14)} ${oneLineTitle.padEnd(50)} ${date}`);
  }
}

function showHelp() {
  console.log(`videosays v${VERSION}

Usage:
  videosays login
  videosays login --api-key <api-key>
  videosays logout
  videosays whoami
  videosays transcribe <video-link-or-share-text>
  videosays transcribe <video-link-or-share-text> --format text
  videosays transcribe <video-link-or-share-text> --format timeline
  videosays transcribe <video-link-or-share-text> --format srt
  videosays status <taskId>
  videosays status <taskId> --format vtt
  videosays batch <links.txt>
  videosays batch continue <batch-id>
  videosays batch status <batch-id>
  videosays batch cancel <batch-id>
  videosays balance
  videosays history [limit]
  videosays --version
  videosays help

Shortcut:
  videosays "<video-link-or-share-text>"

Creation semantics:
  Every transcribe or batch submission creates a new server resource.
  Save the returned ID and use status commands for later checks.

Configuration:
  API key file: ~/.videosays
  VIDEOSAYS_API_KEY   API key, preferred over config file
  VIDEOSAYS_API_URL   API URL (default: https://api.videosays.com)

Examples:
  videosays login
  videosays transcribe "https://www.tiktok.com/@creator/video/123456"
  videosays transcribe "https://v.douyin.com/xxxxx/" --format text
  videosays transcribe "https://v.douyin.com/xxxxx/" --format srt
  videosays batch links.txt
  videosays status 123e4567-e89b-12d3-a456-426614174000
  videosays balance

Website: https://videosays.com
API:     ${API_URL}`);
}

const rawArgs = process.argv.slice(2);

if (rawArgs.includes('--version') || rawArgs.includes('-v')) {
  console.log(VERSION);
  process.exit(0);
}

if (rawArgs.includes('--help') || rawArgs.includes('-h')) {
  showHelp();
  process.exit(0);
}

const args = stripFlags(rawArgs, ['--api-key', '--timeout', '--poll-interval', '--format', '--output']);
const command = args[0];

switch (command) {
  case 'setup':
  case 'register':
    error(`Unknown command: ${command}. Use "videosays login".`);
    break;
  case 'login':
    await cmdLogin(rawArgs);
    break;
  case 'logout':
    await cmdLogout();
    break;
  case 'whoami':
    await cmdWhoami();
    break;
  case 'transcribe':
  case 'caption':
    await cmdTranscribe(args[1], rawArgs);
    break;
  case 'status':
    await cmdStatus(args[1], rawArgs);
    break;
  case 'batch':
    await cmdBatch(args.slice(1), rawArgs);
    break;
  case 'balance':
  case 'credits':
    await cmdBalance();
    break;
  case 'history':
    await cmdHistory(parseInt(args[1], 10) || 10);
    break;
  case 'help':
  case '--help':
  case '-h':
    showHelp();
    break;
  default:
    if (command) {
      await cmdTranscribe(command, rawArgs);
    } else {
      showHelp();
    }
    break;
}
