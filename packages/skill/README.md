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
npx videosays-cli setup
```

## Examples

```bash
npx videosays-cli transcribe "https://www.tiktok.com/@creator/video/123456"
npx videosays-cli transcribe "https://v.douyin.com/xxxxx/" zh-CN
npx videosays-cli balance
npx videosays-cli history 10
```

## Compliance Note

Only submit videos the user owns, created, or has permission to process. Videosays does not provide video downloading, watermark removal, or redistribution.
