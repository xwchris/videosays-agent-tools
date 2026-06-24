---
name: videosays
version: 1.0.0
description: Videosays video transcription. Use when the user asks to transcribe a video link, extract spoken text, check credit balance, or view transcription history. Only submit videos the user owns, created, or has permission to process.
requires:
  binaries:
    - npx
sendsDataTo:
  - https://api.videosays.com
---

# Videosays

Use `npx videosays-cli` to turn authorized video content into transcript text. First use is guided through account registration or login.

> Important: This skill sends the user's API key and submitted video link/share text to Videosays. Only process videos the user owns, created, or has permission to process. Videosays is not a video downloading, watermark removal, or redistribution service.

## Requirements

- Node.js >= 18
- `npx`

## First Use

If no API key is configured, run:

```bash
npx videosays-cli setup
```

The CLI saves the API key to `~/.videosays`.

## Commands

```bash
# Transcribe a video link or share text
npx videosays-cli transcribe "https://www.tiktok.com/@creator/video/123456"

# Specify a language
npx videosays-cli transcribe "https://v.douyin.com/xxxxx/" zh-CN

# Query credits
npx videosays-cli balance

# View recent transcription history
npx videosays-cli history
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

This skill calls `npx videosays-cli`, which sends the submitted video link/share text and API key to `https://api.videosays.com` for transcription. Results are returned as transcript text.

## Links

- Website: https://videosays.com
- API: https://api.videosays.com
- CLI package: https://www.npmjs.com/package/videosays-cli
