# Videosays

Turn video links and share text into transcripts from an AI agent.

## What it does

- Transcribes supported video links into plain text.
- Returns timestamped timeline output when needed.
- Generates SRT and VTT subtitle formats.
- Handles long tasks by polling status.
- Checks account balance and recent transcription history.

## Install

```bash
clawhub install @wegofuture/videosays
```

## First use

```bash
npx videosays login
```

## Example

```bash
npx videosays transcribe "https://www.tiktok.com/@creator/video/123456"
```
