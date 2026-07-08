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

### 启动必读（任何页型都读，且只读这 2 份）

- `references/design_workflow_summary.md`（摘要版，~60 行；需要审计结构/Gate 细则时回查完整版 `design_workflow.md`）
- `references/image.md`

> **design.md 模板已内联**：见下方 §4 Write design.md → 模板正文。不再需要单独 Read `references/design_v2/design.md`。

### 按页型选读（仅读命中项，未命中不读）

| 页型 | 必读 | 可选 |
|------|------|------|
| Marketing / Landing | `references/design/landing.md` | — |
| SaaS / Dashboard / Tool | `references/design/landing.md`（仅借用结构方法） | — |
| Story / PPT / Scrolltelling | `references/design/ppt.md` + `references/design/story.md` | — |
| 含视频 / 粒子 / 光影背景 | `references/design/background.md` | — |

禁止在启动阶段一次性 Read 全部引用。

### Hero 样例（严格索引优先）

1. 先读 `references/design_v2/example/index_summary.md`（摘要版，~30 行）
2. 仅当摘要表命中当前需求时，才定向读取对应 `heroN.md`
3. 需要 CSS 片段、布局结构树或技术栈详情时，回查完整版 `references/design_v2/example/index.md`
4. **禁止**遍历 hero1-4、**禁止**直接读 `hero.md`（已知为空文件）

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

`design.md` 必须以下方内联模板为唯一权威结构，并至少覆盖全部 12 个一级章节。缺任一关键字段，视为设计未完成。

可参考填写样例（按需读取，非必读）：

- `references/design_v2/example-marketing-design.md`
- `references/design_v2/example-saas-design.md`

#### 模板正文

```markdown
# DESIGN.md - [Project Name / Page Name]

## 1. Page Identity

- **页面名称**:
- **页面类型**: `Marketing / Landing` | `SaaS / Dashboard / Tool` | `Story / PPT / Scrolltelling` | `Hybrid`
- **主目标**:
- **受众**:
- **使用场景**:
- **业务结果 / 验收目标**:
- **本次已读取的本地设计资料**:
- **实现参考**: `references/design_v2/design-taste-frontend.md`
- **审查参考**: `references/design_v2/gpt-taste.md`

`Hybrid` 额外必填：

- **主页型**:
- **副页型**:
- **副页型可影响模块**:

## 2. Design Fingerprint

- **一句话定调**:
- **视觉关键词**: 最多 5 个，必须能落到布局、材质、节奏或光影，禁止只写"高级、现代、简约、科技"
- **DESIGN_VARIANCE**: `1-10`
- **MOTION_INTENSITY**: `1-10`
- **VISUAL_DENSITY**: `1-10`

为每个指纹参数补一句解释：为什么这个页面需要这个档位；过高或过低会失败在哪里。

## 3. Page Objective By Type

按页型补充该页必须守住的主目标：

- `Marketing / Landing`: 转化路径、品牌记忆点、Hero 抓手
- `SaaS / Dashboard / Tool`: 可扫读、业务秩序、状态反馈
- `Story / PPT / Scrolltelling`: 章节推进、镜头感、情绪沉浸
- `Hybrid`: 主页型骨架稳定，副页型只做局部增强

## 4. Color Tokens

必须提供完整 CSS 变量，并说明每类颜色承担什么角色。禁止直接使用系统纯黑、纯白、默认蓝作为最终设计色。

补充说明：画布底色、表面层级数量、核心品牌色与辅助色的分工、图片遮罩色。

## 5. Typography & Surface Rules

- **主字体方向**:
- **辅助字体方向**:
- **H1 / H2 / H3 / Body / Caption** 的字号、行高、字距
- **圆角体系**:
- **阴影体系**:
- **边框体系**:

明确红线：是否允许大面积衬线体、是否允许高对比硬阴影、是否允许透明磨砂、哪类文本严禁压在图片上。

## 6. Section Blueprint

逐 section 说明页面结构。至少包含：

| Order | Section | Purpose | Core Content | Visual Priority | Mobile Behavior |
|------|---------|---------|--------------|-----------------|-----------------|
| 1 | Hero / Overview | | | | |
| 2 | Proof / Data / Story Block | | | | |
| 3 | CTA / Action / Utility Area | | | | |

要求：每个 section 说明职责，不得只写名称；写清主次层级；写清移动端如何折叠、堆叠或裁剪。

## 7. Image & Background Strategy

这部分必须和 `references/image.md` 对齐。

- **是否使用图片**:
- **图片类型**: 主视觉图 | 产品界面图 | 场景图 | 数据配图 | 纯背景图 | 不使用图片
- **素材来源**:
- **本地文件名规划**:
- **每张图片所在 section**:
- **裁切与焦点保护**:
- **是否需要遮罩 / 毛玻璃 / 叠层**:
- **移动端降级策略**:
- **缺图 fallback**:

如果不使用图片，说明为什么这个页面不需要图片也能成立。

## 8. Component Language

按当前页型明确组件语言：

| Component | Rules | Avoid |
|-----------|-------|-------|
| Primary CTA | | |
| Secondary CTA | | |
| Card / Panel | | |
| Tags / Chips | | |
| Search / Filter | | |
| Data Blocks / Stats | | |
| Empty State | | |

至少说明：哪些组件可以抢眼、哪些组件必须克制、组件之间如何避免"全都长一样"。

## 9. Motion & Interaction Policy

- 哪些动效是允许的
- 哪些动效是必要的
- 哪些动效必须禁用
- 若使用滚动叙事，说明使用理由和移动端降级

示例字段：Hover / Press / Reveal / Scroll / Loading / Disable。

## 10. Responsive Degradation

必须覆盖 `375px`：首屏结构如何重排、图片如何裁切或降级、数据区如何改单列、导航筛选标签如何保持可点、哪些桌面端效果在移动端必须删除。

## 11. Negative Constraints

写出本页型的明确失败红线。至少包含：不能出现的布局错误、不能出现的图片错误、不能出现的可读性错误、不能出现的模板味表现、不能出现的低质感组件实现。

示例：营销页禁止做成后台列表风；工具页禁止用大图占满首屏导致真实信息下沉；故事页禁止没有章节推进却强上重滚动效果；禁止白字直接压复杂图且无遮罩；禁止空状态只剩一句居中文案。

## 12. Pre-Dev Self Check

进入开发前逐项打勾：

- [ ] 页型已确认
- [ ] 设计指纹已解释
- [ ] Section Blueprint 已写完整
- [ ] 图片与背景策略已确认
- [ ] 移动端降级已定义
- [ ] 负向红线已写出
- [ ] 设计关键词不是空泛形容词
- [ ] 用户已确认本设计
```

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
