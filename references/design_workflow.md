# Web 设计工作流

## 全景概览

整个流程分四个阶段，每阶段调用不同子技能。

| 阶段 | 核心目标 | 主要子技能 |
|------|----------|------------|
| 第一阶段：构思与探索 | 明确设计方向，产出视觉参考 | `imagegen-frontend-web` / `mobile`, `brandkit` |
| 第二阶段：定调与选型 | 确定风格语言，选择核心引擎 | `high-end-visual-design`, `minimalist-ui`, `industrial-brutalist-ui` |
| 第三阶段：编码与实现 | 将设计转化为高质量代码 | `design-taste-frontend` (v2), `gpt-taste` |
| 第四阶段：审计与交付 | 强制完整输出，或对旧项目重设计 | `full-output-enforcement`, `redesign-existing-projects`, `stitch-design-taste` |

---

## 第一阶段：构思与探索

**目标**：写代码前先对齐视觉预期，避免"边写边改"的低效循环。

**步骤**：

1. **生成视觉参考**：向 AI 描述项目类型，使用 `imagegen-frontend-web`（或 `mobile`）生成几张不同布局的参考图，选定一张作为后续编码基准。
2. **建立品牌感**（按需）：使用 `brandkit` 生成配色盘和字体建议，为后续所有子技能提供统一的"调色板"。

**示例 Prompt**：

```
请使用 imagegen-frontend-web 为我的"AI绘画工具"官网生成3种不同布局的Hero区域参考图，风格偏向科技感。
```

---

## 第二阶段：定调与选型

**目标**：根据项目定位，选定核心风格语言和编码引擎。

### 选择风格子技能

| 项目定位 | 对应子技能 |
|----------|------------|
| 高端品牌 | `high-end-visual-design` |
| 工具类产品 | `minimalist-ui` |
| 先锋/实验性项目 | `industrial-brutalist-ui` |

### 选择编码引擎

- **通用场景**：默认用 `design-taste-frontend` (v2)，最均衡，支持三个设计旋钮。
- **GPT 模型**：切换为 `gpt-taste`，对防止 AI 生成平庸设计有更强约束。

### 设定三个设计旋钮

在所有后续编码请求中固定或微调，形成项目专属"设计指纹"：

| 旋钮 | 含义 | 范围 |
|------|------|------|
| `DESIGN_VARIANCE` | 布局大胆程度 | 1–10 |
| `MOTION_INTENSITY` | 动效丰富度 | 1–10 |
| `VISUAL_DENSITY` | 信息密集度 | 1–10 |

---

## 第三阶段：编码与实现

**目标**：将选定风格和参数应用于实际代码生成，完成页面开发。

**步骤**：

1. **逐页推进**：将项目拆为"首页"、"列表页"、"详情页"等模块，逐个发起请求。每次请求中明确提及风格子技能、编码引擎和旋钮值。
2. **迭代优化**：通过调整旋钮值微调风格，例如将 `VISUAL_DENSITY` 从 5 降到 2 以增加留白。

**示例 Prompt**：

```
使用 design-taste-frontend 引擎，并应用 minimalist-ui 风格。
设置 DESIGN_VARIANCE=4，MOTION_INTENSITY=6，VISUAL_DENSITY=3。
基于之前敲定的参考图，为我的 SaaS 产品生成"仪表盘-数据概览"页面的 HTML/CSS 代码。
```

---

## 第四阶段：审计与交付

**目标**：确保代码质量，处理遗留问题，完成最终交付。

| 场景 | 使用技能 | 说明 |
|------|----------|------|
| AI 输出不完整（用"..."偷懒） | `full-output-enforcement` | 强制要求一次性输出所有完整代码 |
| 维护样式混乱的老系统 | `redesign-existing-projects` | 先审计 UI 问题再重构，比直接重写更稳妥 |
| 多模块大型项目收尾 | `stitch-design-taste` | 生成结构化 `DESIGN.md`，固化颜色、字体、间距、组件规范 |

---

## 实战路径示例

**场景**：为奢侈家具电商网站做设计

1. **构思**：用 `imagegen-frontend-web` 生成多张布局参考图，选定"大图、留白多"的版本作为基准。

2. **定调**：
   - 风格：`high-end-visual-design`
   - 引擎：`design-taste-frontend`
   - 旋钮：`VARIANCE=6, MOTION=3, DENSITY=2`（营造安静高端的画廊感）

3. **编码**：按"首页 → 产品列表 → 产品详情 → 关于我们"顺序逐模块生成。首页完成后觉得动效太安静，将 `MOTION_INTENSITY` 提升到 5。

4. **交付**：
   - 用 `full-output-enforcement` 复查，确保无遗留占位符。
   - 运行 `stitch-design-taste`，输出 `DESIGN.md` 设计规范，作为后续迭代基线。
