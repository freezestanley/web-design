# Design Workflow Reference

这份文档是 `web-design` 在 Step 3 开发前必须读取的设计参考。目的不是生成固定风格，而是统一：

- 先读哪些本地设计资料
- 再接哪些设计工具
- 每个工具负责什么
- 页面从设计到实现的组合顺序

## 0. 必读顺序

进入 Step 3 后，先按这个顺序读取和思考：

1. 读取 `references/design/` 下的本地资料
2. 判断当前页面类型
3. 选择合适的设计工具组合
4. 输出 `design.md`
5. 再进入代码开发

禁止跳过本地设计资料直接开写。

## 1. 本地设计资料目录

当前 `references/design/` 下的内容：

- `references/design/landing.md`
  - 用于活动页、营销页、品牌页、产品介绍页
  - 重点看首屏结构、CTA 节奏、卖点分段、社会证明、转化路径

- `references/design/ppt.md`
  - 用于故事型页面、汇报型页面、品牌叙事页、长滚动展示页
  - 重点看章节推进、叙事节奏、视觉切页感、信息分幕

优先级规则：

- 营销、品牌、产品介绍类页面：先读 `landing.md`
- 叙事、演示、故事、scrolltelling 类页面：先读 `ppt.md`
- 二者兼有时：先读主目标对应的文件，再补读另一个

## 2. 设计工具职责梳理

下面这些工具不是平铺一起用，而是各自承担不同层次的职责。

### `design-taste-frontend`

定位：

- 主设计系统入口
- 负责整体页面结构、视觉基调、区块节奏

使用时机：

- 大多数页面在设计阶段都应先经过它
- 特别适合营销页、品牌页、产品功能页、故事型页面

特征要求：

- 无 em-dash
- 零模板感
- Eyebrow 使用克制

它解决的问题：

- 页面看起来是否有明确设计方向
- 是否摆脱通用 AI 模板味
- 区块之间是否有节奏和气质区分

### `frontend-design`

定位：

- 差异化设计语言增强器
- 用于把页面做出更明确的视觉人格

使用时机：

- 页面需要更强品牌辨识度
- 页面需要更强叙事性和氛围感
- 默认设计过于普通时，用它拉开差异

特征要求：

- Syne 字体
- 纪录片式叙事结构

它解决的问题：

- 页面是否足够独特
- 叙事是否更有镜头感和章节感
- 字体与结构是否形成更强记忆点

### `tailwind-best-practices`

定位：

- Tailwind v4 语法规范约束
- 负责把视觉方案落成稳定、可维护的样式实现

使用时机：

- 进入代码开发阶段后必须参考
- 尤其在样式类名组织、token 使用、响应式写法上要遵循

它解决的问题：

- Tailwind 写法是否规范
- 是否出现难维护的堆叠类名
- 是否偏离项目的样式组织方式

### `gsap-scrolltrigger`

定位：

- 核心滚动叙事引擎

使用时机：

- 页面需要强滚动叙事
- 页面需要章节推进、sticky 场景、scroll reveal、timeline 驱动

适用场景：

- 品牌故事页
- 发布页
- 产品演示页
- 长滚动 PPT 感页面

它解决的问题：

- 页面是否需要滚动驱动的镜头感
- 内容切换是否需要时间轴管理
- 是否需要更强的叙事推进

注意：

- 只有当 brief 明确需要滚动叙事时才上
- 不要为了炫技把普通功能页强行改成 scrollytelling

### `motion.js`

定位：

- 微交互层
- 负责按钮按压反馈、卡片 3D tilt、轻量状态动画

使用时机：

- 按钮、卡片、悬浮块需要更细腻的反馈
- 页面不需要重滚动引擎，但需要更强交互质感

它解决的问题：

- 页面是否缺少触感
- hover / press / focus 是否太死
- 卡片与按钮是否缺少反馈层次

### `React Bits`

定位：

- 现成的交互动效与展示组件参考层
- 用于补充页面中的高质量局部表现，而不是接管整页设计

使用时机：

- 页面已经有明确结构和视觉方向，但某些模块还缺少表现力
- 需要更完整的 hero、marquee、spotlight、dock、stack、tilt、reveal 一类局部效果
- 希望减少自己从零实现展示型交互的成本

它解决的问题：

