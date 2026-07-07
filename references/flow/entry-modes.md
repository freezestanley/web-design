# Entry Modes

进入 `web-design` 后，先判定本轮属于哪种模式。不要把所有任务都按完整重型 SOP 执行。

## `new build`

适用场景：

- 新建页面
- 新建托管项目
- 从零开始的完整页面交付

必须经过：

- 项目初始化
- `product.md`
- `product-sync`
- `design.md`
- 开发
- 审计
- 预览
- 发布

禁止：

- 跳过设计直接写代码
- 未预览直接发布

## `revise existing`

适用场景：

- 修改已有托管项目
- 改文案、改区块、改样式、补交互

必须经过：

- 定位托管项目
- 新建本次 task
- 根据改动范围决定是否重做设计
- 代码修改后重新回到审计与预览

禁止：

- 因为“只是小改”就跳过 `G6 -> G7 -> G8 -> G9`

## `audit only`

适用场景：

- 用户要你只做静态审计
- 用户要你判断当前页面是否可交付

必须经过：

- 定位项目或当前构建结果
- 受控预览
- 审计结论写入 `audit.md`

禁止：

- 未经说明顺手改代码
- 没有审计结论就口头宣布通过

## `publish only`

适用场景：

- 用户明确表示只要发布

必须经过：

- 先检查当前 gate 是否已到 `G9_PUBLISH_READY`
- 若未到，明确拒绝直接发布并指出缺失阶段
- 只有满足前置条件时才执行 `publish.js`

禁止：

- 用任何其他脚本或手工步骤替代 `publish.js`
- 在未确认预览满意前推进发布

## Routing Rule

判完模式后，再决定接下来读哪些文档：

- 所有模式都先读 `references/flow/gates.md`
- 需要长任务管理时再读 `references/flow/context-handoff.md`
- 涉及设计时读 `references/design_workflow.md`
- 只审计或只发布时，不要把整套设计资料重新全读一遍
