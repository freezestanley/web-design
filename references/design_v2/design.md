# DESIGN.md - [Project Name / Page Name]

> 本模板是 `web-design` 在 Step 3 的唯一权威设计规约模板。任何页面在进入开发前，都必须把下面所有必填项补齐。缺任一关键字段，视为设计未完成。

可参考样例：

- `references/design_v2/example-marketing-design.md`
- `references/design_v2/example-saas-design.md`

## 1. Page Identity

- **页面名称**:
- **页面类型**: `Marketing / Landing` | `SaaS / Dashboard / Tool` | `Story / PPT / Scrolltelling` | `Hybrid`
- **主目标**:
- **受众**:
- **使用场景**:
- **业务结果 / 验收目标**:

`Hybrid` 额外必填：

- **主页型**:
- **副页型**:
- **副页型可影响模块**:

## 2. Design Fingerprint

- **一句话定调**:
- **视觉关键词**: 最多 5 个，必须能落到布局、材质、节奏或光影，禁止只写“高级、现代、简约、科技”
- **DESIGN_VARIANCE**: `1-10`
- **MOTION_INTENSITY**: `1-10`
- **VISUAL_DENSITY**: `1-10`

为每个指纹参数补一句解释：

- 为什么这个页面需要这个档位
- 过高或过低会失败在哪里

## 3. Page Objective By Type

按页型补充该页必须守住的主目标：

- `Marketing / Landing`: 转化路径、品牌记忆点、Hero 抓手
- `SaaS / Dashboard / Tool`: 可扫读、业务秩序、状态反馈
- `Story / PPT / Scrolltelling`: 章节推进、镜头感、情绪沉浸
- `Hybrid`: 主页型骨架稳定，副页型只做局部增强

## 4. Color Tokens

必须提供完整 CSS 变量，并说明每类颜色承担什么角色。禁止直接使用系统纯黑、纯白、默认蓝作为最终设计色。

```css
:root {
  --bg-app: #f8fafc;
  --bg-surface: #ffffff;
  --bg-elevated: #f1f5f9;
  --text-primary: #0f172a;
  --text-secondary: #475569;
  --text-muted: #64748b;
  --border-soft: rgba(15, 23, 42, 0.08);
  --accent-primary: #4f46e5;
  --accent-secondary: #0ea5e9;
  --success: #16a34a;
  --warning: #d97706;
  --danger: #dc2626;
  --image-scrim: linear-gradient(to bottom, rgba(15, 23, 42, 0.08), rgba(15, 23, 42, 0.72));
}
```

补充说明：

- 画布底色
- 表面层级数量
- 核心品牌色与辅助色的分工
- 图片遮罩色

## 5. Typography & Surface Rules

- **主字体方向**:
- **辅助字体方向**:
- **H1 / H2 / H3 / Body / Caption** 的字号、行高、字距
- **圆角体系**:
- **阴影体系**:
- **边框体系**:

明确以下红线：

- 是否允许大面积衬线体
- 是否允许高对比硬阴影
- 是否允许透明磨砂
- 哪类文本严禁压在图片上

## 6. Section Blueprint

逐 section 说明页面结构。至少包含：

| Order | Section | Purpose | Core Content | Visual Priority | Mobile Behavior |
|------|---------|---------|--------------|-----------------|-----------------|
| 1 | Hero / Overview | | | | |
| 2 | Proof / Data / Story Block | | | | |
| 3 | CTA / Action / Utility Area | | | | |

要求：

- 每个 section 说明职责，不得只写名称
- 写清主次层级
- 写清移动端如何折叠、堆叠或裁剪

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

至少说明：

- 哪些组件可以抢眼
- 哪些组件必须克制
- 组件之间如何避免“全都长一样”

## 9. Motion & Interaction Policy

- 哪些动效是允许的
- 哪些动效是必要的
- 哪些动效必须禁用
- 若使用滚动叙事，说明使用理由和移动端降级

示例字段：

- Hover:
- Press:
- Reveal:
- Scroll:
- Loading:
- Disable:

## 10. Responsive Degradation

必须覆盖 `375px`：

- 首屏结构如何重排
- 图片如何裁切或降级
- 数据区如何改单列
- 导航、筛选、标签如何保持可点
- 哪些桌面端效果在移动端必须删除

## 11. Negative Constraints

写出本页型的明确失败红线。至少包含：

- 不能出现的布局错误
- 不能出现的图片错误
- 不能出现的可读性错误
- 不能出现的模板味表现
- 不能出现的低质感组件实现

示例：

- 营销页禁止做成后台列表风
- 工具页禁止用大图占满首屏导致真实信息下沉
- 故事页禁止没有章节推进却强上重滚动效果
- 禁止白字直接压复杂图且无遮罩
- 禁止空状态只剩一句居中文案

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
