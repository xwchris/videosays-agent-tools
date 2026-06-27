# Videosays Agent Tools

Videosays command-line and agent skill packages for turning video links and share text into clean transcript text.

This repository contains:

- `packages/cli` - npm CLI package, exposed as the `videosays` command.
- `SKILL.md` - root agent skill for GitHub-based discovery and direct installs.
- `packages/skill` - packaged copy of the agent skill that calls `npx videosays`.

## Quick Start

```bash
npx videosays login
npx videosays transcribe "https://www.tiktok.com/@creator/video/123456"
```

The CLI stores your API key in `~/.videosays`. You can also provide it through `VIDEOSAYS_API_KEY`.

## Agent Skill

Use Videosays from an AI agent by giving it this prompt:

```text
Read https://videosays.com/SKILL.md and help me with Videosays.
```

Or install the skill from this repository:

```bash
npx skills add xwchris/videosays-agent-tools
```

The root `SKILL.md` is the canonical skill entry for GitHub-based registries such as `skills.sh`. Keep `packages/skill/SKILL.md` and the website copy at `https://videosays.com/SKILL.md` in sync with it.

## Skill Distribution

### skills.sh / npx skills

`skills.sh` discovers skills from public GitHub repositories. This repository exposes `SKILL.md` at the root so it can be installed directly:

```bash
npx skills add xwchris/videosays-agent-tools
npx skills find videosays
```

### ClawHub / OpenClaw

Publish the root skill after signing in to ClawHub:

```bash
clawhub login
clawhub skill publish .
clawhub inspect videosays
clawhub install videosays
```

If the registry expects a skill directory instead of the repository root, publish `packages/skill`:

```bash
clawhub skill publish packages/skill
```

### SkillUse

SkillUse can install skills from GitHub-backed repositories:

```bash
skilluse auth login
skilluse repo add xwchris/videosays-agent-tools
skilluse skill install videosays
```

If publishing through SkillUse, use the authenticated GitHub account with write access:

```bash
skilluse publish --repo xwchris/videosays-agent-tools
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
