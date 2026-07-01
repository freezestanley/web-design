# DESIGN.md - 滚动驱动逐帧动画舞台视觉设计系统规范

> **[重要声明]** 本文档为 AI Agent 的最高优先级 UI 判定准则。
> AI 在编写、修改或重构本项目的 HTML 结构、CSS 样式与 JavaScript 动画逻辑时，必须 100% 像素级遵循本文档，严禁自行进行风格脑补。

---

## 1. 品牌定调与设计哲学 (Design Philosophy)
*   **核心美学**: 古典哥特剧场风格（Classical Theater Aesthetics）融合现代微数字拟物。
*   **情感画布**: 模拟真实大剧院的深邃感，通过暗色天鹅绒红、木质地毯与发光聚光灯，让用户通过“滚动”这一行为变成舞台的导演，赋予网页元素以拟人化的戏剧生命力。
*   **视觉对齐**: 质感向电影级交互、Apple 官网滚动叙事看齐。

---

## 2. 语义化色彩代币 (Color Tokens & Theme)
```css
:root {
  
}
```

---

## 3. 严苛的排版与字阶系统 (Typography Scale)
*   **字体栈 (Font Family)**: `font-family: 'Playfair Display', 'Georgia', 'Nimbus Roman No9 L', serif;` (严格采用优雅衬线体)
*   **系统字阶表**:
    1.  `Stage Hero/Title`: `3.5rem (56px) | line-height: 1.2 | tracking: 0.05em | font-weight: 700`
    2.  `Card Heading`: `1.5rem (24px) | line-height: 1.3 | font-weight: 600 | color: var(--text-stage-light)`
    3.  `Body Regular`: `1rem (16px) | line-height: 1.6 | font-weight: 400 | color: rgba(254, 252, 240, 0.85)`
    4.  `Indicator/Meta`: `0.875rem (14px) | font-family: monospace | color: var(--tassel-gold)`

---

## 4. 空间与布局度量衡 (Spacing & Layout Grid)
*   **原子级间距基准 (8px 步长法则)**: 所有间距必须为 8 的倍数：`8px | 16px | 24px | 32px | 48px | 64px`。
*   **舞台视口限制 (Stage Container)**: 
    *   舞台视口区域使用 `position: sticky; top: 0; width: 100vw; height: 100vh; overflow: hidden;`。
    *   外部滚动总动能容器固定为 `height: 500vh;`。
*   **舞台演员对齐**: 
    *   中央演员（卡片、引言等）采用绝对定位 `position: absolute; left: 50%; top: 50%;`。
    *   通过 `transform: translate(-50%, -50%)` 作为基准点，后续逐帧动画的数学函数在此外层基准上叠加。

---

## 5. 标准原子组件与剧场元素规范 (Theater Elements)

### 5.1 CSS 幕布与帷幔 (Curtains - 纯 CSS 绘制)
*   **顶部帷幔**: 使用 `background: linear-gradient(...)` 绘制垂坠质感，底边通过 `clip-path: polygon(...)` 截断出优美的古典波浪下摆，并叠加 `border-bottom: 4px solid var(--tassel-gold)` 作为流苏线。
*   **左右两侧幕布**: 宽度各占视口的 `15%`，高 `100%`。利用多重线性渐变 `linear-gradient(90deg, ...)` 模拟出天鹅绒布料起伏不定的褶皱明暗，并附加微弱的 `keyframes` 摇曳动效。

### 5.2 舞台地板 (Stage Floor)
*   **透视质感**: 视口底部 `20vh` 区域为地板，使用 `linear-gradient(180deg, var(--stage-floor-light), var(--stage-floor-dark))`。
*   **木纹刻线**: 结合 `repeating-linear-gradient` 顺着透视角度拉出密集的纵向线条，构成仿木质地板质感。

---

## 6. 滚动驱动逐帧核心机制 (Step-Frame Engine)
*   **总帧数定量**: `const TOTAL_FRAMES = 60;`
*   **状态冻结与增量读写 (反幻觉红线)**:
    *   必须使用 `requestAnimationFrame` 进行滚动防抖。
    *   **核心优化**: 只有在 `Math.floor(progress * TOTAL_FRAMES)` 计算出的帧号发生**绝对变化**时，才允许写入 DOM 样式。若帧号未变，直接 `return`，拒绝一切无意义重绘。
*   **逐帧跳跃感**: 帧与帧之间的变换数据必须是**离散、确定**的，直接覆盖对应元素的 `style.transform` 与 `style.opacity`。**严禁**为演员元素配置 `transition` 过渡属性，以确保绝对纯正的“逐帧泥偶/定格动画”跳跃感。

---

## 7. AI 代理严禁踩踏的红线 (Absolute Don'ts for AI)
*   ❌ **禁止外部依赖**: 严禁引入任何第三方 JS 动画库（如 GreenSock/GSAP）或外部图片资源。幕布、灯光、地板必须纯 CSS 渲染。
*   ❌ **禁止缓动平滑**: 演员元素**严禁**带有 `transition: transform ...` 等平滑过渡，帧切换必须是瞬间硬切的，否则会摧毁逐帧动画的既定艺术风格。
*   ❌ **禁止奇数步长**: 帧指示器圆点的间距、尺寸必须严格遵循 8px 步长，高亮状态必须带有 `box-shadow` 金色复古微光。
