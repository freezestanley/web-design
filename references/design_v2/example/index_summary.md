# 设计模板索引（摘要版）

> 完整版：`references/design_v2/example/index.md`（231 行）。本摘要仅保留选型路由。需要具体实现细节、CSS 片段或布局结构时，回查完整版或直接读对应 heroN.md。

## 选型速查表

| 文件 | 名称 | 风格关键词 | 适用场景 |
|------|------|-----------|---------|
| hero1.md | Lumora | 暗色沉浸 / 全屏视频 / 多路切换 | 多视频切换 + 情绪氛围 |
| hero2.md | NeuralKinetics | 极简黑白 / 视频背景 / 无 Tailwind | 极简科技感，无构建依赖 |
| hero3.md | 太空旅行 | 双 Section / CDN / FadingVideo / BlurText | CDN 单文件部署；自定义 rAF 淡入淡出；逐词模糊入场 |
| hero4.md | VEX | 暗色极简 / 底部对齐 / 逐字符 stagger | 投资/顾问类首屏；纯视频无遮罩 |

## 共用设计系统（摘要）

- **液态玻璃**：`backdrop-filter: blur(4px)` + `::before` 渐变边框（padding-mask 技巧），轻量版 blur 4px / 强版 blur 50px
- **Framer Motion 统一 ease**：`[0.16, 1, 0.3, 1]`
- **FadingVideo**：rAF 驱动透明度，loop 关闭 + ended 手动重播，FADE_OUT_LEAD=0.55s

> CSS 代码片段、完整布局结构树、技术栈详情见完整版 `references/design_v2/example/index.md`。
