# HEARTBEAT.md - 周期性检查清单

## web-design 任务自动续航

每轮心跳执行以下检查：

1. **扫描所有 web-design 项目**
   ```bash
   node /home/ubuntu/claw-workspace/scripts/auto-check-webdesign.js
   ```

2. **处理检查结果**：
   - 如果有任务被自动推进了 gate → 向用户汇报推进了哪些任务
   - 如果有任务卡在需要用户确认的 gate（G2/G4/G8）→ 提醒用户
   - 如果有任务卡在 G9_PUBLISH_READY 等待发布 → 提醒用户可以执行发布
   - 如果没有未完成任务 → 静默通过

3. **记录检查结果**到 `memory/heartbeat-check.json`

## 规则

- 不需要用户确认的 gate 可以自动推进
- 需要用户确认的 gate（产品确认、设计确认、预览确认）不能自动推进
- G9_PUBLISH_READY 需要用户明确说"发布"才能执行 publish.js
- 只在真正发现问题时向用户汇报，不要每次心跳都发消息

## 其他可选检查

- [ ] 检查 `memory/` 目录是否需要清理旧日志
- [ ] 检查 workspace 是否有未提交的 git 更改
