---
name: videosays
version: 1.0.0
description: Videosays video to text transcription, speech-to-text, subtitle extraction, caption transcription, Douyin/TikTok/YouTube/Xiaohongshu video transcript. Use when the user asks to transcribe a video link, extract spoken text, generate subtitles, check credit balance, or view transcription history.
license: MIT-0
requires:
  binaries:
    - npx
sendsDataTo:
  - https://api.videosays.com
---

# Videosays - Video to Text Transcription

Use `npx videosays` to turn video links or share text into transcript text. Search terms this skill covers include video to text, video transcription, speech to text, subtitle extraction, caption transcription, Douyin transcription, TikTok transcription, YouTube transcription, Xiaohongshu transcription, and short-video transcript.

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

Prefer `--json` for agent workflows so downstream steps can parse task IDs, status, text, and errors reliably.

```bash
# Transcribe a video link or share text
npx videosays transcribe "https://www.tiktok.com/@creator/video/123456" --json

# Specify a language
npx videosays transcribe "https://v.douyin.com/xxxxx/" zh-CN --json

# Submit without waiting for completion
npx videosays transcribe "https://www.tiktok.com/@creator/video/123456" --no-wait --json

# Check a task
npx videosays status "<task-id>" --json

# Query credits
npx videosays balance --json

# View recent transcription history
npx videosays history --json
```

## Supported Languages

| Code | Language |
| ---- | -------- |
| `zh-CN` | Simplified Chinese |
| `zh-TW` | Traditional Chinese |
| `en` | English |
| `ja` | Japanese |
| `ko` | Korean |

## Data Flow

This skill calls `npx videosays`, which sends the submitted video link/share text and API key to `https://api.videosays.com` for transcription. Results are returned as JSON when `--json` is used.

## Links

- Website: https://videosays.com
- API: https://api.videosays.com
- CLI package: https://www.npmjs.com/package/videosays
