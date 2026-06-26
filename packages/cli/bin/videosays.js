#!/usr/bin/env node

import { chmodSync, existsSync, readFileSync, unlinkSync, writeFileSync } from 'node:fs';
import { homedir, platform } from 'node:os';
import { join } from 'node:path';
import { spawn } from 'node:child_process';

const VERSION = '1.0.1';
const API_URL = (process.env.VIDEOSAYS_API_URL || 'https://api.videosays.com').replace(/\/$/, '');
const CONFIG_FILE = join(homedir(), '.videosays');

const colors = {
  red: (s) => `\x1b[0;31m${s}\x1b[0m`,
  green: (s) => `\x1b[0;32m${s}\x1b[0m`,
  yellow: (s) => `\x1b[1;33m${s}\x1b[0m`,
  cyan: (s) => `\x1b[0;36m${s}\x1b[0m`,
  bold: (s) => `\x1b[1m${s}\x1b[0m`,
};

let jsonMode = false;

function emitJson(payload) {
  console.log(JSON.stringify(payload, null, 2));
}

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
  if (jsonMode) {
    emitJson({ success: false, error: normalizedError });
  } else {
    console.error(colors.red(`Error: ${normalizedError.message}`));
  }
  process.exit(1);
}

function success(message) {
  if (!jsonMode) console.log(colors.green(message));
}

function info(message) {
  if (!jsonMode) console.log(message);
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
    const loginCommand = jsonMode ? 'videosays login' : colors.bold('videosays login');
    error(`Missing API key.

  Run ${loginCommand} to connect your account in the browser.
  Or set: export VIDEOSAYS_API_KEY="your_api_key"`);
  }
  return config;
}

async function requestJson(method, path, body, options = {}) {
  const headers = { 'Content-Type': 'application/json' };
  if (options.apiKey) headers['X-API-Key'] = options.apiKey;

  const response = await fetch(`${API_URL}${path}`, {
    method,
    headers,
    body: body == null ? undefined : JSON.stringify(body),
  }).catch(() => {
    error('Request failed. Check your network connection.');
  });

  const data = await response.json().catch(() => {
    error('Service returned a non-JSON response.');
  });

  if (!response.ok && !options.allowStatuses?.includes(response.status)) {
    error(data.error || `Request failed (${response.status})`, { status: response.status });
  }

  return { data, status: response.status };
}

async function apiCall(method, path, body, options = {}) {
  const config = options.apiKey ? { apiKey: options.apiKey } : getApiKey();
  const { data } = await requestJson(method, path, body, { apiKey: config.apiKey });
  if (data.error) error(data.error);
  return data;
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
    if (arg === '--json') continue;
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
    if (jsonMode) emitJson({ success: true, configFile: CONFIG_FILE });
    else {
      success('Logged in with API key.');
      success(`API key saved to ${CONFIG_FILE}`);
    }
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
      if (jsonMode) {
        emitJson({
          success: true,
          user: data.user ?? null,
          configFile: CONFIG_FILE,
        });
      } else {
        success('Logged in.');
        success(`API key saved to ${CONFIG_FILE}`);
        if (data.user?.email) info(`Account: ${data.user.email}`);
      }
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

  if (jsonMode) {
    emitJson({
      success: true,
      removedConfigFile: true,
      envStillSet: Boolean(process.env.VIDEOSAYS_API_KEY),
    });
    return;
  }

  success('Logged out from local config.');
  if (config?.source === 'env' || process.env.VIDEOSAYS_API_KEY) {
    info('VIDEOSAYS_API_KEY is still set in the environment.');
  }
}

async function cmdWhoami() {
  const config = getApiKey();
  const credits = await apiCall('GET', '/api/v1/credits');

  if (jsonMode) {
    emitJson({
      success: true,
      email: config.email,
      source: config.source,
      credits,
    });
    return;
  }

  success('Authenticated');
  if (config.email) info(`   Account: ${config.email}`);
  info(`   Source: ${config.source}`);
  info(`   Balance: ${credits.balance}`);
  info(`   Available: ${credits.availableBalance ?? credits.balance}`);
}

function getTaskText(task) {
  return task?.result?.text ?? task?.resultText ?? '';
}

function getTaskError(task) {
  return task?.error?.message ?? task?.errorMessage ?? 'Unknown error';
}

function getTaskDurationMinutes(task) {
  const creditMinutes = task?.billing?.creditMinutes ?? task?.creditCost;
  if (creditMinutes != null) return creditMinutes;
  const durationSeconds = task?.video?.durationSeconds ?? task?.durationSeconds;
  if (durationSeconds != null) return Math.ceil(durationSeconds / 6) / 10;
  return null;
}

function serializeTask(task) {
  return {
    success: true,
    taskId: task?.taskId || task?.id || null,
    status: task?.status || null,
    input: task?.input || null,
    platform: task?.video?.platform ?? task?.platform ?? null,
    title: task?.video?.title ?? task?.title ?? null,
    author: task?.video?.author ?? task?.author ?? null,
    durationSeconds: task?.video?.durationSeconds ?? task?.durationSeconds ?? null,
    creditMinutes: task?.billing?.creditMinutes ?? task?.creditMinutes ?? task?.creditCost ?? null,
    sourceType: task?.result?.sourceType ?? task?.sourceType ?? null,
    provider: task?.result?.provider ?? task?.provider ?? null,
    text: getTaskText(task),
    segments: task?.result?.segments ?? task?.segments ?? null,
    error: task?.error ?? null,
    createdAt: task?.createdAt ?? task?.created_at ?? null,
    completedAt: task?.completedAt ?? task?.completed_at ?? null,
  };
}

