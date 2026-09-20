---
name: videosays
description: Transcribe video links and extract spoken scripts or subtitles from Douyin, Xiaohongshu, Bilibili, YouTube, TikTok, and other supported platforms. Use for single or batch transcription, timestamped transcripts, SRT/VTT export, credit balance, and transcription history.
---

# Videosays Video to Text

Use `npx videosays@1.2.9` to submit video links and retrieve transcript text or subtitles. Commands pin the CLI to the tested release. The CLI sends the configured API key and submitted links/share text to the configured Videosays API. CLI source: https://github.com/xwchris/videosays-agent-tools/tree/v1.2.9/packages/cli .

Accept video links or copied share text when the user asks for a spoken script, transcript, or subtitle file. The CLI does not accept local video files. Source accessibility and supported content depend on the service response.

## Language and API

- Reply in the user's language: Chinese for Chinese requests, English for English requests. Explain CLI errors in that language; preserve command names, task IDs, and subtitle timestamps.
- Return the actual transcript in its original language. Summarize or translate it only when requested, and distinguish that work from the source transcript.
- The CLI's default API is `https://api.videosays.cn`, serving the same backend and accounts as `.com`. Language does not select a different backend. Honor an explicitly configured `VIDEOSAYS_API_URL`.
- Existing installations need a CLI update to receive the new default: `npm install -g videosays@1.2.9`, or use `npx videosays@1.2.9`. An older CLI can call the API with `VIDEOSAYS_API_URL=https://api.videosays.cn`, but its login/recharge links may still use `.com` until upgraded.

## Requirements

- Node.js 18 or newer
- `npx`

## Authentication

Before the first transcription in a session, run:

```bash
npx videosays@1.2.9 whoami
```

If authentication is missing, run:

```bash
npx videosays@1.2.9 login
```

Ask the user to open the printed authorization URL, sign in, and approve the CLI. If the user explicitly provides an API key, run `npx videosays@1.2.9 login --api-key "$VIDEOSAYS_API_KEY"`. Never print or reveal the API key.

## Single Link

Submit one link:

```bash
VIDEOSAYS_CLIENT_SURFACE=agent_skill VIDEOSAYS_CLIENT_NAME=videosays-skill npx videosays@1.2.9 transcribe "<video-link-or-share-text>"
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
npx videosays@1.2.9 status "<task-id>"
```

If the task is still running, `status` immediately prints its current state and the next command. Repeat status checks until the command prints transcript content or a stable error. Preserve the requested format on status checks:

```bash
npx videosays@1.2.9 status "<task-id>" --format timeline
npx videosays@1.2.9 status "<task-id>" --format srt
npx videosays@1.2.9 status "<task-id>" --format vtt
```

Each submission gets a client-generated `submissionId` sent as `Idempotency-Key`. If a command ends ambiguously, repeat the same command with the same `--submission-id <uuid>`; the server returns the original Task safely. Equivalent active work for the same account is reused, and completed work is reused by default. Use `--force-new` only when a fresh transcription is intentional. Treat `transcribe` only as creation: capture its returned server Task ID and use `status` for every later check. Never resubmit a link as a status check with a new submission id.

If submission ends with a network error or timeout before printing a Task ID, do not automatically resubmit with a new id. Retry with the same `--submission-id` when it is available; otherwise check `npx videosays@1.2.9 history` for a recent matching task and report the ambiguous outcome if it cannot be recovered.

## Multiple Links

When the user provides two or more links, use one server batch. Never build a shell loop, use `xargs`, start parallel `transcribe` commands, or submit the links individually.

1. Write one link or share text per line to a temporary text file. Duplicate lines keep their batch positions, while their effective status/result follows the canonical Task by default. Use `--force-new` when the user explicitly requests duplicate processing.
2. Submit once:

```bash
VIDEOSAYS_CLIENT_SURFACE=agent_skill VIDEOSAYS_CLIENT_NAME=videosays-skill npx videosays@1.2.9 batch links.txt
```

3. Capture the server-generated `batchId` from stdout.
4. Wait a reasonable interval, then make a one-shot status request:

```bash
npx videosays@1.2.9 batch status "<batch-id>"
```

5. Repeat status checks until the batch reaches `completed`, `partial`, `failed`, `cancelled`, or `paused`. Stop polling when paused and explain what is needed to continue.

While a batch is running, `batch status` uses a lightweight status response. When the batch finishes, the CLI retrieves the complete results once. Do not replace this with per-Task polling.

Every `batch <file>` submission sends a client-generated `Idempotency-Key`. Repeat an ambiguous submission with the same `--submission-id <uuid>` to receive the original server Batch ID; an equivalent active batch for the same account also converges on one Batch ID. Completed work is reused by default. Use `--force-new` only for an intentional fresh batch. Batch submission and status commands return promptly. Do not rerun the input file as a status check, do not invent a Batch ID, and do not use `batch resume`.

If batch submission ends before printing a Batch ID, do not automatically submit the file with a new id: the server may already have accepted it. Retry with the same `--submission-id` if one is available; otherwise check recent tasks and report the ambiguous outcome if it cannot be recovered.

Videosays creates every batch item as an ordinary Task and runs those Tasks through the normal queue. Each Task must reserve credit atomically before provider submission, so the balance cannot be overspent. If the batch reports `paused`, `continuation.required`, or `stopReason: insufficient_credits`, completed Tasks are preserved and unstarted Tasks may be skipped. Ask the user to top up, then after confirmation run:

```bash
npx videosays@1.2.9 batch continue "<batch-id>"
```

Then continue using `batch status` with the same Batch ID.

## Optional Interactive Waiting

Only use `--wait` when a human explicitly wants the terminal to remain attached:

```bash
npx videosays@1.2.9 transcribe "<video-link>" --wait
npx videosays@1.2.9 batch links.txt --wait
```

Agents must use the default immediate-return workflow so every tool call produces prompt, structured stdout.

## Other Commands

```bash
npx videosays@1.2.9 balance
npx videosays@1.2.9 history
npx videosays@1.2.9 batch cancel "<batch-id>"
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

- Website (China): https://videosays.cn/?utm_source=videosays_skill&utm_medium=agent_skill&utm_campaign=videosays_agent_skill
- API: https://api.videosays.cn
- API docs: https://videosays.cn/docs?utm_source=videosays_skill&utm_medium=agent_skill&utm_campaign=videosays_agent_skill&utm_content=api_docs
- Global website: https://videosays.com
- CLI: https://www.npmjs.com/package/videosays
