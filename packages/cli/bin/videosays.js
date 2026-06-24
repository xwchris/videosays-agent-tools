#!/usr/bin/env node

import { chmodSync, existsSync, readFileSync, writeFileSync } from 'node:fs';
import { homedir } from 'node:os';
import { join } from 'node:path';
import { createInterface } from 'node:readline';

const VERSION = '1.0.0';
const API_URL = (process.env.VIDEOSAYS_API_URL || 'https://api.videosays.com').replace(/\/$/, '');
const CONFIG_FILE = join(homedir(), '.videosays');

const SUPABASE_URL = process.env.VIDEOSAYS_SUPABASE_URL || 'https://wcedjbnfdlfnomzwtwlq.supabase.co';
const SUPABASE_ANON_KEY = process.env.VIDEOSAYS_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6IndjZWRqYm5mZGxmbm9tend0d2xxIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzU1NjQ3NTQsImV4cCI6MjA5MTE0MDc1NH0.7yrhVx_huGDMzGllUivfyayEC7MnTrUzHUb5aVLFHLg';

const colors = {
  red: (s) => `\x1b[0;31m${s}\x1b[0m`,
  green: (s) => `\x1b[0;32m${s}\x1b[0m`,
  yellow: (s) => `\x1b[1;33m${s}\x1b[0m`,
  cyan: (s) => `\x1b[0;36m${s}\x1b[0m`,
  bold: (s) => `\x1b[1m${s}\x1b[0m`,
};

function error(message) {
  console.error(colors.red(`Error: ${message}`));
  process.exit(1);
}

function success(message) {
  console.log(colors.green(message));
}

function info(message) {
  console.log(message);
}

function ask(question, { hidden = false } = {}) {
  return new Promise((resolve) => {
    const rl = createInterface({
      input: process.stdin,
      output: hidden ? undefined : process.stdout,
      terminal: hidden,
    });

    rl.question(question, (answer) => {
      rl.close();
      resolve(answer.trim());
    });
  });
}

function loadConfig() {
  if (process.env.VIDEOSAYS_API_KEY) return process.env.VIDEOSAYS_API_KEY;
  if (!existsSync(CONFIG_FILE)) return null;

  try {
    const content = readFileSync(CONFIG_FILE, 'utf-8');
    const match = content.match(/^VIDEOSAYS_API_KEY=(.+)$/m);
    return match ? match[1].trim() : null;
  } catch {
    return null;
  }
}

function saveConfig(apiKey) {
  writeFileSync(CONFIG_FILE, `VIDEOSAYS_API_KEY=${apiKey}\n`, 'utf-8');
  try {
    chmodSync(CONFIG_FILE, 0o600);
  } catch {
    // chmod is not available on every platform.
  }
}

function getApiKey() {
  const apiKey = loadConfig();
  if (!apiKey) {
    error(`Missing API key.

  Run ${colors.bold('videosays setup')} to register or log in.
  Or set: export VIDEOSAYS_API_KEY="your_api_key"`);
  }
  return apiKey;
}

function requireSupabasePublicConfig() {
  if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
    error('Registration and login require Supabase public configuration.');
  }
}

async function apiCall(method, path, body) {
  const apiKey = getApiKey();
  const options = {
    method,
    headers: {
      'Content-Type': 'application/json',
      'X-API-Key': apiKey,
    },
  };

  if (body) options.body = JSON.stringify(body);

  const response = await fetch(`${API_URL}${path}`, options).catch(() => {
    error('Request failed. Check your network connection.');
  });

  const data = await response.json().catch(() => {
    error('Service returned a non-JSON response.');
  });

  if (!response.ok || data.error) {
    error(data.error || `Request failed (${response.status})`);
  }

  return data;
}

