# DESIGN.md - Flownote AI 官网落地页

> 示例用途：演示 `Marketing / Landing` 页型的 `DESIGN.md` 应该怎么写。这个文件是样例，不是模板复制件；真正新任务仍需按当前页面需求改写。

## 1. Page Identity

- **页面名称**: Flownote AI 官网落地页
- **页面类型**: `Marketing / Landing`
- **主目标**: 让内容团队理解产品价值，并完成免费试用点击
- **受众**: 内容运营、品牌市场、小团队创始人
- **使用场景**: 用户从广告、社媒、朋友推荐进入官网首页，快速判断产品是否值得试用
- **业务结果 / 验收目标**: 首屏 5 秒内讲清核心价值，用户能顺畅进入试用 CTA

## 2. Design Fingerprint

- **一句话定调**: 像一本有镜头语言的数字产品画册，克制但有记忆点
- **视觉关键词**: editorial, luminous, quiet contrast, asymmetric grid, product-first
- **DESIGN_VARIANCE**: `6`
- **MOTION_INTENSITY**: `4`
- **VISUAL_DENSITY**: `3`

解释：

- `DESIGN_VARIANCE = 6`
  需要比普通 SaaS 首页更有版式张力，但仍要保证信息清晰；若低于 4 会太像模板页，若高于 7 会损伤转化效率。
- `MOTION_INTENSITY = 4`
  只需要轻量 reveal 和 CTA/卡片反馈，不需要重滚动叙事；若过高会显得在炫技。
- `VISUAL_DENSITY = 3`
  需要比较大的呼吸感来承接主视觉和卖点；若过低会信息不足，若过高会失去品牌气质。

## 3. Page Objective By Type

- Hero 必须在首屏说清“AI 帮团队把零散素材整理成可复用内容系统”
- 卖点 section 需要体现“节省时间、统一品牌语气、快速落地”
- 页面应优先建立信任和想象空间，而不是先堆功能表格

## 4. Color Tokens

```css
:root {
  --bg-app: #f6f4ef;
  --bg-surface: rgba(255, 255, 255, 0.78);
  --bg-elevated: #f0ece3;
  --text-primary: #1e2430;
  --text-secondary: #4a5568;
  --text-muted: #667085;
  --border-soft: rgba(30, 36, 48, 0.08);
  --accent-primary: #1d4ed8;
  --accent-secondary: #d97706;
  --success: #15803d;
  --warning: #b45309;
  --danger: #b91c1c;
  --image-scrim: linear-gradient(to bottom, rgba(30, 36, 48, 0.08), rgba(30, 36, 48, 0.62));
}
```

说明：

- 画布底色使用暖灰纸感底，避免纯白科技模板感
- 表面层只有 3 级，避免页面过碎
- 主色为深钴蓝，辅助色为琥珀暖光，只在局部强调和 CTA 中使用
- 图片遮罩偏石墨蓝，确保浅色标题压图时可读

## 5. Typography & Surface Rules

- **主字体方向**: `Syne` 用于大标题和数字强调
- **辅助字体方向**: `Inter` 用于正文和组件
- **字号层级**:
  - `H1`: `clamp(3.5rem, 7vw, 6rem) / 1.02 / -0.04em`
  - `H2`: `clamp(2rem, 4vw, 3rem) / 1.08 / -0.03em`
  - `H3`: `1.375rem / 1.2 / -0.02em`
  - `Body`: `1rem / 1.65 / -0.01em`
  - `Caption`: `0.875rem / 1.5 / 0`
- **圆角体系**: 主卡片 24px，次卡片 18px，按钮 999px 胶囊
- **阴影体系**: 仅使用低不透明度空气阴影，不允许硬黑投影
- **边框体系**: 大容器细边框 + 半透明填充，强调轻盈而非厚重

红线：

- 禁止整页都用衬线体
- 禁止强发光、重模糊和夜店式高饱和色
- 任何压图标题都必须带遮罩或承托层

## 6. Section Blueprint

