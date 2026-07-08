---
name: web-design-build
description: `web-design` 的开发阶段子 skill。用于把已确认的 `design.md` 落成实现、拆分任务、约束组件边界，并保护脚手架鉴权 wiring。只在设计确认后使用。
---

# web-design-build

你只负责开发落地，不负责设计定稿、预览确认或发布标记。

## Preconditions

进入本阶段前，必须已经满足：

- `design.md` 已完成
- 用户已确认设计
- 当前 gate 已进入开发阶段

若这些条件不成立，先退回总控或设计阶段。

## Required Reads

开发前先读：

- `references/build/task-planning.md`
- `references/build/component-boundaries.md`
- `references/image.md`

如果实现强依赖设计细节，再回读：

- `references/design_v2/design.md`
- `references/design_v2/design-taste-frontend.md`

## Build Rules

### 1. Plan to Disk

先把开发计划落到磁盘文件中，再开始写代码。

要求：

- 禁止将整份任务计划塞进 context
- 一次只推进一个明确子任务
- 一个子任务只改一个紧密相关的文件

### 1.5. Keep Latest Progress On Disk

每完成一个开发子任务，就覆盖写一次：

- `.webdesign/tasks/<task-id>/progress/latest.md`

格式固定为：

```md
stage: build
task: <current-subtask>
status: in_progress | done | blocked
summary: <只写最新完成摘要>
next: <下一步>
updatedAt: <ISO timestamp>
```

要求：

- 对用户只汇报一句最新摘要，不回放整段流水
- heartbeat 只读取这份最新摘要
- 若子任务完成后准备切到别的组件，`next` 必须明确下一个组件或动作

### 2. Build by Component

不要一口气把整页糊进一个大文件。

默认拆分方式：

- 页面壳与布局
- 具体 UI 组件
- hooks / 状态逻辑
- services / 数据访问

### 3. Preserve Scaffold Wiring

默认保留：

- `src/app/router.jsx`
- `src/shared/auth/*`
- `src/shared/http/axios-instance.js`

禁止在页面开发中移除 SSO、路由守卫或鉴权请求头的改造,没有例外
只有在用户**明确要求公开页面 / public page** 时，才允许讨论是否放宽这套约束

### 4. Asset Rule

图片素材必须：

1. 下载到本地 `src/assets`
2. 在组件顶部 `import`
3. 在 JSX 中使用 import 结果

禁止：

- 直接保留外链 URL 作为最终资源
- `src="/assets/..."` 或 `src="./assets/..."`
- 读取图片原始内容塞进 context

### 5. Change Scope

默认只改：

- 页面内容
- 页面样式
- 业务组件
- 必要的受保护路由接入

不要在普通页面任务里顺手改技术栈、脚手架、发布脚本或 Gate 逻辑。

## Output

本阶段输出应当是：

- 已落盘的开发计划
- 按模块拆分的实现代码
- 可进入审计阶段的构建结果
- 最新的 `progress/latest.md`

## Do Not Do

- 不要在设计未确认时直接写代码
- 不要同时推进多个独立子任务
- 不要把逻辑、UI、服务全塞进一个文件
- 不要在本阶段讨论发布标记或上线动作