async function supabaseRequest(endpoint, body) {
  requireSupabasePublicConfig();

  const response = await fetch(`${SUPABASE_URL}${endpoint}`, {
    method: 'POST',
    headers: {
      apikey: SUPABASE_ANON_KEY,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(body),
  }).catch(() => {
    error('Authentication request failed. Check your network connection.');
  });

  return response.json();
}

async function fetchApiKey(jwt) {
  requireSupabasePublicConfig();

  const response = await fetch(`${SUPABASE_URL}/rest/v1/profiles?select=api_key`, {
    headers: {
      apikey: SUPABASE_ANON_KEY,
      Authorization: `Bearer ${jwt}`,
    },
  }).catch(() => {
    error('Failed to fetch API key. Check your network connection.');
  });

  const data = await response.json().catch(() => null);
  return data?.[0]?.api_key || null;
}

async function doRegister(email, password) {
  info('Registering...');
  const response = await supabaseRequest('/auth/v1/signup', { email, password });

  if (response.msg) error(`Registration failed: ${response.msg}`);

  if (!response.access_token) {
    success('Registration created. Please confirm your email.');
    info('');
    info(`After confirmation, run: ${colors.bold('videosays login')}`);
    process.exit(0);
  }

  const apiKey = await fetchApiKey(response.access_token);
  if (!apiKey) error(`Registered, but API key was not ready. Try ${colors.bold('videosays login')} in a moment.`);

  saveConfig(apiKey);
  success('Registered.');
  success(`API key saved to ${CONFIG_FILE}`);
  return apiKey;
}

async function doLogin(email, password) {
  info('Logging in...');
  const response = await supabaseRequest('/auth/v1/token?grant_type=password', { email, password });

  if (response.msg) error(`Login failed: ${response.msg}`);
  if (!response.access_token) error('Login failed. No access token returned.');

  const apiKey = await fetchApiKey(response.access_token);
  if (!apiKey) error('Logged in, but API key was not found.');

  saveConfig(apiKey);
  success('Logged in.');
  success(`API key saved to ${CONFIG_FILE}`);
  return apiKey;
}

async function cmdSetup() {
  info(colors.bold('videosays - account setup'));
  console.log('');
  console.log('  1) Register a new account');
  console.log('  2) Log in to an existing account');
  console.log('');

  const choice = await ask(colors.cyan('Choose [1/2]: '));
  if (choice === '1') return cmdRegister();
  if (choice === '2') return cmdLogin();
  error('Invalid choice.');
}

async function cmdRegister() {
  const email = await ask('Email: ');
  if (!email) error('Email is required.');

  const password = await ask('Password (at least 6 characters): ', { hidden: true });
  console.log('');
  if (!password || password.length < 6) error('Password must be at least 6 characters.');

  const passwordAgain = await ask('Confirm password: ', { hidden: true });
  console.log('');
  if (password !== passwordAgain) error('Passwords do not match.');

  const apiKey = await doRegister(email, password);
  if (apiKey) {
    console.log('');
    await cmdBalance();
  }
}

async function cmdLogin() {
  const email = await ask('Email: ');
  if (!email) error('Email is required.');

  const password = await ask('Password: ', { hidden: true });
  console.log('');
  if (!password) error('Password is required.');

  const apiKey = await doLogin(email, password);
  if (apiKey) {
    console.log('');
    await cmdBalance();
  }
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

function printTaskSummary(task) {
  const video = task.video ?? {};
  if (video.platform) info(`   Platform: ${video.platform}`);
  if (video.author) info(`   Author: ${video.author}`);
  if (video.title) info(`   Title: ${video.title}`);

  const duration = getTaskDurationMinutes(task);
  if (duration != null) info(`   Billed duration: ${duration} minutes`);
}

async function cmdTranscribe(input, language = 'zh-CN') {
  if (!input) {
    error('Please provide a video link or share text.\n  Usage: videosays transcribe <video-link-or-share-text> [language]');
  }

  getApiKey();

  info(`Submitting transcription: ${colors.yellow(input.substring(0, 80))}`);
  info(`   Language: ${language}`);
  info('   Submiting...');

  const task = await apiCall('POST', '/api/v1/transcribe', { input, language });
  const taskId = task.taskId || task.id;
  if (!taskId) error('Task creation failed. No taskId returned.');

  const timeoutSeconds = 300;
  const intervalMs = 3000;
  const startedAt = Date.now();

  info(`   Task ID: ${taskId}`);

  if (task.status === 'completed') {
    console.log('');
    success('Transcription completed.');
    printTaskSummary(task);
    console.log('');
    info(colors.bold('Transcript:'));
    console.log(getTaskText(task) || '(empty)');
    return;
  }

  while (Date.now() - startedAt < timeoutSeconds * 1000) {
    await new Promise((resolve) => setTimeout(resolve, intervalMs));
    const elapsed = Math.round((Date.now() - startedAt) / 1000);
    const poll = await apiCall('GET', `/api/v1/transcribe/${taskId}`);

    if (poll.status === 'completed') {
      console.log('');
      success('Transcription completed.');
      printTaskSummary(poll);
      console.log('');
      info(colors.bold('Transcript:'));
      console.log(getTaskText(poll) || '(empty)');
      return;
    }

    if (poll.status === 'failed') {
      error(`Transcription failed: ${getTaskError(poll)}`);
    }

    info(`   Waiting... (${elapsed}s, status: ${poll.status})`);
  }

  error(`Transcription timed out after ${timeoutSeconds}s. Task ID: ${taskId}`);
}

async function cmdStatus(taskId) {
  if (!taskId) error('Please provide taskId.\n  Usage: videosays status <taskId>');

  const task = await apiCall('GET', `/api/v1/transcribe/${taskId}`);
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
    const platform = task.video?.platform ? `[${task.video.platform}]` : '';
    console.log(`  ${status.padEnd(14)} ${platform.padEnd(14)} ${oneLineTitle.padEnd(50)} ${date}`);
  }
}

function showHelp() {
  console.log(`videosays-cli v${VERSION}

Usage:
  videosays setup
  videosays register
  videosays login
  videosays transcribe <video-link-or-share-text> [language]
  videosays status <taskId>
  videosays balance
  videosays history [limit]
  videosays help

Shortcut:
  videosays "<video-link-or-share-text>"

Configuration:
  API key file: ~/.videosays
  VIDEOSAYS_API_KEY             API key, preferred over config file
  VIDEOSAYS_API_URL             API URL (default: https://api.videosays.com)
  VIDEOSAYS_SUPABASE_URL        Supabase URL for setup/login
  VIDEOSAYS_SUPABASE_ANON_KEY   Supabase anon key for setup/login

Examples:
  videosays setup
  videosays transcribe "https://www.tiktok.com/@creator/video/123456"
  videosays transcribe "https://v.douyin.com/xxxxx/" zh-CN
  videosays status 123e4567-e89b-12d3-a456-426614174000
  videosays balance
  videosays history 20

Only submit videos you own, created, or have permission to process.

Website: https://videosays.com
API:     ${API_URL}`);
}

const args = process.argv.slice(2);
const command = args[0];

switch (command) {
  case 'setup':
    await cmdSetup();
    break;
  case 'register':
    await cmdRegister();
    break;
  case 'login':
    await cmdLogin();
    break;
  case 'transcribe':
  case 'caption':
    await cmdTranscribe(args[1], args[2]);
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
      await cmdTranscribe(command, args[1]);
    } else {
      showHelp();
    }
    break;
}
