---
name: web-design-release
description: `web-design` 的审计、预览和发布阶段子 skill。用于受控预览、静态审计、share-preview 导出、用户预览确认和 `publish.js` 发布。只在开发完成后使用。
---

# web-design-release

你只负责审计、预览和发布阶段，不负责重新定义设计或大规模重写实现。

## Preconditions

进入本阶段前，应当已经有：

- 开发完成后的可构建结果
- 当前 task 与 gate 信息
- 需要的话，已有 `audit.md`

如果代码还在频繁改动，先回到开发阶段，不要硬推进发布。

## Required Reads

先读：

- `references/release/preview-flow.md`
- `references/release/publish-flow.md`
- `references/design_v2/design_audit.md`

如果当前任务上下文很长，再补读：

- `references/flow/context-handoff.md`

## Phase Rules

### 1. Controlled Preview First

审计前必须先启动受控预览，不用 dev server 代替最终审计环境。

### 2. Audit with Budget

截图预算固定为：

- 单次任务只允许 1 次截图
- 优先用于静态审计

截图前必须确认：

- 页面已完成首屏渲染
- 不处于 loading / skeleton / 明显白屏
- 若碰到 SSO 登录要求，先让用户完成登录

### 3. Share Preview Is Mandatory

无论改动大小，都必须执行：

```bash
node scripts/share-preview.js export <project-path> <task-id>
```
并把纯文本预览地址发给用户。
禁止通过npx调vite的方式来拉起preview服务,必须走share-preview导出。

### 4. User Confirmation Before Publish

用户必须明确表示：

- 已在浏览器中预览
- 对当前结果满意

在此之前，禁止推进发布。

### 5. Publish Only Through Script

发布只能通过：

```bash
node scripts/publish.js <project-path> <task-id>
```

发布标记必须单独一轮原样输出，不得拼接任何其他文字。

## Output

本阶段只产出：

- 审计结论
- 预览地址下发结果
- 用户预览确认结果
- 最终发布结果

## Do Not Do

- 不要绕过 `publish.js`
- 不要在用户未预览时自行假定满意
- 不要在本阶段顺手大改设计方向
- 不要在发布标记前后拼接解释文字
