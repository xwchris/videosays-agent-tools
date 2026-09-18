# 国内 Agent 分发记录

核对日期：2026-09-18。这里区分三件事：能导入自己使用、能提交公共市场、审核通过后其他人能搜到。前两项不代表已公开上架。

## Qoder：已提交审核

- 入口：[我的发布](https://qoder.cn/account/apphub-publications)。发布账号：`xiaokunonly`。
- 显示名：**抖音文案提取 · 视频说**；署名：Wegofuture；分类：内容创作。
- 安装标识沿用 `videosays`；提交的是 `dist/releases/videosays-skill-1.2.8.zip`，只有 canonical `SKILL.md`。
- ZIP SHA-256：`18f3311daf4521f1258328d7b1516d932638e93180f5ea84a9284c89cc1eaa47`。
- 图标沿用官网品牌图标。联系方式使用公开 GitHub 仓库地址。
- 主要适配端勾选 Qoder APP、Qoder IDE、Qoder CLI；未勾选 QoderWake 和 Cloud Agent。平台提示其他产品端仍可能展示该扩展。
- 提交后后台显示 **待审核 / 未上架**。这是投稿回执，不是审核通过或目标客户端完整转写测试的证明。

实际提交的中文描述：

> 粘贴抖音、小红书、B站或 YouTube 视频链接，提取口播文案、视频转文字，导出带时间轴的逐字稿或 SRT/VTT 字幕。支持多个链接批量处理。需要 Node.js、视频说（Videosays）账号及可用分钟数；不支持直接上传本地视频。

Qoder 的中文展示信息在表单里填写，不需要把 WorkBuddy 专用字段塞进标准包。此次未改 CLI、canonical Skill 或 npm 版本。后续更新先查看现有条目，避免重新创建同名条目。

参考：[Qoder 官方上架指南](https://docs.qoder.cn/qoderwork/user-guide/qoderwork-extension-release-guide-skill-plugin-connector)。当前发布表单列出的产品端以页面为准，不把旧文档中的 QoderWork 名称当作新的独立投稿渠道。

## MiniMax Agent：公开搜索已验证

- [技能市场](https://agent.minimaxi.com/skills)，发布者显示为「肖坤」。
- 在公共市场搜索 `videosays`，已能看到本账号的条目及中文简介。
- 最初上传标准 ZIP 失败；改用单个 `SKILL.md` 上传成功。后用 `npm run build:skill:china` 生成的文件更新同名条目并发布，未新建第二个条目。
- 当前上传文件 SHA-256：`f0eaa132214f7ce48f3b4b2265e609668f16945febbe09e5f81434dc1a95120c`。执行正文保持 canonical 版本不变。
- 市场标题仍为 `videosays`；中文内容在简介中。平台的「编辑」会进入其 Agent 对话，目前未完成标题自定义。不要把它记录成完整的中文标题已上线。
- 已验证公开搜索结果；尚未在 MiniMax 云端执行需要用户授权的实际转写。

## 其他渠道

| 平台 | 已核实的入口或限制 | 下一步 |
| --- | --- | --- |
| [MiniMax Agent](https://agent.minimaxi.com/skills) | 已上传并发布；公共搜索可见中文简介 | 标题仍用 `videosays`，实际转写需要用户授权验证 |
| [扣子](https://docs.coze.cn/cozespace_create_skill) | 已建立专门的技能项目并完成平台打包；公开上架需资质、审核和 3 个真实使用案例 | 继续完成公开上架资格、云端认证及案例；当前未公开上架 |
| [豆包工作](https://www.doubao.com/work) | 客户端已核实“新建 → 上传技能”；尚未核实面向个人的公开自助投稿入口 | 可以提供标准包导入；未提交到公共市场 |
| [千问办公](https://qwenwork.cn/docs/features/extensions) | 官方 FAQ 明确当前不支持个人把自建技能发布到公共扩展；企业空间共享另有组织权限 | 暂不按公共上架渠道推进 |
| [千问 App 开放平台](https://open.qianwen.com/) | “Skill 接入”标为“即将开放” | 开放后再接；不与千问办公、Qoder 混为一个入口 |
| [TRAE](https://docs.trae.cn/ide_skills) | 支持标准 Skill 导入和项目技能目录；未核实公开市场自助投稿路径 | 可使用现有仓库安装；不宣称已上架其市场 |

TRAE 公共上架限制另见[官方支持答复](https://forum.trae.cn/t/topic/175878)。千问 AI 平台也有 Skill 市场和自建 Agent 的 Skill 上传 API；这些事实本身不能证明个人可以把同一包发布到千问 App 的公共市场。

## 扣子项目回执

- 正式技能项目：[抖音文案提取技能](https://code.coze.cn/p/7686712933140971535)。从扣子编程首页的「技能」类型创建，下载官网标准 `SKILL.md`；平台生成 `videosays.skill`。
- 构建版本：`3fefdea104`；打包面板已显示「打包成功」。平台生成的预览对话仅解释技能用途，不是实际转写验收，也不能充当 3 个真实案例。
- 当前未提交公开上架资质或商店审核。扣子文档要求在「我的技能」自建条目中申请上架资质；本次刷新列表尚未显示对应自建条目，因此不记录为资质申请已提交。
- 不要通过「导入项目」把只有 `SKILL.md` 的 ZIP 当通用代码项目导入；它不会自动变成技能项目。初次导入留下的私有项目 `7686732102557057050` 未发布，其无效配置搜索已停止；后续使用上面的正式技能项目，不再重复创建。

## 安装与验证

支持 GitHub Skill 安装的客户端可用：

```bash
npx skills add xwchris/videosays-agent-tools --skill videosays
```

支持 ZIP 的客户端使用现有 [1.2.8 release](https://github.com/xwchris/videosays-agent-tools/releases/tag/v1.2.8) 中的 portable 包 `videosays-skill-1.2.8.zip`。不要使用 WorkBuddy 专用 ZIP 代替通用包。

如果平台直接把 `SKILL.md` 的 description 用作中文市场简介，可运行 `npm run build:skill:china`。输出 `dist/china/videosays/SKILL.md` 和 `dist/china/videosays-cn-1.2.8.zip`：只替换标准 description 为现有中文文案，name 仍为 `videosays`，执行正文与 canonical 文件完全一致。不增加平台专用字段，也不复制维护第二套执行流程。显示名仍要根据平台实际支持的后台字段填写。

首次在一个客户端适配时，应验证 Node.js/npx、浏览器授权、分钟数查询、单次提交后用同一任务 ID 取结果、字幕下载。云端 Agent 还需验证授权是否能跨云端会话完成及凭证的安全保存方式。不得把 API Key 写进 Skill、ZIP 或公开使用案例。
