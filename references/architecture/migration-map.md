# Migration Map

这份文件记录 `web-design` 重构后，各类规则现在的 canonical 位置。

## Main Orchestrator

保留在：

- `SKILL.md`

负责：

- 入口模式判定
- gate 路由
- 阶段文档加载顺序
- 不可绕过的总控红线

## Authority and Ownership

迁移到：

- `references/architecture/authority-map.md`

负责：

- code / prompt / tests 三层权威边界

## Flow Control

迁移到：

- `references/flow/entry-modes.md`
- `references/flow/gates.md`
- `references/flow/context-handoff.md`

负责：

- 任务模式分流
- gate 关键条件
- HANDOFF 与上下文治理

## Design Stage

迁移到：

- `skills/web-design-design/SKILL.md`
- `references/design_workflow.md`
- `references/design_v2/design.md`

负责：

- 页型分流
- 设计资料路由
- `design.md` 产出
- 设计自审

## Build Stage

迁移到：

- `skills/web-design-build/SKILL.md`
- `references/build/task-planning.md`
- `references/build/component-boundaries.md`

负责：

- 开发计划落盘
- 单任务推进
- 组件 / hooks / services 边界
- 脚手架鉴权 wiring 保护

## Release Stage

迁移到：

- `skills/web-design-release/SKILL.md`
- `references/release/preview-flow.md`
- `references/release/publish-flow.md`

负责：

- 受控预览
- 静态审计
- share-preview
- 用户预览确认
- `publish.js` 与发布标记协议
