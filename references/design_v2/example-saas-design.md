# DESIGN.md - 应用中心项目概览列表页

> 示例用途：演示 `SaaS / Dashboard / Tool` 页型的 `DESIGN.md` 应该怎么写。这个文件是样例，不是模板复制件；真正新任务仍需按当前页面需求改写。

## 1. Page Identity

- **页面名称**: 应用中心项目概览列表页
- **页面类型**: `SaaS / Dashboard / Tool`
- **主目标**: 让运营人员快速筛选、查看和定位项目状态
- **受众**: 运营、交付、项目管理人员
- **使用场景**: 用户登录后台后，按状态和关键词查找项目，并快速判断下一步动作
- **业务结果 / 验收目标**: 首屏即可看到关键统计、筛选入口和高优先级项目列表

## 2. Design Fingerprint

- **一句话定调**: 像成熟工具台，而不是默认后台模板
- **视觉关键词**: ordered, tactile, cool-neutral, signal-first, efficient
- **DESIGN_VARIANCE**: `3`
- **MOTION_INTENSITY**: `2`
- **VISUAL_DENSITY**: `5`

解释：

- `DESIGN_VARIANCE = 3`
  工具页要以秩序优先，只允许小幅结构变化；若高于 5 会影响扫读速度。
- `MOTION_INTENSITY = 2`
  只保留筛选、分页、hover 的必要反馈；若过高会显得花哨。
- `VISUAL_DENSITY = 5`
  需要在一屏内容纳统计、筛选和列表，但仍保留足够呼吸感；若高于 6 会开始拥挤。

## 3. Page Objective By Type

- 让用户快速找到“哪些项目需要关注”
- 控件和数据层级必须比装饰优先
- 重点不是做氛围，而是做效率感和可靠感

## 4. Color Tokens

```css
:root {
  --bg-app: #f7f8fb;
  --bg-surface: #ffffff;
  --bg-elevated: #eef2f7;
  --text-primary: #162033;
  --text-secondary: #465266;
  --text-muted: #6b7280;
  --border-soft: rgba(22, 32, 51, 0.08);
  --accent-primary: #315efb;
  --accent-secondary: #0f9d7a;
  --success: #15803d;
  --warning: #b45309;
  --danger: #dc2626;
  --image-scrim: linear-gradient(to bottom, rgba(22, 32, 51, 0.06), rgba(22, 32, 51, 0.22));
}
```

说明：

- 画布底色用冷中性灰，不用纯白
- 表面层以浅灰分层而不是靠重阴影切层
- 主色为高信号蓝，只用于关键 CTA、当前筛选和选中态
- 辅助绿只用于健康或正常状态，不参与主要 CTA

## 5. Typography & Surface Rules

- **主字体方向**: `Inter`
- **辅助字体方向**: 数字和状态可局部使用 `IBM Plex Sans`
- **字号层级**:
  - `H1`: `2rem / 1.15 / -0.03em`
  - `H2`: `1.25rem / 1.2 / -0.02em`
  - `H3`: `1rem / 1.3 / -0.01em`
  - `Body`: `0.95rem / 1.55 / -0.005em`
  - `Caption`: `0.8125rem / 1.4 / 0`
- **圆角体系**: 页面主卡片 20px，数据卡 16px，输入框与按钮 14px
- **阴影体系**: 细边框优先，阴影只做弱浮起感
- **边框体系**: 所有交互区都要有低对比边界，避免大片白块糊在一起

红线：

- 禁止默认蓝白后台风
- 禁止重阴影和过度玻璃态
- 禁止正文和数字字号太接近，导致主次模糊

## 6. Section Blueprint

