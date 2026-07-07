# Web Design Routing Review Notes

用于人工检查 `web-design` 在不同 prompt 下是否走对了模式与阶段，不用于定义运行时规范。

## Review Axes

每次看一个 eval，至少检查以下 4 项：

1. **Entry Mode**
   - 是否正确判成 `new build`、`revise existing`、`audit only`、`publish only`
   - 有没有把小任务误拉成整套重 SOP

2. **Reference Loading**
   - 是否只读取当前阶段需要的本地文档
   - 是否在设计阶段接入了 `design_workflow.md`、`design.md` 模板、`design-taste-frontend.md`、`gpt-taste.md`
   - 是否在非设计阶段避免无谓读取整套设计资料

3. **Gate Discipline**
   - 是否在该确认的 gate 停下
   - 是否拒绝绕过 `product-sync`、预览确认或 `publish.js`
   - 修改后是否能回退到 `G6_DEVELOPMENT`

4. **Context Discipline**
   - 是否把计划落盘而不是全塞进 context
   - 是否避免把截图、长日志、长文档一次性全读进来

## Expected Routing by Prompt Type

- **新建页面**：先项目/任务，再 product，再 design，再 build，再 audit/preview/release
- **续改页面**：先托管项目定位，再 task，再按改动范围决定是否补设计，之后重新走 audit/preview
- **设计-only**：停在 `design.md` 与设计自审，不提前写代码或发布
- **audit-only**：只做受控预览与 `audit.md` 结论，不顺手改代码
- **publish-only**：先检查 gate；不满足就拒绝直接发布

## Smells

看到以下现象时，应判路由失败：

- 用户只要审计，却被拉去重写设计
- 用户只要改文案，却被强行当成全新建站
- 用户只要发布，却在未满足 gate 条件时被直接发布
- 非设计任务仍全量读取设计资料，导致上下文膨胀
- 设计任务只提工具名，不读本地设计约束
