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
videosays transcribe "https://www.tiktok.com/@creator/video/123456" --json
```

## Commands

```bash
videosays login
videosays login --api-key <api-key>
videosays logout
videosays whoami
videosays transcribe <video-link-or-share-text> [language]
videosays transcribe <video-link-or-share-text> --json
videosays transcribe <video-link-or-share-text> --no-wait
videosays status <taskId>
videosays balance
videosays history [limit]
videosays help
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
