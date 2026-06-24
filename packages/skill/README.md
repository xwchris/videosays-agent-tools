# Videosays Skill

Videosays agent skill for video transcription.

Use this skill when a user asks to:

- Transcribe a video link into text.
- Extract spoken content from a video.
- Query Videosays credit balance.
- View recent transcription history.

## Install

Clone this repository and point your agent runtime to `packages/skill`, or install it through your skill registry when available.

```bash
git clone https://github.com/xwchris/videosays-agent-tools.git
```

## First Use

```bash
npx videosays setup
```

## Examples

```bash
npx videosays transcribe "https://www.tiktok.com/@creator/video/123456"
npx videosays transcribe "https://v.douyin.com/xxxxx/" zh-CN
npx videosays balance
npx videosays history 10
```

## Compliance Note

Only submit videos the user owns, created, or has permission to process. Videosays does not provide video downloading, watermark removal, or redistribution.
