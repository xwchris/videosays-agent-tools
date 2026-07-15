# Videosays Agent Tools

[![npm version](https://img.shields.io/npm/v/videosays?label=npm%20videosays)](https://www.npmjs.com/package/videosays)
[![license](https://img.shields.io/npm/l/videosays)](./LICENSE)
[![Node.js](https://img.shields.io/node/v/videosays)](https://www.npmjs.com/package/videosays)

AI-agent-friendly CLI and `SKILL.md` package for video transcription, video to text, speech to text, subtitle extraction, and transcript export.

Videosays turns supported video links or share text into clean transcript text, timestamped timelines, SRT subtitles, and VTT subtitles. It is built for humans using a terminal and for AI agents using a skill.

中文：Videosays 是面向 AI Agent 和命令行用户的视频转文字工具，支持把公开视频链接或分享文本转成纯文本、带时间轴文本、SRT 字幕和 VTT 字幕。

Supported platforms include Douyin, TikTok, Instagram Reels, X (Twitter), Xiaohongshu, Bilibili, YouTube, and Kuaishou. Availability can vary by source video accessibility, region, platform restrictions, and whether captions or transcribable audio are available.

支持平台包括抖音、TikTok、Instagram Reels、X（Twitter）、小红书、Bilibili、YouTube、快手。实际可用性会受视频访问权限、地区、平台限制、字幕或音频可获取性影响。

This repository contains:

- `packages/cli` - npm CLI package, exposed as the `videosays` command.
- `skills/videosays` - canonical agent skill that calls `npx videosays`.
- `SKILL.md` - root copy for directories that require a repository-root skill file, such as SkillsLLM.

## Quick Start

```bash
npx videosays login
npx videosays transcribe "https://www.tiktok.com/@creator/video/123456"
npx videosays transcribe "https://www.bilibili.com/video/BV1234567890" --format srt
```

The CLI stores your API key in `~/.videosays`. You can also provide it through `VIDEOSAYS_API_KEY`.

首次使用会打开浏览器授权，CLI 会把 API key 保存到 `~/.videosays`。也可以通过 `VIDEOSAYS_API_KEY` 环境变量提供。

## Agent Skill

Use Videosays from an AI agent by giving it this prompt:

```text
Read https://videosays.com/SKILL.md, install the Videosays Skill if your environment supports skills, and help me transcribe this public video link.
```

Or install the skill from this repository:

```bash
npx skills add xwchris/videosays-agent-tools
```

Install through ClawHub or SkillUse:

```bash
clawhub install @wegofuture/videosays
skilluse repo add xwchris/videosays-agent-tools --path skills --branch main --default
skilluse install videosays --agent codex --global
```

`skills/videosays/SKILL.md` is the canonical skill entry for registry distribution. The root `SKILL.md` and the website copy at `https://videosays.com/SKILL.md` should stay byte-for-byte in sync with it.

`skills/videosays/SKILL.md` 是分发平台使用的 canonical skill。根目录 `SKILL.md` 和网站公开版本 `https://videosays.com/SKILL.md` 需要保持同步。

## Output Formats

```bash
videosays transcribe "<video-link-or-share-text>" --format text      # plain transcript, default
videosays transcribe "<video-link-or-share-text>" --format timeline  # timestamped segments
videosays transcribe "<video-link-or-share-text>" --format srt       # SRT subtitles
videosays transcribe "<video-link-or-share-text>" --format vtt       # VTT subtitles
videosays status "<task-id>" --format srt
```

输出格式：

- `text`: 纯文本，默认格式
- `timeline`: 带时间轴分段
- `srt`: SRT 字幕
- `vtt`: VTT 字幕

## Skill Distribution

### skills.sh / npx skills

`skills.sh` discovers skills from public GitHub repositories. This repository uses the standard `skills/videosays/SKILL.md` layout:

```bash
npx skills add xwchris/videosays-agent-tools
npx skills find videosays
```

### ClawHub / OpenClaw

Install the published skill from the Wegofuture organization:

```bash
clawhub install @wegofuture/videosays
clawhub inspect @wegofuture/videosays
```

Publish updates after signing in to ClawHub with access to the `wegofuture` publisher:

```bash
clawhub login
clawhub skill publish skills/videosays --owner wegofuture
```

### SkillUse

SkillUse can install skills from GitHub-backed repositories:

```bash
skilluse repo add xwchris/videosays-agent-tools --path skills --branch main --default
skilluse install videosays --agent codex --global
```

The `--path skills` flag is required because this repository keeps the canonical skill at `skills/videosays/SKILL.md` for registry compatibility. Omit `--global` if you want SkillUse to install into the current project's local agent skill directory instead.

## Maintenance

Keep the canonical skill, root skill copy, and website copy in sync:

```bash
bash scripts/check-skill-sync.sh
VIDEOSAYS_PUBLIC_SKILL_PATH=/path/to/video2txt/packages/web/public/SKILL.md bash scripts/check-skill-sync.sh
```

### SkillsLLM

SkillsLLM expects a `SKILL.md` file at the root of the submitted GitHub repository. Submit this repository URL and use the root `SKILL.md` copy:

```text
https://github.com/xwchris/videosays-agent-tools
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
videosays batch <links.txt> --batch-id <stable-batch-id>
videosays batch resume <stable-batch-id>
videosays batch status <stable-batch-id>
videosays balance
videosays history [limit]
videosays help
```

## Links

- Website: https://videosays.com
- Public skill: https://videosays.com/SKILL.md
- API: https://api.videosays.com
- CLI package: `videosays`

## License

MIT
