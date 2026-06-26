# Videosays Skill

Video to text, speech-to-text, subtitle extraction, caption transcription, and short-video transcript skill for agent workflows.

Videosays agent skill for video transcription.

Use this skill when a user asks to:

- Transcribe a video link into text.
- Convert short videos to transcript text.
- Extract spoken content from a video.
- Generate subtitle/caption text from supported video links.
- Query Videosays credit balance.
- View recent transcription history.

## Install

Clone this repository and point your agent runtime to `packages/skill`, or install it through your skill registry when available.

```bash
git clone https://github.com/xwchris/videosays-agent-tools.git
```

## First Use

```bash
npx videosays login
```

The CLI prints a browser authorization URL. Open it, sign in, authorize the CLI, and the API key is saved to `~/.videosays`.

## Examples

```bash
npx videosays transcribe "https://www.tiktok.com/@creator/video/123456"
npx videosays transcribe "https://v.douyin.com/xxxxx/" zh-CN
npx videosays transcribe "https://www.tiktok.com/@creator/video/123456" --format timeline
npx videosays transcribe "https://www.tiktok.com/@creator/video/123456" --format srt
npx videosays status "<task-id>" --format srt
npx videosays balance
npx videosays history 10
```

If output contains `VIDEOSAYS_TASK_PENDING`, wait and run the printed `videosays status <task-id>` command until transcript content is returned.