function printTaskSummary(task) {
  const video = task.video ?? {};
  if (video.platform) info(`   Platform: ${video.platform}`);
  if (video.author) info(`   Author: ${video.author}`);
  if (video.title) info(`   Title: ${video.title}`);

  const duration = getTaskDurationMinutes(task);
  if (duration != null) info(`   Billed duration: ${duration} minutes`);
}

async function cmdTranscribe(input, language = 'zh-CN', args = []) {
  if (!input) {
    error('Please provide a video link or share text.\n  Usage: videosays transcribe <video-link-or-share-text> [language]');
  }

  const timeoutSeconds = Number(optionValue(args, '--timeout', '300')) || 300;
  const intervalSeconds = Number(optionValue(args, '--poll-interval', '3')) || 3;
  const noWait = hasFlag(args, '--no-wait');

  info(`Submitting transcription: ${colors.yellow(input.substring(0, 80))}`);
  info(`   Language: ${language}`);
  info('   Submitting...');

  const task = await apiCall('POST', '/api/v1/transcribe', { input, language });
  const taskId = task.taskId || task.id;
  if (!taskId) error('Task creation failed. No taskId returned.');

  if (noWait || task.status === 'completed') {
    if (jsonMode) emitJson(serializeTask(task));
    else {
      if (task.status === 'completed') {
        console.log('');
        success('Transcription completed.');
      } else {
        success(`Task submitted: ${taskId}`);
      }
      printTaskSummary(task);
      const text = getTaskText(task);
      if (text) {
        console.log('');
        info(colors.bold('Transcript:'));
        console.log(text);
      }
    }
    return;
  }

  const startedAt = Date.now();
  info(`   Task ID: ${taskId}`);

  while (Date.now() - startedAt < timeoutSeconds * 1000) {
    await sleep(intervalSeconds * 1000);
    const elapsed = Math.round((Date.now() - startedAt) / 1000);
    const poll = await apiCall('GET', `/api/v1/transcribe/${taskId}`);

    if (poll.status === 'completed') {
      if (jsonMode) {
        emitJson(serializeTask(poll));
      } else {
        console.log('');
        success('Transcription completed.');
        printTaskSummary(poll);
        console.log('');
        info(colors.bold('Transcript:'));
        console.log(getTaskText(poll) || '(empty)');
      }
      return;
    }

    if (poll.status === 'failed') {
      if (jsonMode) {
        emitJson(serializeTask(poll));
        process.exit(1);
      }
      error(`Transcription failed: ${getTaskError(poll)}`);
    }

    info(`   Waiting... (${elapsed}s, status: ${poll.status})`);
  }

  error(`Transcription timed out after ${timeoutSeconds}s. Task ID: ${taskId}`, { taskId });
}

async function cmdStatus(taskId) {
  if (!taskId) error('Please provide taskId.\n  Usage: videosays status <taskId>');

  const task = await apiCall('GET', `/api/v1/transcribe/${taskId}`);
  if (jsonMode) {
    emitJson(serializeTask(task));
    return;
  }

  success('Task status');
  info(`   taskId: ${task.taskId || task.id}`);
  info(`   status: ${task.status}`);
  printTaskSummary(task);

  if (task.error) info(`   error: ${getTaskError(task)}`);

  const text = getTaskText(task);
  if (text) {
    console.log('');
    info(colors.bold('Transcript:'));
    console.log(text);
  }
}

async function cmdBalance() {
  const response = await apiCall('GET', '/api/v1/credits');

  if (jsonMode) {
    emitJson({ success: true, ...response });
    return;
  }

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

  if (jsonMode) {
    emitJson({
      success: true,
      tasks: tasks.map(serializeTask),
      pagination: response.pagination ?? null,
    });
    return;
  }

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
  videosays transcribe <video-link-or-share-text> [language]
  videosays transcribe <video-link-or-share-text> --json
  videosays transcribe <video-link-or-share-text> --no-wait
  videosays status <taskId> [--json]
  videosays balance [--json]
  videosays history [limit] [--json]
  videosays --version
  videosays help

Shortcut:
  videosays "<video-link-or-share-text>"

Configuration:
  API key file: ~/.videosays
  VIDEOSAYS_API_KEY   API key, preferred over config file
  VIDEOSAYS_API_URL   API URL (default: https://api.videosays.com)

Examples:
  videosays login
  videosays transcribe "https://www.tiktok.com/@creator/video/123456" --json
  videosays transcribe "https://v.douyin.com/xxxxx/" zh-CN
  videosays status 123e4567-e89b-12d3-a456-426614174000 --json
  videosays balance

Website: https://videosays.com
API:     ${API_URL}`);
}

const rawArgs = process.argv.slice(2);
jsonMode = rawArgs.includes('--json');

if (rawArgs.includes('--version') || rawArgs.includes('-v')) {
  console.log(VERSION);
  process.exit(0);
}

if (rawArgs.includes('--help') || rawArgs.includes('-h')) {
  showHelp();
  process.exit(0);
}

const args = stripFlags(rawArgs, ['--api-key', '--timeout', '--poll-interval']);
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
    await cmdTranscribe(args[1], args[2]?.startsWith('--') ? 'zh-CN' : args[2], rawArgs);
    break;
  case 'status':
    await cmdStatus(args[1]);
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
      await cmdTranscribe(command, args[1]?.startsWith('--') ? 'zh-CN' : args[1], rawArgs);
    } else {
      showHelp();
    }
    break;
}