- 某个局部模块是否还不够“像成品”
- 是否需要一个更成熟的展示型交互模式
- 是否能在不重写整页设计语言的前提下，提升局部完成度

注意：

- 不要把 `React Bits` 当成页面模板来源
- 只能按需抽取适合当前页面的局部模式
- 使用后仍要回到当前页面的整体设计语言里做统一

### `antd`

定位：

- 复杂业务组件层
- 用于承载表单、表格、筛选、弹窗、步骤流、上传、分页等标准化交互

使用时机：

- 后台页面
- 工具页
- 数据录入页
- 复杂表单页
- 需要稳定业务控件时

它解决的问题：

- 是否需要成熟的业务组件而不是自己拼
- 是否需要更稳定的交互一致性
- 是否需要更快完成复杂控件搭建

注意：

- `antd` 是按需接入，不是默认依赖
- 营销页、品牌页、故事页默认不要先上 `antd`
- 如果用了 `antd`，要控制视觉气质，避免页面退化成默认后台风

## 3. 推荐组合顺序

### 营销页 / 落地页

建议顺序：

1. `references/design/landing.md`
2. `frontend-design`
3. `design-taste-frontend`
4. `tailwind-best-practices`
5. 按需加 `motion.js`
6. 若有局部展示模块需要成品级表现，可按需参考 `React Bits`
7. 若是长滚动叙事，再加 `gsap-scrolltrigger`

### 品牌故事页 / About / 叙事页

建议顺序：

1. `references/design/ppt.md`
2. `frontend-design`
3. `design-taste-frontend`
4. `gsap-scrolltrigger`
5. `tailwind-best-practices`
6. 按需补 `motion.js`
7. 若局部模块需要更强展示效果，可按需引入 `React Bits`

### 产品功能页

建议顺序：

1. `references/design/landing.md`
2. `design-taste-frontend`
3. 必要时少量引入 `frontend-design`
4. `tailwind-best-practices`
5. 默认优先 `motion.js`
6. 复杂业务控件按需加 `antd`
7. 某些展示模块需要更强表现时再少量参考 `React Bits`

原则：

- 功能页默认不要先上 `gsap-scrolltrigger`
- 先保证结构清晰、信息清楚、CTA 明确
- `antd` 只在业务控件真的复杂时接入，不要为了省事把普通营销区块也写成后台风

### 演示型 / PPT 感页面

建议顺序：

1. `references/design/ppt.md`
2. `frontend-design`
3. `design-taste-frontend`
4. `gsap-scrolltrigger`
5. `tailwind-best-practices`
6. 按需补 `React Bits`

## 4. Step 3 的最小输出要求

在写 `design.md` 前，至少要明确以下内容：

- 当前页面读取了哪些 `references/design/*.md`
- 本次启用哪些工具
- 为什么启用这些工具
- 哪个工具负责结构
- 哪个工具负责设计语言
- 哪个工具负责动效
- 哪个工具负责局部展示增强
- 是否按需接入 `antd`
- 哪个工具负责实现规范

推荐写法：

```md
## Design Inputs
- References: landing.md
- Structure Tool: design-taste-frontend
- Visual Language Tool: frontend-design
- Motion Tool: motion.js
- Enhancement Tool: React Bits
- Business Component Layer: antd (optional)
- Implementation Rule: tailwind-best-practices
```

如果使用 `gsap-scrolltrigger`，必须额外写清：

- 哪些区块需要滚动驱动
- 为什么普通 reveal 不够
- 动效服务的是叙事还是只是装饰

## 5. Anti-Slop 约束

无论使用哪些工具，都必须避免：

- 默认 AI 紫色渐变
- 无意义漂浮装饰
- 没信息含量的假数据
- 每一屏都一样的卡片网格
- 无意义的 `SECTION 01`
- 过量 Eyebrow
- 没有目标的滚动炫技

## 6. 页面开发前检查

进入代码开发前，再确认一遍：

- 已读取对应的 `references/design/*.md`
- 已选定工具组合
- 已确定是否需要滚动叙事
- 已确定是否需要微交互层
- 已确定是否需要 `React Bits` 做局部增强
- 已确定是否真的需要接入 `antd`
- 已确定 Tailwind v4 写法要遵循 `tailwind-best-practices`

如果这些没定清楚，不要直接进入实现。
