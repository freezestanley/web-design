# DESIGN.md - [项目名称] 视觉设计系统规范

> 本文档为 AI Agent (如 Cursor, v0, Claude Code, GitHub Copilot) 的专用 UI 生成指南。
> AI 在构建或修改任何前端组件、页面或布局时，必须严格遵守以下声明的 Token 语意与护栏规则。

## 1. Visual Theme & Atmosphere (视觉主题与氛围)
*   **设计哲学**: [例如：激进的极简主义，高对比度数字零售，或是温暖的、充满人情味的摄影驱动社区]
*   **氛围关键词**: [例如：Cinematic, Clean, Futuristic, Craftsmanship, Organic]
*   **一句话定调**: [例如：像 Linear 一样冷峻高效，但带有 Stripe 般灵动的光影渐变]

## 2. Color Palette & Roles (色彩调色板与角色)
<!-- 必须提供完整的 CSS 变量定义，并附带 RGB 辅助值以方便 AI 计算透明度 -->
```css
:root {
  /* 基础画布 (Canvas) */
  --background: #000000;         /* rgb(0, 0, 0) */
  --foreground: #f5f5f7;         /* rgb(245, 245, 247) */

  /* 品牌核心 (Brand Accents) */
  --primary: #0066cc;            /* rgb(0, 102, 204) - 科技蓝 */
  --primary-hover: #0077ed;      /* rgb(0, 119, 237) */
  --accent: #00f2fe;             /* rgb(0, 242, 254) - 霓虹青 */

  /* 中性色阶 (Muted & Borders) */
  --muted: #86868b;              /* rgb(134, 134, 139) */
  --border: #212124;             /* rgb(33, 33, 36) */
  --surface: #121214;            /* rgb(18, 18, 20) */

  /* 状态反馈 (Feedback) */
  --success: #30d158;            /* rgb(48, 209, 88) */
  --error: #ff453a;              /* rgb(255, 69, 58) */
}
```

## 3. Typography Rules (字体与排版规则)
*   **Google Fonts**: `https://googleapis.com`
*   **字体族定义**: `font-family: 'Inter', -apple-system, BlinkMacSystemFont, sans-serif;`
*   **字号层级表**:
    *   `h1`: `3.5rem (56px) / line-height: 1.1 / letter-spacing: -0.02em / bold`
    *   `h2`: `2.25rem (36px) / line-height: 1.2 / letter-spacing: -0.01em / semibold`
    *   `h3`: `1.5rem (24px) / line-height: 1.3 / medium`
    *   `body`: `1rem (16px) / line-height: 1.6 / regular`
    *   `caption`: `0.875rem (14px) / line-height: 1.4 / var(--muted)`
*   **特殊装饰**: 允许在 `h1` 上使用从 `--primary` 到 `--accent` 的 `background-clip: text` 渐变色。
*   **禁止项**: 严禁在非代码区块使用 `Monospace` 字体；严禁使用任何形式的斜体字 (`italic`)。

## 4. Component Stylings (组件样式定义)
### 4.1 核心按钮 (Primary Button)
```css
.btn-primary {
  background: var(--primary);
  color: #ffffff;
  padding: 12px 24px;
  border-radius: 8px;
  font-weight: 500;
  transition: all 0.2s cubic-bezier(0.16, 1, 0.3, 1);
}
.btn-primary:hover {
  background: var(--primary-hover);
  transform: translateY(-1px);
  box-shadow: 0 4px 12px rgba(0, 102, 204, 0.3);
}
```
### 4.2 卡片容器 (Standard Card)
*   **基础样式**: 背景使用 `var(--surface)`，边框 `1px solid var(--border)`，圆角 `12px`。
*   **内边距**: 统一使用 `padding: 24px`。
*   **悬停特效**: 边框亮化为 `var(--muted)`，并叠加微弱的外部发光。

## 5. Layout Principles (布局原则)
*   **容器宽度**: 网页最大控制宽度为 `1200px`，两侧留出最小 `24px` 的安全边距。
*   **网格系统 (Grid)**: 标准卡片流使用 3 列布局（`grid-template-columns: repeat(3, 1fr)`），网格间距统一为 `gap: 32px`。
*   **间距梯度 (Spacing Scale)**: 严格执行 8px 步长原则（`8px | 16px | 24px | 32px | 48px | 64px`），严禁出现如 `13px`, `27px` 等奇数间距。

## 6. Depth & Elevation (深度与层级体系)
*   **Flat (底色)**: 页面基底，使用 `var(--background)`。
*   **Raised (卡片/组件)**: 悬浮于基底之上的元素，使用 `var(--surface)`，并带有阴影：`box-shadow: 0 2px 8px rgba(0,0,0,0.4)`。
*   **Overlay (弹窗/下拉菜单)**: 最高层级，使用 `background: rgba(18,18,20,0.8)` 配合 `backdrop-filter: blur(12px)` 实现高斯模糊玻璃拟态，边缘加粗 `1px solid rgba(255,255,255,0.1)`。

## 7. Animation & Interaction (动效与交互档位)
*   **全局过渡速度**: 默认交互微动效（如按钮 hover、链接颜色切换）统一使用 `200ms`。
*   **过渡曲线**: 页面入场、大组件展开统一使用优雅的贝塞尔曲线：`cubic-bezier(0.16, 1, 0.3, 1)` (Ease-out-quint)。
*   **滚动行为**: 页面内锚点跳转必须启用 `scroll-behavior: smooth;`。

## 8. Responsive Behavior (响应式断点策略)
*   **移动端 (Desktop-First 到 Mobile 断点)**: `max-width: 768px`。
*   **折叠策略**: 处于移动端断点时，3 列网格自动坍塌为单列布局（`1fr`），主导航栏收纳进汉堡菜单。
*   **触摸目标**: 移动端下所有可点击组件（按钮、图标、链接）的最小热区面积必须放大至 `44px * 44px`。

## 9. Do's and Don'ts (设计护栏与反模式)
*   ✅ **Do**: 始终保持暗色背景与亮色文字的高对比度（确保满足 WCAG AA 级对比度标准）。
*   ✅ **Do**: 卡片内部的图标必须统一使用线条感轻盈的单色图标（如 Lucide Icons）。
*   ❌ **Don't**: 严禁在同一个页面混用圆角，大组件统一 `12px`，小组件统一 `8px`。
*   ❌ **Don't**: 严禁使用纯黑以外的带有明显红/绿彩色倾向的杂色作为背景底色。
*   ❌ **Don't**: 绝不允许出现直角边框，除非在代码块区域。
