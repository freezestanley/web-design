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

## Required Reads

先读：

- `references/design_workflow.md`
- `references/design_v2/design.md`
- `references/image.md`

如需参考现成 section / hero 设计样例，再读：

- `references/design_v2/example/index.md`

再按页型补读：

- `references/design/landing.md`
- `references/design/ppt.md`
- `references/design/story.md`
- `references/design/background.md`

当页面需要以下特征时，优先从示例索引跳到对应 hero 文档：

- 暗色视频背景 hero
- 底部对齐的高对比标题布局
- 投资 / 顾问 / 高端品牌类首屏

当前优先参考：

- `references/design_v2/example/hero4.md`

形成 `design.md` 后，再读：

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

只读当前页型需要的资料，不全量扫读：

- 营销页优先 `landing.md`
- 工具页优先借用 `landing.md` 的结构方法，并服从当前业务 UI 秩序
- 叙事页优先 `ppt.md` + `story.md`
- 有背景、视频、粒子、光影需求时，再补 `background.md`
- 需要具体 hero 结构样例时，先读 `references/design_v2/example/index.md`，再定向进入对应 hero 文档；不要把整个 example 目录全量读完

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

在交给用户确认前，用以下两个本地参考校正：

- `references/design_v2/design-taste-frontend.md`
- `references/design_v2/gpt-taste.md`

前者负责“怎么把设计落成前端气质”，后者负责“怎么判断设计是否已经滑向模板味或页型错位”。

## Output

本阶段只产出：

- 完整 `design.md`
- 明确页型结论
- 图片策略结论
- 进入开发前的设计自检结论

## Do Not Do

- 不要跳过 `references/design_workflow.md`
- 不要在 `design.md` 不合格时直接写代码
- 不要把 `design-taste-frontend` 或 `gpt-taste` 只当工具名，不读本地约束文档
- 不要把发布、预览、发布标记协议混进本阶段
