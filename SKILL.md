---
name: videosays
version: 1.1.0
description: Videosays video transcription, video to text, speech to text, subtitle extractor, caption transcription, YouTube transcript, TikTok transcript, Instagram Reels transcript, X or Twitter video transcript, Douyin transcript, Xiaohongshu transcript, WeChat Channels transcript, and AI agent video transcription. Use when the user asks to transcribe a video link, extract spoken text, generate subtitles, check credit balance, or view transcription history.
license: MIT-0
requires:
  binaries:
    - npx
sendsDataTo:
  - https://api.videosays.com
---

# Videosays - Video to Text Transcription

Use `npx videosays` to turn video links or share text into transcript text. Search terms this skill covers include video to text, video transcription, speech to text, subtitle extraction, caption transcription, Douyin transcription, TikTok transcription, Instagram Reels transcription, X video transcription, Twitter video transcription, YouTube transcription, Xiaohongshu transcription, WeChat Channels transcription, 微信视频号转文字, and short-video transcript.

This skill sends the user's API key and submitted video link/share text to Videosays.

## Requirements

- Node.js >= 18
- `npx`

## First Use

If no API key is configured, run:

```bash
npx videosays login
```

The CLI prints a browser authorization URL and waits. Ask the user to open that URL, sign in to Videosays, and authorize the CLI. The CLI then saves the API key to `~/.videosays`.

If the user provides an API key directly, run:

```bash
npx videosays login --api-key "$VIDEOSAYS_API_KEY"
```

Do not print or reveal the API key in responses.

## Commands

Use the simplest command that matches the user's requested output. By default the CLI prints only transcript text to stdout, which is the preferred agent workflow.

```bash
# Check whether the CLI is already authenticated
npx videosays whoami

# Transcribe a video link or share text
VIDEOSAYS_CLIENT_SURFACE=agent_skill VIDEOSAYS_CLIENT_NAME=videosays-skill npx videosays transcribe "https://www.tiktok.com/@creator/video/123456"

# Explicitly request plain text, the default output
VIDEOSAYS_CLIENT_SURFACE=agent_skill VIDEOSAYS_CLIENT_NAME=videosays-skill npx videosays transcribe "https://v.douyin.com/xxxxx/" --format text

# Include timestamps for each segment
VIDEOSAYS_CLIENT_SURFACE=agent_skill VIDEOSAYS_CLIENT_NAME=videosays-skill npx videosays transcribe "https://www.tiktok.com/@creator/video/123456" --format timeline

# Generate subtitle formats
VIDEOSAYS_CLIENT_SURFACE=agent_skill VIDEOSAYS_CLIENT_NAME=videosays-skill npx videosays transcribe "https://www.tiktok.com/@creator/video/123456" --format srt
VIDEOSAYS_CLIENT_SURFACE=agent_skill VIDEOSAYS_CLIENT_NAME=videosays-skill npx videosays transcribe "https://www.tiktok.com/@creator/video/123456" --format vtt

# Check a task that is still running
npx videosays status "<task-id>"
npx videosays status "<task-id>" --format srt

# Query credits
npx videosays balance

# View recent transcription history
npx videosays history

# Reliably process multiple links from a text file
VIDEOSAYS_CLIENT_SURFACE=agent_skill VIDEOSAYS_CLIENT_NAME=videosays-skill npx videosays batch links.txt --batch-id "<stable-batch-id>"

# Resume or inspect an interrupted batch without creating new tasks
npx videosays batch resume "<stable-batch-id>"
npx videosays batch status "<stable-batch-id>"
```

## Batch Tasks

When the user provides two or more video links, use `videosays batch`. Do not build a shell loop, `xargs`, parallel subprocess wrapper, or repeated `transcribe` calls.

1. Write one link or share text per line to a text file.
2. Choose one stable batch ID and keep it for the entire user request.
3. Run `videosays batch <file> --batch-id <stable-batch-id>`.
4. If the terminal, tool call, or agent turn is interrupted, run `videosays batch resume <stable-batch-id>`.

The CLI persists the batch mapping locally and the API deduplicates the batch and its items. Never create a new batch ID merely because a command timed out.

## Authentication Check

Before the first transcription in a session, run:

```bash
npx videosays whoami
```

If it exits successfully, continue with transcription. If it exits non-zero because no API key is configured, run:

```bash
npx videosays login
```

Ask the user to complete the browser authorization URL printed by the CLI, then retry `npx videosays whoami`. Do not ask the user for their API key unless they explicitly want to provide one.

## Pending Tasks

Long videos may still be processing when `transcribe` returns. If stdout contains this block:

```text
VIDEOSAYS_TASK_PENDING
task_id=<task-id>
status=<status>
next=videosays status <task-id>
```

Do not treat it as a final transcript. Extract `task_id`, wait a reasonable interval, then run the `next` command. If the original user requested a format, preserve it on status checks, for example:

```bash
npx videosays status "<task-id>" --format srt
```

Repeat until the command prints transcript/subtitle content or exits with an error.

A terminal timeout does not cancel the server task. Never call `transcribe` again for the same pending item. Use the printed `task_id` with `status`, or use `batch resume` for batch work.

## Errors

If a command exits non-zero, read stderr. Do not treat stdout as transcript content.

The CLI prints stable error details when available:

```text
Error: <message>
Code: <error-code>
Next: <recommended-command>
Recharge: <billing-url>
```

If `Code: insufficient_credits` appears, do not retry transcription. Tell the user their balance is insufficient, suggest `npx videosays balance`, and provide the recharge URL if present.

For media or link errors such as `media_resolve_failed`, `media_unavailable`, or `media_inaccessible`, tell the user the link could not be processed and ask for another video link.

## Data Flow

This skill calls `npx videosays`, which sends the submitted video link/share text and API key to `https://api.videosays.com` for transcription. Transcript text or the requested timestamp/subtitle format is returned on stdout.

## Links

- Website: https://videosays.com
- API: https://api.videosays.com
- CLI package: https://www.npmjs.com/package/videosays
