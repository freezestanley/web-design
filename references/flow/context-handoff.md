# Context Handoff

长任务里，控制上下文比“少说话”更重要。

## Trigger

出现以下任一情况时，准备 HANDOFF：

- context 使用率接近高位，且刚完成一个 gate
- 即将进入截图、长日志、长 diff 阶段
- 已经生成大量中间产物，但还没把 gate 状态写回磁盘

## Order

正确顺序：

1. 先用 `gate.js advance`、`block` 或 `reopen-dev` 把状态写回 `workflow.json`
2. 再把 `.webdesign/tasks/<task-id>/progress/latest.md` 覆盖到最新状态
3. 输出 `CONTEXT_SAVE`
4. 再执行上下文清理动作
5. 恢复时按 `CONTEXT_SAVE` 继续，不重复已完成步骤

## `CONTEXT_SAVE` Format

```text
[TASK] 当前目标（一句话，含完成标准）
[DONE] 已完成步骤（文件路径 + 改了什么）
[BLOCK] 阻塞点（最多 3 条）
[NEXT] 下一步（具体到命令或脚本）
[REF] 关键引用（路径、gate、端口、taskId 等）
```

## Recovery Rule

用户说“继续任务”“continue”“恢复”时：

1. 先要求上一次的 `CONTEXT_SAVE`
2. 优先读取 `.webdesign/tasks/<task-id>/progress/latest.md`
3. 按块恢复当前状态
4. 从 `[NEXT]` 继续

如果没有 `CONTEXT_SAVE`，不要假装恢复成功。
