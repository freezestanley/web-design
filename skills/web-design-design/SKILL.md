---
name: web-design-design
description: `web-design` 的设计阶段子 skill。用于页型判定、设计资料路由、图片策略定义、`design.md` 编写和设计自审。只在 Step 3 设计阶段使用，不负责发布和最终交付。
---

# web-design-design

你只负责设计阶段，不负责发布、发布标记或最终上线。

## Inputs

进入本阶段前，应当已经具备：

- 已确认的 `product.md`
- 当前 `taskId`
- 当前页面目标、受众、场景、验收要求

若这些还没准备好，先回到总控阶段，不要直接脑补设计。

## Required Reads（按条件触发，非全量必读）

### 启动必读（任何页型都读，且只读这 3 份）

- `references/design_workflow.md`
- `references/design_v2/design.md`（design.md 模板本体）
- `references/image.md`

### 按页型选读（仅读命中项，未命中不读）

| 页型 | 必读 | 可选 |
|------|------|------|
| Marketing / Landing | `references/design/landing.md` | — |
| SaaS / Dashboard / Tool | `references/design/landing.md`（仅借用结构方法） | — |
| Story / PPT / Scrolltelling | `references/design/ppt.md` + `references/design/story.md` | — |
| 含视频 / 粒子 / 光影背景 | `references/design/background.md` | — |

禁止在启动阶段一次性 Read 全部引用。

### Hero 样例（严格索引优先）

1. 先读 `references/design_v2/example/index.md`
2. 仅当 index.md 中明确匹配当前需求时，才定向读取对应 `heroN.md`
3. **禁止**遍历 hero1-4、**禁止**直接读 `hero.md`（已知为空文件）

不要把整个 example 目录全量读完。

### 自审合并读取（design.md 完成后一次性执行）

同时读取以下两份，对照输出一份**合并自检报告**，不要拆成两次独立分析：

- `references/design_v2/design-taste-frontend.md`
- `references/design_v2/gpt-taste.md`

## Phase Rules

### 1. Classify Page Type

先把页面归入以下其一：

- `Marketing / Landing`
- `SaaS / Dashboard / Tool`
- `Story / PPT / Scrolltelling`
- `Hybrid`

`Hybrid` 必须额外写清：

- 主页型
- 副页型
- 副页型允许影响的模块

禁止先选工具，再倒推页型。

### 2. Route Local References

按 Required Reads 的页型选读表和 Hero 样例规则执行，不在此处重复列举文件路径。

补充行为约束：工具页借用 `landing.md` 结构方法时，必须服从当前业务 UI 秩序，不得照搬营销页视觉节奏。

### 3. Define Image Strategy First

写 `design.md` 前，必须先回答：

- 这页是否真的需要图片
- 图片扮演什么角色
- 图片在哪个 section
- 是否需要遮罩、裁切、焦点保护
- 移动端如何降级
- 缺图 fallback 是什么

没有这 6 个答案，不得进入实现规划。

### 4. Write `design.md`

`design.md` 必须以 `references/design_v2/design.md` 为模板，并至少覆盖：

- 页面身份
- 设计指纹
- 视觉关键词
- Section Blueprint
- 图片与背景策略
- 组件语言
- 动效策略
- 移动端降级
- 负向红线
- 自检表

### 5. Run Design Self-Review

在交给用户确认前，按 Required Reads → 自审合并读取的规则一次性完成对照校验。

行为要求：用 `design-taste-frontend` 校正前端落地气质，用 `gpt-taste` 检测模板味或页型错位。两者必须合并为一份自检报告，不得拆成两次独立分析。

## Output

本阶段所有产出必须合并进 `design.md` 单文件，不另起总结文档。页型结论、图片策略结论、设计自检结论作为 `design.md` 的一级章节存在。

`design.md` 必须包含以下一级章节：

- 页面身份
- 页型结论
- 设计指纹
- 视觉关键词
- Section Blueprint
- 图片与背景策略（含图片策略结论）
- 组件语言
- 动效策略
- 移动端降级
- 负向红线
- 设计自检结论（合并 taste-frontend + gpt-taste 的对照结果）

## Do Not Do

- 不要跳过 `references/design_workflow.md`
- 不要在 `design.md` 不合格时直接写代码
- 不要把 `design-taste-frontend` 或 `gpt-taste` 只当工具名，不读本地约束文档
- 不要把发布、预览、发布标记协议混进本阶段
- 不要在启动阶段一次性 Read 全部引用（按页型决策树按需读取）
- 不要绕过 `example/index.md` 直接读 `heroN.md`
- 不要把 taste-frontend 和 gpt-taste 拆成两次独立分析（必须合并为一次对照自检）
- 不要 Read 空文件 `references/design_v2/example/hero.md`
