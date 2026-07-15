# videosays

AI-agent-friendly CLI for video transcription, video to text, speech to text, subtitle extraction, and transcript export.

Videosays turns supported video links or share text into clean transcript text, timestamped timelines, SRT subtitles, and VTT subtitles.

中文：Videosays 是面向 AI Agent 和命令行用户的视频转文字 CLI，支持把公开视频链接或分享文本转成纯文本、带时间轴文本、SRT 字幕和 VTT 字幕。

Supported platforms include Douyin, TikTok, Xiaohongshu, Bilibili, YouTube, and Kuaishou. Availability can vary by source video accessibility, region, platform restrictions, and whether captions or transcribable audio are available.

支持平台包括抖音、TikTok、小红书、Bilibili、YouTube、快手。实际可用性会受视频访问权限、地区、平台限制、字幕或音频可获取性影响。

## Install

```bash
# Use directly
npx videosays login

# Or install globally
npm install -g videosays
videosays login
```

Requires Node.js >= 18.

## Quick Start

```bash
# First use: authorize in the browser, then save API key to ~/.videosays
videosays login

# Transcribe a video link or share text
videosays transcribe "https://www.tiktok.com/@creator/video/123456"

# Retrieve the result after the returned Task ID is ready
videosays status "<task-id>"
```

## Commands

```bash
videosays login
videosays login --api-key <api-key>
videosays logout
videosays whoami
videosays transcribe <video-link-or-share-text>
videosays transcribe <video-link-or-share-text> --format text
videosays transcribe <video-link-or-share-text> --format timeline
videosays transcribe <video-link-or-share-text> --format srt
videosays transcribe <video-link-or-share-text> --format vtt
videosays status <taskId>
videosays status <taskId> --format srt
videosays batch <links.txt>
videosays batch status <batch-id>
videosays batch continue <batch-id>
videosays batch cancel <batch-id>
videosays balance
videosays history [limit]
videosays help
```

Submission commands return promptly with a server Task ID or Batch ID. Use `status` or `batch status` as short, one-shot checks. Add `--wait` only for an interactive terminal that should remain attached.

For multiple links, put one input per line in a text file and use `batch`. The server resolves duration and reserves credit one item at a time. If credit is insufficient, later links are not sent to the metadata provider; top up and run `batch continue <batch-id>`.

## Transcription Output

By default, `transcribe` submits and immediately prints a pending receipt. `status` prints transcript text after completion. Both commands use text output unless another format is requested.

Use `--format` when the user asks for a different result shape:

```bash
videosays transcribe "<video-link>" --format text
videosays status "<task-id>" --format timeline
videosays status "<task-id>" --format srt
videosays status "<task-id>" --format vtt
```

Formats:

- `text`: plain transcript, default
- `timeline`: timestamped transcript segments
- `srt`: SRT subtitle file content
- `vtt`: VTT subtitle file content

输出格式：

- `text`: 纯文本，默认格式
- `timeline`: 带时间轴分段
- `srt`: SRT 字幕
- `vtt`: VTT 字幕

If a task is still running, the command prints a pending block:

```text
VIDEOSAYS_TASK_PENDING
task_id=<task-id>
status=processing
next=videosays status <task-id>
```

Run the `next` command later until transcript text or the requested format is returned.

Errors are printed to stderr and exit non-zero:

```text
Error: 余额不足，请充值后再提交任务。
Code: insufficient_credits
Next: videosays balance
Recharge: https://videosays.com/dashboard/billing
```

## Configuration

The API key is saved to `~/.videosays` by default.

Environment variables:

```bash
export VIDEOSAYS_API_KEY="vs_xxxxx"
export VIDEOSAYS_API_URL="https://api.videosays.com"
```

## License

MIT
