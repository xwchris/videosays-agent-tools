# videosays

Videosays command-line tool for turning video links and share text into transcript text.

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
```

## Commands

```bash
videosays login
videosays login --api-key <api-key>
videosays logout
videosays whoami
videosays transcribe <video-link-or-share-text> [language]
videosays transcribe <video-link-or-share-text> --format timeline
videosays transcribe <video-link-or-share-text> --format srt
videosays transcribe <video-link-or-share-text> --format vtt
videosays status <taskId>
videosays status <taskId> --format srt
videosays balance
videosays history [limit]
videosays help
```

## Transcription Output

By default, `transcribe` and `status` print only the transcript text to stdout.

Use `--format` when the user asks for a different result shape:

```bash
videosays transcribe "<video-link>" --format timeline
videosays transcribe "<video-link>" --format srt
videosays transcribe "<video-link>" --format vtt
videosays status "<task-id>" --format srt
```

If a task is still running, the command prints a pending block:

```text
VIDEOSAYS_TASK_PENDING
task_id=<task-id>
status=processing
next=videosays status <task-id>
```

Run the `next` command later until transcript text or the requested format is returned.

## Configuration

The API key is saved to `~/.videosays` by default.

Environment variables:

```bash
export VIDEOSAYS_API_KEY="vs_xxxxx"
export VIDEOSAYS_API_URL="https://api.videosays.com"
```

## License

MIT
