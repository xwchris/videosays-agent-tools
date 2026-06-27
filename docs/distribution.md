# Videosays Skill Distribution

Use this checklist when publishing or updating the Videosays agent skill.

## Source of Truth

- Canonical skill: `skills/videosays/SKILL.md`
- Root copy for root-only directories: `SKILL.md`
- Website copy: `https://videosays.com/SKILL.md`
- Sync check:

```bash
bash scripts/check-skill-sync.sh
VIDEOSAYS_PUBLIC_SKILL_PATH=/Users/bytedance/code/kennyshaw/video2txt/packages/web/public/SKILL.md bash scripts/check-skill-sync.sh
```

## Search Terms

Use these terms in descriptions, tags, and marketplace forms:

```text
videosays, video transcription, video to text, speech to text, subtitle extractor, caption transcription, youtube transcript, tiktok transcript, douyin transcript, xiaohongshu transcript, ai agent video transcription, cli
```

## Channels

### ClawHub

Status: published.

- Canonical listing: `@wegofuture/videosays`
- Install:

```bash
clawhub install @wegofuture/videosays
clawhub inspect @wegofuture/videosays
```

- Publish update:

```bash
clawhub login
clawhub skill publish skills/videosays --owner wegofuture
```

Note: `@xwchris/videosays` is an old duplicate. Keep `@wegofuture/videosays` as the public canonical listing.

### skills.sh / npx skills

Status: repository is installable; search indexing requested.

- Repo: `https://github.com/xwchris/videosays-agent-tools`
- Install:

```bash
npx skills add xwchris/videosays-agent-tools
npx skills use xwchris/videosays-agent-tools --skill videosays
```

- Search issue: `https://github.com/vercel-labs/skills/issues/1532`
- After updates, verify:

```bash
npx skills find videosays
npx skills find "video transcription"
```

### SkillsLLM

Status: submitted manually.

- Submit URL: `https://skillsllm.com/submit`
- Submit repo: `https://github.com/xwchris/videosays-agent-tools`
- Required structure: root `SKILL.md`
- After updates, verify by searching `videosays`, `video transcription`, and `video to text`.

### AgenticSkills

Status: form submission failed because their review queue was not configured; submit by email.

- Submit URL: `https://agenticskills.io/submit`
- Contact: `hello@agenticskills.io`
- Contact email to list for Videosays: `wegofuture@126.com`
- Suggested fields:

```text
Skill Name: Videosays - Video to Text Transcription
GitHub Repository URL: https://github.com/xwchris/videosays-agent-tools
Category: Productivity
Short Description: AI agent skill and CLI for video transcription, video to text, subtitle extraction, and YouTube, TikTok, Douyin, Xiaohongshu transcripts.
Tags: video transcription, video to text, speech to text, subtitle extractor, youtube transcript, tiktok transcript, douyin transcript, xiaohongshu, ai agent, cli
Author: Wegofuture
Email: wegofuture@126.com
Website: https://videosays.com/SKILL.md
```

### SkillUse

Status: verified.

SkillUse needs the `--path skills` flag because this repository keeps the canonical skill at `skills/videosays/SKILL.md`.

```bash
skilluse repo add xwchris/videosays-agent-tools --path skills --branch main --default
skilluse search videosays
skilluse install videosays --agent codex --global
```

If `--global` is omitted, SkillUse installs into the current project's local agent skill directory.

### Agensi

Status: upload package prepared manually.

- Creator dashboard: `https://www.agensi.io/dashboard`
- Package format: zip with root `SKILL.md`
- Build upload zip:

```bash
rm -rf /tmp/videosays-agensi-skill /tmp/videosays-agensi-upload
mkdir -p /tmp/videosays-agensi-skill /tmp/videosays-agensi-upload
cp skills/videosays/SKILL.md /tmp/videosays-agensi-skill/SKILL.md
cd /tmp/videosays-agensi-skill
zip -X -r /tmp/videosays-agensi-upload/videosays-skill-v1.0.3.zip SKILL.md
unzip -l /tmp/videosays-agensi-upload/videosays-skill-v1.0.3.zip
```

- Suggested fields:

```text
Skill title: Videosays - Video to Text Transcription
Category: Productivity
Price: Free
Short description: Transcribe video links into clean text, timeline transcripts, SRT, or VTT subtitles using the Videosays CLI. Supports YouTube, TikTok, Douyin, and Xiaohongshu workflows for AI agents.
Tags: video transcription, video to text, speech to text, subtitle extractor, youtube transcript, tiktok transcript, douyin transcript, xiaohongshu, ai agent, cli
Website: https://videosays.com
Public skill URL: https://videosays.com/SKILL.md
GitHub URL: https://github.com/xwchris/videosays-agent-tools
Author / Creator: Wegofuture
Contact email: wegofuture@126.com
```

Listing description:

```text
Videosays helps AI agents turn video links or share text into usable transcripts.

Use it when a user asks to transcribe a video, extract spoken text, generate subtitles, create SRT/VTT files, or inspect recent transcription history. The skill guides the agent through CLI authentication, balance checks, transcription submission, long-running task polling, and clear handling for insufficient credits or unsupported media links.

The CLI supports plain text output by default, timestamped timeline output, and subtitle formats including SRT and VTT.
```

## Update Checklist

1. Update `skills/videosays/SKILL.md`.
2. Sync `SKILL.md` and the website `packages/web/public/SKILL.md`.
3. Run `scripts/check-skill-sync.sh`.
4. Publish npm CLI if CLI behavior changed.
5. Publish ClawHub update.
6. Rebuild and upload Agensi zip if the skill content changed.
7. Recheck search on ClawHub, SkillUse, skills.sh, SkillsLLM, AgenticSkills, and Agensi.
