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

## 引用架构（三级）

所有引用分为三层，按需加载：

| 层级 | 加载时机 | 行数预算 |
|------|---------|---------|
| L0 内联 | skill 加载时自动注入（本文档） | ≤150 行 |
| L1 摘要 | agent 按需 Read，带 READ_FULL_IF 条件 | 单次 ≤40 行 |
| L2 全文 | 仅当 L1 的 READ_FULL_IF 命中时才 Read | 不限 |

**核心规则**：未满足 READ_FULL_IF 条件时，禁止读取 L2 全文。

## L0 决策路由表

### 启动必读（L1 摘要层，任何页型都读）

| 文件 | 用途 | READ_FULL_IF |
|------|------|-------------|
| `references/design_workflow_summary.md` | 执行总则 + Gate + 失败红线 | 需要审计输出结构、Gate 细则展开、页型分流完整规则 |
| `references/image_summary.md` | 6 问必答 + 页型图片策略速查 + 遮罩/降级规则 | 需要 JSX import 语法、搜索流程、完整审计红线、视频背景细节 |

### design.md 模板（L0 内联）

模板结构已内联在 §4，无需读取任何外部文件。填写样例按需读取：

| 文件 | READ_FULL_IF |
|------|-------------|
| `references/design_v2/example-marketing-design.md` | 页型为 Marketing 且首次填写 design.md |
| `references/design_v2/example-saas-design.md` | 页型为 SaaS/Tool 且首次填写 design.md |

### 按页型选读（L2 全文，仅读命中项）

| 页型 | 文件 | READ_FULL_IF |
|------|------|-------------|
| Marketing / Landing | `references/design/landing.md` | 页型确认为 Marketing |
| SaaS / Dashboard / Tool | `references/design/landing.md` | 页型确认为 SaaS/Tool（仅借用结构方法） |
| Story / PPT / Scrolltelling | `references/design/ppt.md` + `story.md` | 页型确认为 Story |
| 含视频/粒子/光影背景 | `references/design/background.md` | 页面有背景特效需求 |

工具页借用 landing.md 时，必须服从当前业务 UI 秩序，不得照搬营销页视觉节奏。

### Hero 样例（L1 摘要 → L2 定向）

| 步骤 | 文件 | 说明 |
|------|------|------|
| 1 | `references/design_v2/example/index_summary.md` | 选型速查表，~20 行 |
| 2 | 对应 `heroN.md` | 仅当摘要表命中时定向读取 |
| 回查 | `references/design_v2/example/index.md` | 需要 CSS 片段/布局树/技术栈详情时 |

**禁止**遍历 hero1-4、**禁止**读空文件 `hero.md`。

### 自审（L1 摘要优先）

| 文件 | 用途 | READ_FULL_IF |
|------|------|-------------|
| `references/design_v2/design-self-review-summary.md` | 8 维速查自检 + FAIL 硬线 | ≥2 项不确定/不通过；Hybrid 交界模糊；含自定义动效；首次使用该页型 |
| `references/design_v2/design-self-review.md` | 完整实现指引 + 视觉裁判细则 | 上述条件命中时 |

**禁止**再单独读取已废弃的 `design-taste-frontend.md` 或 `gpt-taste.md`。

## Phase Rules

### 1. Classify Page Type

归入其一：`Marketing / Landing` | `SaaS / Dashboard / Tool` | `Story / PPT / Scrolltelling` | `Hybrid`。

`Hybrid` 必须额外写清：主页型、副页型、副页型允许影响的模块。

禁止先选工具再倒推页型。

### 2. Route References

按上方 L0 决策路由表执行。不在此处重复列举文件路径。

### 3. Define Image Strategy First

写 design.md 前，必须先回答 L0 内联的 6 个必答问题（见 image_summary.md）。没有这 6 个答案，不得进入实现规划。

### 4. Write design.md

以以下模板为唯一权威结构，覆盖全部 12 个一级章节。缺任一关键字段视为设计未完成。

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
- **实现参考**: `references/design_v2/design-self-review.md`
- **审查参考**: `references/design_v2/design-self-review.md`

`Hybrid` 额外必填：**主页型** / **副页型** / **副页型可影响模块**

## 2. Design Fingerprint
- **一句话定调**:
- **视觉关键词**: 最多 5 个，必须落到布局/材质/节奏/光影，禁止"高级/现代/简约/科技"
- **DESIGN_VARIANCE**: `1-10`（附解释）
- **MOTION_INTENSITY**: `1-10`（附解释）
- **VISUAL_DENSITY**: `1-10`（附解释）

## 3. Page Objective By Type
按页型补充主目标：Marketing→转化/记忆点/Hero抓手；SaaS→可扫读/秩序/反馈；Story→章节/镜头/沉浸；Hybrid→主骨架稳定+局部增强

## 4. Color Tokens
完整 CSS 变量 + 角色说明。禁止系统纯黑/纯白/默认蓝。

## 5. Typography & Surface Rules
字体方向 + H1-H3/Body/Caption 字号行高字距 + 圆角/阴影/边框体系 + 红线（衬线体/硬阴影/磨砂/压图文本）

## 6. Section Blueprint
| Order | Section | Purpose | Core Content | Visual Priority | Mobile Behavior |
至少 3 行；每个 section 写职责、主次层级、移动端折叠方式

## 7. Image & Background Strategy
对齐 image_summary.md：是否用图/类型/来源/文件名/所在section/裁切焦点/遮罩/移动端降级/缺图fallback

## 8. Component Language
| Component | Rules | Avoid |
至少覆盖 Primary CTA / Secondary CTA / Card / Tags / Search / Data Blocks / Empty State

## 9. Motion & Interaction Policy
允许/必要/禁用的动效；滚动叙事理由+移动端降级；Hover/Press/Reveal/Scroll/Loading/Disable

## 10. Responsive Degradation
375px：首屏重排/图片裁切/数据单列/导航可点/桌面效果删除

## 11. Negative Constraints
本页型失败红线：布局/图片/可读性/模板味/低质感组件

## 12. Pre-Dev Self Check
- [ ] 页型已确认
- [ ] 设计指纹已解释
- [ ] Section Blueprint 完整
- [ ] 图片策略已确认
- [ ] 移动端降级已定义
- [ ] 负向红线已写出
- [ ] 关键词非空泛形容词
- [ ] 用户已确认
```

### 5. Run Design Self-Review

按 L0 路由表的自审规则执行。先读 summary，仅在 READ_FULL_IF 命中时读全文。输出一份合并自检报告写入 design.md §12。

## Output

所有产出合并进 `design.md` 单文件，不另起总结文档。

## Do Not Do

- 不要在 design.md 不合格时写代码
- 不要把发布、预览、发布标记协议混进本阶段
- 不要在启动阶段一次性 Read 全部引用
- 不要绕过 L1 摘要直接读 L2 全文（除非 READ_FULL_IF 命中）
- 不要绕过 `example/index_summary.md` 直接读 heroN.md
- 不要单独读取已废弃的 `design-taste-frontend.md` 或 `gpt-taste.md`
- 不要 Read 空文件 `references/design_v2/example/hero.md`
- 不要把自审拆成两次独立分析
