---
name: videosays
description: Videosays video transcription, video to text, speech to text, subtitle extraction, caption transcription, YouTube transcript, TikTok transcript, Instagram Reels transcript, X or Twitter video transcript, Douyin transcript, Xiaohongshu transcript, WeChat Channels transcript, and AI agent video transcription. Use when the user asks to transcribe one or more video links, extract spoken text, generate subtitles, check credit balance, or view transcription history.
---

# Videosays Video Transcription

Use `npx videosays` to submit video links and retrieve transcript text or subtitles. The CLI sends the configured API key and submitted links/share text to Videosays.

## Requirements

- Node.js 18 or newer
- `npx`

## Authentication

Before the first transcription in a session, run:

```bash
npx videosays whoami
```

If authentication is missing, run:

```bash
npx videosays login
```

Ask the user to open the printed authorization URL, sign in, and approve the CLI. If the user explicitly provides an API key, run `npx videosays login --api-key "$VIDEOSAYS_API_KEY"`. Never print or reveal the API key.

## Single Link

Submit one link:

```bash
VIDEOSAYS_CLIENT_SURFACE=agent_skill VIDEOSAYS_CLIENT_NAME=videosays-skill npx videosays transcribe "<video-link-or-share-text>"
```

Submission returns quickly. It normally prints:

```text
VIDEOSAYS_TASK_PENDING
task_id=<task-id>
status=<status>
next=videosays status <task-id>
```

Capture `task_id`. Wait a reasonable interval, then run the printed one-shot status command:

```bash
npx videosays status "<task-id>"
```

If the task is still running, `status` immediately prints its current state and the next command. Repeat status checks until the command prints transcript content or a stable error. Preserve the requested format on status checks:

```bash
npx videosays status "<task-id>" --format timeline
npx videosays status "<task-id>" --format srt
npx videosays status "<task-id>" --format vtt
```

By default, a repeated video reuses the same account's active Task or a completed result from the last 30 days and does not consume more transcription minutes. Use `--force-new` only when the user explicitly requests a fresh transcription; it is billed normally. Capture the returned Task ID and use `status` for every later check. Never resubmit a link as a status check.

The CLI safely retries temporary network and service errors with the same idempotency key. If it still ends before printing a Task ID, check `npx videosays history` for a recent matching task first. Do not switch to `--force-new` automatically.

## Multiple Links

When the user provides two or more links, use one server batch. Never build a shell loop, use `xargs`, start parallel `transcribe` commands, or submit the links individually.

1. Write one link or share text per line to a temporary text file. Duplicate lines keep their batch positions, but by default their effective status and result follow the canonical Task. Use `--force-new` only when the user explicitly requests separate fresh transcriptions.
2. Submit once:

```bash
VIDEOSAYS_CLIENT_SURFACE=agent_skill VIDEOSAYS_CLIENT_NAME=videosays-skill npx videosays batch links.txt
```

3. Capture the server-generated `batchId` from stdout.
4. Wait a reasonable interval, then make a one-shot status request:

```bash
npx videosays batch status "<batch-id>"
```

5. Repeat status checks until the batch reaches `completed`, `partial`, `failed`, or `cancelled`, or reports a resumable `paused` state.

While a batch is running, `batch status` uses a lightweight status response. When the batch finishes, the CLI retrieves the complete results once. Do not replace this with per-Task polling.

Every new `batch <file>` invocation creates a server Batch ID, but repeated videos for the same account reuse the existing Task or result by default. Batch submission and status commands return promptly. Do not rerun the input file as a status check, do not invent a Batch ID, and do not use `batch resume`.

Batch submission carries an idempotency key, and the CLI safely retries temporary errors with that same key. If it still ends before printing a Batch ID, report the ambiguous outcome and check recent Tasks. Do not switch to `--force-new` automatically.

Videosays creates every batch item as an ordinary Task and runs those Tasks through the normal queue. Each Task must reserve credit atomically before provider submission, so the balance cannot be overspent. If the batch reports `paused` or `stopReason` is `insufficient_credits`, completed Tasks are preserved and unstarted Tasks wait to be resumed. Ask the user to top up, then after confirmation run:

```bash
npx videosays batch continue "<batch-id>"
```

Then continue using `batch status` with the same Batch ID.

## Optional Interactive Waiting

Only use `--wait` when a human explicitly wants the terminal to remain attached:

```bash
npx videosays transcribe "<video-link>" --wait
npx videosays batch links.txt --wait
```

Use a fresh, normally billed transcription only when the user explicitly asks to ignore existing work:

```bash
npx videosays transcribe "<video-link>" --force-new
npx videosays batch links.txt --force-new
```

Agents must use the default immediate-return workflow so every tool call produces prompt, structured stdout.

## Other Commands

```bash
npx videosays balance
npx videosays history
npx videosays batch cancel "<batch-id>"
```

## Errors

Read stderr when a command exits non-zero. Do not treat error output or a pending receipt as transcript content.

```text
Error: <message>
Code: <error-code>
Next: <recommended-command>
Recharge: <billing-url>
```

For `insufficient_credits`, do not repeatedly resubmit. Report the balance issue and recharge URL. For media or link errors such as `media_resolve_failed`, `media_unavailable`, or `media_inaccessible`, ask for another accessible video link.

## Links

- Website: https://videosays.com/?utm_source=videosays_skill&utm_medium=agent_skill&utm_campaign=videosays_agent_skill
- API docs: https://videosays.com/docs?utm_source=videosays_skill&utm_medium=agent_skill&utm_campaign=videosays_agent_skill&utm_content=api_docs
- CLI: https://www.npmjs.com/package/videosays
