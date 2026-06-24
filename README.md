# Videosays Agent Tools

Videosays command-line and agent skill packages for turning authorized video content into clean transcript text.

This repository contains:

- `packages/cli` - npm CLI package, exposed as the `videosays` command.
- `packages/skill` - agent skill that calls `npx videosays-cli`.

## Quick Start

```bash
npx videosays-cli setup
npx videosays-cli transcribe "https://www.tiktok.com/@creator/video/123456"
```

The CLI stores your API key in `~/.videosays`. You can also provide it through `VIDEOSAYS_API_KEY`.

## Commands

```bash
videosays setup
videosays register
videosays login
videosays transcribe <video-link-or-share-text> [language]
videosays status <taskId>
videosays balance
videosays history [limit]
videosays help
```

## Compliance Note

Videosays is intended for videos you own, created, or have permission to process. It does not provide a video downloading, watermark removal, or redistribution service. Users are responsible for ensuring they have the necessary rights to submit content for transcription.

## Links

- Website: https://videosays.com
- API: https://api.videosays.com
- CLI package: `videosays-cli`

## License

MIT
