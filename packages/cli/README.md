# videosays

Videosays command-line tool for turning authorized videos into transcript text.

## Install

```bash
# Use directly
npx videosays setup

# Or install globally
npm install -g videosays
videosays setup
```

Requires Node.js >= 18.

## Quick Start

```bash
# First use: register or log in, then save API key to ~/.videosays
videosays setup

# Transcribe a video you own or have permission to process
videosays transcribe "https://www.tiktok.com/@creator/video/123456"
```

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

## Configuration

The API key is saved to `~/.videosays` by default.

Environment variables:

```bash
export VIDEOSAYS_API_KEY="vs_xxxxx"
export VIDEOSAYS_API_URL="https://api.videosays.com"
```

For registration and login, the CLI uses Videosays' public Supabase auth configuration. You can override it if needed:

```bash
export VIDEOSAYS_SUPABASE_URL="https://your-project.supabase.co"
export VIDEOSAYS_SUPABASE_ANON_KEY="your_supabase_anon_key"
```

## Compliance Note

Only submit videos you own, created, or have permission to process. Videosays does not provide video downloading, watermark removal, or redistribution.

## License

MIT
