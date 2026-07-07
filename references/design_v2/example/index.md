# 设计模板索引

> 路径：`references/design_v2/example/`
> 用途：可参考的 hero section 设计模板，记录各模板的技术栈、视觉风格、核心特性，供快速选型。

---

## 模板总览

| 文件 | 名称 | 风格 | 技术栈 | 亮点 |
|------|------|------|--------|------|
| [hero1.md](hero1.md) | Lumora — 冥想 App Hero | 暗色沉浸/全屏视频 | React + Tailwind + Lucide | 4 路视频切换、液态玻璃效果、深色模式联动 |
| [hero2.md](hero2.md) | NeuralKinetics — 科技产品 Hero | 极简黑白/视频背景 | React + Vite + Framer Motion + 纯 CSS | 响应式视频尺寸、入场动画套件、无 Tailwind |
| [hero3.md](hero3.md) | 太空旅行落地页（双 Section） | 沉浸太空/双段视频 | React 18 + Tailwind CDN + Framer Motion CDN + Babel | FadingVideo 自定义 rAF 淡入淡出、字级模糊动画、液态玻璃双变体 |
| [hero4.md](hero4.md) | VEX — 投资/顾问 Hero | 暗色极简/底部内容对齐 | React + TypeScript + Tailwind CSS + Vite | 逐字符 stagger 入场动画、无遮罩纯视频背景、液态玻璃暗色变体 |


---

## 详细记录

### hero1.md — Lumora（冥想 App）

**定位**：全屏沉浸式 SaaS/App 落地页，情绪化视觉

**技术栈**
- React + Tailwind CSS + Lucide React
- 字体：Instrument Serif（Google Fonts，logo 斜体）+ system-ui（正文）

**核心设计模式**

| 模式 | 实现细节 |
|------|---------|
| 多路视频背景 | 4 个 `<video>` 绝对定位叠加，`opacity` CSS transition 1000ms 切换 |
| 液态玻璃 `.liquid-glass` | `backdrop-filter: blur(4px)` + `::before` 渐变边框（padding-mask 技巧） |
| 视频标签切换器 | 4 个文字按钮，点击防抖（1000ms cooldown）避免动画撕裂 |
| 深色模式联动 | 第 3 个视频激活时，hero 内容切换至 `#182C41`，700ms transition |
| PNG 浮动叠加层 | `train-bob` 动画：translateY 0→-6px，scale(1.03)，3s ease-in-out |
| 汉堡菜单 | Menu/X 图标 90deg 旋转 crossfade，移动端全屏菜单 + stagger 入场 |

**布局结构**
```
section.h-screen.relative
├── 4× video（绝对定位，z-0）
├── PNG overlay（z-1）
└── content layer（z-2，flex column）
    ├── Navbar（液态玻璃 pill 导航）
    ├── Hero（badge + 标题 + 邮件输入 + 视频切换器）
    └── 底部统计行（| 分隔，桌面端显示）
```

---

### hero2.md — NeuralKinetics（科技产品）

**定位**：简洁科技感，无 Tailwind，纯 CSS 实现

**技术栈**
- React 19 + Vite + Framer Motion（`motion` 包）+ Lucide React
- 纯 CSS（无 Tailwind）
- 字体：Inter 300/400/500/600

**核心设计模式**

| 模式 | 实现细节 |
|------|---------|
| 全屏视频背景 | 单视频，移动端 80%×80%，桌面端 100%，`object-fit: cover` |
| Framer Motion 入场套件 | navbar y:-16→0 / video scale 1.05→1 / footer y:20→0，统一 ease [0.16,1,0.3,1] |
| 固定 navbar 分区 | 左（logo+菜单+标签）/ 右（功能入口），pointer-events none 穿透 |
| 底部渐变遮罩 | `linear-gradient(to top, #fff, rgba(255,255,255,0.8), transparent)` |
| 自定义 SVG logo | 两个旋转矩形（-35deg），无图标库依赖 |

**布局结构**
```
div.min-h-100vh（flex column, space-between）
├── Navbar（fixed, z-50）
├── video（absolute, z-0）
└── footer content（bottom, z-30）
    ├── 左：副标题 + 主标题 + 按钮组
    └── 右：3 个标签 pill
```

---

### hero3.md — 太空旅行落地页

**定位**：高复杂度双 Section 落地页，CDN 依赖，无构建工具

**技术栈**
- React 18 + Tailwind CSS（CDN）+ Framer Motion 11（CDN）+ Babel standalone
- 字体：Instrument Serif（italic heading）+ Barlow 300-600（正文）
- 通过 `window.X = X` 暴露组件，全部 `<script type="text/babel">`

**核心设计模式**

| 模式 | 实现细节 |
|------|---------|
| FadingVideo（自定义 rAF 淡入淡出） | `loop` 关闭，手动 `ended` 重播，`requestAnimationFrame` 控制 opacity，防止 CSS transition 与 rAF 冲突；FADE_MS=500，FADE_OUT_LEAD=0.55s |
| 液态玻璃双变体 | `.liquid-glass`（blur 4px）和 `.liquid-glass-strong`（blur 50px），共用 `::before` 渐变边框 |
| BlurText 逐词模糊入场 | IntersectionObserver 触发，每词 `filter:blur(10px)→blur(5px)→0`，stagger 100ms/词，`display:inline-block` + `marginRight:0.28em` |
| Tailwind 全局覆盖 | `borderRadius.DEFAULT: "9999px"`（bare `rounded` = pill），`fontFamily` 扩展 heading/body |

