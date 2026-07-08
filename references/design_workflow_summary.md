# Web 设计工作流（摘要版）

> 完整版：`references/design_workflow.md`（285 行）。本摘要仅保留执行路由所需的最小信息。需要审计输出结构、页型细则展开或 Gate 详细说明时，回查完整版。

## 执行总则

- 先判页型，禁止先选工具再倒推页面长相
- 未完成 `DESIGN.md` 前，禁止进入代码开发
- 未定义图片策略前，禁止引入任何大图、背景图、视频或占位图

## Step 3 硬顺序

1. **页型分流**：归入 `Marketing / Landing` | `SaaS / Dashboard / Tool` | `Story / PPT / Scrolltelling` | `Hybrid`
2. **读取本地资料**：按 SKILL.md Required Reads 的页型选读表执行
3. **先定图片策略**：回答 6 个问题（是否需要 / 角色 / section / 遮罩裁切 / 移动端降级 / 缺图 fallback），未答全不得进版式
4. **工具选择**：先定页型再定工具；禁止先决定"上 GSAP / React Bits"再倒推设计

## 工具选择原则

| 角色 | 工具 | 使用原则 |
|------|------|----------|
| 基础实现引擎 | `design-taste-frontend` | 默认必经 |
| 审美纠偏层 | `gpt-taste` | 设计定稿前 + 审计阶段 |
| 滚动叙事引擎 | `gsap-scrolltrigger` | 仅 Story/PPT/Scrolltelling |
| 微交互补强 | `motion.js`, `React Bits` | 只补局部，不接管整页 |
| 业务控件层 | `antd` | 仅 SaaS/Tool/Hybrid 业务模块 |

## Step 3 内部 Gate（最小清单）

- G3.1 页型确认门：未确认前禁选工具
- G3.2 素材策略门：未定义前禁下载素材
- G3.3 设计规约门：未完成 design.md 前禁进开发
- G3.4 设计确认门：用户未确认前禁推进
- G3.5 审计回退门：FAIL 必须回退修正，禁止只修表面

## 失败红线（任一触发即 FAIL）

- design.md 缺页型、section 骨架或移动端降级
- 营销页做成后台列表风
- 工具页做成大图堆叠风
- 故事页没有章节推进
- 白字压复杂图无遮罩
- 空状态用默认占位图或裸文案
- 整体结构明显模板味

> 审计输出结构、页型分流细则展开见完整版 `references/design_workflow.md`。
