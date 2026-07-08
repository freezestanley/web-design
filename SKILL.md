---
name: web-design
description: 前端页面设计开发到上线的总控 SOP skill。用于 React 页面或项目的新建、续改、设计、开发、审计、预览和发布。凡是页面相关的新建、修改、编译、预览、发布，都必须使用这个 skill，禁止绕过。
---

# web-design

总控入口。它只负责 4 件事：

1. 判定当前任务属于哪种页面工作模式
2. 把任务推进到正确的 gate
3. 在正确阶段读取正确文档
4. 阻止绕过脚本、绕过确认、绕过发布流程

不要把这个文件当成实现细节百科。运行时行为以脚本为准，阶段策略以引用文档为准。

## Authority

- **运行时真相**：`scripts/gate.js`、`scripts/publish.js`、`scripts/share-preview.js`、`scripts/product-sync.js`、`scripts/vitectrl/dev-preview.js`
- **Agent 真相**：本 `SKILL.md` 与它引用的阶段文档
- **测试角色**：测试只验证当前代码和当前 prompt 契约，不能反过来定义规范

权威边界详见：

- `references/architecture/authority-map.md`
- `references/architecture/migration-map.md`

## Core Rules

- 页面相关的新建、修改、编译、预览、发布，都必须走 `web-design`
- 禁止修改技术栈或项目脚手架；只能使用 `templates/scaffold`
- 禁止跳过 SOP gate 或代替用户确认
- 禁止绕过 `publish.js` 直接发布
- 续改时，只允许操作 `PROJECTS_DIR` 下且存在 `.webdesign/project.json` 的托管项目
- 默认保留 `src/app/router.jsx`、`src/shared/auth/*`、`src/shared/http/axios-instance.js`
- 只有在用户**明确要求公开页面 / public page** 时，才允许讨论是否放宽这套鉴权 wiring
- 图片必须先落地到本地 `src/assets` 并通过 `import` 使用
- 预览地址必须以纯文本发给用户，禁止只给 Markdown 链接

## Before You Work

先做 3 个判断：

1. 当前是 `new build`、`revise existing`、`audit only`、还是 `publish only`
2. 当前 gate 在哪里
3. 当前任务是否需要先做 HANDOFF / context 瘦身

先读：

- `references/flow/entry-modes.md`
- `references/flow/gates.md`

长任务、上下文偏高、要进入截图或长日志阶段时，再读：

- `references/flow/context-handoff.md`

## Workflow

### 1. Intake

项目确认、任务创建、`product.md` 写入与 `product-sync` 属于总控阶段。

要求：

- 先用 `list-projects.js` / `resolve-project.js` / `init-project.js` 建立项目上下文
- 写 `product.md` 时必须收集页面主题、素材、文案、API、动效、受众、场景、验收要求
- 涉及 API 时，必须同时明确接口路径列表和 `upstreamOrigin`
- `product.md` 写完后，必须先执行 `node scripts/product-sync.js <project-path> <task-id> ...`
- `G2 -> G3` 必须带用户确认原话

### 2. Design

设计阶段开始前，必须先读取：

- `references/design_workflow.md`
- `skills/web-design-design/SKILL.md`

设计阶段禁止：

- 未判页型就先选工具
- 未完成 `design.md` 就进入代码开发
- 未定义图片策略就下载或引用素材

设计完成后：

- `design.md` 必须以 `references/design_v2/design.md` 为模板
- `G4 -> G5` 必须带用户确认原话

### 3. Build

只有在 `design.md` 已完成且用户确认后，才允许开发。

进入开发阶段前，必须读取：

- `skills/web-design-build/SKILL.md`
- `references/build/task-planning.md`
- `references/build/component-boundaries.md`

开发阶段要求：

- 先把开发计划落到磁盘文件，不要把整份任务计划塞进 context
- 单任务执行，一次只推进一个明确子任务
- 保持 UI、逻辑、服务职责分离
- 默认只替换页面内容、样式、业务组件和必要路由，不顺手拆脚手架
- **单任务输出边界**：每个 task完成后，必须在本轮回复中输出该任务的结果摘要
- **任务间衔接**：上一任务结果摘要输出后，下一任务在新一轮回复中开始

### 4. Audit / Preview / Release

开发完成后才进入审计、预览和发布：

- 先读取 `skills/web-design-release/SKILL.md`
- 再按需读取 `references/release/preview-flow.md` 与 `references/release/publish-flow.md`

- 审计前必须先启动受控预览
- 单次任务只允许 1 次截图，优先用于静态审计
- 必须执行 `share-preview export`
- 必须把纯文本预览地址发给用户
- 用户明确表示“已预览且满意”前，禁止推进发布
- 发布只能通过 `node scripts/publish.js <project-path> <task-id>`
- 发布标记必须单独一轮原样输出，不得拼接任何其他文字

## Primary References

- `references/architecture/authority-map.md`
- `references/architecture/migration-map.md`
- `references/flow/entry-modes.md`
- `references/flow/gates.md`
- `references/flow/context-handoff.md`
- `references/design_workflow.md`
- `references/image.md`
- `references/install.md`
- `references/design_v2/design.md`
- `references/design_v2/design_audit.md`
- `skills/web-design-design/SKILL.md`
- `skills/web-design-build/SKILL.md`
- `skills/web-design-release/SKILL.md`

## Script Entry Points

- `node scripts/list-projects.js`
- `node scripts/resolve-project.js <project-name>`
- `node scripts/init-project.js <project-name> <page-slug> <intent> [--summary "..."]`
- `node scripts/product-sync.js <project-path> <task-id> [upstream-origin]`
- `node scripts/gate.js status <project-path> <task-id>`
- `node scripts/gate.js advance <project-path> <task-id> [--confirm "..."]`
- `node scripts/gate.js block <project-path> <task-id> --reason "..."`
- `node scripts/gate.js unblock <project-path> <task-id>`
- `node scripts/gate.js reopen-dev <project-path> <task-id> --reason "..."`
- `node scripts/vitectrl/dev-preview.js <start|status|cleanup> <project-path> --bypass true`
- `node scripts/share-preview.js export <project-path> <task-id> [--output-dir <dir>]`
- `node scripts/publish.js <project-path> <task-id>`

## Anti-Patterns

- 跳过 gate 直接推进
- 用 dev server 代替受控预览和静态审计
- 用外链图片作为最终交付资源
- 自己代写“用户确认了”
- 多个页面任务塞进同一个 task
- 在普通页面任务里删除 SSO、路由守卫和鉴权请求头 wiring
- 手工拼接发布标记或绕过 `publish.js`

## Setup

首次安装或迁移环境时，读取：

- `references/install.md`