**两个 Section**

**Section 1 — Hero**
```
section.h-screen（black bg）
├── FadingVideo（120%宽高，top-aligned）
└── z-10 content
    ├── Navbar（liquid-glass logo + 中心 pill 导航 + Claim a Spot）
    ├── hero（badge + BlurText 标题 + 副标题 + CTA + 统计卡片×2）
    └── Partners（合作方名称行）
```

**Section 2 — Capabilities**
```
section.min-h-screen（black bg）
├── FadingVideo（全出血）
└── z-10 content
    ├── Kicker + 大标题（Production evolved）
    └── 3 列能力卡片（liquid-glass，图标 + 标签 + 标题 + 描述）
```

---

### hero4.md — VEX（投资/顾问）

**定位**：暗色极简风格，内容底部对齐，强调逐字符入场动效

**技术栈**
- React + TypeScript + Tailwind CSS + Vite
- 字体：Inter 300/400/500/600（Google Fonts，全局 antialiased）
- 图标：lucide-react（当前未使用，预留）

**核心设计模式**

| 模式 | 实现细节 |
|------|---------|
| 纯视频背景（无遮罩） | 全屏 `<video>` autoplay muted loop，无任何 overlay / gradient / dimming，原始画面直出 |
| 液态玻璃暗色变体 | `background: rgba(0,0,0,0.4)` + `backdrop-filter: blur(4px)`，渐变边框透明度降至 0.3/0.1 |
| AnimatedHeading 逐字符入场 | 按 `\n` 分行 → 每行拆字符 → 每字符 `opacity:0 translateX(-18px)→1,0`，stagger = `(lineIndex×lineLength+charIndex)×30ms`，初始延迟 200ms，过渡 500ms |
| FadeIn 通用包装器 | `setTimeout` + React state 控制 opacity 0→1，delay/duration 可配置，纯 CSS transition |
| 内容底部对齐 | `flex-1 flex flex-col justify-end`，hero 内容贴底而非居中 |
| 双列布局（桌面端） | `lg:grid lg:grid-cols-2 lg:items-end`，左列标题+按钮，右列标签卡片 |

**布局结构**
```
section.h-screen.relative（black bg）
├── video（absolute inset-0，z-0，无遮罩）
└── content（z-10，flex column，justify-end）
    ├── Navbar（liquid-glass rounded-xl bar）
    │   ├── Logo "VEX"
    │   ├── 中心导航链接（md+）
    │   └── CTA "Start a Chat"
    └── Hero（pb-12 lg:pb-16）
        ├── 左列：AnimatedHeading + 副标题 + 按钮组
        └── 右列：液态玻璃标签卡片
```

---

## 共用设计系统片段

### 液态玻璃 CSS（可直接复用）

```css
/* 轻量版 */
.liquid-glass {
  background: rgba(255, 255, 255, 0.01);
  backdrop-filter: blur(4px);
  -webkit-backdrop-filter: blur(4px);
  box-shadow: inset 0 1px 1px rgba(255, 255, 255, 0.1);
  position: relative;
  overflow: hidden;
}
.liquid-glass::before {
  content: '';
  position: absolute;
  inset: 0;
  border-radius: inherit;
  padding: 1.4px;
  background: linear-gradient(180deg,
    rgba(255,255,255,0.45) 0%, rgba(255,255,255,0.15) 20%,
    rgba(255,255,255,0) 40%, rgba(255,255,255,0) 60%,
    rgba(255,255,255,0.15) 80%, rgba(255,255,255,0.45) 100%);
  -webkit-mask: linear-gradient(#fff 0 0) content-box, linear-gradient(#fff 0 0);
  -webkit-mask-composite: xor;
  mask-composite: exclude;
  pointer-events: none;
}

/* 强版（primary CTA 用） */
.liquid-glass-strong {
  /* 同上，backdrop-filter: blur(50px)，box-shadow 加外阴影 */
}
```

### Framer Motion 入场动画参数（hero2/hero3 通用）

```js
// 统一 ease
const ease = [0.16, 1, 0.3, 1]

// 典型配置
{ initial: { opacity: 0, y: 20, filter: 'blur(10px)' },
  animate: { opacity: 1, y: 0, filter: 'blur(0px)' },
  transition: { duration: 0.8, delay: 0.4, ease } }
```

### FadingVideo（hero3 核心逻辑摘要）

```js
// rAF 驱动透明度，防止 CSS transition 干扰
// loop 关闭 + ended 事件手动重播
// FADE_OUT_LEAD = 0.55s（在视频结束前 0.55s 开始淡出）
// timeupdate 检测 → fadeTo(0) → ended → reset + fadeTo(1)
```

---

## 选型建议

| 场景 | 推荐模板 |
|------|---------|
| 需要多视频切换 + 情绪氛围 | hero1（Lumora） |
| 极简科技感，无构建依赖要求 | hero2（NeuralKinetics） |
| 需要 CDN 单文件部署 + 高复杂度 | hero3（太空旅行） |
| 需要自定义视频淡入淡出（不用 CSS transition） | hero3（FadingVideo 组件） |
| 需要逐词模糊入场动画 | hero3（BlurText 组件） |
| 内容底部对齐 + 逐字符 stagger 动效 | hero4（VEX） |
| 纯视频背景无遮罩暗色风格 | hero4（VEX） |