| Order | Section | Purpose | Core Content | Visual Priority | Mobile Behavior |
|------|---------|---------|--------------|-----------------|-----------------|
| 1 | Hero | 5 秒讲清价值并引导试用 | 大标题、简短价值主张、主 CTA、产品预览拼贴 | Highest | 文案先于图片，拼贴改单张产品图 |
| 2 | Trust Bar | 建立可信度 | 客户 logo、数据指标、媒体引用 | Medium | logo 改两行滚动或静态网格 |
| 3 | Problem / Outcome | 说明用户痛点与结果 | 3 组问题到结果的对照卡 | High | 改单列卡片堆叠 |
| 4 | Product Walkthrough | 展示产品如何运作 | 3 步流程、界面截图、短说明 | High | 截图改横向滚动或单列切换 |
| 5 | Proof | 建立信任 | 引言、案例摘要、指标提升 | Medium | 卡片高度自适应，取消复杂交错 |
| 6 | CTA Footer | 收口转化 | 明确 CTA、次要 FAQ 入口 | High | 保持单列，按钮满宽 |

## 7. Image & Background Strategy

- **是否使用图片**: 是
- **图片类型**: 主视觉图 + 产品界面图 + 少量场景图
- **素材来源**: 产品界面来自本地截图，场景图来自 Unsplash/Pexels
- **本地文件名规划**:
  - `src/assets/flownote-hero-workspace.jpg`
  - `src/assets/flownote-editor-shot.png`
  - `src/assets/flownote-team-session.jpg`
- **每张图片所在 section**:
  - `hero-workspace`: Hero
  - `editor-shot`: Product Walkthrough
  - `team-session`: Proof 背景辅助
- **裁切与焦点保护**: Hero 图焦点保留在左下角桌面与手部动作；界面图优先保留导航和主内容区
- **是否需要遮罩 / 毛玻璃 / 叠层**: Hero 图与 Proof 图都需要石墨蓝遮罩；界面图不叠毛玻璃，只加浅边框和投影
- **移动端降级策略**: Hero 拼贴降级为单图；Proof 背景图降级为纯色背景
- **缺图 fallback**: 若场景图缺失，Hero 仅保留产品界面拼贴，不使用默认占位图进入最终交付

## 8. Component Language

| Component | Rules | Avoid |
|-----------|-------|-------|
| Primary CTA | 深钴蓝胶囊按钮，搭配轻微上浮反馈 | 默认矩形蓝按钮 |
| Secondary CTA | 文本按钮或描边胶囊，弱于主 CTA | 与主 CTA 同权重 |
| Card / Panel | 大圆角、轻磨砂、清晰留白 | 多层厚阴影 |
| Tags / Chips | 小体量、低饱和中性色 | 彩色药丸标签泛滥 |
| Search / Filter | 本页不作为主组件 | 把营销页做成工具页搜索首屏 |
| Data Blocks / Stats | 只挑 2-3 个关键数字，放大但不密集 | 一整排报表式数字 |
| Empty State | 本页不应出现典型空状态 | 用空状态组件填营销页结构 |

## 9. Motion & Interaction Policy

- **Hover**: CTA 和卡片允许轻微上浮、边框亮化
- **Press**: 按钮缩放不超过 `0.98`
- **Reveal**: Section 入场轻 reveal，避免每块都做相同动画
- **Scroll**: 只允许轻量视差和局部 reveal，不使用重 timeline
- **Loading**: 图片渐显即可
- **Disable**: 夸张飞入、连续滚动锁屏、过强 blur/parallax

## 10. Responsive Degradation

- 首屏文字优先，Hero 拼贴缩成单图或上下结构
- Trust Bar 改成两行紧凑布局
- 问题/结果卡片改单列
- 大尺寸标题降到 `clamp(2.4rem, 10vw, 3.6rem)`
- 胶囊按钮在移动端满宽或双按钮纵向堆叠

## 11. Negative Constraints

- 禁止 Hero 变成“左文右图+两按钮”的标准 SaaS 模板排法
- 禁止全页只靠渐变背景制造差异
- 禁止场景图多于产品图，导致用户不知道产品长什么样
- 禁止 CTA 区和卖点区用同一容器节奏重复铺开
- 禁止白字直接压图且无遮罩

## 12. Pre-Dev Self Check

- [x] 页型已确认
- [x] 设计指纹已解释
- [x] Section Blueprint 已写完整
- [x] 图片与背景策略已确认
- [x] 移动端降级已定义
- [x] 负向红线已写出
- [x] 设计关键词不是空泛形容词
- [x] 用户已确认本设计
