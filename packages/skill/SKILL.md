---
name: videosays
version: 1.0.0
description: Videosays video to text transcription, speech-to-text, subtitle extraction, caption transcription, Douyin/TikTok/YouTube/Xiaohongshu video transcript. Use when the user asks to transcribe a video link, extract spoken text, generate subtitles, check credit balance, or view transcription history. Only submit videos the user owns, created, or has permission to process.
license: MIT-0
requires:
  binaries:
    - npx
sendsDataTo:
  - https://api.videosays.com
---

# Videosays - Video to Text Transcription

Use `npx videosays` to turn authorized video content into transcript text. Search terms this skill covers include video to text, video transcription, speech to text, subtitle extraction, caption transcription, Douyin transcription, TikTok transcription, YouTube transcription, Xiaohongshu transcription, and short-video transcript. First use is guided through account registration or login.

> Important: This skill sends the user's API key and submitted video link/share text to Videosays. Only process videos the user owns, created, or has permission to process. Videosays is not a video downloading, watermark removal, or redistribution service.

## Requirements

- Node.js >= 18
- `npx`

## First Use

If no API key is configured, run:

```bash
npx videosays setup
```

The CLI saves the API key to `~/.videosays`.

## Commands

```bash
# Transcribe a video link or share text
npx videosays transcribe "https://www.tiktok.com/@creator/video/123456"

# Specify a language
npx videosays transcribe "https://v.douyin.com/xxxxx/" zh-CN

# Query credits
npx videosays balance

# View recent transcription history
npx videosays history
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

This skill calls `npx videosays`, which sends the submitted video link/share text and API key to `https://api.videosays.com` for transcription. Results are returned as transcript text.

## Links

- Website: https://videosays.com
- API: https://api.videosays.com
- CLI package: https://www.npmjs.com/package/videosays