| Order | Section | Purpose | Core Content | Visual Priority | Mobile Behavior |
|------|---------|---------|--------------|-----------------|-----------------|
| 1 | Page Header | 建立上下文和全局动作 | 页面标题、说明、主按钮 | High | 标题与主按钮上下堆叠 |
| 2 | Summary Strip | 给出项目总体状态 | 3-4 个关键统计卡 | High | 改两列或横向滚动 |
| 3 | Filter Bar | 提供查找入口 | 搜索、状态筛选、排序 | Highest | 搜索和筛选改为分段堆叠 |
| 4 | Priority Projects | 先暴露高优先级项目 | 置顶项目卡或高风险列表 | High | 保持单列卡片 |
| 5 | Main List | 主任务区 | 项目表格或列表卡、分页 | Highest | 表格降级为卡片流 |
| 6 | Empty / Error State | 处理无数据或失败场景 | 插画、说明、下一步动作 | Medium | 维持单列居中，但带明确操作 |

## 7. Image & Background Strategy

- **是否使用图片**: 仅限空状态图和必要的项目缩略信息
- **图片类型**: 空状态图 | 小型界面缩略图
- **素材来源**: 本地 SVG 或本地截图
- **本地文件名规划**:
  - `src/assets/project-empty-state.svg`
  - `src/assets/project-card-thumb.png`
- **每张图片所在 section**:
  - `project-empty-state`: Empty / Error State
  - `project-card-thumb`: Priority Projects 或 Main List 的辅助缩略图
- **裁切与焦点保护**: 缩略图保留核心内容区，不允许被圆角裁坏文字
- **是否需要遮罩 / 毛玻璃 / 叠层**: 不需要 Hero 式遮罩；仅对缩略图加浅边框
- **移动端降级策略**: 缩略图可隐藏，空状态图保留
- **缺图 fallback**: 列表仍须成立，禁止用默认占位图填满每个列表项

## 8. Component Language

| Component | Rules | Avoid |
|-----------|-------|-------|
| Primary CTA | 用于“新建项目”等主要动作，体量明确但不抢页面主数据 | 超大营销式按钮 |
| Secondary CTA | 轻描边或文字态，用于导出、刷新等次操作 | 与主 CTA 同重 |
| Card / Panel | 数据卡与列表卡区分明显，前者紧凑后者更信息化 | 所有卡片同模样 |
| Tags / Chips | 语义色弱铺底，强对比文字 | 饱和红绿整块铺色 |
| Search / Filter | 内置搜索图标、紧凑胶囊筛选、对齐统一 | 孤立右侧大蓝搜索按钮 |
| Data Blocks / Stats | 数字权重高于说明，趋势箭头和状态信息分离 | 数字和文案同权重 |
| Empty State | 轻插画 + 下一步动作 + 原因说明 | 只有一句“暂无数据” |

## 9. Motion & Interaction Policy

- **Hover**: 卡片边框亮化，列表行轻背景变化
- **Press**: 按钮轻压缩
- **Reveal**: 不需要章节式 reveal，仅列表和统计轻渐入
- **Scroll**: 不引入滚动叙事
- **Loading**: 骨架屏与数据占位必须对齐最终布局
- **Disable**: 大幅 parallax、视频背景、复杂滚动动画

## 10. Responsive Degradation

- 顶部 summary strip 改 2 列卡片或横向滚动
- Filter Bar 在 375px 下改为搜索先行、筛选后置的垂直布局
- 表格降级为单列信息卡，每张卡突出项目名、状态、更新时间和主要动作
- 分页按钮保持 44px 可点击热区
- 非关键信息在移动端折叠进二级文案

## 11. Negative Constraints

- 禁止首屏被装饰图占满，导致真实列表下沉
- 禁止所有数据卡和列表卡长得完全一样
- 禁止表格默认样式直接上屏
- 禁止筛选区和列表区之间没有层级停顿
- 禁止空状态只有一句居中文案
- 禁止用默认占位图作为最终列表缩略图

## 12. Pre-Dev Self Check

- [x] 页型已确认
- [x] 设计指纹已解释
- [x] Section Blueprint 已写完整
- [x] 图片与背景策略已确认
- [x] 移动端降级已定义
- [x] 负向红线已写出
- [x] 设计关键词不是空泛形容词
- [x] 用户已确认本设计
