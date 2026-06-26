# Videosays Agent Tools

Videosays command-line and agent skill packages for turning video links and share text into clean transcript text.

This repository contains:

- `packages/cli` - npm CLI package, exposed as the `videosays` command.
- `packages/skill` - agent skill that calls `npx videosays`.

## Quick Start

```bash
npx videosays login
npx videosays transcribe "https://www.tiktok.com/@creator/video/123456"
```

The CLI stores your API key in `~/.videosays`. You can also provide it through `VIDEOSAYS_API_KEY`.

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

## Links

- Website: https://videosays.com
- API: https://api.videosays.com
- CLI package: `videosays`

## License

MIT
