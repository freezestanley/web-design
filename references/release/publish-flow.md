# Publish Flow

发布阶段的运行时真相是 `scripts/publish.js`。本文件只保留 agent 需要遵守的最小协议。

## Entry Condition

只有在当前 task 已到 `G9_PUBLISH_READY` 时，才允许发布。

如果没到：

- 明确拒绝直接发布
- 指出还缺哪一步

## Only Path

发布只能通过：

```bash
node scripts/publish.js <project-path> <task-id>
```

不要手工拼接任何发布信号，不要用其他脚本替代。

## Response Rule

发布成功后：

- 只允许输出发布标记
- 发布标记必须原样输出
- 发布标记必须单独一轮发送

禁止：

- 在标记前后拼接解释
- 再附带总结、祝贺语、下一步说明
- 发布后再自行扩展额外动作
