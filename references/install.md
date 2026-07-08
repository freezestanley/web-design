# Setup

本文件只负责首次安装和环境初始化，不负责日常页面 workflow。

## Scope

适用场景：

- 首次把 `web-design` 装进当前 workspace
- 迁移到新的 agent workspace
- 缺少前置依赖，导致流程无法开始

不适用场景：

- 日常页面创建、设计、开发、发布
- 普通任务中的阶段推进

## Setup Checklist

### 1. Install prerequisite skills

如缺少依赖技能，再安装：

- `npx skills add https://github.com/greensock/gsap-skills`
- `npx skills add https://github.com/Leonxlnx/taste-skill`
- `npx skills add anthropics/skills --skill frontend-design`
- `npx skills add ofershap/tailwind-best-practices`

### 2. Initialize workspace config

- 把 `config.js` 中的 `PROJECTS_DIR` 指向当前 workspace 下的 `projects` 目录
- 确认模板、任务目录等配置可被脚本读取

### 3. Sync local support files

按需要同步：

- `references/context.md` 追加到当前 workspace 的 `AGENTS.md`

追加时只追加，不全量覆盖。

### 4. Install Node dependencies

在相应目录安装脚本依赖，确保 `scripts/*` 可以运行。

### 5. Restart supporting gateway if required

如果当前环境依赖 gateway 配置刷新，再执行重启，使配置生效。

## Do Not Do

- 不要把这里的 setup 步骤混成日常 workflow
- 不要把安装文档当作运行时规范来源
