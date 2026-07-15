---
name: videosays
description: Videosays video transcription, video to text, speech to text, subtitle extraction, caption transcription, YouTube transcript, TikTok transcript, Instagram Reels transcript, X or Twitter video transcript, Douyin transcript, Xiaohongshu transcript, WeChat Channels transcript, and AI agent video transcription. Use when the user asks to transcribe one or more video links, extract spoken text, generate subtitles, check credit balance, or view transcription history.
license: MIT-0
metadata:
  version: 1.2.0
  requires:
    binaries:
      - npx
  sendsDataTo:
    - https://api.videosays.com
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

Do not submit the link again while its task is pending. The API reuses a matching active task, but agents must still follow the returned Task ID.

## Multiple Links

When the user provides two or more links, use one server batch. Never build a shell loop, use `xargs`, start parallel `transcribe` commands, or submit the links individually.

1. Write one link or share text per line to a temporary text file.
2. Submit once:

```bash
VIDEOSAYS_CLIENT_SURFACE=agent_skill VIDEOSAYS_CLIENT_NAME=videosays-skill npx videosays batch links.txt
```

3. Capture the server-generated `batchId` from stdout.
4. Wait a reasonable interval, then make a one-shot status request:

```bash
npx videosays batch status "<batch-id>"
```

5. Repeat status checks until the batch reaches `completed`, `partial`, `failed`, or `cancelled`.

Batch submission and status commands return promptly. Do not invent a Batch ID and do not use `batch resume`.

Videosays resolves duration and checks credit sequentially. If an item exceeds the remaining credit, later unscanned links are skipped without another metadata-provider call. When `stopReason` is `insufficient_credits`, ask the user to top up; after confirmation run:

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

- Website: https://videosays.com
- API: https://api.videosays.com
- CLI: https://www.npmjs.com/package/videosays
