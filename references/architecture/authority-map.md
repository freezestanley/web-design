# Authority Map

`web-design` 的规范分成 3 层，避免文档、脚本、测试互相抢权。

## 1. Runtime Truth

以下内容以脚本行为为准：

- gate 推进与回退：`scripts/gate.js`
- 发布行为：`scripts/publish.js`
- 产品同步与代理提取：`scripts/product-sync.js`
- 受控预览：`scripts/vitectrl/dev-preview.js`
- 分享预览：`scripts/share-preview.js`

如果文档与脚本冲突，以脚本为准；文档应被修正，而不是反过来解释脚本。

## 2. Agent Truth

以下内容以 skill 与引用文档为准：

- 当前任务属于哪种模式
- 当前阶段应该读哪些本地资料
- 什么时候必须停下来等用户确认
- 什么时候必须做 HANDOFF / context 瘦身
- 什么时候禁止绕过阶段直接继续

主入口：

- `SKILL.md`

阶段文档：

- `references/flow/*.md`
- `references/design_workflow.md`
- `skills/web-design-design/SKILL.md`

## 3. Validation Truth

测试的职责只有两个：

1. 验证运行时脚本行为是否符合当前实现
2. 验证 prompt 契约是否仍然覆盖关键流程约束

测试不应做的事：

- 用过期 wording 反向定义 skill
- 断言历史实现细节仍然必须存在
- 把 agent 文案偶然表达写死成唯一真相

## Writing Rule

新增规则前先判断放哪一层：

- 会被脚本直接执行的，放 runtime
- 会影响 agent 决策顺序的，放 prompt
- 只是防回归的，放测试

不要把同一条规则在三层都展开成长文复写。
