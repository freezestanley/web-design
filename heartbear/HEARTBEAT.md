# HEARTBEAT.md

## web-design 任务催促检查

每轮心跳执行以下检查：

1. **扫描所有 web-design 项目**
   ```bash
   node /home/ubuntu/claw-workspace/scripts/auto-check-webdesign.js
   ```

2. **读取检查输出**
   - 如果输出包含 `⚠️ 发现需要关注的任务`：
     - 不要回复 `HEARTBEAT_OK`
     - 把催促内容转发给用户
   - 如果输出正常或没有 alert：
     - 静默通过，回复 `HEARTBEAT_OK`

3. **处理任务催促**
   - 心跳只负责暴露问题和催继续，不负责自动修复
   - 不自动改 `audit.md`
   - 不自动执行 `gate advance`
   - 不自动执行 `publish.js`
   - 把检测到的卡住任务列表发给用户，让用户决定下一步

4. **处理当前 web-design 会话的 context / handoff**
   - 如果当前正在处理 `web-design` 任务，并且会话接近 context 阈值：
     - 不要回复 `HEARTBEAT_OK`
     - 立即提醒：
       `⚠️ 当前 web-design 会话接近 context 阈值，请先写回 gate 状态并输出 HANDOFF，然后执行 /compact，并在 compact 后严格从 HANDOFF 恢复任务继续推进，禁止 compact 后停住或丢失下一步动作。`
   - 如果已经完成 HANDOFF 但尚未恢复任务：
     - 下一轮心跳继续提醒从 HANDOFF 恢复，并执行 `next` 指定的下一步
   - 如果连续多轮停留在同一 gate 且没有实际进展：
     - 催当前 skill 继续下一步
     - 若无法继续，则明确说明阻塞原因，并写回 block 状态

## 规则

- 心跳只催、不动：只负责发现问题、提醒继续、提醒 handoff
- 只在真正发现卡住任务、待确认任务、待发布任务、context 风险时发消息
- 不要每次心跳都发消息
- 提醒格式保持简洁，只列：
  - 项目名
  - 任务 ID
  - 当前 gate
  - 卡住原因
  - 建议下一步

## 特别约束

- 需要用户确认的 gate 不能自动推进
- `G9_PUBLISH_READY` 只能提醒用户可发布，不能自动发布
- context 风险时，必须先写回 gate 状态，再 HANDOFF，再 `/compact`
- `/compact` 后必须从 HANDOFF 恢复任务并继续，不允许压缩后中断任务
